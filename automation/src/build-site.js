import {
  access,
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { artifactBuffer, artifactSha256 } from "./artifact-content.js";
import { validateChinaIpAuditForPromotion } from "./china-ip-audit.js";
import {
  renderPublicAuditDashboard,
  validatePublicAuditDashboard,
} from "./public-audit-dashboard.js";
import {
  canRefreshChannel,
  refreshChannelManifest,
  refreshClientManifest,
  refreshCurrentManifest,
} from "./refresh-current.js";
import { canonicalJson } from "./render-anywhere-rules.js";
import { assertChannelClosure } from "../../shared/release/channel-closure.js";
import { FRONTIER_CHANNELS } from "../../shared/release/frontier-manifest.js";
import { renderOneXrayImportPage } from "../../clients/onexray/src/build-import-page.js";
import { oneXrayGeoNames } from "../../clients/onexray/src/geodata-contract.js";
import {
  activeClientIds,
  lightweightRuleClientIds,
  publicDirectoryForClient,
} from "../../shared/release/client-catalog.js";

// Retention policy: the publication pipeline prunes immutable version
// snapshots to MAX_VERSION_COUNT (8). check-actions.mjs validates the on-disk
// tree with a one-snapshot tolerance (9) so a just-added version never fails
// CI before the prune step runs. Keep these two numbers in sync.
const MAX_PUBLISHED_BYTES = 750 * 1024 * 1024;
const MAX_VERSION_COUNT = 8;
const MIN_VERSION_COUNT = 2;
const CHINA_IP_AUDIT_PATH = "audit/china-ip-drift.json";
const CHINA_IP_AUDIT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
const PUBLIC_AUDIT_DASHBOARD_PATH = "audit/dashboard.json";

export const CLIENT_PUBLIC_PATHS = Object.freeze(Object.fromEntries(
  activeClientIds().map((client) => [client, publicDirectoryForClient(client)]),
));
const OPTIONAL_CLIENTS = lightweightRuleClientIds();

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readPublishedClientHash(directory, client) {
  const manifestPath = join(directory, publicDirectoryForClient(client), "client-manifest.json");
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!manifest || manifest.client !== client || !/^[0-9a-f]{64}$/u.test(manifest.manifestHash ?? "")) {
      throw new Error(`Published ${client} client manifest is invalid`);
    }
    return manifest.manifestHash;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function refreshPublishedAuditDashboard(channelDirectory) {
  const dashboardPath = join(channelDirectory, "audit/dashboard.json");
  if (!await exists(dashboardPath)) return false;
  let dashboard = JSON.parse(await readFile(dashboardPath, "utf8"));
  const edgeDashboardPath = join(dirname(channelDirectory), "edge/audit/dashboard.json");
  if (await exists(edgeDashboardPath)) {
    const edgeDashboard = JSON.parse(await readFile(edgeDashboardPath, "utf8"));
    validatePublicAuditDashboard(edgeDashboard);
    const clients = { ...dashboard.clients };
    for (const [client, edgeState] of Object.entries(edgeDashboard.clients)) {
      if (Object.hasOwn(clients, client)) continue;
      clients[client] = {
        ...edgeState,
        current: { manifestHash: null, closure: true },
        previous: { manifestHash: null, closure: true },
      };
    }
    dashboard = { ...dashboard, clients };
  }
  validatePublicAuditDashboard(dashboard);
  const publicRoot = dirname(channelDirectory);
  const clients = {};
  for (const [client, previous] of Object.entries(dashboard.clients)) {
    const channels = {};
    for (const channel of FRONTIER_CHANNELS) {
      channels[channel] = {
        manifestHash: await readPublishedClientHash(join(publicRoot, channel), client),
        closure: true,
      };
    }
    clients[client] = { ...previous, ...channels };
  }
  const channels = Object.fromEntries(FRONTIER_CHANNELS.map((channel) => [channel, {
    closure: true,
    manifestCount: Object.values(clients).filter((client) => client[channel].manifestHash !== null).length,
  }]));
  const refreshed = { ...dashboard, channels, clients };
  validatePublicAuditDashboard(refreshed);
  await writeFile(dashboardPath, canonicalJson(refreshed), "utf8");
  await writeFile(join(channelDirectory, "audit/dashboard.html"), renderPublicAuditDashboard(refreshed), "utf8");
  return true;
}

function safeRelativePath(path) {
  return typeof path === "string"
    && path.length > 0
    && !path.startsWith("/")
    && !path.split("/").includes("..")
    && !path.includes("\\");
}

async function writeSnapshot(directory, files) {
  for (const [path, content] of files) {
    if (!safeRelativePath(path)) throw new TypeError("Public snapshot file is invalid");
    const destination = join(directory, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, artifactBuffer(content));
  }
}

const HAPP_ROUTING_DEEPLINK_RE = /happ:\/\/routing\/onadd\/([A-Za-z0-9+/]+={0,2})/gu;

function rewriteHappRoutingDeepLinks(text, from, to) {
  return text.replace(HAPP_ROUTING_DEEPLINK_RE, (match, encoded) => {
    let profile;
    try {
      profile = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    } catch {
      return match;
    }
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) return match;
    const serialized = JSON.stringify(profile);
    if (!serialized.includes(`/${from}/`)) return match;
    const rewritten = serialized.replaceAll(`/${from}/`, `/${to}/`);
    return `happ://routing/onadd/${Buffer.from(rewritten, "utf8").toString("base64")}`;
  });
}

function rewritePublicationChannel(content, from, to, { rewriteGeoDataNames = true } = {}) {
  if (!(content instanceof Uint8Array)) return content;
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(content);
  } catch {
    return Buffer.from(content);
  }
  let rewritten = text.replace(
    /\b(channel\s*(?:=|:)\s*)(["'])(edge|current|previous)\2/gu,
    (match, prefix, quote, value) => value === from ? `${prefix}${quote}${to}${quote}` : match,
  )
    .replaceAll(`/${from}/`, `/${to}/`)
    .replace(new RegExp(`${from}%2f`, "giu"), `${to}%2F`)
    .replace(new RegExp(`%2f${from}%2f`, "giu"), `%2F${to}%2F`)
    .replaceAll(`channel=${from}`, `channel=${to}`)
    .replaceAll(`channel%3D${from}`, `channel%3D${to}`)
    .replaceAll(`channel:${from}`, `channel:${to}`)
    .replaceAll(`channel: ${from}`, `channel: ${to}`)
    .replaceAll(`"channel":"${from}"`, `"channel":"${to}"`)
    .replaceAll(`"channel": "${from}"`, `"channel": "${to}"`);
  if (rewriteGeoDataNames) {
    rewritten = rewritten
      .replaceAll(oneXrayGeoNames(from).domain, oneXrayGeoNames(to).domain)
      .replaceAll(oneXrayGeoNames(from).ip, oneXrayGeoNames(to).ip);
  }
  return Buffer.from(rewriteHappRoutingDeepLinks(rewritten, from, to), "utf8");
}

function parseOneXrayManifest(content) {
  let manifest;
  try {
    manifest = JSON.parse(artifactBuffer(content).toString("utf8"));
  } catch {
    throw new Error("OneXray GeoData manifest is invalid JSON");
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)
    || manifest.schema !== "apple-proxy-onexray-geodata-v1"
    || !FRONTIER_CHANNELS.includes(manifest.channel)
    || !Array.isArray(manifest.files) || manifest.files.length !== 2
    || !/^[0-9a-f]{64}$/u.test(manifest.manifestHash ?? "")) {
    throw new Error("OneXray GeoData manifest is invalid");
  }
  const { manifestHash, ...base } = manifest;
  if (artifactSha256(canonicalJson(base)) !== manifestHash
    || !artifactBuffer(content).equals(artifactBuffer(canonicalJson(manifest)))) {
    throw new Error("OneXray GeoData manifest hash or canonical bytes are invalid");
  }
  return manifest;
}

function rebindOneXrayFiles(files, channel) {
  const manifestPath = "onexray/geodata/manifest.json";
  if (!files.has(manifestPath)) return files;
  const source = parseOneXrayManifest(files.get(manifestPath));
  if (source.channel === channel) return new Map(files);
  const manifestBase = {
    ...source,
    channel,
    releaseId: `${channel}-${source.upstream?.commit?.slice(0, 8) ?? "release"}`,
    names: oneXrayGeoNames(channel),
  };
  delete manifestBase.manifestHash;
  const manifest = Object.freeze({
    ...manifestBase,
    manifestHash: artifactSha256(canonicalJson(manifestBase)),
  });
  const dataFiles = new Map([
    ["onexray/geodata/geosite.dat", artifactBuffer(files.get("onexray/geodata/geosite.dat"))],
    ["onexray/geodata/geoip.dat", artifactBuffer(files.get("onexray/geodata/geoip.dat"))],
  ]);
  const page = renderOneXrayImportPage({
    manifest,
    files: dataFiles,
    publicBase: "https://juan-nikola.github.io/apple-proxy-profiles",
  });
  const rebound = new Map(files);
  rebound.set(manifestPath, Buffer.from(canonicalJson(manifest), "utf8"));
  rebound.set("onexray/index.html", Buffer.from(page, "utf8"));
  return rebound;
}

async function rewriteTreeChannel(directory, from, to) {
  const relatives = await relativeFiles(directory);
  for (const relative of relatives) {
    const path = join(directory, relative);
    const content = await readFile(path);
    const oneXrayManifest = relative === "onexray/geodata/manifest.json"
      || relative.endsWith("/onexray/geodata/manifest.json");
    await writeFile(path, oneXrayManifest
      ? content
      : rewritePublicationChannel(content, from, to));
  }
  const fromGeoNames = oneXrayGeoNames(from);
  const toGeoNames = oneXrayGeoNames(to);
  for (const relative of relatives) {
    const match = /^(?:(?:geodata)\/)?(?:cn|global|ru|ir)\/(AppleProxy(?:Site|IP))(?:Edge|Current|Previous)\.dat$/u.exec(relative);
    if (!match || !relative.endsWith(`${fromGeoNames.domain}.dat`)
      && !relative.endsWith(`${fromGeoNames.ip}.dat`)) continue;
    const destination = relative.endsWith(`${fromGeoNames.domain}.dat`)
      ? relative.slice(0, -`${fromGeoNames.domain}.dat`.length) + `${toGeoNames.domain}.dat`
      : relative.slice(0, -`${fromGeoNames.ip}.dat`.length) + `${toGeoNames.ip}.dat`;
    if (relative === destination) continue;
    await rm(join(directory, destination), { force: true });
    await rename(join(directory, relative), join(directory, destination));
  }
  const manifestSuffix = "onexray/geodata/manifest.json";
  for (const relativeManifest of relatives.filter((path) => path === manifestSuffix || path.endsWith(`/${manifestSuffix}`))) {
    const prefix = relativeManifest === manifestSuffix
      ? ""
      : relativeManifest.slice(0, -manifestSuffix.length);
    const scoped = new Map();
    for (const relative of relatives) {
      if (relative === `${prefix}onexray/geodata/manifest.json` || relative.startsWith(`${prefix}onexray/`)) {
        scoped.set(relative.slice(prefix.length), await readFile(join(directory, relative)));
      }
    }
    const rebound = rebindOneXrayFiles(scoped, to);
    for (const [relative, content] of rebound) {
      await writeFile(join(directory, `${prefix}${relative}`), artifactBuffer(content));
    }
  }
  if (relatives.includes("manifest.json")) await refreshRootManifestHash(join(directory, "manifest.json"));
}

async function refreshRootManifestHash(manifestPath) {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)
      || !/^[0-9a-f]{64}$/u.test(manifest.manifestHash ?? "")) return;
    const { manifestHash: ignored, ...base } = manifest;
    const files = Array.isArray(base.files)
      ? await Promise.all(base.files.map(async (record) => {
        if (!record || typeof record.path !== "string" || record.path.startsWith("/")
          || record.path.split("/").includes("..")) return record;
        try {
          const content = await readFile(join(dirname(manifestPath), record.path));
          return { ...record, bytes: content.length, sha256: artifactSha256(content) };
        } catch (error) {
          if (error.code === "ENOENT") return record;
          throw error;
        }
      }))
      : base.files;
    const reboundBase = { ...base, ...(files === undefined ? {} : { files }) };
    await writeFile(manifestPath, canonicalJson({
      ...reboundBase,
      manifestHash: artifactSha256(canonicalJson(reboundBase)),
    }), "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function prepareCurrentRootFromEdge({ publicDirectory } = {}) {
  const edgeDirectory = join(publicDirectory, "edge");
  const currentDirectory = join(publicDirectory, "current");
  if (await exists(currentDirectory)) return false;
  const clientDirectories = new Set(Object.values(CLIENT_PUBLIC_PATHS));
  for (const entry of await readdir(edgeDirectory, { withFileTypes: true })) {
    if (clientDirectories.has(entry.name)
      || entry.name === "clients"
      || entry.name === "optional"
      || entry.name === "optional-versions") continue;
    const source = join(edgeDirectory, entry.name);
    const destination = join(currentDirectory, entry.name);
    await rm(destination, { recursive: true, force: true });
    if (entry.isDirectory()) {
      await cp(source, destination, { recursive: true });
      await rewriteTreeChannel(destination, "edge", "current");
    } else {
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, rewritePublicationChannel(await readFile(source), "edge", "current"));
      if (entry.name === "manifest.json") await refreshRootManifestHash(destination);
    }
  }
  await refreshRootManifestHash(join(currentDirectory, "manifest.json"));
  return true;
}

async function refreshNestedClientManifest({ treeRoot, clientDirectory, manifestPath, recordPrefix }) {
  const existing = JSON.parse(await readFile(manifestPath, "utf8"));
  const records = [];
  for (const relative of await relativeFiles(treeRoot)) {
    if (relative === "client-manifest.json") continue;
    const content = await readFile(join(treeRoot, relative));
    records.push({
      path: `${recordPrefix}/${relative}`,
      bytes: content.byteLength,
      sha256: artifactSha256(content),
    });
  }
  records.sort((left, right) => left.path.localeCompare(right.path));
  const base = {
    schemaVersion: 1,
    client: existing.client,
    generatedAt: existing.generatedAt,
    ...(existing.optionalPacks === undefined ? {} : { optionalPacks: existing.optionalPacks }),
    ...(existing.chinaIpAuditSha256 === undefined ? {} : { chinaIpAuditSha256: existing.chinaIpAuditSha256 }),
    files: records,
  };
  const manifest = { ...base, manifestHash: artifactSha256(canonicalJson(base)) };
  await writeFile(manifestPath, canonicalJson(manifest), "utf8");
  return manifest;
}

async function subsetMatches(directory, files) {
  for (const [path, content] of files) {
    if (!safeRelativePath(path)) return false;
    try {
      if (!(await readFile(join(directory, path))).equals(artifactBuffer(content))) return false;
    } catch {
      return false;
    }
  }
  return true;
}

function validateFrontierPublicationFiles(files) {
  const byChannel = new Map(FRONTIER_CHANNELS.map((channel) => [channel, new Map()]));
  for (const [path, content] of files) {
    const [channel] = path.split("/", 1);
    if (!byChannel.has(channel)) {
      throw new Error("Frontier public artifact must be scoped to edge, current, or previous");
    }
    byChannel.get(channel).set(path, content);
  }
  for (const [channel, scopedFiles] of byChannel) {
    if (scopedFiles.size === 0) continue;
    assertChannelClosure({ files: scopedFiles, channel, rootPrefix: channel });
  }
}

async function fileMatches(path, content) {
  try {
    return (await readFile(path)).equals(artifactBuffer(content));
  } catch {
    return false;
  }
}

export async function snapshotCurrentVersion(directory) {
  const manifestPath = join(directory, "current", "manifest.json");
  if (!await exists(manifestPath)) return null;
  const manifestBytes = await readFile(manifestPath);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (!manifest || !/^[0-9a-f]{64}$/u.test(manifest.manifestHash)) {
    throw new Error("Current manifest hash is invalid");
  }
  const versionDirectory = join(directory, "versions", manifest.manifestHash);
  if (await exists(versionDirectory)) {
    if (!(await readFile(join(versionDirectory, "manifest.json"))).equals(manifestBytes)) {
      throw new Error("Immutable public version bytes changed or are missing");
    }
    return manifest.manifestHash;
  }
  await mkdir(join(directory, "versions"), { recursive: true });
  await cp(join(directory, "current"), versionDirectory, { recursive: true, errorOnExist: true });
  return manifest.manifestHash;
}

async function directoryBytes(directory) {
  let total = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) total += await directoryBytes(path);
    else if (entry.isFile()) total += (await stat(path)).size;
    else throw new Error("Public tree contains a non-regular entry");
  }
  return total;
}

async function relativeFiles(root, current = "") {
  const found = [];
  for (const entry of await readdir(join(root, current), { withFileTypes: true })) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...await relativeFiles(root, relative));
    else if (entry.isFile()) found.push(relative);
    else return ["<invalid>"];
  }
  return found;
}

async function readArtifactTree(directory, prefix = "") {
  const files = new Map();
  for (const relative of await relativeFiles(directory)) {
    if (relative === "<invalid>") throw new Error("Publication tree contains a non-regular entry");
    files.set(prefix ? `${prefix}/${relative}` : relative, await readFile(join(directory, relative)));
  }
  return files;
}

async function versionRecords(versionsDirectory) {
  if (!await exists(versionsDirectory)) return [];
  const records = [];
  for (const entry of await readdir(versionsDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[0-9a-f]{64}$/u.test(entry.name)) {
      throw new Error("Public versions directory contains an invalid entry");
    }
    const manifest = JSON.parse(await readFile(join(versionsDirectory, entry.name, "manifest.json"), "utf8"));
    records.push({ name: entry.name, generatedAt: manifest.generatedAt });
  }
  return records.sort((left, right) => (
    left.generatedAt === right.generatedAt
      ? left.name < right.name ? 1 : -1
      : left.generatedAt < right.generatedAt ? 1 : -1
  ));
}

export async function enforceRetention(stagingDirectory, requiredVersion = null) {
  const versionsDirectory = join(stagingDirectory, "versions");
  let versions = await versionRecords(versionsDirectory);
  if (requiredVersion !== null) {
    const required = versions.find((record) => record.name === requiredVersion);
    if (!required) throw new Error("Current immutable public version is missing");
    versions = [required, ...versions.filter((record) => record.name !== requiredVersion)];
  }
  for (const record of versions.slice(MAX_VERSION_COUNT)) {
    await rm(join(versionsDirectory, record.name), { recursive: true, force: true });
  }
  versions = versions.slice(0, MAX_VERSION_COUNT);
  let bytes = await directoryBytes(stagingDirectory);
  while (bytes > MAX_PUBLISHED_BYTES && versions.length > MIN_VERSION_COUNT) {
    let oldestIndex = versions.length - 1;
    if (requiredVersion !== null && versions[oldestIndex].name === requiredVersion) {
      oldestIndex -= 1;
    }
    if (oldestIndex < 0) break;
    const [oldest] = versions.splice(oldestIndex, 1);
    await rm(join(versionsDirectory, oldest.name), { recursive: true, force: true });
    bytes = await directoryBytes(stagingDirectory);
  }
  if (bytes > MAX_PUBLISHED_BYTES) throw new Error("Public site exceeds the 750 MiB retention limit");
  return { bytes, versionCount: versions.length };
}

function indexHtml(manifest) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Apple Proxy Profiles</title></head>
<body><main><h1>Apple Proxy Profiles</h1><p>Blackmatrix7 commit: <code>${manifest.upstream.commit}</code></p><p>公开页不包含私密节点、策略正文或凭据。</p><ul><li><a href="current/manifest.json">Current manifest</a></li><li><a href="edge/manifest.json">Frontier edge manifest</a></li><li><a href="current/frontier-manifest.json">Current frontier manifest</a></li><li><a href="previous/manifest.json">Previous manifest</a></li><li><a href="current/audit/dashboard.html">中文公开审计看板</a></li><li><a href="current/audit/dashboard.json">审计 JSON</a></li><li><a href="current/anywhere/import.html">Anywhere import</a></li><li><a href="current/surge/scripts/surge-profile-generator.js">Surge Sub-Store script</a></li><li><a href="current/sing-box/scripts/sing-box-config-generator.js">sing-box Sub-Store script</a></li></ul></main></body></html>
`;
}

export async function snapshotMatches(directory, files) {
  for (const [path, content] of files) {
    try {
      if (!(await readFile(join(directory, path))).equals(artifactBuffer(content))) return false;
    } catch {
      return false;
    }
  }
  const actual = (await relativeFiles(directory)).sort();
  const expected = [...files.keys()].sort();
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export async function buildSite({
  publicDirectory,
  files,
  manifest,
  frontierFiles = null,
}) {
  if (!(files instanceof Map) || !manifest || !/^[0-9a-f]{64}$/u.test(manifest.manifestHash)) {
    throw new TypeError("Verified public artifacts are required");
  }
  if (frontierFiles !== null && !(frontierFiles instanceof Map)) {
    throw new TypeError("Frontier public artifacts must be a Map");
  }
  if (frontierFiles !== null) {
    for (const [path, content] of frontierFiles) {
      if (!safeRelativePath(path)) throw new TypeError("Frontier public artifact is invalid");
      if (!/^(?:edge|current|previous)\//u.test(path)) {
        throw new Error("Frontier public artifact must be scoped to edge, current, or previous");
      }
    }
    validateFrontierPublicationFiles(frontierFiles);
  }
  const currentDirectory = join(publicDirectory, "current");
  if (await exists(currentDirectory) && await snapshotMatches(currentDirectory, files)
    && (frontierFiles === null || await subsetMatches(publicDirectory, frontierFiles))
    && await fileMatches(join(publicDirectory, "index.html"), indexHtml(manifest))) {
    const versionsDirectory = join(publicDirectory, "versions");
    const versionDirectory = join(versionsDirectory, manifest.manifestHash);
    if (await exists(versionDirectory) && !await snapshotMatches(versionDirectory, files)) {
      throw new Error("Immutable public version bytes changed or are missing");
    }
    if (await exists(versionDirectory)) {
      const versions = await versionRecords(versionsDirectory);
      return { bytes: await directoryBytes(publicDirectory), versionCount: versions.length };
    }
  }
  const parent = dirname(publicDirectory);
  const staging = await mkdtemp(join(parent, `.${basename(publicDirectory)}-staging-`));
  const backup = `${publicDirectory}.backup-${manifest.manifestHash.slice(0, 12)}`;
  try {
    if (await exists(publicDirectory)) {
      const versions = join(publicDirectory, "versions");
      if (await exists(versions)) await cp(versions, join(staging, "versions"), { recursive: true, errorOnExist: true });
      await cp(join(publicDirectory, "current"), join(staging, "previous"), { recursive: true, errorOnExist: true });
      const edge = join(publicDirectory, "edge");
      if (await exists(edge)) await cp(edge, join(staging, "edge"), { recursive: true, errorOnExist: true });
    } else {
      await writeSnapshot(join(staging, "previous"), files);
    }
    await writeSnapshot(join(staging, "current"), files);
    if (frontierFiles !== null) await writeSnapshot(staging, frontierFiles);
    const versionDirectory = join(staging, "versions", manifest.manifestHash);
    if (await exists(versionDirectory)) {
      if (!await snapshotMatches(versionDirectory, files)) throw new Error("Immutable public version bytes changed");
    } else {
      await writeSnapshot(versionDirectory, files);
    }
    if (await exists(join(staging, "previous"))) {
      await rewriteTreeChannel(join(staging, "previous"), "current", "previous");
      for (const client of activeClientIds()) {
        const clientDirectory = publicDirectoryForClient(client);
        if (await exists(join(staging, "previous", clientDirectory, "client-manifest.json"))) {
          await refreshClientManifest({ publicDirectory: staging, channel: "previous", client });
        }
      }
      if (await canRefreshChannel(join(staging, "previous"))) {
        await refreshChannelManifest({ publicDirectory: staging, channel: "previous" });
      }
      const previousFiles = await readArtifactTree(join(staging, "previous"));
      assertChannelClosure({ files: previousFiles, channel: "previous", rootPrefix: "previous" });
    }
    const versionFiles = await readArtifactTree(versionDirectory);
    assertChannelClosure({
      files: versionFiles,
      channel: "current",
      rootPrefix: `versions/${manifest.manifestHash}`,
      immutableVersion: manifest.manifestHash,
    });
    await writeFile(join(staging, "manifest.json"), artifactBuffer(files.get("manifest.json")));
    await writeFile(join(staging, "index.html"), indexHtml(manifest), "utf8");
    await writeFile(join(staging, ".nojekyll"), "", "utf8");
    const retention = await enforceRetention(staging, manifest.manifestHash);

    if (await exists(backup)) throw new Error("Public backup path already exists");
    const hadPublic = await exists(publicDirectory);
    if (hadPublic) await rename(publicDirectory, backup);
    try {
      await rename(staging, publicDirectory);
    } catch (error) {
      if (hadPublic) await rename(backup, publicDirectory);
      throw error;
    }
    if (hadPublic) await rm(backup, { recursive: true, force: true });
    return retention;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export const PUBLIC_RETENTION = Object.freeze({
  maxBytes: MAX_PUBLISHED_BYTES,
  maxVersions: MAX_VERSION_COUNT,
  minVersions: MIN_VERSION_COUNT,
});

function validatePublicationMap(files, label) {
  if (!(files instanceof Map)) throw new TypeError(`${label} must be a Map`);
  for (const [path, content] of files) {
    if (!safeRelativePath(path)) throw new TypeError(`${label} contains an invalid path`);
    artifactBuffer(content);
  }
}

function mergePublicationFiles(defaults, optionalPacks) {
  validatePublicationMap(defaults, "Default publication");
  if (!(optionalPacks instanceof Map)) throw new TypeError("Optional publications must be a Map");
  const merged = new Map(defaults);
  for (const [packId, files] of optionalPacks) {
    if (typeof packId !== "string" || !packId) throw new TypeError("Optional pack ID is invalid");
    validatePublicationMap(files, `Optional publication ${packId}`);
    for (const [path, content] of files) {
      if (merged.has(path)) throw new Error(`Duplicate publication path: ${path}`);
      merged.set(path, content);
    }
  }
  return merged;
}

function parseCanonicalManifest(files, manifestPath, label) {
  const content = files.get(manifestPath);
  if (content === undefined) throw new Error(`${label} manifest is missing`);
  let manifest;
  try {
    manifest = JSON.parse(artifactBuffer(content).toString("utf8"));
  } catch {
    throw new Error(`${label} manifest is invalid JSON`);
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`${label} manifest is invalid`);
  }
  const { manifestHash, ...baseManifest } = manifest;
  if (!/^[0-9a-f]{64}$/u.test(manifestHash)
    || artifactSha256(canonicalJson(baseManifest)) !== manifestHash
    || !artifactBuffer(content).equals(artifactBuffer(canonicalJson(manifest)))) {
    throw new Error(`${label} manifest hash or canonical bytes are invalid`);
  }
  return manifest;
}

function verifyManifestFileClosure(files, manifest, manifestPath, expectedPaths, label) {
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) {
    throw new Error(`${label} manifest file records are empty`);
  }
  const expected = new Set(expectedPaths);
  const seen = new Set();
  for (const record of manifest.files) {
    if (!record || typeof record.path !== "string" || !safeRelativePath(record.path)
      || seen.has(record.path) || !expected.has(record.path)
      || !Number.isSafeInteger(record.bytes) || record.bytes < 0
      || !/^[0-9a-f]{64}$/u.test(record.sha256)) {
      throw new Error(`${label} manifest file records are invalid`);
    }
    const content = files.get(record.path);
    if (content === undefined || artifactBuffer(content).byteLength !== record.bytes
      || artifactSha256(content) !== record.sha256) {
      throw new Error(`${label} manifest file bytes changed: ${record.path}`);
    }
    seen.add(record.path);
  }
  if (seen.size !== expected.size || [...expected].some((path) => !seen.has(path))) {
    throw new Error(`${label} manifest file set is not closed`);
  }
  if (seen.has(manifestPath)) throw new Error(`${label} manifest must not hash itself`);
}

function verifyClientManifest(files, client, directory, basePrefix = "") {
  const prefix = basePrefix ? `${basePrefix}/${directory}` : directory;
  const manifestPath = `${prefix}/client-manifest.json`;
  const manifest = parseCanonicalManifest(files, manifestPath, `Client ${client}`);
  if (manifest.client !== client) throw new Error(`Client ${client} manifest identity is invalid`);
  const expectedPaths = [...files.keys()].filter((path) => path.startsWith(`${prefix}/`) && path !== manifestPath);
  verifyManifestFileClosure(files, manifest, manifestPath, expectedPaths, `Client ${client}`);
  return manifest;
}

function publicationChannel(basePrefix, explicitChannel = null) {
  if (explicitChannel !== null) {
    if (!FRONTIER_CHANNELS.includes(explicitChannel)) {
      throw new TypeError("Publication channel is unsupported");
    }
    return explicitChannel;
  }
  if (FRONTIER_CHANNELS.includes(basePrefix)) return basePrefix;
  return "current";
}

function assertPublicationChannelClosure(files, {
  channel,
  rootPrefix = null,
  immutableVersion = null,
} = {}) {
  assertChannelClosure({
    files,
    channel,
    rootPrefix: rootPrefix ?? channel,
    immutableVersion,
  });
}

function inferArtifactChannel(files) {
  for (const value of files.values()) {
    if (!(value instanceof Uint8Array) && typeof value !== "string") continue;
    const text = Buffer.from(value).toString("utf8");
    const match = text.match(/\/apple-proxy-profiles\/(edge|current|previous)\//u);
    if (match) return match[1];
  }
  return null;
}

function validateAnywhereHostedUrls(files, channel) {
  const defaultPattern = new RegExp(`^/apple-proxy-profiles/${channel}/anywhere/rules/[^/]+\\.arrs$`, "u");
  const optionalPattern = new RegExp(
    `^/apple-proxy-profiles/optional/[a-z0-9][a-z0-9-]*/${channel}/anywhere/[^/]+\\.arrs$`,
    "u",
  );
  const urlPattern = /https:\/\/[^\s"'<>`()]+/gu;
  for (const [path, value] of files) {
    if (!(value instanceof Uint8Array) && typeof value !== "string") continue;
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        typeof value === "string" ? Buffer.from(value) : value,
      );
    } catch {
      continue;
    }
    for (const raw of text.match(urlPattern) ?? []) {
      let url;
      try {
        url = new URL(raw);
      } catch {
        continue;
      }
      if (!url.pathname.includes("/apple-proxy-profiles/") || !url.pathname.includes("/anywhere/")) continue;
      if (url.protocol !== "https:" || url.hostname !== "juan-nikola.github.io"
        || url.username || url.password || url.port || url.search || url.hash
        || (!defaultPattern.test(url.pathname) && !optionalPattern.test(url.pathname))) {
        throw new Error(`Anywhere hosted URL is not closed to ${channel}: ${path}`);
      }
    }
  }
}

export function validateClientPublication({
  files,
  client,
  directory = CLIENT_PUBLIC_PATHS[client],
  basePrefix = "",
  expectedHash = null,
  channel = null,
  immutableVersion = null,
}) {
  validatePublicationMap(files, `Client publication ${client}`);
  if (!directory) throw new TypeError("Client publication identity is invalid");
  const manifest = verifyClientManifest(files, client, directory, basePrefix);
  if (expectedHash !== null && manifest.manifestHash !== expectedHash) {
    throw new Error(`Client ${client} manifest hash does not match selected rollout`);
  }
  const versionMatch = /^versions\/([0-9a-f]{64})$/u.exec(basePrefix);
  assertPublicationChannelClosure(files, {
    channel: publicationChannel(basePrefix, channel),
    rootPrefix: basePrefix || publicationChannel(basePrefix, channel),
    immutableVersion: immutableVersion ?? versionMatch?.[1] ?? null,
  });
  return manifest;
}

export function validateDefaultPublication({ defaults, manifest, channel = "current" }) {
  validatePublicationMap(defaults, "Default publication");
  const parsed = parseCanonicalManifest(defaults, "manifest.json", "Default publication");
  if (!manifest || parsed.manifestHash !== manifest.manifestHash
    || !artifactBuffer(defaults.get("manifest.json")).equals(artifactBuffer(canonicalJson(manifest)))) {
    throw new Error("Default publication manifest argument does not match emitted bytes");
  }
  const expectedPaths = [...defaults.keys()].filter((path) => path !== "manifest.json");
  verifyManifestFileClosure(defaults, parsed, "manifest.json", expectedPaths, "Default publication");
  const dashboardBytes = defaults.get(PUBLIC_AUDIT_DASHBOARD_PATH);
  if (dashboardBytes === undefined) throw new Error("Public audit dashboard manifest artifact is missing");
  let dashboard;
  try {
    dashboard = JSON.parse(artifactBuffer(dashboardBytes).toString("utf8"));
  } catch {
    throw new Error("Public audit dashboard is invalid JSON");
  }
  if (!artifactBuffer(dashboardBytes).equals(artifactBuffer(canonicalJson(dashboard)))) {
    throw new Error("Public audit dashboard bytes are not canonical");
  }
  validatePublicAuditDashboard(dashboard);
  for (const [client, { manifestHash }] of Object.entries(parsed.clients ?? {})) {
    const directory = CLIENT_PUBLIC_PATHS[client];
    const clientManifest = verifyClientManifest(defaults, client, directory);
    if (manifestHash !== clientManifest.manifestHash) {
      throw new Error(`Default publication client hash mismatch for ${client}`);
    }
  }
  validateAnywhereHostedUrls(defaults, channel);
  assertPublicationChannelClosure(defaults, { channel, rootPrefix: channel });
  return parsed;
}

export function validateOptionalPublication({ packId, files, channel = "current" }) {
  validatePublicationMap(files, `Optional publication ${packId}`);
  const prefix = `optional/${packId}`;
  if ([...files.keys()].some((path) => !path.startsWith(`${prefix}/`))) {
    throw new Error(`Optional publication ${packId} escaped its tree`);
  }
  const manifestPath = `${prefix}/manifest.json`;
  const manifest = parseCanonicalManifest(files, manifestPath, `Optional publication ${packId}`);
  if (manifest.packId !== packId) throw new Error(`Optional publication ${packId} identity is invalid`);
  const expectedPaths = [...files.keys()].filter((path) => path !== manifestPath);
  verifyManifestFileClosure(files, manifest, manifestPath, expectedPaths, `Optional publication ${packId}`);
  for (const [client, { manifestHash }] of Object.entries(manifest.clients ?? {})) {
    const directory = CLIENT_PUBLIC_PATHS[client];
    const clientManifest = verifyClientManifest(files, client, directory, prefix);
    if (manifestHash !== clientManifest.manifestHash) {
      throw new Error(`Optional publication ${packId} client hash mismatch for ${client}`);
    }
  }
  validateAnywhereHostedUrls(files, channel);
  assertPublicationChannelClosure(files, { channel, rootPrefix: prefix });
  return manifest;
}

export async function publishEdgeRelease({
  publicDirectory,
  defaults,
  optionalPacks,
  manifest,
  channel = null,
}) {
  const merged = mergePublicationFiles(defaults, optionalPacks);
  const selectedChannel = channel ?? inferArtifactChannel(defaults) ?? "edge";
  if (!FRONTIER_CHANNELS.includes(selectedChannel)) throw new TypeError("Publication channel is unsupported");
  validateDefaultPublication({ defaults, manifest, channel: selectedChannel });
  const edgeMerged = new Map(merged);
  const edgeRootManifest = manifest;
  const optionalManifests = new Map([...optionalPacks].map(([packId, files]) => [
    packId,
    validateOptionalPublication({ packId, files, channel: selectedChannel }),
  ]));
  for (const [client, directory] of Object.entries(CLIENT_PUBLIC_PATHS)) {
    const clientManifest = verifyClientManifest(defaults, client, directory);
    const expectedSelections = Object.fromEntries([...optionalManifests]
      .filter(([, optionalManifest]) => optionalManifest.clients[client] !== undefined)
      .map(([packId, optionalManifest]) => [packId, optionalManifest.clients[client].manifestHash]));
    if (canonicalJson(clientManifest.optionalPacks ?? {}) !== canonicalJson(expectedSelections)) {
      throw new Error(`Default client optional selection mismatch for ${client}`);
    }
  }
  const parent = dirname(publicDirectory);
  await mkdir(publicDirectory, { recursive: true });
  let rollout = null;
  const staging = await mkdtemp(join(parent, `.${basename(publicDirectory)}-edge-staging-`));
  const edgeDirectory = join(publicDirectory, "edge");
  const backup = join(publicDirectory, `.edge-backup-${manifest.manifestHash.slice(0, 12)}`);
  const rolloutPath = join(publicDirectory, "rollout.json");
  const rolloutBackup = null;
  let rolloutStageDirectory = null;
  let rolloutStagePath = null;
  try {
    if (rollout !== null) {
      rolloutStageDirectory = await mkdtemp(join(parent, `.${basename(publicDirectory)}-rollout-staging-`));
      rolloutStagePath = join(rolloutStageDirectory, "rollout.json");
      await writeFile(rolloutStagePath, `${JSON.stringify(rollout, null, 2)}\n`, "utf8");
    }
    await writeSnapshot(staging, edgeMerged);
    for (const [packId, optionalManifest] of optionalManifests) {
      for (const [client, { manifestHash: optionalHash }] of Object.entries(optionalManifest.clients)) {
        const directory = CLIENT_PUBLIC_PATHS[client];
        await cp(
          join(staging, "optional", packId, directory),
          join(staging, "optional-versions", packId, optionalHash, directory),
          { recursive: true, errorOnExist: true },
        );
      }
    }
    for (const [client, directory] of Object.entries(CLIENT_PUBLIC_PATHS)) {
      if (manifest.clients?.[client] === undefined) continue;
      const clientManifestPath = join(staging, directory, "client-manifest.json");
      const clientManifest = JSON.parse(await readFile(clientManifestPath, "utf8"));
      if (!/^[0-9a-f]{64}$/u.test(clientManifest.manifestHash)
        || clientManifest.manifestHash !== manifest.clients[client]?.manifestHash) {
        throw new Error(`Edge client manifest mismatch for ${client}`);
      }
      const immutable = join(staging, "clients", client, clientManifest.manifestHash);
      await mkdir(immutable, { recursive: true });
      await cp(join(staging, directory), join(immutable, directory), { recursive: true, errorOnExist: true });
      await writeFile(join(immutable, "client-manifest.json"), artifactBuffer(defaults.get(`${directory}/client-manifest.json`)));
    }

    const edgeFiles = await readArtifactTree(staging);
    validateAnywhereHostedUrls(edgeFiles, selectedChannel);
    assertChannelClosure({ files: edgeFiles, channel: selectedChannel, rootPrefix: "edge" });

    if (await exists(backup)) throw new Error("Edge backup path already exists");
    if (rolloutBackup !== null && await exists(rolloutBackup)) {
      throw new Error("Rollout backup path already exists");
    }
    const hadEdge = await exists(edgeDirectory);
    if (hadEdge) await rename(edgeDirectory, backup);
    let edgeInstalled = false;
    let rolloutInstalled = false;
    try {
      await rename(staging, edgeDirectory);
      edgeInstalled = true;
      if (rolloutStagePath !== null) {
        await rename(rolloutPath, rolloutBackup);
        await rename(rolloutStagePath, rolloutPath);
        rolloutInstalled = true;
      }
    } catch (error) {
      if (rolloutInstalled) await rm(rolloutPath, { force: true });
      if (rolloutBackup !== null && await exists(rolloutBackup)) {
        await rename(rolloutBackup, rolloutPath);
      }
      if (edgeInstalled) await rm(edgeDirectory, { recursive: true, force: true });
      if (hadEdge) await rename(backup, edgeDirectory);
      throw error;
    }
    if (hadEdge) await rm(backup, { recursive: true, force: true });
    if (rolloutBackup !== null) await rm(rolloutBackup, { force: true });
    if (rolloutStageDirectory !== null) await rm(rolloutStageDirectory, { recursive: true, force: true });
    return Object.freeze({
      files: edgeMerged.size,
      manifestHash: edgeRootManifest.manifestHash,
      defaultManifestHash: manifest.manifestHash,
    });
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (rolloutStageDirectory !== null) {
      await rm(rolloutStageDirectory, { recursive: true, force: true });
    }
    throw error;
  }
}

async function verifyImmutableClient(sourceDirectory, manifest, directory) {
  if (!Array.isArray(manifest.files)) throw new Error("Edge client manifest files are missing");
  const { manifestHash, ...baseManifest } = manifest;
  if (artifactSha256(canonicalJson(baseManifest)) !== manifestHash) {
    throw new Error("Edge client manifest hash is invalid");
  }
  for (const record of manifest.files) {
    if (!record || typeof record.path !== "string" || !record.path.startsWith(`${directory}/`)
      || !/^[0-9a-f]{64}$/u.test(record.sha256)) {
      throw new Error("Edge client manifest contains an invalid file record");
    }
    const content = await readFile(join(sourceDirectory, record.path));
    if (content.byteLength !== record.bytes || artifactSha256(content) !== record.sha256) {
      throw new Error(`Immutable edge client bytes changed: ${record.path}`);
    }
  }
  const manifestPath = join(sourceDirectory, "client-manifest.json");
  const expected = new Set(["client-manifest.json", ...manifest.files.map(({ path }) => path)]);
  const nestedManifest = `${directory}/client-manifest.json`;
  const actual = await relativeFiles(sourceDirectory);
  if (actual.includes(nestedManifest)) {
    if (!(await readFile(join(sourceDirectory, nestedManifest))).equals(await readFile(manifestPath))) {
      throw new Error("Immutable edge client manifest copies differ");
    }
    expected.add(nestedManifest);
  }
  const unexpected = actual.filter((path) => !expected.has(path));
  if (unexpected.length > 0 || actual.length !== expected.size) {
    throw new Error(`Immutable edge client contains an unexpected file: ${unexpected[0] ?? "missing manifest record"}`);
  }
}

async function verifiedChinaIpAuditEvidence({
  publicDirectory,
  client,
  manifestHash: approvedManifestHash,
  expectedAuditSha256,
  now,
}) {
  if (!/^[0-9a-f]{64}$/u.test(expectedAuditSha256)) {
    throw new Error("The approved client manifest does not bind the edge ChinaIP audit");
  }
  const edgeDirectory = join(publicDirectory, "edge");
  const manifestBytes = await readFile(join(edgeDirectory, "manifest.json"));
  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error("Edge root manifest is invalid JSON");
  }
  const { manifestHash, ...baseManifest } = manifest;
  if (!/^[0-9a-f]{64}$/u.test(manifestHash)
    || artifactSha256(canonicalJson(baseManifest)) !== manifestHash
    || !manifestBytes.equals(artifactBuffer(canonicalJson(manifest)))) {
    throw new Error("Edge root manifest hash or canonical bytes are invalid");
  }
  if (manifest.clients?.[client]?.manifestHash !== approvedManifestHash) {
    throw new Error("The edge root manifest does not bind the approved client manifest");
  }
  const records = Array.isArray(manifest.files)
    ? manifest.files.filter(({ path }) => path === CHINA_IP_AUDIT_PATH)
    : [];
  if (records.length !== 1) {
    throw new Error("ChinaIP audit is not present in the edge root manifest");
  }
  const [record] = records;
  if (!Number.isSafeInteger(record.bytes) || record.bytes < 1 || !/^[0-9a-f]{64}$/u.test(record.sha256)) {
    throw new Error("ChinaIP audit root manifest record is invalid");
  }
  if (record.sha256 !== expectedAuditSha256) {
    throw new Error("The approved client manifest does not bind the edge ChinaIP audit");
  }
  const bytes = await readFile(join(edgeDirectory, CHINA_IP_AUDIT_PATH));
  if (bytes.length !== record.bytes || artifactSha256(bytes) !== record.sha256) {
    throw new Error("ChinaIP audit bytes differ from the edge root manifest");
  }
  let report;
  try {
    report = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("ChinaIP audit report is invalid JSON");
  }
  if (!bytes.equals(artifactBuffer(canonicalJson(report)))) {
    throw new Error("ChinaIP audit report bytes are not canonical");
  }
  if (report.primary?.repository !== manifest.upstream?.repository
    || report.primary?.commit !== manifest.upstream?.commit
    || report.primary?.committedAt !== manifest.upstream?.committedAt) {
    throw new Error("ChinaIP audit primary provenance does not match the edge root upstream");
  }
  const validationTime = now instanceof Date ? now.getTime() : (
    typeof now === "number" ? now : Date.parse(now)
  );
  const generatedAt = Date.parse(report.generatedAt);
  if (!Number.isFinite(validationTime) || !Number.isFinite(generatedAt)) {
    throw new TypeError("ChinaIP audit promotion time is invalid");
  }
  if (generatedAt > validationTime) throw new Error("ChinaIP audit report is from the future");
  if (validationTime - generatedAt > CHINA_IP_AUDIT_MAX_AGE_MS) {
    throw new Error("ChinaIP audit report is stale");
  }
  validateChinaIpAuditForPromotion(report, new Date(validationTime));
  return bytes;
}

function emptyRollout() {
  const clients = () => Object.fromEntries(Object.keys(CLIENT_PUBLIC_PATHS).map((client) => [client, null]));
  const optionalClients = () => Object.fromEntries(OPTIONAL_CLIENTS.map((client) => [client, null]));
  return {
    schemaVersion: 2,
    clients: clients(),
    previous: clients(),
    optionalPacks: {},
    previousOptionalPacks: {},
    optionalClients,
  };
}

function knownClientSelections(value) {
  const selections = Object.fromEntries(Object.keys(CLIENT_PUBLIC_PATHS).map((client) => [client, null]));
  if (!value || typeof value !== "object" || Array.isArray(value)) return selections;
  for (const client of Object.keys(selections)) {
    if (Object.hasOwn(value, client)) selections[client] = value[client];
  }
  return selections;
}

function knownOptionalSelections(value) {
  const selections = Object.fromEntries(OPTIONAL_CLIENTS.map((client) => [client, null]));
  if (!value || typeof value !== "object" || Array.isArray(value)) return selections;
  for (const client of OPTIONAL_CLIENTS) {
    if (Object.hasOwn(value, client)) selections[client] = value[client];
  }
  return selections;
}

function knownOptionalPacks(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([packId, selections]) => [
    packId,
    knownOptionalSelections(selections),
  ]));
}

export async function sealPreviousRelease({ publicDirectory }) {
  if (typeof publicDirectory !== "string" || publicDirectory.length === 0) {
    throw new TypeError("Public directory is required");
  }
  const currentDirectory = join(publicDirectory, "current");
  if (!await exists(join(currentDirectory, "manifest.json"))) {
    throw new Error("Canonical current publication is required before sealing previous");
  }
  const parent = dirname(publicDirectory);
  const staging = await mkdtemp(join(parent, `.${basename(publicDirectory)}-seal-previous-`));
  const backup = `${publicDirectory}.seal-previous-backup`;
  try {
    await cp(publicDirectory, staging, { recursive: true, force: false, errorOnExist: false });
    await rm(join(staging, "previous"), { recursive: true, force: true });
    await cp(join(staging, "current"), join(staging, "previous"), { recursive: true, errorOnExist: true });
    await rewriteTreeChannel(join(staging, "previous"), "current", "previous");

    for (const client of activeClientIds()) {
      const directory = publicDirectoryForClient(client);
      if (await exists(join(staging, "previous", directory, "client-manifest.json"))) {
        await refreshClientManifest({ publicDirectory: staging, channel: "previous", client });
      }
    }
    if (await canRefreshChannel(join(staging, "previous"))) {
      await refreshPublishedAuditDashboard(join(staging, "previous"));
      await refreshChannelManifest({ publicDirectory: staging, channel: "previous" });
    }

    const optionalRoot = join(staging, "optional");
    if (await exists(optionalRoot)) {
      for (const packId of await readdir(optionalRoot, { withFileTypes: true })) {
        if (!packId.isDirectory()) continue;
        const optionalCurrent = join(optionalRoot, packId.name, "current");
        if (!await exists(optionalCurrent)) continue;
        const optionalPrevious = join(optionalRoot, packId.name, "previous");
        await rm(optionalPrevious, { recursive: true, force: true });
        await cp(optionalCurrent, optionalPrevious, { recursive: true, errorOnExist: true });
        await rewriteTreeChannel(optionalPrevious, "current", "previous");
        for (const client of activeClientIds()) {
          const clientDirectory = publicDirectoryForClient(client);
          const manifestPath = join(optionalPrevious, clientDirectory, "client-manifest.json");
          if (await exists(manifestPath)) {
            await refreshNestedClientManifest({
              treeRoot: join(optionalPrevious, clientDirectory),
              clientDirectory,
              manifestPath,
              recordPrefix: `optional/${packId.name}/${clientDirectory}`,
            });
          }
        }
      }
    }

    const rolloutPath = join(staging, "rollout.json");
    if (await exists(rolloutPath)) {
      let rollout;
      try {
        rollout = JSON.parse(await readFile(rolloutPath, "utf8"));
      } catch {
        throw new Error("Rollout metadata is invalid");
      }
      const previous = Object.fromEntries(activeClientIds().map((client) => [client, null]));
      for (const client of activeClientIds()) {
        const manifestPath = join(staging, "previous", publicDirectoryForClient(client), "client-manifest.json");
        if (await exists(manifestPath)) {
          const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
          previous[client] = manifest.manifestHash;
        }
      }
      rollout.previous = previous;
      await writeFile(rolloutPath, `${JSON.stringify(rollout, null, 2)}\n`, "utf8");
    }

    const previousFiles = await readArtifactTree(join(staging, "previous"));
    assertChannelClosure({ files: previousFiles, channel: "previous", rootPrefix: "previous" });
    if (await exists(optionalRoot)) {
      for (const packEntry of await readdir(optionalRoot, { withFileTypes: true })) {
        if (!packEntry.isDirectory()) continue;
        const previousDirectory = join(optionalRoot, packEntry.name, "previous");
        if (!await exists(previousDirectory)) continue;
        const optionalPreviousFiles = await readArtifactTree(previousDirectory);
        assertChannelClosure({ files: optionalPreviousFiles, channel: "previous", rootPrefix: "previous" });
      }
    }
    if (await exists(backup)) throw new Error("Previous seal backup path already exists");
    await rename(publicDirectory, backup);
    try {
      await rename(staging, publicDirectory);
    } catch (error) {
      await rename(backup, publicDirectory);
      throw error;
    }
    await rm(backup, { recursive: true, force: true });
    const manifest = await readFile(join(publicDirectory, "previous", "manifest.json"), "utf8");
    return Object.freeze({ manifestHash: JSON.parse(manifest).manifestHash, channel: "previous" });
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export async function promoteClientRelease({
  publicDirectory,
  client,
  expectedHash = null,
  manifestHash,
  now = new Date(),
  cleanupBackupImpl = (path) => rm(path, { recursive: true, force: true }),
}) {
  const directory = CLIENT_PUBLIC_PATHS[client];
  if (!activeClientIds().includes(client) || !directory) {
    throw new Error(`Client ${client} is not an active promotion target`);
  }
  const targetHash = expectedHash ?? manifestHash;
  const hadCurrentRoot = await exists(join(publicDirectory, "current"));
  if (expectedHash !== null && manifestHash !== undefined && expectedHash !== manifestHash) {
    throw new Error("Expected client manifest hash does not match legacy manifestHash");
  }
  if (!/^[0-9a-f]{64}$/u.test(targetHash)) {
    throw new TypeError("Client promotion target is invalid");
  }
  const immutableSource = join(publicDirectory, "edge", "clients", client, targetHash);
  const clientManifest = JSON.parse(await readFile(join(immutableSource, "client-manifest.json"), "utf8"));
  if (clientManifest.manifestHash !== targetHash) throw new Error("Edge client manifest hash does not match promotion target");
  const immutableFiles = await readArtifactTree(immutableSource);
  const candidateChannel = inferArtifactChannel(immutableFiles) ?? "edge";
  validateClientPublication({
    files: immutableFiles,
    client,
    directory,
    basePrefix: "",
    expectedHash: targetHash,
    channel: candidateChannel,
    immutableVersion: targetHash,
  });
  const chinaIpAudit = await verifiedChinaIpAuditEvidence({
    publicDirectory,
    client,
    manifestHash: targetHash,
    expectedAuditSha256: clientManifest.chinaIpAuditSha256,
    now,
  });
  await verifyImmutableClient(immutableSource, clientManifest, directory);
  const optionalPackIds = Object.keys(clientManifest.optionalPacks ?? {}).sort();
  const optionalManifests = new Map();
  for (const packId of optionalPackIds) {
    const optionalHash = clientManifest.optionalPacks[packId];
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(packId) || !/^[0-9a-f]{64}$/u.test(optionalHash)) {
      throw new Error("Immutable optional selection contains an invalid pack");
    }
    const prefix = `optional/${packId}`;
    const files = await readArtifactTree(join(
      publicDirectory,
      "edge",
      "optional-versions",
      packId,
      optionalHash,
    ), prefix);
    const optionalManifest = validateClientPublication({
      files,
      client,
      directory,
      basePrefix: prefix,
      expectedHash: optionalHash,
      channel: inferArtifactChannel(files) ?? candidateChannel,
    });
    optionalManifests.set(packId, optionalManifest);
  }

  const parent = dirname(publicDirectory);
  const staging = await mkdtemp(join(parent, `.${basename(publicDirectory)}-promote-staging-`));
  const backup = `${publicDirectory}.promote-backup-${client}-${targetHash.slice(0, 12)}`;
  try {
    await cp(publicDirectory, staging, { recursive: true, force: false, errorOnExist: false });
    const optionalRootForSeal = join(staging, "optional");
    if (await exists(optionalRootForSeal)) {
      for (const packEntry of await readdir(optionalRootForSeal, { withFileTypes: true })) {
        if (!packEntry.isDirectory()) continue;
        const optionalCurrent = join(optionalRootForSeal, packEntry.name, "current");
        if (!await exists(optionalCurrent)) continue;
        const optionalPrevious = join(optionalRootForSeal, packEntry.name, "previous");
        await rm(optionalPrevious, { recursive: true, force: true });
        await mkdir(dirname(optionalPrevious), { recursive: true });
        await cp(optionalCurrent, optionalPrevious, { recursive: true, errorOnExist: true });
        await rewriteTreeChannel(optionalPrevious, "current", "previous");
        for (const optionalClient of activeClientIds()) {
          const optionalClientDirectory = publicDirectoryForClient(optionalClient);
          const manifestPath = join(optionalPrevious, optionalClientDirectory, "client-manifest.json");
          if (await exists(manifestPath)) {
            await refreshNestedClientManifest({
              treeRoot: join(optionalPrevious, optionalClientDirectory),
              clientDirectory: optionalClientDirectory,
              manifestPath,
              recordPrefix: `optional/${packEntry.name}/${optionalClientDirectory}`,
            });
          }
        }
      }
    }
    const stagedSource = join(staging, "edge", "clients", client, targetHash, directory);
    const current = join(staging, "current", directory);
    const previous = join(staging, "previous", directory);
    await rm(previous, { recursive: true, force: true });
    if (await exists(current)) {
      await mkdir(dirname(previous), { recursive: true });
      await rename(current, previous);
      await rewriteTreeChannel(previous, "current", "previous");
      if (await exists(join(previous, "client-manifest.json"))) {
        await refreshNestedClientManifest({
          treeRoot: previous,
          clientDirectory: directory,
          manifestPath: join(previous, "client-manifest.json"),
          recordPrefix: directory,
        });
      }
    }
    await mkdir(dirname(current), { recursive: true });
    await cp(stagedSource, current, { recursive: true, errorOnExist: true });
    if (candidateChannel !== "current") {
      await rewriteTreeChannel(current, candidateChannel, "current");
    }
    await writeFile(join(current, "client-manifest.json"), artifactBuffer(await readFile(
      join(staging, "edge", "clients", client, targetHash, "client-manifest.json"),
    )));
    if (candidateChannel !== "current") {
      await refreshNestedClientManifest({
        treeRoot: current,
        clientDirectory: directory,
        manifestPath: join(current, "client-manifest.json"),
        recordPrefix: directory,
      });
    }
    if (!hadCurrentRoot || !await exists(join(staging, "current", CHINA_IP_AUDIT_PATH))) {
      const currentAudit = join(staging, "current", CHINA_IP_AUDIT_PATH);
      await mkdir(dirname(currentAudit), { recursive: true });
      await writeFile(currentAudit, chinaIpAudit);
    }
    for (const [packId] of optionalManifests) {
      const stableOptional = join(staging, "optional", packId, "current", directory);
      const previousOptional = join(staging, "optional", packId, "previous", directory);
      await rm(previousOptional, { recursive: true, force: true });
      if (await exists(stableOptional)) {
        await mkdir(dirname(previousOptional), { recursive: true });
        await rename(stableOptional, previousOptional);
        await rewriteTreeChannel(previousOptional, "current", "previous");
        if (await exists(join(previousOptional, "client-manifest.json"))) {
          await refreshNestedClientManifest({
            treeRoot: previousOptional,
            clientDirectory: directory,
            manifestPath: join(previousOptional, "client-manifest.json"),
            recordPrefix: `optional/${packId}/${directory}`,
          });
        }
      }
      await mkdir(dirname(stableOptional), { recursive: true });
      await cp(
        join(
          staging,
          "edge",
          "optional-versions",
          packId,
          optionalManifests.get(packId).manifestHash,
          directory,
        ),
        stableOptional,
        { recursive: true, errorOnExist: true },
      );
      if (candidateChannel !== "current") {
        await rewriteTreeChannel(stableOptional, candidateChannel, "current");
        await refreshNestedClientManifest({
          treeRoot: stableOptional,
          clientDirectory: directory,
          manifestPath: join(stableOptional, "client-manifest.json"),
          recordPrefix: `optional/${packId}/${directory}`,
        });
      }
    }

    const installedOptionalManifests = new Map();
    for (const [packId] of optionalManifests) {
      const installedPath = join(staging, "optional", packId, "current", directory, "client-manifest.json");
      if (await exists(installedPath)) {
        installedOptionalManifests.set(packId, JSON.parse(await readFile(installedPath, "utf8")));
      }
    }
    if (installedOptionalManifests.size > 0) {
      const currentManifestPath = join(current, "client-manifest.json");
      const currentManifest = JSON.parse(await readFile(currentManifestPath, "utf8"));
      const optionalSelections = Object.fromEntries([...installedOptionalManifests]
        .map(([packId, optionalManifest]) => [packId, optionalManifest.manifestHash]));
      const currentBase = { ...currentManifest, optionalPacks: optionalSelections };
      delete currentBase.manifestHash;
      await writeFile(join(current, "client-manifest.json"), canonicalJson({
        ...currentBase,
        manifestHash: artifactSha256(canonicalJson(currentBase)),
      }), "utf8");
    }
    const publishedClientManifest = JSON.parse(await readFile(
      join(current, "client-manifest.json"),
      "utf8",
    ));
    if (!/^[0-9a-f]{64}$/u.test(publishedClientManifest.manifestHash)) {
      throw new Error("Published current client manifest hash is invalid");
    }
    const publishedOptionalManifests = new Map(
      Object.entries(publishedClientManifest.optionalPacks ?? {})
        .map(([packId, hash]) => [packId, hash]),
    );

    let rollout = emptyRollout();
    try {
      rollout = JSON.parse(await readFile(join(staging, "rollout.json"), "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const sanitizedClients = knownClientSelections(rollout.clients);
    const sanitizedPrevious = knownClientSelections(rollout.previous);
    const sanitizedOptionalPacks = knownOptionalPacks(rollout.optionalPacks);
    const sanitizedPreviousOptionalPacks = knownOptionalPacks(rollout.previousOptionalPacks);
    const nextRollout = {
      schemaVersion: 2,
      clients: { ...sanitizedClients, [client]: publishedClientManifest.manifestHash },
      previous: { ...sanitizedPrevious, [client]: sanitizedClients[client] ?? null },
      optionalPacks: {
        ...sanitizedOptionalPacks,
        ...Object.fromEntries([...installedOptionalManifests].map(([packId, optionalManifest]) => [
          packId,
          {
            ...knownOptionalSelections(sanitizedOptionalPacks[packId]),
            [client]: publishedOptionalManifests.get(packId) ?? optionalManifest.manifestHash,
          },
        ])),
      },
      previousOptionalPacks: {
        ...sanitizedPreviousOptionalPacks,
        ...Object.fromEntries([...optionalManifests.keys()].map((packId) => [
          packId,
          {
            ...knownOptionalSelections(sanitizedPreviousOptionalPacks[packId]),
            [client]: sanitizedOptionalPacks[packId]?.[client] ?? null,
          },
        ])),
      },
    };
    await writeFile(join(staging, "rollout.json"), `${JSON.stringify(nextRollout, null, 2)}\n`, "utf8");
    if (await canRefreshChannel(join(staging, "current"))) {
      await refreshPublishedAuditDashboard(join(staging, "current"));
      const currentManifest = await refreshCurrentManifest({ publicDirectory: staging });
      await snapshotCurrentVersion(staging);
      await enforceRetention(staging, currentManifest.manifestHash);
    }
    if (await canRefreshChannel(join(staging, "previous"))) {
      await refreshPublishedAuditDashboard(join(staging, "previous"));
      await refreshChannelManifest({ publicDirectory: staging, channel: "previous" });
    }

    const currentFiles = await readArtifactTree(join(staging, "current"));
    assertChannelClosure({ files: currentFiles, channel: "current", rootPrefix: "current" });
    if (await exists(join(staging, "previous"))) {
      const previousFiles = await readArtifactTree(join(staging, "previous"));
      assertChannelClosure({ files: previousFiles, channel: "previous", rootPrefix: "previous" });
    }
    const optionalRoot = join(staging, "optional");
    if (await exists(optionalRoot)) {
      for (const packEntry of await readdir(optionalRoot, { withFileTypes: true })) {
        if (!packEntry.isDirectory()) continue;
        for (const channel of ["current", "previous"]) {
          const optionalDirectory = join(optionalRoot, packEntry.name, channel);
          if (!await exists(optionalDirectory)) continue;
          const optionalFiles = await readArtifactTree(optionalDirectory);
          assertChannelClosure({ files: optionalFiles, channel, rootPrefix: channel });
        }
      }
    }
    if (await exists(join(staging, "versions"))) {
      for (const record of await versionRecords(join(staging, "versions"))) {
        const versionFiles = await readArtifactTree(join(staging, "versions", record.name));
        assertChannelClosure({
          files: versionFiles,
          channel: "current",
          rootPrefix: `versions/${record.name}`,
          immutableVersion: record.name,
        });
      }
    }

    if (await exists(backup)) throw new Error("Promotion backup path already exists");
    await rename(publicDirectory, backup);
    try {
      await rename(staging, publicDirectory);
    } catch (error) {
      await rename(backup, publicDirectory);
      throw error;
    }
    let backupCleanupPending = false;
    try {
      await cleanupBackupImpl(backup);
    } catch {
      backupCleanupPending = true;
    }
    return Object.freeze({
      client,
      manifestHash: publishedClientManifest.manifestHash,
      sourceManifestHash: targetHash,
      previous: nextRollout.previous[client],
      backupCleanupPending,
      optionalPacks: Object.freeze(Object.fromEntries([...optionalManifests].map(([packId, optionalManifest]) => [
        packId,
        publishedOptionalManifests.get(packId) ?? optionalManifest.manifestHash,
      ]))),
      sourceOptionalPacks: Object.freeze(Object.fromEntries([...optionalManifests].map(([packId, optionalManifest]) => [
        packId,
        optionalManifest.manifestHash,
      ]))),
    });
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}
