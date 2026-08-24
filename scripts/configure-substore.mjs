import { chmod, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkSubstoreTaskUrl } from "./check-substore-task.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const PRIVATE_CONFIG_PATH = resolve(ROOT, "secrets/substore.private.json");
const PUBLIC_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";
const CHANNELS = Object.freeze(["edge", "current", "previous"]);
const HAPP_PUBLIC_CHANNEL = "current";
const COLLECTIONS = Object.freeze([
  "apple-proxy-all",
  "apple-proxy-egern",
  "apple-proxy-anywhere",
  "apple-proxy-shadowrocket",
  "apple-proxy-surge",
  "apple-proxy-singbox",
  "apple-proxy-onexray",
  "apple-proxy-happ",
  "apple-proxy-v2rayn",
  "apple-proxy-v2box",
]);
const HAPP_PLATFORMS = Object.freeze(["macos", "iphone", "ipad", "android", "windows", "linux"]);

function assertChannel(channel) {
  if (!CHANNELS.includes(channel)) throw new Error(`channel must be one of ${CHANNELS.join(", ")}`);
  return channel;
}

function assertSourceUrl(sourceUrl) {
  if (typeof sourceUrl !== "string" || sourceUrl.trim() !== sourceUrl || sourceUrl.length === 0) {
    throw new Error("sourceUrl must be a non-empty URL");
  }
  let parsed;
  try { parsed = new URL(sourceUrl); } catch { throw new Error("sourceUrl must be a valid URL"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new Error("sourceUrl must use https without userinfo");
  }
  return sourceUrl;
}

function base(channel, client, script) {
  return `${PUBLIC_ROOT}/${assertChannel(channel)}/${client}/scripts/${script}`;
}

function fragment(options) {
  return Object.entries(options)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
}

function remoteTask(name, client, url, extra = {}) {
  return Object.freeze({ name, client, kind: "remote-js", url, ...extra });
}

function nodeTask(name, client, channel, collection) {
  const script = client === "shadowrocket"
    ? "shadowrocket-node-subscription.js"
    : client === "surge"
      ? "surge-nodes-generator.js"
      : ["v2rayn", "v2box"].includes(client)
        ? "substore-node-generator.js"
      : `${client}-node-generator.js`;
  return remoteTask(
    name,
    client,
    `${base(channel, client, script)}#${fragment({ output: "nodes", type: "collection", name: collection, clientChain: "off", channel })}`,
    { output: "nodes", collection, channel },
  );
}

function configTask(name, client, script, channel, collection, platform, subscriptionName, extra = {}, metadata = {}) {
  const options = {
    output: "config",
    type: "collection",
    name: collection,
    subscriptionName,
    platform,
    channel,
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: platform === "macos" ? "ipv4-only" : "auto",
    autoGroupMode: "auto",
    clientChain: "off",
    ...extra,
  };
  const { omitKeys = [], ...taskMetadata } = metadata;
  for (const key of omitKeys) delete options[key];
  return remoteTask(name, client, `${base(channel, client, script)}#${fragment(options)}`, {
    output: "config", collection, platform, channel, policyInput: "apple-proxy-policy", ...taskMetadata,
  });
}

export function canonicalTaskCatalog(channel = "current") {
  assertChannel(channel);
  const tasks = [
    nodeTask("egern-nodes", "egern", channel, "apple-proxy-egern"),
    configTask("egern-macos", "egern", "egern-profile-generator.js", channel, "apple-proxy-egern", "macos", "Apple-Proxy-Egern", { nodeSubscriptionUrl: "<PRIVATE_EGERN_NODES_URL>" }),
    configTask("egern-iphone", "egern", "egern-profile-generator.js", channel, "apple-proxy-egern", "iphone", "Apple-Proxy-Egern", { nodeSubscriptionUrl: "<PRIVATE_EGERN_NODES_URL>" }),
    configTask("egern-ipad", "egern", "egern-profile-generator.js", channel, "apple-proxy-egern", "ipad", "Apple-Proxy-Egern", { nodeSubscriptionUrl: "<PRIVATE_EGERN_NODES_URL>" }),
    nodeTask("anywhere-nodes", "anywhere", channel, "apple-proxy-anywhere"),
    remoteTask("anywhere-strategy", "anywhere", `${base(channel, "anywhere", "anywhere-strategy-generator.js")}#${fragment({ output: "strategy", type: "collection", name: "apple-proxy-anywhere", channel })}`, { output: "strategy", collection: "apple-proxy-anywhere", channel, policyInput: "apple-proxy-policy" }),
    nodeTask("shadowrocket-nodes", "shadowrocket", channel, "apple-proxy-shadowrocket"),
    configTask("shadowrocket-config-macos", "shadowrocket", "shadowrocket-profile-generator.js", channel, "apple-proxy-shadowrocket", "macos", "Apple-Proxy-Nodes"),
    configTask("shadowrocket-config-iphone", "shadowrocket", "shadowrocket-profile-generator.js", channel, "apple-proxy-shadowrocket", "iphone", "Apple-Proxy-Nodes"),
    configTask("shadowrocket-config-ipad", "shadowrocket", "shadowrocket-profile-generator.js", channel, "apple-proxy-shadowrocket", "ipad", "Apple-Proxy-Nodes"),
    nodeTask("surge-nodes", "surge", channel, "apple-proxy-surge"),
    configTask("surge-config-macos", "surge", "surge-profile-generator.js", channel, "apple-proxy-surge", "macos", "Apple-Proxy-Nodes"),
    configTask("surge-config-iphone", "surge", "surge-profile-generator.js", channel, "apple-proxy-surge", "iphone", "Apple-Proxy-Nodes"),
    configTask("surge-config-ipad", "surge", "surge-profile-generator.js", channel, "apple-proxy-surge", "ipad", "Apple-Proxy-Nodes"),
    configTask("singbox-config-macos", "sing-box", "sing-box-config-generator.js", channel, "apple-proxy-singbox", "macos", "Apple-Proxy-Nodes", { profileMode: "light", nodeErrorMode: "strict" }),
    configTask("singbox-config-iphone", "sing-box", "sing-box-config-generator.js", channel, "apple-proxy-singbox", "iphone", "Apple-Proxy-Nodes", { profileMode: "light", nodeErrorMode: "strict" }),
    configTask("singbox-config-ipad", "sing-box", "sing-box-config-generator.js", channel, "apple-proxy-singbox", "ipad", "Apple-Proxy-Nodes", { profileMode: "light", nodeErrorMode: "strict" }),
    configTask("singbox-config-android", "sing-box", "sing-box-config-generator.js", channel, "apple-proxy-singbox", "android", "Apple-Proxy-Nodes", { profileMode: "light", nodeErrorMode: "strict" }),
    Object.freeze({ name: "apple-proxy-policy", client: "shared", kind: "private-policy", channel, policySchema: "schemaVersion=2; targets=single-layer; channels=edge,current,previous; readers accept schemaVersion=1", url: null }),
    nodeTask("onexray-nodes", "onexray", channel, "apple-proxy-onexray"),
    remoteTask("onexray-profile", "onexray", `${base(channel, "onexray", "onexray-profile-generator.js")}#${fragment({ output: "profile", type: "collection", name: "apple-proxy-onexray", channel, clientChain: "off" })}`, { output: "profile", collection: "apple-proxy-onexray", channel, policyInput: "apple-proxy-policy" }),
    remoteTask("onexray-routing-audit", "onexray", `${base(channel, "onexray", "onexray-routing-audit.js")}#${fragment({ output: "audit", type: "collection", name: "apple-proxy-onexray", channel, clientChain: "off" })}`, { output: "audit", collection: "apple-proxy-onexray", channel, policyInput: "apple-proxy-policy" }),
    ...HAPP_PLATFORMS.filter((platform) => platform !== "all").map((platform) => (
      configTask(`happ-${platform}`, "happ", "happ-config-generator.js", HAPP_PUBLIC_CHANNEL, "apple-proxy-happ", platform, "Apple-Proxy-Happ", {}, { policyInput: "apple-proxy-policy", omitKeys: ["clientChain", "autoGroupMode", "channel"] })
    )),
    remoteTask("happ-routing-audit", "happ", `${base(HAPP_PUBLIC_CHANNEL, "happ", "happ-routing-audit.js")}#${fragment({ output: "audit", type: "collection", name: "apple-proxy-happ", subscriptionName: "Apple-Proxy-Happ", platform: "all" })}`, { output: "audit", collection: "apple-proxy-happ", platform: "all", channel: HAPP_PUBLIC_CHANNEL, policyInput: "apple-proxy-policy" }),
    nodeTask("v2rayn-nodes", "v2rayn", channel, "apple-proxy-v2rayn"),
    configTask("v2rayn-config-windows", "v2rayn", "substore-config-generator.js", channel, "apple-proxy-v2rayn", "windows", "Apple-Proxy-v2rayN", { region: "cn" }, { omitKeys: ["autoGroupMode"] }),
    configTask("v2rayn-config-macos", "v2rayn", "substore-config-generator.js", channel, "apple-proxy-v2rayn", "macos", "Apple-Proxy-v2rayN", { region: "cn" }, { omitKeys: ["autoGroupMode"] }),
    nodeTask("v2box-nodes", "v2box", channel, "apple-proxy-v2box"),
    configTask("v2box-config-iphone", "v2box", "substore-config-generator.js", channel, "apple-proxy-v2box", "iphone", "Apple-Proxy-V2Box", { region: "cn" }, { omitKeys: ["autoGroupMode"] }),
    configTask("v2box-config-ipad", "v2box", "substore-config-generator.js", channel, "apple-proxy-v2box", "ipad", "Apple-Proxy-V2Box", { region: "cn" }, { omitKeys: ["autoGroupMode"] }),
  ];
  if (tasks.length !== 35) throw new Error(`Expected 35 canonical tasks, got ${tasks.length}`);
  return Object.freeze(tasks);
}

export function buildPrivateSubstoreConfig({ sourceUrl, channel = "current" } = {}) {
  const safeSourceUrl = assertSourceUrl(sourceUrl);
  const safeChannel = assertChannel(channel);
  return Object.freeze({
    schemaVersion: 1,
    sourceUrl: safeSourceUrl,
    defaultChannel: safeChannel,
    collections: COLLECTIONS,
    tasks: canonicalTaskCatalog(safeChannel),
    privateInputs: Object.freeze({
      policyTask: "apple-proxy-policy",
      egernNodesOutput: "<PRIVATE_EGERN_NODES_URL>",
      surgeNodesOutput: "<PRIVATE_SURGE_NODES_URL>",
    }),
  });
}

export function validatePrivateSubstoreConfig(config) {
  if (!config || config.schemaVersion !== 1 || !Array.isArray(config.tasks)) return false;
  if (!Array.isArray(config.collections) || config.collections.length !== COLLECTIONS.length) return false;
  if (!CHANNELS.includes(config.defaultChannel)) return false;
  for (const task of config.tasks) {
    if (task.kind !== "remote-js") continue;
    const result = checkSubstoreTaskUrl(task.url);
    if (!result.ok) return false;
  }
  return config.tasks.length === 35;
}

export async function writePrivateSubstoreConfig({ sourceUrl, channel = "current", path = PRIVATE_CONFIG_PATH } = {}) {
  const config = buildPrivateSubstoreConfig({ sourceUrl, channel });
  if (!validatePrivateSubstoreConfig(config)) throw new Error("Generated private Sub-Store config failed validation");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await chmod(path, 0o600);
  return path;
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const sourceUrl = process.env.SUBSTORE_SOURCE_URL;
  if (!sourceUrl) {
    process.stderr.write("Set SUBSTORE_SOURCE_URL to your private Sub-Store source URL.\n");
    process.exitCode = 1;
  } else {
    const channel = process.env.SUBSTORE_CHANNEL ?? "current";
    const path = await writePrivateSubstoreConfig({ sourceUrl, channel });
    process.stdout.write(`Wrote private Sub-Store config: ${path}\n`);
  }
}
