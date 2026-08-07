import { DOMESTIC_CORE_DOMAIN_SUFFIXES, DOMESTIC_GAME_DOMAIN_SUFFIXES } from "../../shared/rules/domestic-core.js";
import { DEFAULT_RULE_SOURCE_IDS, FULL_ADBLOCK_SOURCE_IDS } from "../../shared/rules/lightweight-policy.js";
import { normalizeRuleEntry, RULE_KIND } from "../../shared/rules/model.js";
import { parseSurgeRules } from "./parse-surge.js";
import {
  DEFAULT_PUBLISH_SOURCE_CATALOG,
  FETCH_SOURCE_CATALOG,
  OPTIONAL_PUBLISH_SOURCE_CATALOGS,
} from "./source-catalog.js";

const DOMAIN_KINDS = new Set([RULE_KIND.domain, RULE_KIND.domainSuffix, RULE_KIND.domainKeyword]);
const ADDRESS_KINDS = new Set([RULE_KIND.ipv4Cidr, RULE_KIND.ipv6Cidr]);
const KIND_ORDER = new Map(Object.values(RULE_KIND).map((kind, index) => [kind, index]));
const DEFAULT_CATALOG_BY_ID = new Map(DEFAULT_PUBLISH_SOURCE_CATALOG.map((source) => [source.id, source]));
const FETCH_CATALOG_BY_ID = new Map(FETCH_SOURCE_CATALOG.map((source) => [source.id, source]));

function entryKey(entry) {
  return `${entry.kind}\0${entry.value}`;
}

function sortEntries(left, right) {
  const kind = KIND_ORDER.get(left.kind) - KIND_ORDER.get(right.kind);
  if (kind !== 0) return kind;
  if (left.value !== right.value) return left.value < right.value ? -1 : 1;
  return Number(left.noResolve) - Number(right.noResolve);
}

function normalizeEntries(entries, sourceId) {
  const unique = new Map();
  for (const rawEntry of entries) {
    const normalized = normalizeRuleEntry({ ...rawEntry, sourceId });
    const key = entryKey(normalized);
    const existing = unique.get(key);
    unique.set(key, existing && existing.noResolve && !normalized.noResolve
      ? existing
      : normalized);
  }
  return Object.freeze([...unique.values()].sort(sortEntries));
}

function sourceForSnapshot(id, fetched) {
  if (fetched?.source) return fetched.source;
  const source = FETCH_CATALOG_BY_ID.get(id);
  if (!source) throw new Error(`Rule source ${id}: descriptor is unavailable`);
  return source;
}

function parsedSnapshot(snapshots, id) {
  const fetched = snapshots.get(id);
  if (!fetched) throw new Error(`Rule source ${id}: missing snapshot input`);
  if (Array.isArray(fetched.entries)) return fetched.entries;
  if (typeof fetched.text !== "string") throw new TypeError(`Rule source ${id}: snapshot text is required`);
  return parseSurgeRules(fetched.text, sourceForSnapshot(id, fetched)).entries;
}

function coveredBySuffix(entry, suffix) {
  return (entry.kind === RULE_KIND.domain || entry.kind === RULE_KIND.domainSuffix)
    && (entry.value === suffix || entry.value.endsWith(`.${suffix}`));
}

function coveredByAnySuffix(entry, suffixes) {
  return suffixes.some((suffix) => coveredBySuffix(entry, suffix));
}

function compiledSet(id, entries, sourceIds, sourceBytes) {
  const source = DEFAULT_CATALOG_BY_ID.get(id)
    ?? OPTIONAL_PUBLISH_SOURCE_CATALOGS.adblockFull.find((item) => item.id === id);
  if (!source) throw new Error(`Rule source ${id}: compiled descriptor is unavailable`);
  return Object.freeze({
    id,
    source,
    sourceIds: Object.freeze([...sourceIds]),
    sourceBytes,
    entries: normalizeEntries(entries, id),
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

function gameOutputs(gameEntries) {
  const domestic = [];
  const overseas = [];
  for (const entry of gameEntries) {
    const normalized = normalizeRuleEntry({ ...entry, sourceId: "Game" });
    const domesticDomain = (normalized.kind === RULE_KIND.domain || normalized.kind === RULE_KIND.domainSuffix)
      && (normalized.value === "cn"
        || normalized.value.endsWith(".cn")
        || coveredByAnySuffix(normalized, DOMESTIC_GAME_DOMAIN_SUFFIXES));
    if (domesticDomain) {
      domestic.push(normalized);
    } else if (DOMAIN_KINDS.has(normalized.kind) || ADDRESS_KINDS.has(normalized.kind)) {
      overseas.push(normalized);
    } else {
      throw new Error(`Rule source Game: unsupported game rule kind ${normalized.kind}`);
    }
  }
  return { domestic, overseas };
}

function assertNoGameOverlap(domestic, overseas) {
  const domesticKeys = new Set(domestic.map(entryKey));
  const overlap = overseas.filter((entry) => domesticKeys.has(entryKey(entry)))
    .map(({ kind, value }) => `${kind}:${value}`).sort();
  if (overlap.length) {
    const error = new Error(`DomesticGame and OverseasGame overlap: ${overlap.join(", ")}`);
    error.diagnostics = Object.freeze({ overlap: Object.freeze(overlap) });
    throw error;
  }
  return Object.freeze(overlap);
}

export function compileLightweightRules({ snapshots }) {
  if (!(snapshots instanceof Map)) throw new TypeError("Rule snapshots must be a Map");
  for (const { id } of FETCH_SOURCE_CATALOG) parsedSnapshot(snapshots, id);

  const domesticCoreEntries = normalizeEntries(
    domainSuffixEntries(DOMESTIC_CORE_DOMAIN_SUFFIXES, "DomesticCore"),
    "DomesticCore",
  );
  const parsedGame = parsedSnapshot(snapshots, "Game");
  const partitionedGame = gameOutputs(parsedGame);
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

  const chinaInput = parsedSnapshot(snapshots, "ChinaMax");
  if (chinaInput.some((entry) => DOMAIN_KINDS.has(entry.kind))) {
    throw new Error("Rule source ChinaMax: domain rules are forbidden in ChinaIP");
  }
  if (chinaInput.some((entry) => !ADDRESS_KINDS.has(entry.kind))) {
    throw new Error("Rule source ChinaMax: only IPv4 and IPv6 CIDRs are allowed in ChinaIP");
  }

  const defaultRuleSets = new Map();
  for (const id of DEFAULT_RULE_SOURCE_IDS) {
    if (id === "DomesticCore") {
      defaultRuleSets.set(id, compiledSet(id, domesticCoreEntries, [], 0));
      continue;
    }
    if (id === "DomesticGame") {
      defaultRuleSets.set(id, compiledSet(id, domesticGameEntries, ["Game"], fetchedBytes(snapshots, "Game")));
      continue;
    }
    if (id === "OverseasGame") {
      defaultRuleSets.set(id, compiledSet(id, overseasGameEntries, ["Game"], fetchedBytes(snapshots, "Game")));
      continue;
    }
    if (id === "ChinaIP") {
      defaultRuleSets.set(id, compiledSet(id, chinaInput, ["ChinaMax"], fetchedBytes(snapshots, "ChinaMax")));
      continue;
    }
    const source = DEFAULT_CATALOG_BY_ID.get(id);
    let entries = parsedSnapshot(snapshots, id);
    if (source.routing === 1) {
      entries = entries.filter((entry) => !coveredByAnySuffix(
        normalizeRuleEntry({ ...entry, sourceId: id }),
        DOMESTIC_CORE_DOMAIN_SUFFIXES,
      ));
    }
    defaultRuleSets.set(id, compiledSet(id, entries, [id], fetchedBytes(snapshots, id)));
  }

  const adblockFull = new Map(FULL_ADBLOCK_SOURCE_IDS.map((id) => [
    id,
    compiledSet(id, parsedSnapshot(snapshots, id), [id], fetchedBytes(snapshots, id)),
  ]));
  const defaultInputIds = new Set([...defaultRuleSets.values()].flatMap(({ sourceIds }) => sourceIds));
  const defaultSourceBytes = [...defaultInputIds]
    .reduce((total, id) => total + fetchedBytes(snapshots, id), 0);
  const defaultEntries = [...defaultRuleSets.values()]
    .reduce((total, set) => total + set.entries.length, 0);

  return Object.freeze({
    defaultRuleSets,
    optionalPacks: Object.freeze({ adblockFull }),
    diagnostics: Object.freeze({
      defaultEntries,
      defaultSourceBytes,
      domesticCoreEntries: domesticCoreEntries.length,
      overlap,
    }),
  });
}
