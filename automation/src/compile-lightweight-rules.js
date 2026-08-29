import { DOMESTIC_CORE_DOMAIN_SUFFIXES, DOMESTIC_GAME_DOMAIN_SUFFIXES } from "../../shared/rules/domestic-core.js";
import {
  DEFAULT_RULE_SOURCE_IDS,
  FULL_ADBLOCK_SOURCE_IDS,
  MOBILE_RULE_BUNDLES,
} from "../../shared/rules/lightweight-policy.js";
import { normalizeRuleEntry, parseCanonicalCidr, RULE_KIND } from "../../shared/rules/model.js";
import { parseSurgeRules } from "./parse-surge.js";
import {
  DEFAULT_PUBLISH_SOURCE_CATALOG,
  FETCH_SOURCE_CATALOG,
  OPTIONAL_PUBLISH_SOURCE_CATALOGS,
} from "./source-catalog.js";
import { EXTERNAL_RULE_SOURCE_CATALOG } from "../../shared/rules/external-sources.js";

const DOMAIN_KINDS = new Set([RULE_KIND.domain, RULE_KIND.domainSuffix, RULE_KIND.domainKeyword]);
const ADDRESS_KINDS = new Set([RULE_KIND.ipv4Cidr, RULE_KIND.ipv6Cidr]);
const COMPILABLE_KINDS = new Set([...DOMAIN_KINDS, ...ADDRESS_KINDS]);
const KIND_ORDER = new Map(Object.values(RULE_KIND).map((kind, index) => [kind, index]));
const DEFAULT_CATALOG_BY_ID = new Map(DEFAULT_PUBLISH_SOURCE_CATALOG.map((source) => [source.id, source]));
const EXTERNAL_CATALOG_BY_ID = new Map(EXTERNAL_RULE_SOURCE_CATALOG.map((source) => [source.id, source]));

// External sources supplement the existing business rule files. They are
// deliberately projected into stable built-in intents so every renderer
// receives the same canonical entries without introducing client-specific
// rule IDs. Existing entries win exact matcher conflicts; unsupported
// PROCESS-NAME records are counted and omitted for domain/CIDR clients.
const EXTERNAL_TARGETS = Object.freeze({
  "loyalsoldier-clash-reject": "Hijacking",
  "loyalsoldier-clash-direct": "DomesticCore",
  "loyalsoldier-clash-private": "DomesticCore",
  "loyalsoldier-clash-lancidr": "DomesticCore",
  "loyalsoldier-clash-cncidr": "ChinaIP",
  "loyalsoldier-clash-apple": "Apple",
  "loyalsoldier-clash-icloud": "Apple",
  "loyalsoldier-clash-telegramcidr": "Telegram",
  "loyalsoldier-clash-gfw": "GlobalMedia",
  "loyalsoldier-clash-tld-not-cn": "GlobalMedia",
  "loyalsoldier-clash-applications": null,
  "loyalsoldier-clash-google": null,
});

function entryKey(entry) {
  return `${entry.kind}\0${entry.value}`;
}

function sortEntries(left, right) {
  const kind = KIND_ORDER.get(left.kind) - KIND_ORDER.get(right.kind);
  if (kind !== 0) return kind;
  if (left.value !== right.value) return left.value < right.value ? -1 : 1;
  return Number(left.noResolve) - Number(right.noResolve);
}

function bumpOmitted(omittedByKind, kind) {
  if (omittedByKind) omittedByKind.set(kind, (omittedByKind.get(kind) ?? 0) + 1);
}

function normalizeEntries(entries, sourceId, omittedByKind = null) {
  const unique = new Map();
  for (const rawEntry of entries) {
    if (!COMPILABLE_KINDS.has(rawEntry.kind)) {
      bumpOmitted(omittedByKind, rawEntry.kind);
      continue;
    }
    const normalized = normalizeRuleEntry({ ...rawEntry, sourceId });
    const key = entryKey(normalized);
    const existing = unique.get(key);
    unique.set(key, existing && existing.noResolve && !normalized.noResolve
      ? existing
      : normalized);
  }
  return Object.freeze([...unique.values()].sort(sortEntries));
}

const DESCRIPTOR_IDENTITY_FIELDS = Object.freeze([
  "id", "canonicalPath", "inputFormat", "policy", "minEntries",
  "inputOnly", "auditOnly", "optionalPack",
]);

function validateSnapshotDescriptor(expected, actual) {
  if (!actual || DESCRIPTOR_IDENTITY_FIELDS.some((field) => actual[field] !== expected[field])) {
    throw new Error(`Rule source ${expected.id}: snapshot descriptor does not match pinned catalog`);
  }
}

function parseSnapshots(snapshots) {
  const parsed = new Map();
  for (const expected of FETCH_SOURCE_CATALOG) {
    const fetched = snapshots.get(expected.id);
    if (!fetched) throw new Error(`Rule source ${expected.id}: missing snapshot input`);
    validateSnapshotDescriptor(expected, fetched.source);
    if (Array.isArray(fetched.entries)) {
      parsed.set(expected.id, fetched.entries);
      continue;
    }
    if (typeof fetched.text !== "string") {
      throw new TypeError(`Rule source ${expected.id}: snapshot text is required`);
    }
    parsed.set(expected.id, parseSurgeRules(fetched.text, expected).entries);
  }
  return parsed;
}

function parsedSnapshot(parsed, id) {
  const entries = parsed.get(id);
  if (!entries) throw new Error(`Rule source ${id}: parsed snapshot is unavailable`);
  return entries;
}

function coveredBySuffix(entry, suffix) {
  return (entry.kind === RULE_KIND.domain || entry.kind === RULE_KIND.domainSuffix)
    && (entry.value === suffix || entry.value.endsWith(`.${suffix}`));
}

function coveredByAnySuffix(entry, suffixes) {
  return suffixes.some((suffix) => coveredBySuffix(entry, suffix));
}

function compiledSet(id, entries, sourceIds, sourceBytes, omittedByKind, sourceOverride = null) {
  const source = sourceOverride
    ?? DEFAULT_CATALOG_BY_ID.get(id)
    ?? OPTIONAL_PUBLISH_SOURCE_CATALOGS.adblockFull.find((item) => item.id === id);
  if (!source) throw new Error(`Rule source ${id}: compiled descriptor is unavailable`);
  return Object.freeze({
    id,
    source,
    sourceIds: Object.freeze([...sourceIds]),
    sourceBytes,
    entries: normalizeEntries(entries, id, omittedByKind),
  });
}

function fetchedBytes(snapshots, id) {
  const value = snapshots.get(id)?.sourceBytes;
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`Rule source ${id}: sourceBytes is invalid`);
  return value;
}

function domainSuffixEntries(suffixes, sourceId) {
  return suffixes.map((value) => ({
    kind: RULE_KIND.domainSuffix,
    value,
    noResolve: false,
    sourceId,
  }));
}

function externalSupplementDiagnostics() {
  return {
    candidateCount: 0,
    parsedCount: 0,
    unsupportedCount: 0,
    unsupportedByReason: {},
    duplicates: 0,
    conflicts: 0,
    retained: 0,
    supplementary: 0,
    sources: {},
  };
}

function mergeExternalSupplements(defaultRuleSets, externalSnapshots) {
  const diagnostics = externalSupplementDiagnostics();
  if (externalSnapshots === null || externalSnapshots === undefined) {
    return Object.freeze({ ruleSets: defaultRuleSets, diagnostics: Object.freeze(diagnostics) });
  }
  if (!(externalSnapshots instanceof Map)) throw new TypeError("External rule snapshots must be a Map");
  const merged = new Map([...defaultRuleSets].map(([id, ruleSet]) => [id, {
    ...ruleSet,
    entries: [...ruleSet.entries],
    supplementarySources: new Set(ruleSet.supplementarySources ?? []),
  }]));
  const existing = new Map();
  for (const [targetId, ruleSet] of merged) {
    for (const entry of ruleSet.entries) existing.set(entryKey(entry), targetId);
  }
  for (const [sourceId, snapshot] of externalSnapshots) {
    const source = EXTERNAL_CATALOG_BY_ID.get(sourceId);
    if (!source || source.auditOnly === true) continue;
    const entries = Array.isArray(snapshot?.entries) ? snapshot.entries : [];
    const targetId = EXTERNAL_TARGETS[sourceId];
    const sourceDiagnostics = snapshot?.diagnostics ?? {};
    const sourceRecord = {
      candidateCount: Number.isSafeInteger(sourceDiagnostics.candidateCount) ? sourceDiagnostics.candidateCount : entries.length,
      parsedCount: Number.isSafeInteger(sourceDiagnostics.parsedCount) ? sourceDiagnostics.parsedCount : entries.length,
      unsupportedCount: Number.isSafeInteger(sourceDiagnostics.unsupportedCount) ? sourceDiagnostics.unsupportedCount : 0,
      duplicates: Number.isSafeInteger(sourceDiagnostics.duplicates) ? sourceDiagnostics.duplicates : 0,
      unsupportedByReason: sourceDiagnostics.unsupportedByReason ?? {},
      retained: 0,
      conflicts: 0,
      supplementary: 0,
    };
    diagnostics.candidateCount += sourceRecord.candidateCount;
    diagnostics.parsedCount += sourceRecord.parsedCount;
    diagnostics.unsupportedCount += sourceRecord.unsupportedCount;
    diagnostics.duplicates += sourceRecord.duplicates;
    for (const [reason, count] of Object.entries(sourceRecord.unsupportedByReason)) {
      diagnostics.unsupportedByReason[reason] = (diagnostics.unsupportedByReason[reason] ?? 0) + count;
    }
    if (!targetId) {
      diagnostics.sources[sourceId] = sourceRecord;
      continue;
    }
    const target = merged.get(targetId);
    if (!target) {
      diagnostics.sources[sourceId] = sourceRecord;
      continue;
    }
    target.supplementarySources.add(sourceId);
    for (const rawEntry of entries) {
      if (!COMPILABLE_KINDS.has(rawEntry.kind)) {
        sourceRecord.unsupportedCount += 1;
        const reason = rawEntry.kind === "processName" || rawEntry.kind === "process-name"
          ? "process-name-unsupported"
          : `kind-${rawEntry.kind}`;
        sourceRecord.unsupportedByReason[reason] = (sourceRecord.unsupportedByReason[reason] ?? 0) + 1;
        continue;
      }
      const normalized = normalizeRuleEntry({ ...rawEntry, sourceId });
      const key = entryKey(normalized);
      if (existing.has(key)) {
        sourceRecord.conflicts += 1;
        diagnostics.conflicts += 1;
        continue;
      }
      target.entries.push(normalized);
      existing.set(key, targetId);
      sourceRecord.retained += 1;
      sourceRecord.supplementary += 1;
      diagnostics.retained += 1;
      diagnostics.supplementary += 1;
    }
    diagnostics.sources[sourceId] = sourceRecord;
  }
  const result = new Map([...merged].map(([id, ruleSet]) => [id, Object.freeze({
    ...ruleSet,
    entries: Object.freeze(normalizeEntries(ruleSet.entries, id)),
    supplementarySources: Object.freeze([...ruleSet.supplementarySources].sort()),
  })]));
  return Object.freeze({ ruleSets: result, diagnostics: Object.freeze(diagnostics) });
}

function gameOutputs(gameEntries, omittedByKind) {
  const domestic = [];
  const overseas = [];
  for (const entry of gameEntries) {
    if (!COMPILABLE_KINDS.has(entry.kind)) {
      bumpOmitted(omittedByKind, entry.kind);
      continue;
    }
    const normalized = normalizeRuleEntry({ ...entry, sourceId: "Game" });
    const domesticDomain = (normalized.kind === RULE_KIND.domain || normalized.kind === RULE_KIND.domainSuffix)
      && (normalized.value === "cn"
        || normalized.value.endsWith(".cn")
        || coveredByAnySuffix(normalized, DOMESTIC_GAME_DOMAIN_SUFFIXES));
    if (domesticDomain) {
      domestic.push(normalized);
    } else {
      overseas.push(normalized);
    }
  }
  return { domestic, overseas };
}

function domainsOverlap(left, right) {
  if (!DOMAIN_KINDS.has(left.kind) || !DOMAIN_KINDS.has(right.kind)) return false;
  if (left.kind === RULE_KIND.domainKeyword || right.kind === RULE_KIND.domainKeyword) {
    return left.kind === right.kind && left.value === right.value;
  }
  if (left.kind === RULE_KIND.domain && right.kind === RULE_KIND.domain) return left.value === right.value;
  if (left.kind === RULE_KIND.domainSuffix && right.kind === RULE_KIND.domainSuffix) {
    return coveredBySuffix(left, right.value) || coveredBySuffix(right, left.value);
  }
  const domain = left.kind === RULE_KIND.domain ? left : right;
  const suffix = left.kind === RULE_KIND.domainSuffix ? left : right;
  return coveredBySuffix(domain, suffix.value);
}

function cidrsOverlap(left, right) {
  if (!ADDRESS_KINDS.has(left.kind) || left.kind !== right.kind) return false;
  const version = left.kind === RULE_KIND.ipv4Cidr ? 4 : 6;
  const width = version === 4 ? 32 : 128;
  const leftCidr = parseCanonicalCidr(left.value, version);
  const rightCidr = parseCanonicalCidr(right.value, version);
  const shorter = leftCidr.prefix <= rightCidr.prefix ? leftCidr : rightCidr;
  const longer = shorter === leftCidr ? rightCidr : leftCidr;
  const hostBits = BigInt(width - shorter.prefix);
  const containingNetwork = hostBits === 0n ? longer.network : (longer.network >> hostBits) << hostBits;
  return shorter.network === containingNetwork;
}

export function findSemanticRuleOverlaps(domestic, overseas) {
  if (!Array.isArray(domestic) || !Array.isArray(overseas)) {
    throw new TypeError("Domestic and overseas rule entries must be arrays");
  }
  const overlaps = new Set();
  for (const domesticEntry of domestic) {
    for (const overseasEntry of overseas) {
      if (domainsOverlap(domesticEntry, overseasEntry) || cidrsOverlap(domesticEntry, overseasEntry)) {
        overlaps.add(`${domesticEntry.kind}:${domesticEntry.value} <> ${overseasEntry.kind}:${overseasEntry.value}`);
      }
    }
  }
  return Object.freeze([...overlaps].sort());
}

function assertNoGameOverlap(domestic, overseas) {
  const overlap = findSemanticRuleOverlaps(domestic, overseas);
  if (overlap.length) {
    const error = new Error(`DomesticGame and OverseasGame overlap: ${overlap.join(", ")}`);
    error.diagnostics = Object.freeze({ overlap: Object.freeze(overlap) });
    throw error;
  }
  return Object.freeze(overlap);
}

export function compileLightweightRules({ snapshots, externalSnapshots = null }) {
  if (!(snapshots instanceof Map)) throw new TypeError("Rule snapshots must be a Map");
  const parsed = parseSnapshots(snapshots);
  const omittedByKind = new Map();

  const domesticCoreEntries = normalizeEntries(
    domainSuffixEntries(DOMESTIC_CORE_DOMAIN_SUFFIXES, "DomesticCore"),
    "DomesticCore",
  );
  const parsedGame = parsedSnapshot(parsed, "Game");
  const partitionedGame = gameOutputs(parsedGame, omittedByKind);
  const seededDomesticGame = normalizeEntries([
    ...domainSuffixEntries(DOMESTIC_GAME_DOMAIN_SUFFIXES, "DomesticGame"),
    ...partitionedGame.domestic,
  ], "DomesticGame");
  const domesticGameEntries = normalizeEntries(
    seededDomesticGame.filter((entry) => !coveredByAnySuffix(entry, DOMESTIC_CORE_DOMAIN_SUFFIXES)),
    "DomesticGame",
  );
  const overseasGameEntries = normalizeEntries(partitionedGame.overseas, "OverseasGame");
  const overlap = assertNoGameOverlap(domesticGameEntries, overseasGameEntries);

  const chinaInput = parsedSnapshot(parsed, "ChinaIPs");
  if (chinaInput.some((entry) => DOMAIN_KINDS.has(entry.kind))) {
    throw new Error("Rule source ChinaIPs: domain rules are forbidden in ChinaIP");
  }
  if (chinaInput.some((entry) => !ADDRESS_KINDS.has(entry.kind))) {
    throw new Error("Rule source ChinaIPs: only IPv4 and IPv6 CIDRs are allowed in ChinaIP");
  }

  const defaultRuleSets = new Map();
  for (const id of DEFAULT_RULE_SOURCE_IDS) {
    if (id === "DomesticCore") {
      defaultRuleSets.set(id, compiledSet(id, domesticCoreEntries, [], 0, omittedByKind));
      continue;
    }
    if (id === "DomesticGame") {
      defaultRuleSets.set(id, compiledSet(id, domesticGameEntries, ["Game"], fetchedBytes(snapshots, "Game"), omittedByKind));
      continue;
    }
    if (id === "OverseasGame") {
      defaultRuleSets.set(id, compiledSet(id, overseasGameEntries, ["Game"], fetchedBytes(snapshots, "Game"), omittedByKind));
      continue;
    }
    if (id === "ChinaTLD") {
      defaultRuleSets.set(id, compiledSet(
        id,
        normalizeEntries([{
          kind: RULE_KIND.domainSuffix,
          value: "cn",
          noResolve: false,
          sourceId: "ChinaTLD",
        }], "ChinaTLD"),
        [],
        0,
        omittedByKind,
      ));
      continue;
    }
    if (id === "ChinaIP") {
      defaultRuleSets.set(id, compiledSet(id, chinaInput, ["ChinaIPs"], fetchedBytes(snapshots, "ChinaIPs"), omittedByKind));
      continue;
    }
    const source = DEFAULT_CATALOG_BY_ID.get(id);
    let entries = parsedSnapshot(parsed, id);
    if (source.policy === "DIRECT") {
      entries = entries.filter((entry) => !coveredByAnySuffix(
        DOMAIN_KINDS.has(entry.kind) && entry.kind !== RULE_KIND.domainKeyword
          ? normalizeRuleEntry({ ...entry, sourceId: id })
          : entry,
        DOMESTIC_CORE_DOMAIN_SUFFIXES,
      ));
    }
    defaultRuleSets.set(id, compiledSet(id, entries, [id], fetchedBytes(snapshots, id), omittedByKind));
  }

  const external = mergeExternalSupplements(defaultRuleSets, externalSnapshots);
  const supplementedDefaultRuleSets = external.ruleSets;
  const adblockFull = new Map(FULL_ADBLOCK_SOURCE_IDS.map((id) => [
    id,
    compiledSet(id, parsedSnapshot(parsed, id), [id], fetchedBytes(snapshots, id), omittedByKind),
  ]));
  const mobileRuleSets = new Map(MOBILE_RULE_BUNDLES.map((bundle) => {
    // Mobile bundles stay on the compact first-party baseline. Desktop and
    // full-capability clients consume the external supplements above; mobile
    // runtimes must not eagerly materialize the 100k+ domain overlays.
    const entries = bundle.sourceIds.flatMap((sourceId) => defaultRuleSets.get(sourceId)?.entries ?? []);
    const source = Object.freeze({
      id: bundle.id,
      canonicalPath: `compiled/mobile/${bundle.id}.list`,
      inputFormat: "RULE-SET",
      policy: bundle.policy,
      phase: bundle.phase,
      dnsClass: bundle.dnsClass,
      minEntries: 0,
    });
    const sourceBytes = bundle.sourceIds.reduce((total, sourceId) => (
      total + (defaultRuleSets.get(sourceId)?.sourceBytes ?? fetchedBytes(snapshots, sourceId))
    ), 0);
    return [bundle.id, compiledSet(bundle.id, entries, bundle.sourceIds, sourceBytes, omittedByKind, source)];
  }));
  const defaultInputIds = new Set([...supplementedDefaultRuleSets.values()].flatMap(({ sourceIds }) => sourceIds));
  const defaultSourceBytes = [...defaultInputIds]
    .reduce((total, id) => total + fetchedBytes(snapshots, id), 0);
  const defaultEntries = [...supplementedDefaultRuleSets.values()]
    .reduce((total, set) => total + set.entries.length, 0);
  const mobileEntries = [...mobileRuleSets.values()]
    .reduce((total, set) => total + set.entries.length, 0);

  return Object.freeze({
    baselineRuleSets: defaultRuleSets,
    defaultRuleSets: supplementedDefaultRuleSets,
    mobileRuleSets,
    optionalPacks: Object.freeze({ adblockFull }),
    diagnostics: Object.freeze({
      defaultEntries,
      mobileEntries,
      defaultSourceBytes,
      domesticCoreEntries: domesticCoreEntries.length,
      overlap,
      omittedByKind: Object.freeze(Object.fromEntries([...omittedByKind].sort(([left], [right]) => (
        left < right ? -1 : left > right ? 1 : 0
      )))),
      external: external.diagnostics,
    }),
  });
}
