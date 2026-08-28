import { readFileSync } from "node:fs";
import QRCode from "qrcode";

import { buildAnywhereRuleSnapshot, canonicalJson } from "./render-anywhere-rules.js";
import { renderEgernRuleSource } from "./render-egern-rules.js";
import { renderShadowrocketRuleSource } from "./render-shadowrocket-rules.js";
import { renderSingBoxRuleSource } from "./render-sing-box-rules.js";
import { renderClashRuleSource } from "./render-clash-rules.js";
import { compileLightweightRules } from "./compile-lightweight-rules.js";
import { compactRuleCidrs } from "./compact-rule-cidrs.js";
import { artifactBuffer, artifactByteLength, artifactSha256 } from "./artifact-content.js";
import { BLACKMATRIX7_BASELINE, catalogSha256 } from "./source-catalog.js";
import { buildRoutingPlanAudit } from "./routing-plan-audit.js";
import { validateV2flyDomainAudit } from "./v2fly-domain-audit.js";
import {
  buildPublicAuditDashboard,
  renderPublicAuditDashboard,
  validatePublicAuditDashboard,
} from "./public-audit-dashboard.js";
import {
  orderedRoutingPlan,
  MOBILE_RULE_SOURCE_IDS,
  RULE_BUDGETS,
  ruleClientCatalog,
} from "../../shared/rules/lightweight-policy.js";
import { sourcesForRegion } from "../../shared/rules/region-profiles.js";
import { SEMANTIC_INTENTS } from "../../shared/rules/semantic-intents.js";
import { RULE_KIND } from "../../shared/rules/model.js";
import { buildImportBatches, renderImportPage } from "../../clients/anywhere/src/build-import-page.js";
import { ANYWHERE_LIGHTWEIGHT_MIGRATION } from "../../clients/anywhere/src/shard-rules.js";
import { buildRegionGeoDataArtifacts } from "./render-region-geodata.js";
import { renderHappGeodata } from "./render-happ-geodata.js";
import { renderHappImportPage } from "../../clients/happ/src/build-import-page.js";
import { renderHappRoutingDeepLink, renderHappRoutingProfile } from "../../clients/happ/src/render-routing-profile.js";
import {
  activeClientIds,
  allClientIds,
  clientAdapter,
  lightweightRuleClientIds,
  publicDirectoryForClient,
} from "../../shared/release/client-catalog.js";
import { FRONTIER_CHANNELS } from "../../shared/release/frontier-manifest.js";

const CLIENT_PATHS = Object.freeze(Object.fromEntries(
  activeClientIds().map((client) => [client, publicDirectoryForClient(client)]),
));
const RULE_CLIENT_IDS = lightweightRuleClientIds();
const RULE_CLIENT_PATHS = Object.freeze(Object.fromEntries(
  RULE_CLIENT_IDS.map((client) => [client, CLIENT_PATHS[client]]),
));

const OPTIONAL_PACK_CLIENTS = Object.freeze({
  "adblock-full": Object.freeze(Object.fromEntries(
    Object.entries(RULE_CLIENT_PATHS),
  )),
});

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
  "v2box/scripts/substore-node-generator.js",
  "v2box/scripts/substore-config-generator.js",
  "clash/scripts/clash-node-generator.js",
  "clash/scripts/substore-node-generator.js",
  "clash/scripts/clash-profile-generator.js",
  "clash/scripts/substore-profile-generator.js",
  "happ/scripts/happ-config-generator.js",
  "happ/scripts/substore-config-generator.js",
  "happ/scripts/happ-routing-audit.js",
  "happ/scripts/substore-routing-audit.js",
]);

const V2BOX_SCRIPT_PATHS = Object.freeze([
  "v2box/scripts/substore-node-generator.js",
  "v2box/scripts/substore-config-generator.js",
]);
const CLASH_SCRIPT_PATHS = Object.freeze([
  "clash/scripts/clash-node-generator.js",
  "clash/scripts/substore-node-generator.js",
  "clash/scripts/clash-profile-generator.js",
  "clash/scripts/substore-profile-generator.js",
]);
const HAPP_SCRIPT_PATHS = Object.freeze([
  "happ/scripts/happ-config-generator.js",
  "happ/scripts/substore-config-generator.js",
  "happ/scripts/happ-routing-audit.js",
  "happ/scripts/substore-routing-audit.js",
]);
const NATIVE_POLICY_GENERATOR_PATHS = new Set([
  ...V2BOX_SCRIPT_PATHS,
  ...CLASH_SCRIPT_PATHS,
  ...HAPP_SCRIPT_PATHS,
]);
const REGION_GEO_DATA_REGIONS = Object.freeze(["cn", "global", "ru", "ir"]);

function v2boxPublicScripts() {
  return nativePublicScripts("v2box", V2BOX_SCRIPT_PATHS);
}

function clashPublicScripts() {
  return nativePublicScripts("clash", CLASH_SCRIPT_PATHS);
}

function happPublicScripts() {
  return nativePublicScripts("happ", HAPP_SCRIPT_PATHS);
}

function renderQrSvg(value) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const cells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (qr.modules.data[y * size + x]) cells.push(`M${x},${y}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="HAPP 导入二维码"><path fill="#000" d="${cells.join("")}"/></svg>`;
}

function nativePublicScripts(client, paths) {
  const files = new Map();
  for (const path of paths) {
    const filename = path.slice(`${client}/scripts/`.length);
    const content = readFileSync(new URL(`../../clients/${client}/dist/${filename}`, import.meta.url));
    if (!Buffer.isBuffer(content) || content.length === 0) throw new Error(`${client} public script is empty: ${path}`);
    files.set(path, content);
  }
  return files;
}

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

function anywhereLogicalRuleSets(compiledCatalog) {
  const sourceById = new Map(compiledCatalog.map((source) => [source.id, source]));
  const assigned = new Set();
  const logical = [];
  for (const intent of SEMANTIC_INTENTS) {
    const sourceIds = intent.sourceIds.filter((sourceId) => sourceById.has(sourceId));
    if (sourceIds.length === 0) continue;
    const sources = sourceIds.map((sourceId) => sourceById.get(sourceId));
    const routing = sources[0].routing;
    if (sources.some((source) => source.routing !== routing)) {
      throw new Error(`Anywhere semantic intent ${intent.id} mixes routing targets`);
    }
    logical.push(Object.freeze({
      id: intent.ruleId,
      sourceIds: Object.freeze(sourceIds),
      required: true,
      policy: intent.policy,
      defaultTarget: intent.defaultTarget,
      phase: intent.phase,
      dnsClass: intent.dnsClass,
      routing,
    }));
    for (const sourceId of sourceIds) assigned.add(sourceId);
  }
  if (sourceById.has("ChinaTLD") && !assigned.has("ChinaTLD")) {
    const domesticCoreIndex = logical.findIndex(({ id }) => id === "DomesticCore");
    if (domesticCoreIndex !== -1) {
      const domesticCore = logical[domesticCoreIndex];
      logical[domesticCoreIndex] = Object.freeze({
        ...domesticCore,
        sourceIds: Object.freeze([...domesticCore.sourceIds, "ChinaTLD"]),
      });
      assigned.add("ChinaTLD");
    }
  }
  for (const source of compiledCatalog) {
    if (assigned.has(source.id)) continue;
    logical.push(Object.freeze({
      id: source.id,
      sourceIds: Object.freeze([source.id]),
      required: true,
      policy: source.policy,
      defaultTarget: source.intendedTarget,
      phase: source.phase,
      dnsClass: source.dnsClass,
      routing: source.routing,
    }));
  }
  return Object.freeze(logical);
}

function addFiles(target, additions) {
  for (const [path, content] of additions) {
    if (target.has(path)) throw new Error(`Duplicate public artifact path: ${path}`);
    target.set(path, content);
  }
}

// The update pipeline supplies channel-rewritten copies of generated client
// bundles through `additionalFiles`.  Keep those staged bytes authoritative
// while still rejecting accidental collisions for every other artifact.
function addAdditionalFiles(target, additions) {
  const overridable = new Set([
    ...V2BOX_SCRIPT_PATHS,
    ...CLASH_SCRIPT_PATHS,
    ...HAPP_SCRIPT_PATHS,
  ]);
  for (const [path, content] of additions) {
    if (target.has(path) && !overridable.has(path)) {
      throw new Error(`Duplicate public artifact path: ${path}`);
    }
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
  channel = "current",
}) {
  const files = new Map();
  const clientSources = { shadowrocket: [], surge: [], egern: [], singbox: [], clash: [] };
  const compiledSnapshot = new Map();
  const compiledCatalog = [];

  for (const [id, compiled] of ruleSets) {
    const input = renderInput(compiled, upstream);
    const shadowrocket = renderShadowrocketRuleSource(input);
    const egern = renderEgernRuleSource(input);
    const singbox = renderSingBoxRuleSource(input);
    const clash = renderClashRuleSource(input);
    const prefix = pathPrefix ? `${pathPrefix}/` : "";
    files.set(`${prefix}shadowrocket/rules/${id}.list`, shadowrocket.content);
    files.set(`${prefix}surge/rules/${id}.list`, shadowrocket.content);
    files.set(`${prefix}egern/rules/${id}.yaml`, egern.content);
    files.set(`${prefix}clash/rules/${id}.yaml`, clash.content);
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
    clientSources.clash.push({ id, ...clash.counts });
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

  const anywhere = buildAnywhereRuleSnapshot({
    snapshot: compiledSnapshot,
    catalog: compiledCatalog,
    upstream,
    logicalRuleSets: anywhereLogicalRuleSets(compiledCatalog),
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
    { mode: anywhereMode, channel },
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
  if (!RULE_CLIENT_PATHS[client]) return [];
  const prefixes = client === "anywhere"
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
    const isSingBox = client === "singbox";
    const nonBinaryRecords = isSingBox
      ? records.filter(({ path }) => !/\.srs$/u.test(path))
      : records;
    const nonBinaryBytes = nonBinaryRecords.reduce((sum, { bytes }) => sum + bytes, 0);
    if (nonBinaryBytes > RULE_BUDGETS.defaultBytes) {
      throw budgetError("referenced default bytes", actual, RULE_BUDGETS.defaultBytes, client, records);
    }
    if (isSingBox) {
      const binaryRecords = records.filter(({ path }) => /(?:^|\/)sing-box\/(?:rule-sets|mobile-rule-sets)\/[^/]+\.srs$/u.test(path));
      const binaryTotal = binaryRecords.reduce((sum, { bytes }) => sum + bytes, 0);
      for (const record of binaryRecords) {
        if (record.bytes > RULE_BUDGETS.singBoxRuleSetBytes) {
          throw budgetError("sing-box rule-set bytes", record.bytes, RULE_BUDGETS.singBoxRuleSetBytes, client, [record]);
        }
      }
      if (binaryTotal > RULE_BUDGETS.singBoxTotalRuleSetBytes) {
        throw budgetError("sing-box total rule-set bytes", binaryTotal, RULE_BUDGETS.singBoxTotalRuleSetBytes, client, binaryRecords);
      }
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
  sharedAssets = null,
) {
  if (chinaIpAuditSha256 !== null && !/^[0-9a-f]{64}$/u.test(chinaIpAuditSha256)) {
    throw new TypeError("ChinaIP audit digest is invalid");
  }
  const manifests = {};
  for (const [client, directory] of Object.entries(clientPaths)) {
    const prefix = basePrefix ? `${basePrefix}/${directory}` : directory;
    const records = fileRecords(new Map([...files].filter(([path]) => path.startsWith(`${prefix}/`))));
    // Direct unit-level rule builds may intentionally omit native-generator
    // statics; the full update-rules path supplies them before validating the
    // publication. Existing rule clients must always have a non-empty tree.
    if (records.length === 0) {
      throw new Error(`Client ${client} has no publication files`);
    }
    if (records.length === 0) continue;
    const base = {
      schemaVersion: 1,
      client,
      generatedAt: upstream.committedAt,
      ...(optionalSelections === null ? {} : { optionalPacks: optionalSelections[client] ?? {} }),
      ...(chinaIpAuditSha256 === null ? {} : { chinaIpAuditSha256 }),
      ...(sharedAssets?.[client] ? { sharedAssets: sharedAssets[client] } : {}),
      files: records,
    };
    const manifestHash = artifactSha256(canonicalJson(base));
    const manifest = Object.freeze({ ...base, manifestHash });
    files.set(`${prefix}/client-manifest.json`, canonicalJson(manifest));
    manifests[client] = manifest;
  }
  return Object.freeze(manifests);
}

function unifiedSnapshots(ruleSets, externalSnapshots, upstream) {
  if (!(ruleSets instanceof Map)) throw new TypeError("Compiled rule sets are required");
  const baseline = new Map();
  for (const [id, ruleSet] of ruleSets) {
    if (!ruleSet || !Array.isArray(ruleSet.entries)) throw new TypeError(`Compiled rule set ${id} is malformed`);
    baseline.set(id, {
      sourceId: id,
      entries: ruleSet.entries,
      provenance: {
        sourceId: id,
        ...(upstream?.repository ? { repository: upstream.repository } : {}),
        ...(upstream?.branch ? { branch: upstream.branch } : {}),
        ...(upstream?.commit ? { commit: upstream.commit } : {}),
        ...(upstream?.committedAt ? { committedAt: upstream.committedAt } : {}),
        ...(upstream?.license ? { license: upstream.license } : {}),
      },
    });
  }
  if (externalSnapshots === null || externalSnapshots === undefined) return baseline;
  if (!(externalSnapshots instanceof Map)) throw new TypeError("External rule snapshots must be a Map");
  const unified = new Map(baseline);
  for (const [sourceId, value] of externalSnapshots) {
    if (unified.has(sourceId)) throw new Error(`Duplicate unified rule snapshot: ${sourceId}`);
    if (!value || !Array.isArray(value.entries)) throw new TypeError(`External rule snapshot ${sourceId} must contain parsed entries`);
    unified.set(sourceId, value);
  }
  return unified;
}

function selectedGeoDataRegions(regions) {
  if (regions === null || regions === undefined) return REGION_GEO_DATA_REGIONS;
  if (!Array.isArray(regions) || regions.length === 0
    || regions.some((region) => !REGION_GEO_DATA_REGIONS.includes(region))
    || new Set(regions).size !== regions.length) {
    throw new TypeError("GeoData publication regions are invalid");
  }
  return Object.freeze([...regions]);
}

function sharedGeoDataArtifacts({ ruleSets, externalSnapshots, upstream, regions, channel }) {
  const unified = unifiedSnapshots(ruleSets, externalSnapshots, upstream);
  const provenanceBySource = new Map([...unified.values()]
    .map((value) => [value.sourceId, value.provenance])
    .filter(([sourceId, provenance]) => sourceId && provenance));
  const files = new Map();
  const manifests = {};
  for (const region of selectedGeoDataRegions(regions)) {
    // GeoData is a category projection, not a second routing decision. The
    // inputs are already compiled and normalized, so selecting them directly
    // avoids re-running policy precedence (and preserves equal-name entries
    // that belong to different clients or source categories).
    const selected = new Set(sourcesForRegion(region));
    const selectedRuleSets = new Map([...unified]
      .filter(([sourceId]) => selected.has(sourceId))
      .map(([sourceId, value]) => [sourceId, {
        id: sourceId,
        sources: [sourceId],
        entries: value.entries,
      }]));
    const merged = {
      ruleSets: selectedRuleSets,
      provenance: [...provenanceBySource]
        .filter(([sourceId]) => selected.has(sourceId))
        .map(([, provenance]) => provenance),
      diagnostics: {
        sourceCount: selectedRuleSets.size,
        matcherCount: [...selectedRuleSets.values()]
          .reduce((total, value) => total + value.entries.length, 0),
      },
    };
    const rendered = buildRegionGeoDataArtifacts({
      merged,
      region,
      channel,
      publicBase: `https://juan-nikola.github.io/apple-proxy-profiles/${channel}/geodata`,
    });
    const prefix = `geodata/${region}`;
    files.set(`${prefix}/${rendered.manifest.names.domain}.dat`, artifactBuffer(rendered.geosite));
    files.set(`${prefix}/${rendered.manifest.names.ip}.dat`, artifactBuffer(rendered.geoip));
    files.set(`${prefix}/manifest.json`, artifactBuffer(canonicalJson(rendered.manifest)));
    manifests[region] = rendered.manifest;
  }
  return Object.freeze({
    files,
    manifests: Object.freeze(manifests),
    records: Object.freeze(fileRecords(files)),
  });
}

export function assertNoForbiddenDefaultReferences(files) {
  if (!(files instanceof Map)) throw new TypeError("Default publication files must be a Map");
  for (const [path, content] of files) {
    const forbiddenPath = FORBIDDEN_DEFAULT_RULE_IDS.find((id) => path.includes(id));
    if (forbiddenPath) throw new Error(`Forbidden default rule path ${forbiddenPath} in ${path}`);
    if (NON_ROUTING_NOTICE_PATHS.has(path)) continue;
    // Native policy bundles contain rule IDs as executable mapping input; they
    // do not publish those optional rule files into the default tree.
    if (NATIVE_POLICY_GENERATOR_PATHS.has(path)) continue;
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

function buildOptionalPack({ packId, ruleSets, upstream, singBoxBinaries = null, channel = "current" }) {
  const pathPrefix = `optional/${packId}`;
  const rendered = renderRuleSetMap({
    ruleSets,
    upstream,
    singBoxBinaries,
    pathPrefix,
    anywherePrefix: `${pathPrefix}/anywhere`,
    anywhereUrlPrefix: "anywhere",
    anywherePublicBase: `https://juan-nikola.github.io/apple-proxy-profiles/optional/${packId}/${channel}`,
    anywhereMode: "adblock-full",
    channel,
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
  externalSnapshots = null,
  regions = null,
  upstream = BLACKMATRIX7_BASELINE,
  channel = "current",
  additionalFiles = null,
  singBoxBinaries = null,
  chinaIpAudit = null,
  v2flyDomainAudit = null,
}) {
  if (!(snapshot instanceof Map)) throw new TypeError("Complete rule snapshot is required");
  if (!FRONTIER_CHANNELS.includes(channel)) throw new TypeError("Publication channel is unsupported");
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
  const compiled = compileLightweightRules({ snapshots: snapshot, externalSnapshots });
  const compactedDefaults = compactRuleSetMap(compiled.defaultRuleSets);
  const compactedBaselineDefaults = compactRuleSetMap(compiled.baselineRuleSets ?? compiled.defaultRuleSets);
  const compactedAdblock = compactRuleSetMap(compiled.optionalPacks.adblockFull);
  const publicationDiagnostics = Object.freeze({
    ...compiled.diagnostics,
    rawDefaultEntries: compiled.diagnostics.defaultEntries,
    defaultEntries: [...compactedDefaults.ruleSets.values()]
      .reduce((sum, ruleSet) => sum + ruleSet.entries.length, 0),
  });
  const compactedMobile = compactRuleSetMap(compiled.mobileRuleSets);
  const sharedGeoData = sharedGeoDataArtifacts({
    ruleSets: compactedBaselineDefaults.ruleSets,
    externalSnapshots,
    upstream,
    regions,
    channel,
  });
  const rendered = renderRuleSetMap({
    ruleSets: compactedDefaults.ruleSets,
    mobileRuleSets: compactedMobile.ruleSets,
    upstream,
    singBoxBinaries,
    anywherePublicBase: `https://juan-nikola.github.io/apple-proxy-profiles/${channel}`,
    channel,
  });
  const defaults = rendered.files;
  addFiles(defaults, v2boxPublicScripts());
  addFiles(defaults, clashPublicScripts());
  addFiles(defaults, happPublicScripts());
  addFiles(defaults, sharedGeoData.files);
  let chinaIpAuditSha256 = null;

  const additions = typeof additionalFiles === "function"
    ? additionalFiles(rendered.anywhere.manifest)
    : additionalFiles;
  if (additions !== null) {
    if (!(additions instanceof Map)) throw new TypeError("Additional public files must be a Map");
    addAdditionalFiles(defaults, additions);
  }
  if (chinaIpAudit !== null) {
    if (defaults.has("audit/china-ip-drift.json")) {
      throw new Error("Duplicate public artifact path: audit/china-ip-drift.json");
    }
    artifactBuffer(chinaIpAudit);
    defaults.set("audit/china-ip-drift.json", chinaIpAudit);
    chinaIpAuditSha256 = artifactSha256(chinaIpAudit);
  }
  if (v2flyDomainAudit !== null) {
    if (defaults.has("audit/v2fly-domain-drift.json")) {
      throw new Error("Duplicate public artifact path: audit/v2fly-domain-drift.json");
    }
    const v2flyBytes = artifactBuffer(v2flyDomainAudit);
    let report;
    try {
      report = JSON.parse(v2flyBytes.toString("utf8"));
    } catch {
      throw new Error("v2fly audit report is invalid JSON");
    }
    validateV2flyDomainAudit(report);
    if (!v2flyBytes.equals(artifactBuffer(canonicalJson(report)))) {
      throw new Error("v2fly audit report bytes are not canonical");
    }
    defaults.set("audit/v2fly-domain-drift.json", v2flyBytes);
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

  const happGeoData = renderHappGeodata(compactedBaselineDefaults.ruleSets);
  addFiles(defaults, happGeoData.files);
  const happGeoManifestBase = {
    schemaVersion: 2,
    client: "happ",
    generatedAt: upstream.committedAt,
    geodata: happGeoData.counts,
    files: fileRecords(happGeoData.files),
  };
  const happGeoManifest = Object.freeze({
    ...happGeoManifestBase,
    manifestHash: artifactSha256(canonicalJson(happGeoManifestBase)),
  });
  defaults.set("happ/manifest.json", canonicalJson(happGeoManifest));
  const happProfile = renderHappRoutingProfile({
    baseUrl: `https://juan-nikola.github.io/apple-proxy-profiles/${channel}`,
    generatedAt: upstream.committedAt,
  });
  const happDeepLink = renderHappRoutingDeepLink(happProfile);
  defaults.set("happ/index.html", renderHappImportPage({
    profile: happProfile,
    deepLink: happDeepLink,
    qrSvg: renderQrSvg(happDeepLink),
  }));

  const adblockFull = buildOptionalPack({
    packId: "adblock-full",
    ruleSets: compactedAdblock.ruleSets,
    upstream,
    singBoxBinaries,
    channel,
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
    {
      v2box: sharedGeoData.records,
    },
  );
  const parseAudit = (content) => {
    if (content === null) return {};
    try { return JSON.parse(artifactBuffer(content).toString("utf8")); } catch { throw new Error("Audit evidence is invalid JSON"); }
  };
  const publicAuditDashboard = buildPublicAuditDashboard({
    generatedAt: upstream.committedAt,
    upstream: {
      repository: upstream.owner ?? "blackmatrix7",
      commit: upstream.commit,
      committedAt: upstream.committedAt,
      sha256: catalogSha256(),
    },
    chinaIpAudit: parseAudit(chinaIpAudit),
    v2flyDomainAudit: parseAudit(v2flyDomainAudit),
    routingPlanAudit,
    clientCatalog: allClientIds().map((client) => clientAdapter(client)),
    releaseState: {
      channels: {
        current: {
          closure: true,
          clients: Object.fromEntries(Object.entries(clientManifests).map(([client, value]) => [client, {
            manifestHash: value.manifestHash,
            closure: true,
          }])),
        },
      },
    },
  });
  validatePublicAuditDashboard(publicAuditDashboard);
  defaults.set("audit/dashboard.json", artifactBuffer(canonicalJson(publicAuditDashboard)));
  defaults.set("audit/dashboard.html", renderPublicAuditDashboard(publicAuditDashboard));
  const records = fileRecords(defaults);
  const baseManifest = {
    schemaVersion: 2,
    generatedAt: upstream.committedAt,
    upstream: provenance(upstream),
    catalogSha256: catalogSha256(),
    clients: Object.fromEntries(Object.keys(clientManifests).map((client) => [client, {
      manifestHash: clientManifests[client].manifestHash,
      referencedDefaultBytes: referencedBytes[client],
    }])),
    clientStates: Object.fromEntries(allClientIds().map((client) => {
      const adapter = clientAdapter(client);
      return [client, {
        state: adapter.state,
        adapterSchema: adapter.adapterSchema,
        publicDirectory: adapter.publicDirectory,
      }];
    })),
    diagnostics: {
      defaultEntries: publicationDiagnostics.defaultEntries,
      rawDefaultEntries: publicationDiagnostics.rawDefaultEntries,
      domesticCoreEntries: publicationDiagnostics.domesticCoreEntries,
      omittedByKind: publicationDiagnostics.omittedByKind,
      external: compiled.diagnostics.external,
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
    diagnostics: Object.freeze({
      defaultRuleIds: Object.freeze([...compiled.defaultRuleSets.keys()]),
      compiler: compiled.diagnostics,
      compaction: compactedDefaults.diagnostics,
      referencedBytes,
      defaultManifest,
      routingPlanAudit,
      sharedGeoData: sharedGeoData.manifests,
      publicAuditDashboard,
      optionalManifests: Object.freeze({ "adblock-full": adblockFull.manifest }),
    }),
  });
}
