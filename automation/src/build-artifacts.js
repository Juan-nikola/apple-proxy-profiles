import { readFileSync } from "node:fs";

import { buildAnywhereRuleSnapshot, canonicalJson } from "./render-anywhere-rules.js";
import { renderEgernRuleSource } from "./render-egern-rules.js";
import { renderShadowrocketRuleSource } from "./render-shadowrocket-rules.js";
import { renderSingBoxRuleSource } from "./render-sing-box-rules.js";
import { compileLightweightRules } from "./compile-lightweight-rules.js";
import { compactRuleCidrs } from "./compact-rule-cidrs.js";
import { artifactBuffer, artifactByteLength, artifactSha256 } from "./artifact-content.js";
import { BLACKMATRIX7_BASELINE, catalogSha256 } from "./source-catalog.js";
import { buildRoutingPlanAudit } from "./routing-plan-audit.js";
import {
  orderedRoutingPlan,
  MOBILE_RULE_SOURCE_IDS,
  RULE_BUDGETS,
  ruleClientCatalog,
} from "../../shared/rules/lightweight-policy.js";
import { RULE_KIND } from "../../shared/rules/model.js";
import { buildImportBatches, renderImportPage } from "../../clients/anywhere/src/build-import-page.js";
import { ANYWHERE_LIGHTWEIGHT_MIGRATION } from "../../clients/anywhere/src/shard-rules.js";
import { buildOneXrayGeoDataArtifacts } from "../../clients/onexray/src/build-import-page.js";
import { renderHappGeodata } from "./render-happ-geodata.js";

const CLIENT_PATHS = Object.freeze({
  shadowrocket: "shadowrocket",
  surge: "surge",
  egern: "egern",
  singbox: "sing-box",
  anywhere: "anywhere",
  happ: "happ",
});

const OPTIONAL_PACK_CLIENTS = Object.freeze({
  "adblock-full": Object.freeze(Object.fromEntries(
    Object.entries(CLIENT_PATHS).filter(([client]) => client !== "happ"),
  )),
});

const ONEXRAY_SCRIPT_PATHS = Object.freeze([
  "onexray/scripts/onexray-nodes-generator.js",
  "onexray/scripts/onexray-profile-generator.js",
]);
const HAPP_SCRIPT_PATHS = Object.freeze([
  "happ/scripts/happ-config-generator.js",
  "happ/scripts/substore-config-generator.js",
]);

const SURGE_TYPE = Object.freeze({
  [RULE_KIND.domain]: "DOMAIN",
  [RULE_KIND.domainSuffix]: "DOMAIN-SUFFIX",
  [RULE_KIND.domainKeyword]: "DOMAIN-KEYWORD",
  [RULE_KIND.ipv4Cidr]: "IP-CIDR",
  [RULE_KIND.ipv6Cidr]: "IP-CIDR6",
});

const FORBIDDEN_DEFAULT_RULE_IDS = Object.freeze([
  "Advertising_Domain",
  "ChinaMax_Domain",
  "Advertising",
]);
const FORBIDDEN_DEFAULT_CONTENT = /\b(?:Advertising_Domain|ChinaMax_Domain|Advertising)\b/u;
const FORBIDDEN_LEGACY_CONTENT = /\bChinaMax_Domain\b/u;
const NON_ROUTING_NOTICE_PATHS = new Set(["THIRD_PARTY_NOTICES.md"]);
const OPTIONAL_AWARE_GENERATOR_PATHS = new Set([
  "shadowrocket/scripts/shadowrocket-profile-generator.js",
  "shadowrocket/scripts/substore-profile-generator.js",
  "egern/scripts/egern-profile-generator.js",
  "egern/scripts/substore-profile-generator.js",
  "surge/scripts/surge-profile-generator.js",
  "surge/scripts/substore-profile-generator.js",
  "sing-box/scripts/sing-box-config-generator.js",
  "sing-box/scripts/substore-config-generator.js",
  "happ/scripts/happ-config-generator.js",
  "happ/scripts/substore-config-generator.js",
]);

function compiledText(entries) {
  return `${entries.map((entry) => {
    const type = SURGE_TYPE[entry.kind];
    if (!type) throw new Error(`Compiled rule kind is not publishable: ${entry.kind}`);
    return `${type},${entry.value}${entry.noResolve ? ",no-resolve" : ""}`;
  }).join("\n")}\n`;
}

function happPublicScripts() {
  const files = new Map();
  for (const path of HAPP_SCRIPT_PATHS) {
    const filename = path.slice("happ/scripts/".length);
    const content = readFileSync(new URL(`../../clients/happ/dist/${filename}`, import.meta.url));
    if (!Buffer.isBuffer(content) || content.length === 0) throw new Error(`Happ public script is empty: ${path}`);
    files.set(path, content);
  }
  return files;
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

function onexrayEdgeScripts() {
  const files = new Map();
  for (const path of ONEXRAY_SCRIPT_PATHS) {
    const filename = path.slice("onexray/scripts/".length);
    const content = readFileSync(new URL(`../../clients/onexray/dist/${filename}`, import.meta.url));
    if (!Buffer.isBuffer(content) || content.length === 0) {
      throw new Error(`OneXray edge script is empty: ${path}`);
    }
    files.set(path, content);
  }
  return files;
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

function renderRuleSetMap({
  ruleSets,
  mobileRuleSets = new Map(),
  upstream,
  singBoxBinaries = null,
  pathPrefix = "",
  anywherePrefix = "anywhere/rules",
  anywhereUrlPrefix = anywherePrefix,
  anywherePublicBase = "https://juan-nikola.github.io/apple-proxy-profiles/current",
  anywhereMode = "default",
}) {
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
    if (singBoxBinaries === null) {
      files.set(`${prefix}sing-box/rules/${id}.json`, singbox.content);
    } else {
      const binaryPath = pathPrefix
        ? `${prefix}sing-box/${id}.srs`
        : `sing-box/rule-sets/${id}.srs`;
      const binary = singBoxBinaries.get(binaryPath);
      if (!Buffer.isBuffer(binary)) throw new Error(`Compiled sing-box rule set is missing: ${binaryPath}`);
      files.set(binaryPath, binary);
    }
    clientSources.shadowrocket.push({ id, ...shadowrocket.counts });
    clientSources.surge.push({ id, ...shadowrocket.counts });
    clientSources.egern.push({ id, ...egern.counts });
    clientSources.singbox.push({ id, ...singbox.counts });
    compiledSnapshot.set(id, input.fetched);
    compiledCatalog.push(input.source);
  }

  for (const [id, compiled] of mobileRuleSets) {
    const input = renderInput(compiled, upstream);
    const singbox = renderSingBoxRuleSource(input);
    const prefix = pathPrefix ? `${pathPrefix}/` : "";
    if (singBoxBinaries === null) {
      files.set(`${prefix}sing-box/rules/mobile_${id}.json`, singbox.content);
    } else {
      const binaryPath = pathPrefix
        ? `${pathPrefix}sing-box/mobile-rule-sets/${id}.srs`
        : `sing-box/mobile-rule-sets/${id}.srs`;
      const binary = singBoxBinaries.get(binaryPath);
      if (!Buffer.isBuffer(binary)) throw new Error(`Compiled sing-box mobile rule set is missing: ${binaryPath}`);
      files.set(binaryPath, binary);
    }
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
    urlPathPrefix: anywhereUrlPrefix,
    publicBase: anywherePublicBase,
    migration: anywhereMode === "default" ? ANYWHERE_LIGHTWEIGHT_MIGRATION : null,
  });
  addFiles(files, anywhere.files);
  const importPath = anywherePrefix.endsWith("/rules")
    ? `${anywherePrefix.slice(0, -"/rules".length)}/import.html`
    : `${anywherePrefix}/import.html`;
  files.set(importPath, renderImportPage(
    buildImportBatches(anywhere.manifest.shards.map(({ url }) => url)),
    anywhere.manifest,
    { mode: anywhereMode },
  ));
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
  const prefixes = client === "happ"
    ? ["happ/geosite.dat", "happ/geoip.dat"]
    : client === "anywhere"
    ? ["anywhere/rules/"]
    : client === "singbox"
      ? ["sing-box/rules/", "sing-box/rule-sets/", "sing-box/mobile-rule-sets/"]
      : [`${CLIENT_PATHS[client]}/rules/`];
  return fileRecords(new Map([...files].filter(([path]) => (
    prefixes.some((prefix) => path.startsWith(prefix)) && !path.endsWith("/manifest.json")
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

function addClientManifests(
  files,
  upstream,
  clientPaths = CLIENT_PATHS,
  basePrefix = "",
  optionalSelections = null,
  chinaIpAuditSha256 = null,
) {
  if (chinaIpAuditSha256 !== null && !/^[0-9a-f]{64}$/u.test(chinaIpAuditSha256)) {
    throw new TypeError("ChinaIP audit digest is invalid");
  }
  const manifests = {};
  for (const [client, directory] of Object.entries(clientPaths)) {
    const prefix = basePrefix ? `${basePrefix}/${directory}` : directory;
    const records = fileRecords(new Map([...files].filter(([path]) => path.startsWith(`${prefix}/`))));
    if (records.length === 0) throw new Error(`Client ${client} has no publication files`);
    const base = {
      schemaVersion: 1,
      client,
      generatedAt: upstream.committedAt,
      ...(optionalSelections === null ? {} : { optionalPacks: optionalSelections[client] ?? {} }),
      ...(chinaIpAuditSha256 === null ? {} : { chinaIpAuditSha256 }),
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
    const forbiddenPath = FORBIDDEN_DEFAULT_RULE_IDS.find((id) => path.includes(id));
    if (forbiddenPath) throw new Error(`Forbidden default rule path ${forbiddenPath} in ${path}`);
    if (NON_ROUTING_NOTICE_PATHS.has(path)) continue;
    const text = artifactBuffer(content).toString("utf8");
    const match = (OPTIONAL_AWARE_GENERATOR_PATHS.has(path)
      ? FORBIDDEN_LEGACY_CONTENT
      : FORBIDDEN_DEFAULT_CONTENT).exec(text);
    if (match) {
      if (path === "anywhere/import.html" || path === "anywhere/rules/manifest.json") continue;
      throw new Error(`Forbidden default rule reference ${match[0]} in ${path}`);
    }
  }
}

function buildOptionalPack({ packId, ruleSets, upstream, singBoxBinaries = null }) {
  const pathPrefix = `optional/${packId}`;
  const rendered = renderRuleSetMap({
    ruleSets,
    upstream,
    singBoxBinaries,
    pathPrefix,
    anywherePrefix: `${pathPrefix}/anywhere`,
    anywhereUrlPrefix: "anywhere",
    anywherePublicBase: `https://juan-nikola.github.io/apple-proxy-profiles/optional/${packId}/current`,
    anywhereMode: "adblock-full",
  });
  const clientManifests = addClientManifests(rendered.files, upstream, OPTIONAL_PACK_CLIENTS[packId], pathPrefix);
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
  singBoxBinaries = null,
  chinaIpAudit = null,
  onexrayChannel = "edge",
}) {
  if (!(snapshot instanceof Map)) throw new TypeError("Complete rule snapshot is required");
  if (singBoxBinaries !== null) {
    if (!(singBoxBinaries instanceof Map)) throw new TypeError("Compiled sing-box rules must be a Map");
    const expected = [
      ...ruleClientCatalog({ adblockMode: "off" }).map(({ id }) => `sing-box/rule-sets/${id}.srs`),
      ...MOBILE_RULE_SOURCE_IDS.map((id) => `sing-box/mobile-rule-sets/${id}.srs`),
      "optional/adblock-full/sing-box/Advertising.srs",
      "optional/adblock-full/sing-box/Advertising_Domain.srs",
    ].sort();
    const actual = [...singBoxBinaries.keys()].sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error("Compiled sing-box rule-set file closure failed");
    }
    for (const [path, content] of singBoxBinaries) {
      if (!Buffer.isBuffer(content) || content.length < 17
        || !content.subarray(0, 4).equals(Buffer.from([0x53, 0x52, 0x53, 0x02]))) {
        throw new Error(`Compiled sing-box rule set is invalid: ${path}`);
      }
    }
  }
  const compiled = compileLightweightRules({ snapshots: snapshot });
  const compactedDefaults = compactRuleSetMap(compiled.defaultRuleSets);
  const compactedAdblock = compactRuleSetMap(compiled.optionalPacks.adblockFull);
  const publicationDiagnostics = Object.freeze({
    ...compiled.diagnostics,
    rawDefaultEntries: compiled.diagnostics.defaultEntries,
    defaultEntries: [...compactedDefaults.ruleSets.values()]
      .reduce((sum, ruleSet) => sum + ruleSet.entries.length, 0),
  });
  const onexray = buildOneXrayGeoDataArtifacts({
    ruleSets: compactedDefaults.ruleSets,
    upstream,
    channel: onexrayChannel,
  });
  const compactedMobile = compactRuleSetMap(compiled.mobileRuleSets);
  const rendered = renderRuleSetMap({
    ruleSets: compactedDefaults.ruleSets,
    mobileRuleSets: compactedMobile.ruleSets,
    upstream,
    singBoxBinaries,
  });
  const defaults = rendered.files;
  addFiles(defaults, renderHappGeodata(compactedDefaults.ruleSets).files);
  addFiles(defaults, happPublicScripts());
  let chinaIpAuditSha256 = null;

  const additions = typeof additionalFiles === "function"
    ? additionalFiles(rendered.anywhere.manifest)
    : additionalFiles;
  if (additions !== null) {
    if (!(additions instanceof Map)) throw new TypeError("Additional public files must be a Map");
    addFiles(defaults, additions);
  }
  if (chinaIpAudit !== null) {
    if (defaults.has("audit/china-ip-drift.json")) {
      throw new Error("Duplicate public artifact path: audit/china-ip-drift.json");
    }
    artifactBuffer(chinaIpAudit);
    defaults.set("audit/china-ip-drift.json", chinaIpAudit);
    chinaIpAuditSha256 = artifactSha256(chinaIpAudit);
  }
  if (defaults.has("audit/routing-plan.json")) {
    throw new Error("Duplicate public artifact path: audit/routing-plan.json");
  }
  const routingPlanAudit = buildRoutingPlanAudit({
    plan: orderedRoutingPlan({ adblockMode: "off" }),
    ruleSets: compactedDefaults.ruleSets,
  });
  defaults.set("audit/routing-plan.json", artifactBuffer(canonicalJson(routingPlanAudit)));

  assertNoForbiddenDefaultReferences(defaults);
  const referencedBytes = enforcePublicationBudgets({ diagnostics: publicationDiagnostics, files: defaults });

  const adblockFull = buildOptionalPack({
    packId: "adblock-full",
    ruleSets: compactedAdblock.ruleSets,
    upstream,
    singBoxBinaries,
  });
  const optionalPacks = new Map([["adblock-full", adblockFull.files]]);
  const optionalSelections = Object.fromEntries(Object.keys(CLIENT_PATHS).map((client) => [client, {
    ...(adblockFull.manifest.clients[client] === undefined ? {} : {
      "adblock-full": adblockFull.manifest.clients[client].manifestHash,
    }),
  }]));
  const clientManifests = addClientManifests(
    defaults,
    upstream,
    CLIENT_PATHS,
    "",
    optionalSelections,
    chinaIpAuditSha256,
  );
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

  return Object.freeze({
    defaults,
    optionalPacks,
    onexray: onexray.files,
    onexrayScripts: onexrayEdgeScripts(),
    diagnostics: Object.freeze({
      defaultRuleIds: Object.freeze([...compiled.defaultRuleSets.keys()]),
      compiler: compiled.diagnostics,
      compaction: compactedDefaults.diagnostics,
      referencedBytes,
      defaultManifest,
      routingPlanAudit,
      onexrayManifest: onexray.manifest,
      onexrayChannel: onexray.channel,
      optionalManifests: Object.freeze({ "adblock-full": adblockFull.manifest }),
    }),
  });
}
