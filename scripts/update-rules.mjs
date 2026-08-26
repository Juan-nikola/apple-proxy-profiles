import { access, cp, readdir, readFile, rm } from "node:fs/promises";
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
  prepareCurrentRootFromEdge,
  refreshPublishedAuditDashboard,
  enforceRetention,
  sealPreviousRelease,
  snapshotCurrentVersion,
  snapshotMatches,
  validateClientPublication,
  validateOptionalPublication,
} from "../automation/src/build-site.js";
import {
  renderPublicAuditDashboard,
  validatePublicAuditDashboard,
} from "../automation/src/public-audit-dashboard.js";
import { fetchSnapshot } from "../automation/src/fetch-snapshot.js";
import { fetchExternalRuleSnapshots } from "../automation/src/fetch-external-sources.js";
import { parseSurgeRules } from "../automation/src/parse-surge.js";
import {
  canRefreshChannel,
  refreshChannelManifest,
  refreshCurrentManifest,
} from "../automation/src/refresh-current.js";
import { assertChannelClosure } from "../shared/release/channel-closure.js";
import { resolveUpstreamCommit } from "../automation/src/resolve-upstream.js";
import {
  BLACKMATRIX7_BASELINE,
  FETCH_SOURCE_CATALOG,
} from "../automation/src/source-catalog.js";
import {
  activeClientIds,
  lightweightRuleClientIds,
  publicDirectoryForClient,
} from "../shared/release/client-catalog.js";
import { FRONTIER_CHANNELS } from "../shared/release/frontier-manifest.js";
import {
  DEFAULT_COMPILED_ROOT,
  DEFAULT_STAGE_ROOT,
  loadCompiledSingBoxRules,
  readRuleStageManifest,
} from "./stage-rule-artifacts.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultPublicDirectory = join(repositoryRoot, "public");
const PROMOTION_CLIENTS = new Set(activeClientIds());
const OPTIONAL_CLIENTS = new Set(lightweightRuleClientIds());
const ACTIVE_CLIENT_DIRECTORIES = Object.freeze(Object.fromEntries(
  activeClientIds().map((client) => [client, publicDirectoryForClient(client)]),
));
const ACTIVE_CLIENT_PREFIXES = Object.freeze(Object.values(ACTIVE_CLIENT_DIRECTORIES).map((directory) => `${directory}/`));
const PUBLIC_AUDIT_DASHBOARD_PATHS = new Set(["audit/dashboard.json", "audit/dashboard.html"]);
const INDEPENDENT_AUDIT_PATHS = new Set([
  "audit/china-ip-drift.json",
  "audit/v2fly-domain-drift.json",
  "audit/routing-plan.json",
]);
const LEGACY_CURRENT_EXTRA_FILES = Object.freeze([
  /^frontier-manifest\.json$/u,
  /^surge\/(?:macos|iphone|ipad)\/manifest\.json$/u,
  /^singbox\/(?:macos|iphone|ipad|android)\/manifest\.json$/u,
]);

export function parseUpdateRulesArguments(args) {
  if (JSON.stringify(args) === JSON.stringify(["--channel", "edge"])) {
    return Object.freeze({ operation: "build-edge", channel: "edge" });
  }
  if (args.length === 3 && args[0] === "--check" && args[1] === "--channel"
    && FRONTIER_CHANNELS.includes(args[2])) {
    return Object.freeze({ operation: `check-${args[2]}`, channel: args[2] });
  }
  if (JSON.stringify(args) === JSON.stringify(["--seal-previous"])) {
    return Object.freeze({ operation: "seal-previous" });
  }
  if (JSON.stringify(args) === JSON.stringify(["--refresh-current"])) {
    return Object.freeze({ operation: "refresh-current" });
  }
  if (args.length === 3 && args[0] === "--promote" && PROMOTION_CLIENTS.has(args[1])
    && /^[0-9a-f]{64}$/u.test(args[2])) {
    return Object.freeze({ operation: "promote", client: args[1], manifestHash: args[2] });
  }
  if (JSON.stringify(args) === JSON.stringify(["--promote-all"])) {
    return Object.freeze({ operation: "promote-all" });
  }
  throw new Error("Invalid update-rules arguments; use --channel edge, --check --channel <edge|current|previous>, --seal-previous, --refresh-current, --promote-all, or --promote <client> <manifest-hash>");
}

export async function promoteClientRelease(options) {
  return promoteClientReleaseImpl(options);
}

export async function promoteAllClients({ publicDirectory = defaultPublicDirectory } = {}) {
  const edgeManifest = JSON.parse(await readFile(join(publicDirectory, "edge/manifest.json"), "utf8"));
  if (edgeManifest.schemaVersion !== 2
    || !/^[0-9a-f]{64}$/u.test(edgeManifest.manifestHash ?? "")
    || !edgeManifest.clients || typeof edgeManifest.clients !== "object") {
    throw new Error("Edge manifest is invalid for full promotion");
  }
  await prepareCurrentRootFromEdge({ publicDirectory });
  const results = [];
  for (const client of activeClientIds()) {
    const manifestHash = edgeManifest.clients[client]?.manifestHash;
    if (!/^[0-9a-f]{64}$/u.test(manifestHash ?? "")) {
      throw new Error(`Edge manifest is missing a valid ${client} client hash`);
    }
    results.push(await promoteClientRelease({
      publicDirectory,
      client,
      manifestHash,
      expectedHash: manifestHash,
    }));
  }
  return Object.freeze(results);
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
            !INDEPENDENT_AUDIT_PATHS.has(path)
              && !PUBLIC_AUDIT_DASHBOARD_PATHS.has(path)
              && !ACTIVE_CLIENT_PREFIXES.some((prefix) => path.startsWith(prefix))
          ))
          : base.files,
      };
    };
    return canonicalJson(projection(actual)) === canonicalJson(projection(expectedManifest));
  } catch {
    return false;
  }
}

async function validateTrackedPublicAuditDashboard(directory, manifest) {
  try {
    const jsonBytes = await readFile(join(directory, "audit/dashboard.json"));
    const dashboard = JSON.parse(jsonBytes.toString("utf8"));
    if (!jsonBytes.equals(artifactBuffer(canonicalJson(dashboard)))) return false;
    validatePublicAuditDashboard(dashboard);
    const htmlBytes = await readFile(join(directory, "audit/dashboard.html"));
    if (!htmlBytes.equals(artifactBuffer(renderPublicAuditDashboard(dashboard)))) return false;
    for (const [path, bytes] of [["audit/dashboard.json", jsonBytes], ["audit/dashboard.html", htmlBytes]]) {
      const record = Array.isArray(manifest.files) ? manifest.files.find((item) => item?.path === path) : null;
      if (!record || record.bytes !== bytes.length || record.sha256 !== artifactSha256(bytes)) return false;
    }
    return true;
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
  const validRolloutClientKeys = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return keys.length > 0 && keys.every((client) => PROMOTION_CLIENTS.has(client));
  };
  if (!validRolloutClientKeys(rollout.clients)
    || (rollout.previous !== undefined && !validRolloutClientKeys(rollout.previous))) {
    return false;
  }

  const currentDirectory = join(publicDirectory, "current");
  let expectedRootManifest = diagnostics?.defaultManifest ?? null;
  let trackedRootManifest;
  try {
    trackedRootManifest = JSON.parse(await readFile(join(currentDirectory, "manifest.json"), "utf8"));
  } catch {
    return false;
  }
  if (!await validateTrackedPublicAuditDashboard(currentDirectory, trackedRootManifest)) return false;
  const clientDirectories = ACTIVE_CLIENT_DIRECTORIES;
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
    if (PUBLIC_AUDIT_DASHBOARD_PATHS.has(path) || INDEPENDENT_AUDIT_PATHS.has(path)) continue;
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

export async function verifyPublishedChannel({ publicDirectory, channel }) {
  if (!FRONTIER_CHANNELS.includes(channel)) throw new TypeError("Publication channel is unsupported");
  const directory = join(publicDirectory, channel);
  if (!await pathExists(directory)) return false;
  try {
    const files = await readPublicationTree(directory, channel);
    assertChannelClosure({ files, channel, rootPrefix: channel });
    const versionsDirectory = join(publicDirectory, "versions");
    if (await pathExists(versionsDirectory)) {
      for (const entry of await readdir(versionsDirectory, { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^[0-9a-f]{64}$/u.test(entry.name)) return false;
        const versionFiles = await readPublicationTree(
          join(versionsDirectory, entry.name),
          `versions/${entry.name}`,
        );
        assertChannelClosure({
          files: versionFiles,
          channel: "current",
          rootPrefix: `versions/${entry.name}`,
          immutableVersion: entry.name,
        });
      }
    }
    return true;
  } catch {
    return false;
  }
}

async function loadText(path) {
  return readFile(join(repositoryRoot, path), "utf8");
}

function rewriteStaticPublicationChannel(content, channel) {
  if (channel === "current") return content;
  return content.replaceAll("/current/", `/${channel}/`);
}

async function staticFiles(channel = "current") {
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
    ["anywhere/scripts/anywhere-strategy-generator.js", "clients/anywhere/dist/anywhere-strategy-generator.js"],
    ["anywhere/scripts/substore-strategy-generator.js", "clients/anywhere/dist/substore-strategy-generator.js"],
    ["surge/scripts/surge-profile-generator.js", "clients/surge/dist/surge-profile-generator.js"],
    ["surge/scripts/substore-profile-generator.js", "clients/surge/dist/substore-profile-generator.js"],
    ["surge/scripts/surge-nodes-generator.js", "clients/surge/dist/surge-nodes-generator.js"],
    ["surge/scripts/substore-nodes-generator.js", "clients/surge/dist/substore-nodes-generator.js"],
    ["surge/examples/surge-macos.conf", "clients/surge/examples/surge-macos.conf"],
    ["surge/examples/surge-iphone.conf", "clients/surge/examples/surge-iphone.conf"],
    ["surge/examples/surge-ipad.conf", "clients/surge/examples/surge-ipad.conf"],
    ["sing-box/scripts/sing-box-config-generator.js", "clients/sing-box/dist/sing-box-config-generator.js"],
    ["sing-box/scripts/substore-config-generator.js", "clients/sing-box/dist/substore-config-generator.js"],
    ["onexray/scripts/onexray-node-generator.js", "clients/onexray/dist/onexray-node-generator.js"],
    ["onexray/scripts/substore-node-generator.js", "clients/onexray/dist/substore-node-generator.js"],
    ["onexray/scripts/onexray-profile-generator.js", "clients/onexray/dist/onexray-profile-generator.js"],
    ["onexray/scripts/substore-profile-generator.js", "clients/onexray/dist/substore-profile-generator.js"],
    ["onexray/scripts/onexray-routing-audit.js", "clients/onexray/dist/onexray-routing-audit.js"],
    ["onexray/scripts/substore-routing-audit.js", "clients/onexray/dist/substore-routing-audit.js"],
    ["happ/scripts/happ-config-generator.js", "clients/happ/dist/happ-config-generator.js"],
    ["happ/scripts/substore-config-generator.js", "clients/happ/dist/substore-config-generator.js"],
    ["happ/scripts/happ-routing-audit.js", "clients/happ/dist/happ-routing-audit.js"],
    ["happ/scripts/substore-routing-audit.js", "clients/happ/dist/substore-routing-audit.js"],
    ["clash/scripts/clash-node-generator.js", "clients/clash/dist/clash-node-generator.js"],
    ["clash/scripts/substore-node-generator.js", "clients/clash/dist/substore-node-generator.js"],
    ["clash/scripts/clash-profile-generator.js", "clients/clash/dist/clash-profile-generator.js"],
    ["clash/scripts/substore-profile-generator.js", "clients/clash/dist/substore-profile-generator.js"],
    ...["macos", "iphone", "ipad", "appletv"].flatMap((platform) => [
      [`clash/examples/clash-${platform}.yaml`, `clients/clash/examples/clash-${platform}.yaml`],
    ]),
     ...["macos", "iphone", "ipad", "android"].flatMap((platform) => [
      [`sing-box/examples/sing-box-${platform}.json`, `clients/sing-box/examples/sing-box-${platform}.json`],
      [`sing-box/examples/sing-box-${platform}-diagnostic.json`, `clients/sing-box/examples/sing-box-${platform}-diagnostic.json`],
    ]),
    ["LICENSE", "LICENSE"],
    ["THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md"],
  ];
  const loaded = new Map(await Promise.all(paths.map(async ([publicPath, localPath]) => [
    publicPath,
    rewriteStaticPublicationChannel(await loadText(localPath), channel),
  ])));
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
    ["anywhere/scripts/anywhere-strategy-generator.js", "anywhere/scripts/substore-strategy-generator.js"],
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
  channel = "edge",
  upstreamOverride = null,
  singBoxBinaries = null,
  includeStaticFiles = true,
  chinaIpAudit = null,
  v2flyDomainAudit = null,
  fetchSnapshotImpl = fetchSnapshot,
  externalSnapshots = null,
  fetchExternalSnapshotsImpl = fetchExternalRuleSnapshots,
  loadExternalSnapshots = false,
}) {
  let commit;
  let committedAt;
  if (upstreamOverride !== null) {
    if (!/^[0-9a-f]{40}$/u.test(upstreamOverride?.commit)
      || typeof upstreamOverride.committedAt !== "string") {
      throw new Error("Staged upstream identity is invalid");
    }
    ({ commit, committedAt } = upstreamOverride);
  } else if (operation.startsWith("check-")) {
    const checkedChannel = operation.slice("check-".length);
    const checkedManifest = JSON.parse(await readFile(join(publicDirectory, checkedChannel, "manifest.json"), "utf8"));
    commit = checkedManifest.upstream.commit;
    committedAt = checkedManifest.upstream.committedAt;
  } else {
    ({ sha: commit, committedAt } = await resolveUpstreamCommit());
  }
  const upstream = Object.freeze({ ...BLACKMATRIX7_BASELINE, commit, committedAt });
  const resolvedExternalSnapshots = externalSnapshots === null && loadExternalSnapshots
    ? await fetchExternalSnapshotsImpl()
    : externalSnapshots;
  const snapshot = await fetchSnapshotImpl({
    commit,
    catalog: FETCH_SOURCE_CATALOG,
    concurrency: 1,
    requestIntervalMs: 250,
  });
  const statics = includeStaticFiles ? await staticFiles(channel) : null;
  const artifacts = buildClientArtifacts({
    snapshot,
    externalSnapshots: resolvedExternalSnapshots,
    upstream,
    channel,
    additionalFiles: statics,
    singBoxBinaries,
    chinaIpAudit,
    v2flyDomainAudit,
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
    await refreshPublishedAuditDashboard(join(publicDirectory, "current"));
    const manifest = await refreshCurrentManifest({ publicDirectory, adoptEdgeMetadata: true });
    await snapshotCurrentVersion(publicDirectory);
    await enforceRetention(publicDirectory, manifest.manifestHash);
    if (await canRefreshChannel(join(publicDirectory, "previous"))) {
      await refreshPublishedAuditDashboard(join(publicDirectory, "previous"));
      await refreshChannelManifest({ publicDirectory, channel: "previous" });
    }
    process.stdout.write(`Current manifest refreshed: ${manifest.manifestHash}\n`);
    return manifest;
  }
  if (command.operation === "seal-previous") {
    const result = await sealPreviousRelease({ publicDirectory });
    process.stdout.write(`Previous channel sealed: ${result.manifestHash}\n`);
    return result;
  }
  if (command.operation === "promote") {
    const result = await promoteClientRelease({
      publicDirectory,
      ...command,
      expectedHash: command.manifestHash,
    });
    process.stdout.write(`Client promoted: ${result.client} ${result.manifestHash}\n`);
    return result;
  }
  if (command.operation === "promote-all") {
    const results = await promoteAllClients({ publicDirectory });
    process.stdout.write(`All active clients promoted: ${results.map(({ client, manifestHash }) => `${client} ${manifestHash}`).join(", ")}\n`);
    return results;
  }

  const stageRoot = env.SING_BOX_ARTIFACT_ROOT || DEFAULT_STAGE_ROOT;
  const stage = await readRuleStageManifest(stageRoot);
  const chinaIpAudit = await readFile(join(stageRoot, stage.chinaIpAudit.path));
  const v2flyDomainAudit = stage.v2flyAudit === undefined
    ? null
    : await readFile(join(stageRoot, stage.v2flyAudit.path));
  const singBoxBinaries = await loadCompiledSingBoxRules(env.SING_BOX_RULE_OUTPUT_ROOT || DEFAULT_COMPILED_ROOT);
  const artifacts = await buildArtifacts({
    operation: command.operation,
    publicDirectory,
    upstreamOverride: stage.upstream,
    channel: command.channel ?? "edge",
    singBoxBinaries,
    chinaIpAudit,
    v2flyDomainAudit,
    loadExternalSnapshots: true,
  });
  if (command.operation === "check-current") {
    if (!await verifyTrackedPublications({ publicDirectory, ...artifacts })) {
      throw new Error("Tracked default or optional publication does not reproduce from its immutable commit");
    }
    process.stdout.write(`Public snapshot verified: ${artifacts.diagnostics.defaultManifest.upstream.commit}\n`);
    return artifacts.diagnostics;
  }
  if (command.operation === "check-edge" || command.operation === "check-previous") {
    if (!await verifyPublishedChannel({ publicDirectory, channel: command.channel })) {
      throw new Error(`Published ${command.channel} channel failed closure verification`);
    }
    process.stdout.write(`Published ${command.channel} channel verified.\n`);
    return artifacts.diagnostics;
  }

  const result = await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
    channel: command.channel ?? "edge",
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
