import { buildAnywhereRuleSnapshot, canonicalJson } from "./render-anywhere-rules.js";
import { renderEgernRuleSource } from "./render-egern-rules.js";
import { renderShadowrocketRuleSource } from "./render-shadowrocket-rules.js";
import { renderSingBoxRuleSource } from "./render-sing-box-rules.js";
import { compileLightweightRules } from "./compile-lightweight-rules.js";
import { compactRuleCidrs } from "./compact-rule-cidrs.js";
import { artifactBuffer, artifactByteLength, artifactSha256 } from "./artifact-content.js";
import { BLACKMATRIX7_BASELINE, catalogSha256 } from "./source-catalog.js";
import { RULE_BUDGETS } from "../../shared/rules/lightweight-policy.js";
import { RULE_KIND } from "../../shared/rules/model.js";

const CLIENT_PATHS = Object.freeze({
  shadowrocket: "shadowrocket",
  surge: "surge",
  egern: "egern",
  singbox: "sing-box",
  anywhere: "anywhere",
});

const SURGE_TYPE = Object.freeze({
  [RULE_KIND.domain]: "DOMAIN",
  [RULE_KIND.domainSuffix]: "DOMAIN-SUFFIX",
  [RULE_KIND.domainKeyword]: "DOMAIN-KEYWORD",
  [RULE_KIND.ipv4Cidr]: "IP-CIDR",
  [RULE_KIND.ipv6Cidr]: "IP-CIDR6",
});

const FORBIDDEN_DEFAULT_REFERENCES = Object.freeze([
  Object.freeze({ id: "Advertising_Domain", pattern: /\bAdvertising_Domain\b/u }),
  Object.freeze({ id: "ChinaMax_Domain", pattern: /\bChinaMax_Domain\b/u }),
  Object.freeze({ id: "rule-Advertising", pattern: /\brule-Advertising(?:_Domain)?\b/u }),
  Object.freeze({ id: "Advertising", pattern: /["']Advertising["']|\/Advertising(?:\.(?:arrs|json|list|srs|yaml)|\/)/u }),
]);

function compiledText(entries) {
  return `${entries.map((entry) => {
    const type = SURGE_TYPE[entry.kind];
    if (!type) throw new Error(`Compiled rule kind is not publishable: ${entry.kind}`);
    return `${type},${entry.value}${entry.noResolve ? ",no-resolve" : ""}`;
  }).join("\n")}\n`;
}

function renderInput(compiled, upstream) {
  const text = compiledText(compiled.entries);
  const source = Object.freeze({ ...compiled.source, inputFormat: "RULE-SET", minEntries: 0 });
  const parsed = Object.freeze({
    entries: compiled.entries,
    diagnostics: Object.freeze({
      physicalLines: compiled.entries.length,
      comments: 0,
      blank: 0,
      candidateCount: compiled.entries.length,
      parsedCount: compiled.entries.length,
      convertibleCount: compiled.entries.length,
      unsupportedCount: 0,
      unsupportedByReason: Object.freeze({}),
      ignoredModifiers: Object.freeze({
        noResolve: compiled.entries.filter(({ noResolve }) => noResolve).length,
      }),
    }),
  });
  const fetched = Object.freeze({
    text,
    entries: compiled.entries,
    source,
    sourceBytes: artifactByteLength(text),
    sourceSha256: artifactSha256(text),
    rawUrl: `compiled://${source.id}`,
  });
  return Object.freeze({ source, parsed, fetched, upstream });
}

function addFiles(target, additions) {
  for (const [path, content] of additions) {
    if (target.has(path)) throw new Error(`Duplicate public artifact path: ${path}`);
    target.set(path, content);
  }
}

function fileRecords(files) {
  return [...files].map(([path, content]) => Object.freeze({
    path,
    bytes: artifactByteLength(content),
    sha256: artifactSha256(content),
  })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

function renderRuleSetMap({ ruleSets, upstream, pathPrefix = "", anywherePrefix = "anywhere/rules" }) {
  const files = new Map();
  const clientSources = { shadowrocket: [], surge: [], egern: [], singbox: [] };
  const compiledSnapshot = new Map();
  const compiledCatalog = [];

  for (const [id, compiled] of ruleSets) {
    const input = renderInput(compiled, upstream);
    const shadowrocket = renderShadowrocketRuleSource(input);
    const egern = renderEgernRuleSource(input);
    const singbox = renderSingBoxRuleSource(input);
    const prefix = pathPrefix ? `${pathPrefix}/` : "";
    files.set(`${prefix}shadowrocket/rules/${id}.list`, shadowrocket.content);
    files.set(`${prefix}surge/rules/${id}.list`, shadowrocket.content);
    files.set(`${prefix}egern/rules/${id}.yaml`, egern.content);
    files.set(`${prefix}sing-box/rules/${id}.json`, singbox.content);
    clientSources.shadowrocket.push({ id, ...shadowrocket.counts });
    clientSources.surge.push({ id, ...shadowrocket.counts });
    clientSources.egern.push({ id, ...egern.counts });
    clientSources.singbox.push({ id, ...singbox.counts });
    compiledSnapshot.set(id, input.fetched);
    compiledCatalog.push(input.source);
  }

  const logicalRuleSets = compiledCatalog.map(({ id }) => Object.freeze({
    id,
    sourceIds: Object.freeze([id]),
    required: true,
  }));
  const anywhere = buildAnywhereRuleSnapshot({
    snapshot: compiledSnapshot,
    catalog: compiledCatalog,
    upstream,
    logicalRuleSets,
    pathPrefix: anywherePrefix,
    publicBase: "https://juan-nikola.github.io/apple-proxy-profiles/current",
  });
  addFiles(files, anywhere.files);
  return Object.freeze({ files, clientSources, anywhere });
}

function provenance(upstream) {
  return Object.freeze({
    repository: upstream.repository,
    branch: upstream.branch,
    commit: upstream.commit,
    committedAt: upstream.committedAt,
    license: upstream.license,
  });
}

function compactRuleSetMap(ruleSets) {
  const compacted = new Map();
  const diagnostics = {};
  for (const [id, ruleSet] of ruleSets) {
    const result = compactRuleCidrs(ruleSet.entries);
    compacted.set(id, Object.freeze({ ...ruleSet, entries: result.entries }));
    diagnostics[id] = result.diagnostics;
  }
  return Object.freeze({ ruleSets: compacted, diagnostics: Object.freeze(diagnostics) });
}

function clientRuleRecords(files, client) {
  const prefix = client === "anywhere" ? "anywhere/rules/" : `${CLIENT_PATHS[client]}/rules/`;
  return fileRecords(new Map([...files].filter(([path]) => (
    path.startsWith(prefix) && !path.endsWith("/manifest.json")
  ))));
}

function largestFive(records) {
  return [...records]
    .sort((left, right) => right.bytes - left.bytes || (left.path < right.path ? -1 : left.path > right.path ? 1 : 0))
    .slice(0, 5)
    .map(({ path, bytes }) => `${path}=${bytes}`)
    .join(", ");
}

function budgetError(kind, actual, limit, client, records) {
  return new Error(
    `Publication budget exceeded: ${kind} actual ${actual} limit ${limit}; client ${client}; largest five ${largestFive(records) || "none"}`,
  );
}

export function enforcePublicationBudgets({ diagnostics, files }) {
  if (!diagnostics || !(files instanceof Map)) throw new TypeError("Publication diagnostics and files are required");
  const allRecords = fileRecords(files);
  if (diagnostics.domesticCoreEntries > RULE_BUDGETS.domesticCoreEntries) {
    throw budgetError(
      "DomesticCore entries",
      diagnostics.domesticCoreEntries,
      RULE_BUDGETS.domesticCoreEntries,
      "all",
      allRecords,
    );
  }
  if (diagnostics.defaultEntries > RULE_BUDGETS.defaultEntries) {
    throw budgetError(
      "default entries",
      diagnostics.defaultEntries,
      RULE_BUDGETS.defaultEntries,
      "all",
      allRecords,
    );
  }
  const referencedBytes = {};
  for (const client of Object.keys(CLIENT_PATHS)) {
    const records = clientRuleRecords(files, client);
    const actual = records.reduce((sum, { bytes }) => sum + bytes, 0);
    referencedBytes[client] = actual;
    if (actual > RULE_BUDGETS.defaultBytes) {
      throw budgetError("referenced default bytes", actual, RULE_BUDGETS.defaultBytes, client, records);
    }
  }
  return Object.freeze(referencedBytes);
}

function addClientManifests(files, upstream, basePrefix = "") {
  const manifests = {};
  for (const [client, directory] of Object.entries(CLIENT_PATHS)) {
    const prefix = basePrefix ? `${basePrefix}/${directory}` : directory;
    const records = fileRecords(new Map([...files].filter(([path]) => path.startsWith(`${prefix}/`))));
    if (records.length === 0) throw new Error(`Client ${client} has no publication files`);
    const base = {
      schemaVersion: 1,
      client,
      generatedAt: upstream.committedAt,
      files: records,
    };
    const manifestHash = artifactSha256(canonicalJson(base));
    const manifest = Object.freeze({ ...base, manifestHash });
    files.set(`${prefix}/client-manifest.json`, canonicalJson(manifest));
    manifests[client] = manifest;
  }
  return Object.freeze(manifests);
}

export function assertNoForbiddenDefaultReferences(files) {
  if (!(files instanceof Map)) throw new TypeError("Default publication files must be a Map");
  for (const [path, content] of files) {
    const text = artifactBuffer(content).toString("utf8");
    const forbidden = FORBIDDEN_DEFAULT_REFERENCES.find(({ pattern }) => pattern.test(text));
    if (forbidden) {
      throw new Error(`Forbidden default rule reference ${forbidden.id} in ${path}`);
    }
  }
}

function buildOptionalPack({ packId, ruleSets, upstream }) {
  const pathPrefix = `optional/${packId}`;
  const rendered = renderRuleSetMap({
    ruleSets,
    upstream,
    pathPrefix,
    anywherePrefix: `${pathPrefix}/anywhere`,
  });
  const clientManifests = addClientManifests(rendered.files, upstream, pathPrefix);
  const records = fileRecords(rendered.files);
  const baseManifest = {
    schemaVersion: 1,
    packId,
    generatedAt: upstream.committedAt,
    entries: [...ruleSets.values()].reduce((sum, set) => sum + set.entries.length, 0),
    bytes: records.reduce((sum, record) => sum + record.bytes, 0),
    clients: Object.fromEntries(Object.entries(clientManifests).map(([client, manifest]) => [client, {
      manifestHash: manifest.manifestHash,
    }])),
    files: records,
  };
  const manifest = Object.freeze({
    ...baseManifest,
    manifestHash: artifactSha256(canonicalJson(baseManifest)),
  });
  rendered.files.set(`${pathPrefix}/manifest.json`, canonicalJson(manifest));
  return Object.freeze({ files: rendered.files, manifest });
}

export function buildClientArtifacts({
  snapshot,
  upstream = BLACKMATRIX7_BASELINE,
  additionalFiles = null,
}) {
  if (!(snapshot instanceof Map)) throw new TypeError("Complete rule snapshot is required");
  const compiled = compileLightweightRules({ snapshots: snapshot });
  const compactedDefaults = compactRuleSetMap(compiled.defaultRuleSets);
  const compactedAdblock = compactRuleSetMap(compiled.optionalPacks.adblockFull);
  const publicationDiagnostics = Object.freeze({
    ...compiled.diagnostics,
    rawDefaultEntries: compiled.diagnostics.defaultEntries,
    defaultEntries: [...compactedDefaults.ruleSets.values()]
      .reduce((sum, ruleSet) => sum + ruleSet.entries.length, 0),
  });
  const rendered = renderRuleSetMap({ ruleSets: compactedDefaults.ruleSets, upstream });
  const defaults = rendered.files;

  const additions = typeof additionalFiles === "function"
    ? additionalFiles(rendered.anywhere.manifest)
    : additionalFiles;
  if (additions !== null) {
    if (!(additions instanceof Map)) throw new TypeError("Additional public files must be a Map");
    addFiles(defaults, additions);
  }

  assertNoForbiddenDefaultReferences(defaults);
  const referencedBytes = enforcePublicationBudgets({ diagnostics: publicationDiagnostics, files: defaults });
  const clientManifests = addClientManifests(defaults, upstream);
  const records = fileRecords(defaults);
  const baseManifest = {
    schemaVersion: 2,
    generatedAt: upstream.committedAt,
    upstream: provenance(upstream),
    catalogSha256: catalogSha256(),
    clients: Object.fromEntries(Object.keys(CLIENT_PATHS).map((client) => [client, {
      manifestHash: clientManifests[client].manifestHash,
      referencedDefaultBytes: referencedBytes[client],
    }])),
    diagnostics: {
      defaultEntries: publicationDiagnostics.defaultEntries,
      rawDefaultEntries: publicationDiagnostics.rawDefaultEntries,
      domesticCoreEntries: publicationDiagnostics.domesticCoreEntries,
      omittedByKind: publicationDiagnostics.omittedByKind,
    },
    files: records,
  };
  const defaultManifest = Object.freeze({
    ...baseManifest,
    manifestHash: artifactSha256(canonicalJson(baseManifest)),
  });
  defaults.set("manifest.json", canonicalJson(defaultManifest));

  const adblockFull = buildOptionalPack({
    packId: "adblock-full",
    ruleSets: compactedAdblock.ruleSets,
    upstream,
  });
  const optionalPacks = new Map([["adblock-full", adblockFull.files]]);
  return Object.freeze({
    defaults,
    optionalPacks,
    diagnostics: Object.freeze({
      defaultRuleIds: Object.freeze([...compiled.defaultRuleSets.keys()]),
      compiler: compiled.diagnostics,
      compaction: compactedDefaults.diagnostics,
      referencedBytes,
      defaultManifest,
      optionalManifests: Object.freeze({ "adblock-full": adblockFull.manifest }),
    }),
  });
}
