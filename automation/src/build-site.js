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
import { canonicalJson } from "./render-anywhere-rules.js";

const MAX_PUBLISHED_BYTES = 750 * 1024 * 1024;
const MAX_VERSION_COUNT = 8;
const MIN_VERSION_COUNT = 2;

export const CLIENT_PUBLIC_PATHS = Object.freeze({
  singbox: "sing-box",
  surge: "surge",
  shadowrocket: "shadowrocket",
  egern: "egern",
  anywhere: "anywhere",
});

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
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

async function fileMatches(path, content) {
  try {
    return (await readFile(path)).equals(artifactBuffer(content));
  } catch {
    return false;
  }
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

async function enforceRetention(stagingDirectory) {
  const versionsDirectory = join(stagingDirectory, "versions");
  let versions = await versionRecords(versionsDirectory);
  for (const record of versions.slice(MAX_VERSION_COUNT)) {
    await rm(join(versionsDirectory, record.name), { recursive: true, force: true });
  }
  versions = versions.slice(0, MAX_VERSION_COUNT);
  let bytes = await directoryBytes(stagingDirectory);
  while (bytes > MAX_PUBLISHED_BYTES && versions.length > MIN_VERSION_COUNT) {
    const oldest = versions.pop();
    await rm(join(versionsDirectory, oldest.name), { recursive: true, force: true });
    bytes = await directoryBytes(stagingDirectory);
  }
  if (bytes > MAX_PUBLISHED_BYTES) throw new Error("Public site exceeds the 750 MiB retention limit");
  return { bytes, versionCount: versions.length };
}

function indexHtml(manifest) {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Apple Proxy Profiles</title></head>
<body><main><h1>Apple Proxy Profiles</h1><p>Blackmatrix7 commit: <code>${manifest.upstream.commit}</code></p><ul><li><a href="current/manifest.json">Current manifest</a></li><li><a href="edge/manifest.json">Frontier edge manifest</a></li><li><a href="current/frontier-manifest.json">Current frontier manifest</a></li><li><a href="previous/manifest.json">Previous manifest</a></li><li><a href="current/anywhere/import.html">Anywhere import</a></li><li><a href="current/surge/scripts/surge-profile-generator.js">Surge Sub-Store script</a></li><li><a href="current/sing-box/scripts/sing-box-config-generator.js">sing-box Sub-Store script</a></li></ul></main></body></html>
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

export async function buildSite({ publicDirectory, files, manifest, frontierFiles = null }) {
  if (!(files instanceof Map) || !manifest || !/^[0-9a-f]{64}$/u.test(manifest.manifestHash)) {
    throw new TypeError("Verified public artifacts are required");
  }
  if (frontierFiles !== null && !(frontierFiles instanceof Map)) {
    throw new TypeError("Frontier public artifacts must be a Map");
  }
  if (frontierFiles !== null) {
    for (const [path, content] of frontierFiles) {
      if (!safeRelativePath(path)) throw new TypeError("Frontier public artifact is invalid");
      if (!/^(?:edge|current)\//u.test(path)) throw new Error("Frontier public artifact must be scoped to edge or current");
    }
  }
  const currentDirectory = join(publicDirectory, "current");
  if (await exists(currentDirectory) && await snapshotMatches(currentDirectory, files)
    && (frontierFiles === null || await subsetMatches(publicDirectory, frontierFiles))
    && await fileMatches(join(publicDirectory, "index.html"), indexHtml(manifest))) {
    const versionsDirectory = join(publicDirectory, "versions");
    const versionDirectory = join(versionsDirectory, manifest.manifestHash);
    if (!await exists(versionDirectory) || !await snapshotMatches(versionDirectory, files)) {
      throw new Error("Immutable public version bytes changed or are missing");
    }
    const versions = await versionRecords(versionsDirectory);
    return { bytes: await directoryBytes(publicDirectory), versionCount: versions.length };
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
    await writeFile(join(staging, "manifest.json"), artifactBuffer(files.get("manifest.json")));
    await writeFile(join(staging, "index.html"), indexHtml(manifest), "utf8");
    await writeFile(join(staging, ".nojekyll"), "", "utf8");
    const retention = await enforceRetention(staging);

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

export function validateClientPublication({
  files,
  client,
  directory = CLIENT_PUBLIC_PATHS[client],
  basePrefix = "",
  expectedHash = null,
}) {
  validatePublicationMap(files, `Client publication ${client}`);
  if (!directory) throw new TypeError("Client publication identity is invalid");
  const manifest = verifyClientManifest(files, client, directory, basePrefix);
  if (expectedHash !== null && manifest.manifestHash !== expectedHash) {
    throw new Error(`Client ${client} manifest hash does not match selected rollout`);
  }
  return manifest;
}

export function validateDefaultPublication({ defaults, manifest }) {
  validatePublicationMap(defaults, "Default publication");
  const parsed = parseCanonicalManifest(defaults, "manifest.json", "Default publication");
  if (!manifest || parsed.manifestHash !== manifest.manifestHash
    || !artifactBuffer(defaults.get("manifest.json")).equals(artifactBuffer(canonicalJson(manifest)))) {
    throw new Error("Default publication manifest argument does not match emitted bytes");
  }
  const expectedPaths = [...defaults.keys()].filter((path) => path !== "manifest.json");
  verifyManifestFileClosure(defaults, parsed, "manifest.json", expectedPaths, "Default publication");
  for (const [client, directory] of Object.entries(CLIENT_PUBLIC_PATHS)) {
    const clientManifest = verifyClientManifest(defaults, client, directory);
    if (parsed.clients?.[client]?.manifestHash !== clientManifest.manifestHash) {
      throw new Error(`Default publication client hash mismatch for ${client}`);
    }
  }
  return parsed;
}

export function validateOptionalPublication({ packId, files }) {
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
  for (const [client, directory] of Object.entries(CLIENT_PUBLIC_PATHS)) {
    const clientManifest = verifyClientManifest(files, client, directory, prefix);
    if (manifest.clients?.[client]?.manifestHash !== clientManifest.manifestHash) {
      throw new Error(`Optional publication ${packId} client hash mismatch for ${client}`);
    }
  }
  return manifest;
}

export async function publishEdgeRelease({ publicDirectory, defaults, optionalPacks, manifest }) {
  const merged = mergePublicationFiles(defaults, optionalPacks);
  validateDefaultPublication({ defaults, manifest });
  const optionalManifests = new Map([...optionalPacks].map(([packId, files]) => [
    packId,
    validateOptionalPublication({ packId, files }),
  ]));
  for (const [client, directory] of Object.entries(CLIENT_PUBLIC_PATHS)) {
    const clientManifest = verifyClientManifest(defaults, client, directory);
    const expectedSelections = Object.fromEntries([...optionalManifests].map(([packId, optionalManifest]) => [
      packId,
      optionalManifest.clients[client].manifestHash,
    ]));
    if (canonicalJson(clientManifest.optionalPacks ?? {}) !== canonicalJson(expectedSelections)) {
      throw new Error(`Default client optional selection mismatch for ${client}`);
    }
  }
  const parent = dirname(publicDirectory);
  await mkdir(publicDirectory, { recursive: true });
  const staging = await mkdtemp(join(parent, `.${basename(publicDirectory)}-edge-staging-`));
  const edgeDirectory = join(publicDirectory, "edge");
  const backup = join(publicDirectory, `.edge-backup-${manifest.manifestHash.slice(0, 12)}`);
  try {
    await writeSnapshot(staging, merged);
    for (const [packId, optionalManifest] of optionalManifests) {
      for (const [client, directory] of Object.entries(CLIENT_PUBLIC_PATHS)) {
        const optionalHash = optionalManifest.clients[client].manifestHash;
        await cp(
          join(staging, "optional", packId, directory),
          join(staging, "optional-versions", packId, optionalHash, directory),
          { recursive: true, errorOnExist: true },
        );
      }
    }
    for (const [client, directory] of Object.entries(CLIENT_PUBLIC_PATHS)) {
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

    if (await exists(backup)) throw new Error("Edge backup path already exists");
    const hadEdge = await exists(edgeDirectory);
    if (hadEdge) await rename(edgeDirectory, backup);
    try {
      await rename(staging, edgeDirectory);
    } catch (error) {
      if (hadEdge) await rename(backup, edgeDirectory);
      throw error;
    }
    if (hadEdge) await rm(backup, { recursive: true, force: true });
    return Object.freeze({ files: merged.size, manifestHash: manifest.manifestHash });
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
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

function emptyRollout() {
  const clients = () => Object.fromEntries(Object.keys(CLIENT_PUBLIC_PATHS).map((client) => [client, null]));
  return {
    schemaVersion: 2,
    clients: clients(),
    previous: clients(),
    optionalPacks: {},
    previousOptionalPacks: {},
  };
}

export async function promoteClientRelease({ publicDirectory, client, manifestHash }) {
  const directory = CLIENT_PUBLIC_PATHS[client];
  if (!directory || !/^[0-9a-f]{64}$/u.test(manifestHash)) {
    throw new TypeError("Client promotion target is invalid");
  }
  const immutableSource = join(publicDirectory, "edge", "clients", client, manifestHash);
  const clientManifest = JSON.parse(await readFile(join(immutableSource, "client-manifest.json"), "utf8"));
  if (clientManifest.manifestHash !== manifestHash) throw new Error("Edge client manifest hash does not match promotion target");
  await verifyImmutableClient(immutableSource, clientManifest, directory);
  const optionalPackIds = Object.keys(clientManifest.optionalPacks ?? {}).sort();
  if (optionalPackIds.length === 0) throw new Error("Immutable optional selection is empty");
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
    });
    optionalManifests.set(packId, optionalManifest);
  }

  const parent = dirname(publicDirectory);
  const staging = await mkdtemp(join(parent, `.${basename(publicDirectory)}-promote-staging-`));
  const backup = `${publicDirectory}.promote-backup-${client}-${manifestHash.slice(0, 12)}`;
  try {
    await cp(publicDirectory, staging, { recursive: true, force: false, errorOnExist: false });
    const stagedSource = join(staging, "edge", "clients", client, manifestHash, directory);
    const current = join(staging, "current", directory);
    const previous = join(staging, "previous", directory);
    await rm(previous, { recursive: true, force: true });
    if (await exists(current)) {
      await mkdir(dirname(previous), { recursive: true });
      await rename(current, previous);
    }
    await mkdir(dirname(current), { recursive: true });
    await cp(stagedSource, current, { recursive: true, errorOnExist: true });
    await writeFile(join(current, "client-manifest.json"), artifactBuffer(await readFile(
      join(staging, "edge", "clients", client, manifestHash, "client-manifest.json"),
    )));
    for (const [packId] of optionalManifests) {
      const stableOptional = join(staging, "optional", packId, "current", directory);
      const previousOptional = join(staging, "optional", packId, "previous", directory);
      await rm(previousOptional, { recursive: true, force: true });
      if (await exists(stableOptional)) {
        await mkdir(dirname(previousOptional), { recursive: true });
        await rename(stableOptional, previousOptional);
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
    }

    let rollout = emptyRollout();
    try {
      rollout = JSON.parse(await readFile(join(staging, "rollout.json"), "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const nextRollout = {
      schemaVersion: 2,
      clients: { ...emptyRollout().clients, ...rollout.clients, [client]: manifestHash },
      previous: { ...emptyRollout().previous, ...rollout.previous, [client]: rollout.clients?.[client] ?? null },
      optionalPacks: {
        ...rollout.optionalPacks,
        ...Object.fromEntries([...optionalManifests].map(([packId, optionalManifest]) => [
          packId,
          {
            ...emptyRollout().clients,
            ...rollout.optionalPacks?.[packId],
            [client]: optionalManifest.manifestHash,
          },
        ])),
      },
      previousOptionalPacks: {
        ...rollout.previousOptionalPacks,
        ...Object.fromEntries([...optionalManifests.keys()].map((packId) => [
          packId,
          {
            ...emptyRollout().previous,
            ...rollout.previousOptionalPacks?.[packId],
            [client]: rollout.optionalPacks?.[packId]?.[client] ?? null,
          },
        ])),
      },
    };
    await writeFile(join(staging, "rollout.json"), `${JSON.stringify(nextRollout, null, 2)}\n`, "utf8");

    if (await exists(backup)) throw new Error("Promotion backup path already exists");
    await rename(publicDirectory, backup);
    try {
      await rename(staging, publicDirectory);
    } catch (error) {
      await rename(backup, publicDirectory);
      throw error;
    }
    await rm(backup, { recursive: true, force: true });
    return Object.freeze({
      client,
      manifestHash,
      previous: nextRollout.previous[client],
      optionalPacks: Object.freeze(Object.fromEntries([...optionalManifests].map(([packId, optionalManifest]) => [
        packId,
        optionalManifest.manifestHash,
      ]))),
    });
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}
