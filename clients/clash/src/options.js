import { OPTION_VALUES } from "../../../shared/contracts.js";
import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";
import { validateCollectionName } from "../../../shared/substore/collection-name.js";

export const PUBLIC_SNAPSHOT_BASE_URL = "https://juan-nikola.github.io/apple-proxy-profiles/current";
export const PUBLIC_RULE_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";

const REQUIRED = ["output", "type", "name", "nodeSubscriptionUrl", "platform"];
const PLATFORMS = new Set(["iphone", "ipad", "macos", "appletv"]);
const AD_BLOCK = new Set(["off", "full"]);
const PARSED = new WeakSet();
const CONTROL = /[\u0000-\u001f\u007f\\]/u;

function ownRecord(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(raw))) {
    throw new TypeError("Clash options must be a plain object");
  }
  const values = new Map();
  for (const key of Reflect.ownKeys(raw)) {
    if (typeof key !== "string" || key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error("Clash options contain an unsupported key");
    }
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) {
      throw new Error("Clash options contain an invalid property");
    }
    values.set(key, descriptor.value);
  }
  return values;
}

function required(values, key) {
  if (!values.has(key)) throw new Error("Clash option '" + key + "' is required");
  return values.get(key);
}

function enumValue(values, key, fallback) {
  const value = values.has(key) && values.get(key) !== undefined ? values.get(key) : fallback;
  if (typeof value !== "string" || !OPTION_VALUES[key].includes(value)) {
    throw new Error("Clash option '" + key + "' is unsupported");
  }
  return value;
}

function safeUrl(value) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || CONTROL.test(value)
    || !value.startsWith("https://") || value.includes("#")) {
    throw new Error("Clash nodeSubscriptionUrl must be an absolute HTTPS URL");
  }
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error("Clash nodeSubscriptionUrl must not contain credentials");
  }
  return value;
}

export function ruleBaseUrlForChannel(channel) {
  if (!FRONTIER_CHANNELS.includes(channel)) throw new Error("Clash channel is unsupported");
  return PUBLIC_RULE_ROOT + "/" + channel;
}

export function parseClashOptions(raw) {
  const values = ownRecord(raw);
  const allowed = new Set([...REQUIRED, "subscriptionName", "channel", "adblockMode", "dnsMode", "chinaDns", "globalDns", "blockMode", "quicMode", "ipv6Mode", "autoGroupMode", "clientChain"]);
  for (const key of values.keys()) if (!allowed.has(key) && !key.startsWith("_")) throw new Error("Unknown Clash option '" + key + "'");
  if (required(values, "output") !== "config" || required(values, "type") !== "collection") {
    throw new Error("Clash profile output must be config/collection");
  }
  const platform = required(values, "platform");
  if (typeof platform !== "string" || !PLATFORMS.has(platform)) throw new Error("Clash platform is unsupported");
  const channel = values.has("channel") ? values.get("channel") : "current";
  if (!FRONTIER_CHANNELS.includes(channel)) throw new Error("Clash channel is unsupported");
  const adblockMode = values.has("adblockMode") ? values.get("adblockMode") : "off";
  if (!AD_BLOCK.has(adblockMode)) throw new Error("Clash adblockMode is unsupported");
  const options = Object.freeze({
    output: "config",
    type: "collection",
    name: validateCollectionName(required(values, "name"), "Clash option 'name'"),
    subscriptionName: typeof values.get("subscriptionName") === "string" && values.get("subscriptionName").trim() ? values.get("subscriptionName") : "Apple-Proxy-Clash",
    nodeSubscriptionUrl: safeUrl(required(values, "nodeSubscriptionUrl")),
    platform,
    channel,
    adblockMode,
    publicBaseUrl: ruleBaseUrlForChannel(channel),
    dnsMode: enumValue(values, "dnsMode", "stable"),
    chinaDns: enumValue(values, "chinaDns", "alidns"),
    globalDns: enumValue(values, "globalDns", "cloudflare"),
    blockMode: enumValue(values, "blockMode", "balanced"),
    quicMode: enumValue(values, "quicMode", "proxy-block"),
    ipv6Mode: enumValue(values, "ipv6Mode", "auto"),
    autoGroupMode: enumValue(values, "autoGroupMode", "auto"),
    clientChain: enumValue(values, "clientChain", "off"),
  });
  PARSED.add(options);
  return options;
}

export function isParsedClashOptions(value) {
  return value !== null && typeof value === "object" && PARSED.has(value);
}
