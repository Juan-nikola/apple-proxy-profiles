import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";
import { validateCollectionName } from "../../../shared/substore/collection-name.js";

const INCY_PLATFORMS = Object.freeze(["iphone", "ipad", "appletv", "android", "androidtv", "macos", "windows", "linux"]);
const DEFAULTS = Object.freeze({
  channel: "current",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "ipv4-only",
  adblockMode: "off",
  format: "array",
  selectionMode: "manual",
  autoGroupMode: "auto",
  clientChain: "off",
});

const ALLOWED_KEYS = new Set([
  "output",
  "type",
  "name",
  "subscriptionName",
  "platform",
  "channel",
  "dnsMode",
  "chinaDns",
  "globalDns",
  "blockMode",
  "quicMode",
  "ipv6Mode",
  "adblockMode",
  "format",
  "selectionMode",
  "autoGroupMode",
  "clientChain",
]);
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const ENUM_VALUES = Object.freeze({
  dnsMode: Object.freeze(["stable", "privacy", "speed"]),
  chinaDns: Object.freeze(["alidns", "dnspod", "system"]),
  globalDns: Object.freeze(["cloudflare", "google", "quad9"]),
  blockMode: Object.freeze(["balanced", "security", "strict", "off"]),
  quicMode: Object.freeze(["allow", "proxy-block", "all-block"]),
  ipv6Mode: Object.freeze(["auto", "ipv4-only"]),
  adblockMode: Object.freeze(["off", "full"]),
  format: Object.freeze(["array", "single"]),
  selectionMode: Object.freeze(["manual", "both"]),
  autoGroupMode: Object.freeze(["auto", "full", "balanced", "minimal"]),
  clientChain: Object.freeze(["off", "on"]),
});

function ownOptions(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("INCY options must be a plain object");
  }
  const prototype = Object.getPrototypeOf(raw);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("INCY options must be a plain object");
  }
  const values = new Map();
  for (const key of Reflect.ownKeys(raw)) {
    if (typeof key !== "string") continue;
    if (PROTOTYPE_KEYS.has(key)) throw new Error("INCY options contain a forbidden key");
    if (!ALLOWED_KEYS.has(key)) throw new Error(`Unknown INCY option '${key}'`);
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || !descriptor.enumerable || "get" in descriptor || "set" in descriptor) {
      throw new Error("INCY options must contain data properties");
    }
    values.set(key, descriptor.value);
  }
  return values;
}

function required(values, key) {
  if (!values.has(key)) throw new Error(`INCY option '${key}' is required`);
  return values.get(key);
}

function literal(values, key, expected) {
  const value = required(values, key);
  if (value !== expected) throw new Error(`INCY option '${key}' must be '${expected}'`);
  return value;
}

function enumValue(values, key, fallback = DEFAULTS[key]) {
  const value = values.has(key) && values.get(key) !== undefined ? values.get(key) : fallback;
  if (typeof value !== "string" || !ENUM_VALUES[key]?.includes(value)) {
    throw new Error(`INCY option '${key}' has an unsupported value`);
  }
  return value;
}

export function parseIncyOptions(raw) {
  const values = ownOptions(raw);
  literal(values, "output", "config");
  literal(values, "type", "collection");
  const platform = required(values, "platform");
  if (typeof platform !== "string" || !INCY_PLATFORMS.includes(platform)) {
    throw new Error("INCY option 'platform' has an unsupported value");
  }
  const channel = values.has("channel") && values.get("channel") !== undefined ? values.get("channel") : DEFAULTS.channel;
  if (typeof channel !== "string" || !FRONTIER_CHANNELS.includes(channel)) {
    throw new Error("INCY option 'channel' has an unsupported value");
  }
  const options = {
    output: "config",
    type: "collection",
    name: validateCollectionName(required(values, "name"), "INCY option 'name'"),
    subscriptionName: validateCollectionName(required(values, "subscriptionName"), "INCY option 'subscriptionName'"),
    platform,
    channel,
    dnsMode: enumValue(values, "dnsMode"),
    chinaDns: enumValue(values, "chinaDns"),
    globalDns: enumValue(values, "globalDns"),
    blockMode: enumValue(values, "blockMode"),
    quicMode: enumValue(values, "quicMode"),
    ipv6Mode: enumValue(values, "ipv6Mode"),
    adblockMode: enumValue(values, "adblockMode"),
    format: enumValue(values, "format"),
    selectionMode: enumValue(values, "selectionMode"),
    autoGroupMode: enumValue(values, "autoGroupMode"),
    clientChain: enumValue(values, "clientChain"),
  };
  if (options.format === "single" && options.selectionMode === "both") {
    throw new Error("INCY selectionMode=both requires format=array");
  }
  return Object.freeze(options);
}

export { INCY_PLATFORMS };
