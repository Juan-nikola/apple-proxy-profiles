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

const MAX_PUBLISHED_BYTES = 750 * 1024 * 1024;
const MAX_VERSION_COUNT = 8;
const MIN_VERSION_COUNT = 2;

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
    if (!safeRelativePath(path) || typeof content !== "string") throw new TypeError("Public snapshot file is invalid");
    const destination = join(directory, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content, "utf8");
  }
}

async function subsetMatches(directory, files) {
  for (const [path, content] of files) {
    if (!safeRelativePath(path) || typeof content !== "string") return false;
    try {
      if (await readFile(join(directory, path), "utf8") !== content) return false;
    } catch {
      return false;
    }
  }
  return true;
}

async function fileMatches(path, content) {
  try {
    return await readFile(path, "utf8") === content;
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

async function enforceRetention(stagingDirectory, requiredVersion = null) {
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
<body><main><h1>Apple Proxy Profiles</h1><p>Blackmatrix7 commit: <code>${manifest.upstream.commit}</code></p><ul><li><a href="current/manifest.json">Current manifest</a></li><li><a href="edge/manifest.json">Frontier edge manifest</a></li><li><a href="current/frontier-manifest.json">Current frontier manifest</a></li><li><a href="previous/manifest.json">Previous manifest</a></li><li><a href="current/anywhere/import.html">Anywhere import</a></li><li><a href="current/surge/scripts/surge-profile-generator.js">Surge Sub-Store script</a></li><li><a href="current/sing-box/scripts/sing-box-config-generator.js">sing-box Sub-Store script</a></li></ul></main></body></html>
`;
}

export async function snapshotMatches(directory, files) {
  for (const [path, content] of files) {
    try {
      if (await readFile(join(directory, path), "utf8") !== content) return false;
    } catch {
      return false;
    }
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
      if (!safeRelativePath(path) || typeof content !== "string") throw new TypeError("Frontier public artifact is invalid");
      if (!/^(?:edge|current)\//u.test(path)) throw new Error("Frontier public artifact must be scoped to edge or current");
    }
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
    await writeFile(join(staging, "manifest.json"), files.get("manifest.json"), "utf8");
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
