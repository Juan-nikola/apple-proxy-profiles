import { OPTION_VALUES } from "../../../shared/contracts.js";

const REQUIRED_KEYS = Object.freeze(["output", "type", "name", "subscriptionName", "platform"]);
const DEFAULTS = Object.freeze({
  channel: "edge",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "auto",
  policyOverrides: "",
  adblockMode: "off",
});
const OUTPUTS = new Set(["config", "audit"]);
const CONFIG_PLATFORMS = new Set(["macos", "iphone", "ipad", "android", "windows", "linux"]);
const CHANNELS = new Set(["edge", "current", "previous"]);
const ENUM_KEYS = Object.freeze(["dnsMode", "chinaDns", "globalDns", "blockMode", "quicMode", "ipv6Mode"]);
const ALLOWED_KEYS = new Set([...REQUIRED_KEYS, "channel", ...ENUM_KEYS, "policyOverrides"]);
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function optionError(key, reason) {
  return new Error(`Option '${key}' ${reason}`);
}

function ownDataOptions(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("Happ options must be a plain object");
  }
  if (Object.getPrototypeOf(raw) !== Object.prototype && Object.getPrototypeOf(raw) !== null) {
    throw new TypeError("Happ options must be a plain object");
  }
  const values = new Map();
  for (const key of Reflect.ownKeys(raw)) {
    if (typeof key !== "string" || PROTOTYPE_KEYS.has(key)) throw new Error("Unknown Happ option");
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) {
      throw new Error("Happ options must contain only enumerable data options");
    }
    if (!key.startsWith("_") && !ALLOWED_KEYS.has(key)) throw new Error(`Unknown Happ option: ${key}`);
    values.set(key, descriptor.value);
  }
  return values;
}

function requiredString(values, key) {
  if (!values.has(key)) throw optionError(key, "is required");
  const value = values.get(key);
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n]/u.test(value)) {
    throw optionError(key, "must be a non-empty single-line string");
  }
  return value;
}

function enumValue(values, key) {
  const value = values.has(key) && values.get(key) !== undefined ? values.get(key) : DEFAULTS[key];
  if (typeof value !== "string" || !OPTION_VALUES[key]?.includes(value)) {
    throw optionError(key, "has an unsupported value");
  }
  return value;
}

export function parseHappOptions(raw) {
  const values = ownDataOptions(raw);
  for (const key of REQUIRED_KEYS) requiredString(values, key);
  const output = requiredString(values, "output");
  if (!OUTPUTS.has(output)) throw optionError("output", "has an unsupported value");
  if (requiredString(values, "type") !== "collection") throw optionError("type", "must be 'collection'");
  const platform = requiredString(values, "platform");
  if ((output === "config" && !CONFIG_PLATFORMS.has(platform)) || (output === "audit" && platform !== "all")) {
    throw optionError("platform", "is invalid for output mode");
  }
  const channel = values.has("channel") && values.get("channel") !== undefined ? values.get("channel") : DEFAULTS.channel;
  if (typeof channel !== "string" || !CHANNELS.has(channel)) throw optionError("channel", "has an unsupported value");
  const policyOverrides = values.has("policyOverrides") && values.get("policyOverrides") !== undefined
    ? values.get("policyOverrides") : DEFAULTS.policyOverrides;
  if (typeof policyOverrides !== "string") throw optionError("policyOverrides", "must be a string");

  return Object.freeze({
    output,
    type: "collection",
    name: requiredString(values, "name"),
    subscriptionName: requiredString(values, "subscriptionName"),
    platform,
    channel,
    dnsMode: enumValue(values, "dnsMode"),
    chinaDns: enumValue(values, "chinaDns"),
    globalDns: enumValue(values, "globalDns"),
    blockMode: enumValue(values, "blockMode"),
    quicMode: enumValue(values, "quicMode"),
    ipv6Mode: enumValue(values, "ipv6Mode"),
    policyOverrides,
    adblockMode: "off",
  });
}
