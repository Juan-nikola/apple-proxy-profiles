import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertNoForbiddenDefaultReferences,
  buildClientArtifacts,
} from "../automation/src/build-artifacts.js";
import { artifactBuffer } from "../automation/src/artifact-content.js";
import {
  promoteClientRelease as promoteClientReleaseImpl,
  publishEdgeRelease,
  snapshotMatches,
  validateClientPublication,
  validateOptionalPublication,
} from "../automation/src/build-site.js";
import { fetchSnapshot } from "../automation/src/fetch-snapshot.js";
import { resolveUpstreamCommit } from "../automation/src/resolve-upstream.js";
import {
  BLACKMATRIX7_BASELINE,
  FETCH_SOURCE_CATALOG,
} from "../automation/src/source-catalog.js";
import { buildImportBatches, renderImportPage } from "../clients/anywhere/src/build-import-page.js";
import { UPSTREAM_RULE_SOURCE_CATALOG } from "../shared/rules/catalog.js";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const defaultPublicDirectory = join(repositoryRoot, "public");
const PROMOTION_CLIENTS = new Set(["singbox", "surge", "shadowrocket", "egern", "anywhere"]);

export function parseUpdateRulesArguments(args) {
  if (JSON.stringify(args) === JSON.stringify(["--channel", "edge"])) {
    return Object.freeze({ operation: "build-edge" });
  }
  if (JSON.stringify(args) === JSON.stringify(["--check", "--channel", "current"])) {
    return Object.freeze({ operation: "check-current" });
  }
  if (args.length === 3 && args[0] === "--promote" && PROMOTION_CLIENTS.has(args[1])
    && /^[0-9a-f]{64}$/u.test(args[2])) {
    return Object.freeze({ operation: "promote", client: args[1], manifestHash: args[2] });
  }
  throw new Error("Invalid update-rules arguments; use --channel edge, --check --channel current, or --promote <client> <manifest-hash>");
}

export async function promoteClientRelease(options) {
  return promoteClientReleaseImpl(options);
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

async function readPublicationTree(directory, prefix = "") {
  const files = new Map();
  for (const path of await relativeFiles(directory)) {
    files.set(prefix ? `${prefix}/${path}` : path, await readFile(join(directory, path)));
  }
  return files;
}

async function selectedClientMatches({ directory, basePrefix = "", client, clientDirectory, expectedHash }) {
  if (!/^[0-9a-f]{64}$/u.test(expectedHash) || !await pathExists(directory)) return false;
  try {
    const treePrefix = basePrefix ? `${basePrefix}/${clientDirectory}` : clientDirectory;
    const files = await readPublicationTree(directory, treePrefix);
    validateClientPublication({
      files,
      client,
      directory: clientDirectory,
      basePrefix,
      expectedHash,
    });
    return true;
  } catch {
    return false;
  }
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
    "sing-box/examples/sing-box-openwrt.json",
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

export async function verifyTrackedPublications({ publicDirectory, defaults, optionalPacks }) {
  let rollout = null;
  try {
    rollout = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") return false;
  }
  if (rollout === null) {
    if (!await snapshotMatches(join(publicDirectory, "current"), defaults)) return false;
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

  const currentDirectory = join(publicDirectory, "current");
  const clientDirectories = {
    singbox: "sing-box",
    surge: "surge",
    shadowrocket: "shadowrocket",
    egern: "egern",
    anywhere: "anywhere",
  };
  const clientPrefixes = new Set(Object.values(clientDirectories).map((directory) => `${directory}/`));
  for (const [path, content] of defaults) {
    if ([...clientPrefixes].some((prefix) => path.startsWith(prefix))) continue;
    try {
      if (!(await readFile(join(currentDirectory, path))).equals(artifactBuffer(content))) return false;
    } catch {
      return false;
    }
  }
  for (const [client, clientDirectory] of Object.entries(clientDirectories)) {
    const selectedHash = rollout.clients[client];
    if (selectedHash === null || selectedHash === undefined) {
      if (!await snapshotMatches(
        join(currentDirectory, clientDirectory),
        clientTreeFiles(clientDirectory, defaults),
      )) return false;
      continue;
    }
    if (!await selectedClientMatches({
      directory: join(currentDirectory, clientDirectory),
      client,
      clientDirectory,
      expectedHash: selectedHash,
    })) return false;
  }

  for (const [packId, files] of optionalPacks) {
    validateOptionalPublication({ packId, files });
  }
  for (const [packId, selections] of Object.entries(rollout.optionalPacks)) {
    if (!selections || typeof selections !== "object" || Array.isArray(selections)) return false;
    for (const [client, clientDirectory] of Object.entries(clientDirectories)) {
      const selectedHash = selections[client];
      if (selectedHash === null || selectedHash === undefined) continue;
      const basePrefix = `optional/${packId}`;
      if (!await selectedClientMatches({
        directory: join(publicDirectory, "optional", packId, "current", clientDirectory),
        basePrefix,
        client,
        clientDirectory,
        expectedHash: selectedHash,
      })) return false;
    }
  }
  return true;
}

async function loadText(path) {
  return readFile(join(repositoryRoot, path), "utf8");
}

async function staticFiles() {
  const paths = [
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
    ["surge/examples/surge-macos.conf", "clients/surge/examples/surge-macos.conf"],
    ["surge/examples/surge-iphone.conf", "clients/surge/examples/surge-iphone.conf"],
    ["surge/examples/surge-ipad.conf", "clients/surge/examples/surge-ipad.conf"],
    ["sing-box/scripts/sing-box-config-generator.js", "clients/sing-box/dist/sing-box-config-generator.js"],
    ["sing-box/scripts/substore-config-generator.js", "clients/sing-box/dist/substore-config-generator.js"],
    ["sing-box/examples/sing-box-macos.json", "clients/sing-box/examples/sing-box-macos.json"],
    ["sing-box/examples/sing-box-iphone.json", "clients/sing-box/examples/sing-box-iphone.json"],
    ["sing-box/examples/sing-box-ipad.json", "clients/sing-box/examples/sing-box-ipad.json"],
    ["sing-box/examples/sing-box-android.json", "clients/sing-box/examples/sing-box-android.json"],
    ["sing-box/examples/sing-box-openwrt.json", "clients/sing-box/examples/sing-box-openwrt.json"],
    ["LICENSE", "LICENSE"],
    ["THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md"],
  ];
  const loaded = new Map(await Promise.all(paths.map(async ([publicPath, localPath]) => [publicPath, await loadText(localPath)])));
  const rawRoot = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket";
  const publicRoot = "https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/rules";
  for (const bundlePath of [
    "shadowrocket/scripts/shadowrocket-profile-generator.js",
    "shadowrocket/scripts/substore-profile-generator.js",
    "egern/scripts/egern-profile-generator.js",
    "egern/scripts/substore-profile-generator.js",
  ]) {
    const bundle = loaded.get(bundlePath);
    const rewrittenBundle = bundle
      .replace(`var RULE_ROOT = "${rawRoot}";`, `var RULE_ROOT = "${publicRoot}";`)
      .replace("upstreamUrl: `${RULE_ROOT}/${sourcePath}`", "upstreamUrl: `${RULE_ROOT}/${id}.list`");
    if (rewrittenBundle === bundle || rewrittenBundle.includes(rawRoot)
      || !rewrittenBundle.includes("`${RULE_ROOT}/${id}.list`")) {
      throw new Error(`Public bundle URL closure failed for ${bundlePath}`);
    }
    loaded.set(bundlePath, rewrittenBundle);
  }

  for (const path of [
    "shadowrocket/examples/shadowrocket-macos.conf",
    "shadowrocket/examples/shadowrocket-iphone.conf",
    "shadowrocket/examples/shadowrocket-ipad.conf",
  ]) {
    let content = loaded.get(path);
    let replacements = 0;
    for (const source of UPSTREAM_RULE_SOURCE_CATALOG) {
      const next = content.replaceAll(
        source.upstreamUrl,
        `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/rules/${source.id}.list`,
      );
      if (next !== content) replacements += 1;
      content = next;
    }
    if (replacements !== UPSTREAM_RULE_SOURCE_CATALOG.length) {
      throw new Error(`Shadowrocket public snapshot URL closure failed for ${path}`);
    }
    loaded.set(path, content);
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

async function buildArtifacts({ operation, publicDirectory }) {
  let commit;
  let committedAt;
  if (operation === "check-current") {
    const currentManifest = JSON.parse(await readFile(join(publicDirectory, "current/manifest.json"), "utf8"));
    commit = currentManifest.upstream.commit;
    committedAt = currentManifest.upstream.committedAt;
  } else {
    ({ sha: commit, committedAt } = await resolveUpstreamCommit());
  }
  const upstream = Object.freeze({ ...BLACKMATRIX7_BASELINE, commit, committedAt });
  const snapshot = await fetchSnapshot({ commit, catalog: FETCH_SOURCE_CATALOG, concurrency: 4 });
  const statics = await staticFiles();
  return buildClientArtifacts({
    snapshot,
    upstream,
    additionalFiles(anywhereManifest) {
      const additions = new Map(statics);
      additions.set("anywhere/import.html", renderImportPage(
        buildImportBatches(anywhereManifest.shards.map(({ url }) => url)),
        anywhereManifest,
      ));
      return additions;
    },
  });
}

export async function main(args = process.argv.slice(2), { publicDirectory = defaultPublicDirectory } = {}) {
  const command = parseUpdateRulesArguments(args);
  if (command.operation === "promote") {
    const result = await promoteClientRelease({ publicDirectory, ...command });
    process.stdout.write(`Client promoted: ${result.client} ${result.manifestHash}\n`);
    return result;
  }

  const artifacts = await buildArtifacts({ operation: command.operation, publicDirectory });
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
