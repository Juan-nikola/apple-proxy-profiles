import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { artifactSha256 } from "./artifact-content.js";
import { buildRoutingPlanAudit } from "./routing-plan-audit.js";
import { canonicalJson } from "./render-anywhere-rules.js";
import { parseSurgeRules } from "./parse-surge.js";
import { orderedRoutingPlan } from "../../shared/rules/lightweight-policy.js";
import { activeClientIds, publicDirectoryForClient } from "../../shared/release/client-catalog.js";

const CLIENT_DIRECTORIES = Object.freeze(Object.fromEntries(
  activeClientIds().map((client) => [client, publicDirectoryForClient(client)]),
));

const ROUTING_PREFIXES = Object.freeze([
  "surge/rules/",
  "sing-box/rule-sets/",
  "anywhere/rules/",
  "egern/rules/",
  "clash/rules/",
]);

const ARCHIVE_PREFIXES = Object.freeze([
  "clients/",
  "optional/",
  "optional-versions/",
]);

const CLIENT_RULE_PREFIXES = Object.freeze({
  shadowrocket: ["shadowrocket/rules/"],
  surge: ["surge/rules/"],
  egern: ["egern/rules/"],
  clash: ["clash/rules/"],
  singbox: [
    "sing-box/rules/",
    "sing-box/rule-sets/",
    "sing-box/mobile-rule-sets/",
  ],
  anywhere: ["anywhere/rules/"],
  happ: [],
  v2box: [],
  v2rayn: [],
});
const SHA256 = /^[0-9a-f]{64}$/u;
const PUBLIC_CHANNEL_URL_RE = /(https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles\/)(?:current|previous|edge)(\/)/gu;

function safeChannel(value) {
  if (value !== "current" && value !== "previous" && value !== "edge") {
    throw new TypeError("Publication channel must be current, previous, or edge");
  }
  return value;
}

async function treeFiles(root, current = "") {
  const found = [];
  for (const entry of await readdir(join(root, current), { withFileTypes: true })) {
    const relative = current ? `${current}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...await treeFiles(root, relative));
    else if (entry.isFile()) found.push(relative);
    else throw new Error("Publication tree contains a non-regular entry");
  }
  return found;
}

function fileRecords(files) {
  return [...files].map(([path, content]) => Object.freeze({
    path,
    bytes: content.byteLength ?? content.length,
    sha256: artifactSha256(content),
  })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

async function channelTreeRecords(directory) {
  const paths = await treeFiles(directory);
  const records = [];
  for (const path of paths) {
    if (path === "manifest.json") continue;
    if (ARCHIVE_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;
    const content = await readFile(join(directory, path));
    records.push(Object.freeze({ path, bytes: content.byteLength, sha256: artifactSha256(content) }));
  }
  return records.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

function parseCanonicalManifest(bytes, label) {
  const manifest = JSON.parse(bytes.toString("utf8"));
  const { manifestHash, ...base } = manifest;
  if (!/^[0-9a-f]{64}$/u.test(manifestHash)
    || artifactSha256(canonicalJson(base)) !== manifestHash
    || !bytes.equals(Buffer.from(canonicalJson(manifest), "utf8"))) {
    throw new Error(`${label} manifest hash or canonical bytes are invalid`);
  }
  return manifest;
}

function referencedBytesForClient(records, client) {
  if (client === "incy") {
    return records
      .filter(({ path }) => path.startsWith("incy/") && !path.endsWith("/client-manifest.json"))
      .reduce((sum, { bytes }) => sum + bytes, 0);
  }
  const prefixes = CLIENT_RULE_PREFIXES[client];
  if (!prefixes) throw new Error(`Unknown client: ${client}`);
  if (prefixes.length === 0) return 0;
  return records
    .filter(({ path }) => (
      prefixes.some((prefix) => path.startsWith(prefix)) && !path.endsWith("/manifest.json")
    ))
    .reduce((sum, { bytes }) => sum + bytes, 0);
}

async function buildRoutingAudit(directory) {
  const plan = orderedRoutingPlan({ adblockMode: "off" });
  const ruleSets = new Map();
  const rulesDirectory = join(directory, "surge", "rules");
  const names = (await treeFiles(rulesDirectory)).filter((name) => name.endsWith(".list")).sort();
  for (const name of names) {
    const id = name.slice(0, -".list".length);
    const text = await readFile(join(rulesDirectory, name), "utf8");
    ruleSets.set(id, parseSurgeRules(text, { id, inputFormat: "RULE-SET", minEntries: 0 }));
  }
  return buildRoutingPlanAudit({ plan, ruleSets });
}

async function assertRoutingBytesMatch(edgeDirectory) {
  const currentDirectory = join(dirname(edgeDirectory), "current");
  const edgePaths = (await treeFiles(edgeDirectory)).sort();
  for (const prefix of ROUTING_PREFIXES) {
    const currentPaths = (await treeFiles(currentDirectory)).filter((path) => path.startsWith(prefix)).sort();
    const edge = edgePaths.filter((path) => path.startsWith(prefix)).sort();
    if (JSON.stringify(currentPaths) !== JSON.stringify(edge)) {
      throw new Error(`Current routing bytes diverge from edge under ${prefix}`);
    }
    for (const path of currentPaths) {
      const currentBytes = normalizeRoutingBytes(await readFile(join(currentDirectory, path)));
      const edgeBytes = normalizeRoutingBytes(await readFile(join(edgeDirectory, path)));
      if (artifactSha256(currentBytes) !== artifactSha256(edgeBytes)) {
        throw new Error(`Current routing bytes diverge from edge: ${path}`);
      }
    }
  }
}

function normalizeRoutingBytes(bytes) {
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return bytes;
  }
  return Buffer.from(text.replace(PUBLIC_CHANNEL_URL_RE, "$1edge$2"), "utf8");
}

/**
 * Rebuilds the canonical root manifest for one published channel from the
 * channel tree itself. Metadata that only the full compiler knows (upstream,
 * diagnostics, catalog digest) is preserved from the existing channel
 * manifest, while file records, client manifest hashes, and referenced rule
 * bytes are recomputed from the tree.
 */
export async function refreshChannelManifest({ publicDirectory, channel }) {
  safeChannel(channel);
  const directory = join(publicDirectory, channel);
  const existing = parseCanonicalManifest(
    await readFile(join(directory, "manifest.json")),
    channel,
  );
  const records = await channelTreeRecords(directory);
  const clients = {};
  for (const [client, clientDirectory] of Object.entries(CLIENT_DIRECTORIES)) {
    const clientManifestPath = `${clientDirectory}/client-manifest.json`;
    const record = records.find(({ path }) => path === clientManifestPath);
    if (!record) throw new Error(`Missing ${clientManifestPath}`);
    const clientManifest = JSON.parse((await readFile(join(directory, clientManifestPath))).toString("utf8"));
    if (!/^[0-9a-f]{64}$/u.test(clientManifest.manifestHash)) {
      throw new Error(`Invalid client manifest hash: ${clientManifestPath}`);
    }
    clients[client] = {
      manifestHash: clientManifest.manifestHash,
      referencedDefaultBytes: referencedBytesForClient(records, client),
    };
  }
  const base = {
    schemaVersion: 2,
    generatedAt: existing.generatedAt,
    upstream: existing.upstream,
    catalogSha256: existing.catalogSha256,
    ...(existing.clientStates === undefined ? {} : { clientStates: existing.clientStates }),
    clients,
    diagnostics: existing.diagnostics,
    files: records,
  };
  const manifest = Object.freeze({
    ...base,
    manifestHash: artifactSha256(canonicalJson(base)),
  });
  await writeFile(join(directory, "manifest.json"), canonicalJson(manifest), "utf8");
  return manifest;
}

/**
 * Rebuilds a client-manifest.json from the client tree, preserving the
 * existing generatedAt, optional pack selections, and ChinaIP audit identity.
 */
export async function refreshClientManifest({ publicDirectory, channel, client }) {
  safeChannel(channel);
  const clientDirectory = CLIENT_DIRECTORIES[client];
  if (!clientDirectory) throw new Error(`Unknown client: ${client}`);
  const directory = join(publicDirectory, channel, clientDirectory);
  const manifestPath = join(directory, "client-manifest.json");
  const existing = JSON.parse((await readFile(manifestPath)).toString("utf8"));
  const records = [];
  for (const path of await treeFiles(directory)) {
    if (path === "client-manifest.json") continue;
    const content = await readFile(join(directory, path));
    records.push(Object.freeze({
      path: `${clientDirectory}/${path}`,
      bytes: content.byteLength,
      sha256: artifactSha256(content),
    }));
  }
  records.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const base = {
    schemaVersion: 1,
    client: existing.client,
    generatedAt: existing.generatedAt,
    ...(existing.optionalPacks === undefined ? {} : { optionalPacks: existing.optionalPacks }),
    ...(existing.chinaIpAuditSha256 === undefined ? {} : { chinaIpAuditSha256: existing.chinaIpAuditSha256 }),
    ...(existing.sharedAssets === undefined ? {} : { sharedAssets: existing.sharedAssets }),
    files: records,
  };
  const manifest = Object.freeze({
    ...base,
    manifestHash: artifactSha256(canonicalJson(base)),
  });
  await writeFile(manifestPath, canonicalJson(manifest), "utf8");
  return manifest;
}

async function pathExists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns true when a channel tree is complete enough for a metadata refresh:
 * a root manifest plus every client-manifest.json.
 */
export async function canRefreshChannel(directory) {
  if (!await pathExists(join(directory, "manifest.json"))) return false;
  for (const clientDirectory of Object.values(CLIENT_DIRECTORIES)) {
    if (!await pathExists(join(directory, clientDirectory, "client-manifest.json"))) return false;
  }
  return true;
}

/**
 * Repairs a stale current root manifest and routing-plan audit from the
 * current tree. When adoptEdgeMetadata is true, the function first proves the
 * routing bytes match edge and adopts edge's upstream/diagnostics identity;
 * otherwise the existing current manifest metadata is preserved.
 */
export async function refreshCurrentManifest({ publicDirectory, adoptEdgeMetadata = false } = {}) {
  const currentDirectory = join(publicDirectory, "current");
  if (adoptEdgeMetadata) {
    const edgeDirectory = join(publicDirectory, "edge");
    const edgeManifest = parseCanonicalManifest(
      await readFile(join(edgeDirectory, "manifest.json")),
      "edge",
    );
    await assertRoutingBytesMatch(edgeDirectory);
    const manifest = await refreshChannelManifest({ publicDirectory, channel: "current" });
    const existingCurrent = parseCanonicalManifest(
      await readFile(join(currentDirectory, "manifest.json")),
      "current",
    );
    const base = {
      schemaVersion: 2,
      generatedAt: edgeManifest.generatedAt,
      upstream: edgeManifest.upstream,
    catalogSha256: edgeManifest.catalogSha256,
      ...(edgeManifest.clientStates === undefined
        ? (existingCurrent.clientStates === undefined ? {} : { clientStates: existingCurrent.clientStates })
        : { clientStates: edgeManifest.clientStates }),
      clients: existingCurrent.clients,
      diagnostics: edgeManifest.diagnostics,
      files: existingCurrent.files,
    };
    const adopted = Object.freeze({
      ...base,
      manifestHash: artifactSha256(canonicalJson(base)),
    });
    await writeFile(join(currentDirectory, "manifest.json"), canonicalJson(adopted), "utf8");
    await writeFile(
      join(currentDirectory, "audit", "routing-plan.json"),
      canonicalJson(await buildRoutingAudit(currentDirectory)),
      "utf8",
    );
    return adopted;
  }
  const manifest = await refreshChannelManifest({ publicDirectory, channel: "current" });
  await writeFile(
    join(currentDirectory, "audit", "routing-plan.json"),
    canonicalJson(await buildRoutingAudit(currentDirectory)),
    "utf8",
  );
  return manifest;
}
