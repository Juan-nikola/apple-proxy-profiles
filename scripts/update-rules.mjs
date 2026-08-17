import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertNoForbiddenDefaultReferences,
  buildClientArtifacts,
} from "../automation/src/build-artifacts.js";
import { artifactBuffer, artifactSha256 } from "../automation/src/artifact-content.js";
import { canonicalJson } from "../automation/src/render-anywhere-rules.js";
import {
  promoteClientRelease as promoteClientReleaseImpl,
  publishEdgeRelease,
  snapshotMatches,
  validateClientPublication,
  validateOptionalPublication,
} from "../automation/src/build-site.js";
import { fetchSnapshot } from "../automation/src/fetch-snapshot.js";
import { parseSurgeRules } from "../automation/src/parse-surge.js";
import { refreshCurrentManifest } from "../automation/src/refresh-current.js";
import { resolveUpstreamCommit } from "../automation/src/resolve-upstream.js";
import {
  BLACKMATRIX7_BASELINE,
  FETCH_SOURCE_CATALOG,
} from "../automation/src/source-catalog.js";
import {
  DEFAULT_COMPILED_ROOT,
  DEFAULT_STAGE_ROOT,
  loadCompiledSingBoxRules,
  readRuleStageManifest,
} from "./stage-rule-artifacts.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultPublicDirectory = join(repositoryRoot, "public");
const PROMOTION_CLIENTS = new Set(["singbox", "surge", "shadowrocket", "egern", "anywhere"]);
const OPTIONAL_CLIENTS = new Set(["singbox", "surge", "shadowrocket", "egern", "anywhere"]);
const INDEPENDENT_CLIENT_PATH = /^(?:anywhere|egern|shadowrocket|sing-box|surge)\//u;
const LEGACY_CURRENT_EXTRA_FILES = Object.freeze([
  /^frontier-manifest\.json$/u,
  /^surge\/(?:macos|iphone|ipad)\/manifest\.json$/u,
  /^singbox\/(?:macos|iphone|ipad|android)\/manifest\.json$/u,
]);

export function parseUpdateRulesArguments(args) {
  if (JSON.stringify(args) === JSON.stringify(["--channel", "edge"])) {
    return Object.freeze({ operation: "build-edge" });
  }
  if (JSON.stringify(args) === JSON.stringify(["--check", "--channel", "current"])) {
    return Object.freeze({ operation: "check-current" });
  }
  if (JSON.stringify(args) === JSON.stringify(["--refresh-current"])) {
    return Object.freeze({ operation: "refresh-current" });
  }
  if (args.length === 3 && args[0] === "--promote" && PROMOTION_CLIENTS.has(args[1])
    && /^[0-9a-f]{64}$/u.test(args[2])) {
    return Object.freeze({ operation: "promote", client: args[1], manifestHash: args[2] });
  }
  throw new Error("Invalid update-rules arguments; use --channel edge, --check --channel current, --refresh-current, or --promote <client> <manifest-hash>");
}

export async function promoteClientRelease(options) {
  return promoteClientReleaseImpl(options);
}

export function chinaIpAuditPrimary(snapshot, upstream) {
  const chinaIp = snapshot instanceof Map ? snapshot.get("ChinaIPs") : null;
  const entries = Array.isArray(chinaIp?.entries)
    ? chinaIp.entries
    : chinaIp?.text && chinaIp?.source
      ? parseSurgeRules(chinaIp.text, { ...chinaIp.source, minEntries: 0 }).entries
      : null;
  if (!entries || !/^[0-9a-f]{64}$/u.test(chinaIp?.sourceSha256)
    || !upstream || !/^[0-9a-f]{40}$/u.test(upstream.commit)) {
    throw new TypeError("Production ChinaIP snapshot is invalid for audit");
  }
  return Object.freeze({
    entries,
    source: Object.freeze({
      repository: upstream.repository,
      commit: upstream.commit,
      committedAt: upstream.committedAt,
      sha256: chinaIp.sourceSha256,
    }),
  });
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function optionalTreeFiles(packId, files) {
  const prefix = `optional/${packId}/`;
  return new Map([...files].map(([path, content]) => {
    if (!path.startsWith(prefix)) throw new Error(`Optional publication ${packId} escaped its tree`);
    return [path.slice(prefix.length), content];
  }));
}

function clientTreeFiles(directory, files) {
  const prefix = `${directory}/`;
  return new Map([...files]
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, content]) => [path.slice(prefix.length), content]));
}

async function relativeFiles(root, current = "") {
  const found = [];
  for (const entry of await readdir(join(root, current), { withFileTypes: true })) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...await relativeFiles(root, relative));
    else if (entry.isFile()) found.push(relative);
    else throw new Error("Tracked publication contains a non-regular entry");
  }
  return found;
}

async function relativeTreeEntries(root, current = "") {
  const found = [];
  for (const entry of await readdir(join(root, current), { withFileTypes: true })) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      found.push(`${relative}/`);
      found.push(...await relativeTreeEntries(root, relative));
    } else if (entry.isFile()) {
      found.push(relative);
    } else {
      throw new Error("Tracked publication contains a non-regular entry");
    }
  }
  return found;
}

async function readPublicationTree(directory, prefix = "") {
  const files = new Map();
  for (const path of await relativeFiles(directory)) {
    files.set(prefix ? `${prefix}/${path}` : path, await readFile(join(directory, path)));
  }
  return files;
}

function treeEntriesForFiles(paths) {
  const entries = new Set(paths);
  for (const path of paths) {
    const segments = path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      entries.add(`${segments.slice(0, index).join("/")}/`);
    }
  }
  return [...entries].sort();
}

function safeTrackedPath(path) {
  return typeof path === "string"
    && path.length > 0
    && !path.startsWith("/")
    && !path.includes("\\")
    && !path.split("/").includes("..");
}

function sameUpstream(actual, expected) {
  return actual && expected
    && actual.repository === expected.repository
    && actual.branch === expected.branch
    && actual.commit === expected.commit
    && actual.committedAt === expected.committedAt
    && actual.license === expected.license;
}

function rootManifestMatchesWithIndependentAudit(content, expectedManifest) {
  try {
    const bytes = artifactBuffer(content);
    const actual = JSON.parse(bytes.toString("utf8"));
    const { manifestHash, ...actualBase } = actual;
    if (!/^[0-9a-f]{64}$/u.test(manifestHash)
      || artifactSha256(canonicalJson(actualBase)) !== manifestHash
      || !bytes.equals(artifactBuffer(canonicalJson(actual)))) return false;
    const projection = (manifest) => {
      const { manifestHash: ignored, ...base } = manifest;
      return {
        ...base,
        clients: base.clients && Object.fromEntries(
          Object.entries(base.clients).filter(([client]) => !PROMOTION_CLIENTS.has(client)),
        ),
        files: Array.isArray(base.files)
          ? base.files.filter(({ path }) => (
            path !== "audit/china-ip-drift.json" && !INDEPENDENT_CLIENT_PATH.test(path)
          ))
          : base.files,
      };
    };
    return canonicalJson(projection(actual)) === canonicalJson(projection(expectedManifest));
  } catch {
    return false;
  }
}

async function verifyLegacyCurrent(directory, expectedUpstream) {
  try {
    const manifestBytes = await readFile(join(directory, "manifest.json"));
    const manifest = JSON.parse(manifestBytes.toString("utf8"));
    if (manifest.schemaVersion !== 1 || manifest.generatedAt !== manifest.upstream?.committedAt
      || !sameUpstream(manifest.upstream, expectedUpstream)
      || !Array.isArray(manifest.files) || manifest.files.length === 0) return false;
    const { manifestHash, ...baseManifest } = manifest;
    if (!/^[0-9a-f]{64}$/u.test(manifestHash)
      || artifactSha256(canonicalJson(baseManifest)) !== manifestHash
      || !manifestBytes.equals(Buffer.from(canonicalJson(manifest), "utf8"))) return false;

    const expectedFiles = new Set(["manifest.json"]);
    for (const record of manifest.files) {
      if (!record || !safeTrackedPath(record.path) || expectedFiles.has(record.path)
        || !Number.isSafeInteger(record.bytes) || record.bytes < 0
        || !/^[0-9a-f]{64}$/u.test(record.sha256)) return false;
      const content = await readFile(join(directory, record.path));
      if (content.length !== record.bytes || artifactSha256(content) !== record.sha256) return false;
      expectedFiles.add(record.path);
    }

    const actualFiles = await relativeFiles(directory);
    for (const path of actualFiles) {
      if (!expectedFiles.has(path) && !LEGACY_CURRENT_EXTRA_FILES.some((pattern) => pattern.test(path))) return false;
    }
    for (const path of expectedFiles) if (!actualFiles.includes(path)) return false;
    return JSON.stringify((await relativeTreeEntries(directory)).sort())
      === JSON.stringify(treeEntriesForFiles(actualFiles).sort());
  } catch {
    return false;
  }
}

async function selectedClientManifest({ directory, basePrefix = "", client, clientDirectory, expectedHash = null }) {
  if ((expectedHash !== null && !/^[0-9a-f]{64}$/u.test(expectedHash)) || !await pathExists(directory)) return null;
  try {
    const treePrefix = basePrefix ? `${basePrefix}/${clientDirectory}` : clientDirectory;
    const files = await readPublicationTree(directory, treePrefix);
    const manifest = validateClientPublication({
      files,
      client,
      directory: clientDirectory,
      basePrefix,
      expectedHash,
    });
    const recordPrefix = `${treePrefix}/`;
    const expectedFiles = ["client-manifest.json", ...manifest.files.map(({ path }) => {
      if (!path.startsWith(recordPrefix)) throw new Error("Client manifest path escaped its selected tree");
      return path.slice(recordPrefix.length);
    })];
    if (JSON.stringify((await relativeTreeEntries(directory)).sort())
      !== JSON.stringify(treeEntriesForFiles(expectedFiles))) return null;
    return manifest;
  } catch {
    return null;
  }
}

function optionalSelectionProjection(selections) {
  if (!selections || typeof selections !== "object" || Array.isArray(selections)) return null;
  const projection = {};
  for (const [packId, hash] of Object.entries(selections).sort(([left], [right]) => left.localeCompare(right))) {
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(packId) || !/^[0-9a-f]{64}$/u.test(hash)) return null;
    projection[packId] = hash;
  }
  return projection;
}

function rolloutOptionalProjection(optionalPacks, client) {
  const projection = {};
  for (const [packId, selections] of Object.entries(optionalPacks).sort(([left], [right]) => left.localeCompare(right))) {
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(packId)
      || !selections || typeof selections !== "object" || Array.isArray(selections)) return null;
    if (JSON.stringify(Object.keys(selections).sort())
      !== JSON.stringify([...OPTIONAL_CLIENTS].sort())) return null;
    const hash = selections[client];
    if (hash === null || hash === undefined) continue;
    if (!/^[0-9a-f]{64}$/u.test(hash)) return null;
    projection[packId] = hash;
  }
  return projection;
}

export function selectDefaultStaticFiles(files) {
  if (!(files instanceof Map)) throw new TypeError("Static publication files must be a Map");
  const selected = new Map(files);
  const legacyProfileArtifacts = new Set([
    "shadowrocket/scripts/shadowrocket-profile-generator.js",
    "shadowrocket/scripts/substore-profile-generator.js",
    "shadowrocket/examples/shadowrocket-macos.conf",
    "shadowrocket/examples/shadowrocket-iphone.conf",
    "shadowrocket/examples/shadowrocket-ipad.conf",
    "egern/scripts/egern-profile-generator.js",
    "egern/scripts/substore-profile-generator.js",
    "egern/examples/egern-macos.yaml",
    "egern/examples/egern-iphone.yaml",
    "egern/examples/egern-ipad.yaml",
    "surge/scripts/surge-profile-generator.js",
    "surge/scripts/substore-profile-generator.js",
    "surge/examples/surge-macos.conf",
    "surge/examples/surge-iphone.conf",
    "surge/examples/surge-ipad.conf",
    "sing-box/scripts/sing-box-config-generator.js",
    "sing-box/scripts/substore-config-generator.js",
    "sing-box/examples/sing-box-macos.json",
    "sing-box/examples/sing-box-iphone.json",
    "sing-box/examples/sing-box-ipad.json",
    "sing-box/examples/sing-box-android.json",
  ]);
  for (const [path, content] of [...selected]) {
    try {
      assertNoForbiddenDefaultReferences(new Map([[path, content]]));
    } catch (error) {
      if (!legacyProfileArtifacts.has(path)) throw error;
      selected.delete(path);
    }
  }
  assertNoForbiddenDefaultReferences(selected);
  return selected;
}

export async function verifyTrackedPublications({ publicDirectory, defaults, optionalPacks, diagnostics = null }) {
  let rollout = null;
  try {
    rollout = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") return false;
  }
  if (rollout === null) {
    const currentDirectory = join(publicDirectory, "current");
    let trackedManifest;
    try {
      trackedManifest = JSON.parse(await readFile(join(currentDirectory, "manifest.json"), "utf8"));
    } catch {
      return false;
    }
    if (trackedManifest.schemaVersion === 1) {
      if (!await verifyLegacyCurrent(currentDirectory, diagnostics?.defaultManifest?.upstream)) return false;
    } else if (!await snapshotMatches(currentDirectory, defaults)) return false;
    for (const [packId, files] of optionalPacks) {
      validateOptionalPublication({ packId, files });
      const stableDirectory = join(publicDirectory, "optional", packId);
      if (!await pathExists(stableDirectory)) continue;
      if (!await snapshotMatches(stableDirectory, optionalTreeFiles(packId, files))) return false;
    }
    return true;
  }
  if (!rollout || rollout.schemaVersion !== 2 || typeof rollout.clients !== "object"
    || typeof rollout.optionalPacks !== "object") return false;
  const expectedRolloutClients = [...PROMOTION_CLIENTS].sort();
  if (JSON.stringify(Object.keys(rollout.clients).sort()) !== JSON.stringify(expectedRolloutClients)
    || (rollout.previous !== undefined
      && JSON.stringify(Object.keys(rollout.previous).sort()) !== JSON.stringify(expectedRolloutClients))) {
    return false;
  }

  const currentDirectory = join(publicDirectory, "current");
  let expectedRootManifest = diagnostics?.defaultManifest ?? null;
  const clientDirectories = {
    singbox: "sing-box",
    surge: "surge",
    shadowrocket: "shadowrocket",
    egern: "egern",
    anywhere: "anywhere",
  };
  const clientPrefixes = new Set(Object.values(clientDirectories).map((directory) => `${directory}/`));
  const toleratedExtras = (path) => LEGACY_CURRENT_EXTRA_FILES.some((pattern) => pattern.test(path));
  const expectedRootPaths = [...defaults.keys()]
    .filter((path) => ![...clientPrefixes].some((prefix) => path.startsWith(prefix)))
    .sort();
  const expectedRootEntries = new Set(expectedRootPaths);
  for (const path of expectedRootPaths) {
    const segments = path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      expectedRootEntries.add(`${segments.slice(0, index).join("/")}/`);
    }
  }
  const actualRootEntries = (await relativeTreeEntries(currentDirectory))
    .filter((path) => ![...clientPrefixes].some((prefix) => path.startsWith(prefix)))
    .filter((path) => !toleratedExtras(path))
    .filter((path) => !path.startsWith("singbox/"))
    .sort();
  if (JSON.stringify(actualRootEntries) !== JSON.stringify([...expectedRootEntries].sort())) return false;
  for (const [path, content] of defaults) {
    if ([...clientPrefixes].some((prefix) => path.startsWith(prefix))) continue;
    try {
      const tracked = await readFile(join(currentDirectory, path));
      if (path === "manifest.json") {
        if (!rootManifestMatchesWithIndependentAudit(tracked, expectedRootManifest)) return false;
      } else if (!tracked.equals(artifactBuffer(content))) return false;
    } catch {
      return false;
    }
  }
  const currentClientManifests = new Map();
  for (const [client, clientDirectory] of Object.entries(clientDirectories)) {
    const selectedHash = rollout.clients[client];
    const currentClientDirectory = join(currentDirectory, clientDirectory);
    if ((selectedHash === null || selectedHash === undefined) && !await pathExists(currentClientDirectory)) {
      continue;
    }
    if (selectedHash === null || selectedHash === undefined) {
      if (!await snapshotMatches(
        currentClientDirectory,
        clientTreeFiles(clientDirectory, defaults),
      )) return false;
    }
    const currentManifest = await selectedClientManifest({
      directory: join(currentDirectory, clientDirectory),
      client,
      clientDirectory,
      expectedHash: selectedHash ?? null,
    });
    if (currentManifest === null) return false;
    currentClientManifests.set(client, currentManifest);
  }

  for (const [packId, files] of optionalPacks) {
    validateOptionalPublication({ packId, files });
  }
  for (const [client, currentManifest] of currentClientManifests) {
    const rolloutProjection = rolloutOptionalProjection(rollout.optionalPacks, client);
    if (rolloutProjection === null) return false;
    const manifestProjection = optionalSelectionProjection(currentManifest.optionalPacks);
    if (manifestProjection === null
      || JSON.stringify(manifestProjection) !== JSON.stringify(rolloutProjection)) return false;
  }
  for (const [packId, selections] of Object.entries(rollout.optionalPacks)) {
    if (!selections || typeof selections !== "object" || Array.isArray(selections)) return false;
    for (const [client, clientDirectory] of Object.entries(clientDirectories)) {
      const selectedHash = selections[client];
      if (selectedHash === null || selectedHash === undefined) continue;
      const basePrefix = `optional/${packId}`;
      if (await selectedClientManifest({
        directory: join(publicDirectory, "optional", packId, "current", clientDirectory),
        basePrefix,
        client,
        clientDirectory,
        expectedHash: selectedHash,
      }) === null) return false;
    }
  }
  return true;
}

async function loadText(path) {
  return readFile(join(repositoryRoot, path), "utf8");
}

async function staticFiles() {
  const paths = [
    ["shadowrocket/scripts/shadowrocket-node-subscription.js", "clients/shadowrocket/dist/shadowrocket-node-subscription.js"],
    ["shadowrocket/scripts/shadowrocket-node-operator.js", "clients/shadowrocket/dist/shadowrocket-node-operator.js"],
    ["shadowrocket/scripts/shadowrocket-profile-generator.js", "clients/shadowrocket/dist/shadowrocket-profile-generator.js"],
    ["shadowrocket/scripts/substore-node-operator.js", "clients/shadowrocket/dist/substore-node-operator.js"],
    ["shadowrocket/scripts/substore-profile-generator.js", "clients/shadowrocket/dist/substore-profile-generator.js"],
    ["shadowrocket/examples/shadowrocket-macos.conf", "clients/shadowrocket/examples/shadowrocket-macos.conf"],
    ["shadowrocket/examples/shadowrocket-iphone.conf", "clients/shadowrocket/examples/shadowrocket-iphone.conf"],
    ["shadowrocket/examples/shadowrocket-ipad.conf", "clients/shadowrocket/examples/shadowrocket-ipad.conf"],
    ["egern/scripts/egern-node-generator.js", "clients/egern/dist/egern-node-generator.js"],
    ["egern/scripts/egern-profile-generator.js", "clients/egern/dist/egern-profile-generator.js"],
    ["egern/scripts/substore-node-generator.js", "clients/egern/dist/substore-node-generator.js"],
    ["egern/scripts/substore-profile-generator.js", "clients/egern/dist/substore-profile-generator.js"],
    ["egern/examples/egern-macos.yaml", "clients/egern/examples/egern-macos.yaml"],
    ["egern/examples/egern-iphone.yaml", "clients/egern/examples/egern-iphone.yaml"],
    ["egern/examples/egern-ipad.yaml", "clients/egern/examples/egern-ipad.yaml"],
    ["anywhere/scripts/anywhere-node-generator.js", "clients/anywhere/dist/anywhere-node-generator.js"],
    ["anywhere/scripts/substore-node-generator.js", "clients/anywhere/dist/substore-node-generator.js"],
    ["surge/scripts/surge-profile-generator.js", "clients/surge/dist/surge-profile-generator.js"],
    ["surge/scripts/substore-profile-generator.js", "clients/surge/dist/substore-profile-generator.js"],
    ["surge/scripts/surge-nodes-generator.js", "clients/surge/dist/surge-nodes-generator.js"],
    ["surge/scripts/substore-nodes-generator.js", "clients/surge/dist/substore-nodes-generator.js"],
    ["surge/examples/surge-macos.conf", "clients/surge/examples/surge-macos.conf"],
    ["surge/examples/surge-iphone.conf", "clients/surge/examples/surge-iphone.conf"],
    ["surge/examples/surge-ipad.conf", "clients/surge/examples/surge-ipad.conf"],
    ["sing-box/scripts/sing-box-config-generator.js", "clients/sing-box/dist/sing-box-config-generator.js"],
    ["sing-box/scripts/substore-config-generator.js", "clients/sing-box/dist/substore-config-generator.js"],
     ...["macos", "iphone", "ipad", "android"].flatMap((platform) => [
      [`sing-box/examples/sing-box-${platform}.json`, `clients/sing-box/examples/sing-box-${platform}.json`],
      [`sing-box/examples/sing-box-${platform}-diagnostic.json`, `clients/sing-box/examples/sing-box-${platform}-diagnostic.json`],
    ]),
    ["LICENSE", "LICENSE"],
    ["THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md"],
  ];
  const loaded = new Map(await Promise.all(paths.map(async ([publicPath, localPath]) => [publicPath, await loadText(localPath)])));
  const rawRoot = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket";
  for (const bundlePath of [
    "shadowrocket/scripts/shadowrocket-profile-generator.js",
    "shadowrocket/scripts/substore-profile-generator.js",
    "egern/scripts/egern-profile-generator.js",
    "egern/scripts/substore-profile-generator.js",
  ]) {
    const bundle = loaded.get(bundlePath);
    if (bundle.includes(rawRoot)
      || !bundle.includes("https://juan-nikola.github.io/apple-proxy-profiles")
      || !bundle.includes("${PUBLIC_RULE_ROOT}/${channel}")) {
      throw new Error(`Public bundle URL closure failed for ${bundlePath}`);
    }
  }

  for (const path of [
    "shadowrocket/examples/shadowrocket-macos.conf",
    "shadowrocket/examples/shadowrocket-iphone.conf",
    "shadowrocket/examples/shadowrocket-ipad.conf",
  ]) {
    const content = loaded.get(path);
    if (content.includes(rawRoot)
      || !content.includes("https://juan-nikola.github.io/apple-proxy-profiles/edge/shadowrocket/rules/")) {
      throw new Error(`Shadowrocket public snapshot URL closure failed for ${path}`);
    }
  }

  for (const [canonical, legacy] of [
    ["shadowrocket/scripts/shadowrocket-node-operator.js", "shadowrocket/scripts/substore-node-operator.js"],
    ["shadowrocket/scripts/shadowrocket-profile-generator.js", "shadowrocket/scripts/substore-profile-generator.js"],
    ["egern/scripts/egern-node-generator.js", "egern/scripts/substore-node-generator.js"],
    ["egern/scripts/egern-profile-generator.js", "egern/scripts/substore-profile-generator.js"],
    ["anywhere/scripts/anywhere-node-generator.js", "anywhere/scripts/substore-node-generator.js"],
  ]) {
    if (loaded.get(canonical) !== loaded.get(legacy)) {
      throw new Error(`Public compatibility alias drifted for ${canonical}`);
    }
  }
  return selectDefaultStaticFiles(loaded);
}

export async function buildArtifacts({
  operation,
  publicDirectory,
  upstreamOverride = null,
  singBoxBinaries = null,
  includeStaticFiles = true,
  chinaIpAudit = null,
}) {
  let commit;
  let committedAt;
  if (upstreamOverride !== null) {
    if (!/^[0-9a-f]{40}$/u.test(upstreamOverride?.commit)
      || typeof upstreamOverride.committedAt !== "string") {
      throw new Error("Staged upstream identity is invalid");
    }
    ({ commit, committedAt } = upstreamOverride);
  } else if (operation === "check-current") {
    const currentManifest = JSON.parse(await readFile(join(publicDirectory, "current/manifest.json"), "utf8"));
    commit = currentManifest.upstream.commit;
    committedAt = currentManifest.upstream.committedAt;
  } else {
    ({ sha: commit, committedAt } = await resolveUpstreamCommit());
  }
  const upstream = Object.freeze({ ...BLACKMATRIX7_BASELINE, commit, committedAt });
  const snapshot = await fetchSnapshot({ commit, catalog: FETCH_SOURCE_CATALOG, concurrency: 4 });
  const statics = includeStaticFiles ? await staticFiles() : null;
  const artifacts = buildClientArtifacts({
    snapshot,
    upstream,
    additionalFiles: statics,
    singBoxBinaries,
    chinaIpAudit,
  });
  return Object.freeze({
    ...artifacts,
    diagnostics: Object.freeze({
      ...artifacts.diagnostics,
      chinaIpAuditPrimary: chinaIpAuditPrimary(snapshot, upstream),
    }),
  });
}

export async function main(
  args = process.argv.slice(2),
  { publicDirectory = defaultPublicDirectory, env = process.env } = {},
) {
  const command = parseUpdateRulesArguments(args);
  if (command.operation === "refresh-current") {
    const manifest = await refreshCurrentManifest({ publicDirectory, adoptEdgeMetadata: true });
    process.stdout.write(`Current manifest refreshed: ${manifest.manifestHash}\n`);
    return manifest;
  }
  if (command.operation === "promote") {
    const result = await promoteClientRelease({ publicDirectory, ...command });
    process.stdout.write(`Client promoted: ${result.client} ${result.manifestHash}\n`);
    return result;
  }

  const stageRoot = env.SING_BOX_ARTIFACT_ROOT || DEFAULT_STAGE_ROOT;
  const stage = await readRuleStageManifest(stageRoot);
  const chinaIpAudit = await readFile(join(stageRoot, stage.chinaIpAudit.path));
  const singBoxBinaries = await loadCompiledSingBoxRules(env.SING_BOX_RULE_OUTPUT_ROOT || DEFAULT_COMPILED_ROOT);
  const artifacts = await buildArtifacts({
    operation: command.operation,
    publicDirectory,
    upstreamOverride: stage.upstream,
    singBoxBinaries,
    chinaIpAudit,
  });
  if (command.operation === "check-current") {
    if (!await verifyTrackedPublications({ publicDirectory, ...artifacts })) {
      throw new Error("Tracked default or optional publication does not reproduce from its immutable commit");
    }
    process.stdout.write(`Public snapshot verified: ${artifacts.diagnostics.defaultManifest.upstream.commit}\n`);
    return artifacts.diagnostics;
  }

  const result = await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  process.stdout.write(
    `Edge candidate updated: ${artifacts.diagnostics.defaultManifest.upstream.commit}; ${result.files} files; ${result.manifestHash}\n`,
  );
  return result;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
