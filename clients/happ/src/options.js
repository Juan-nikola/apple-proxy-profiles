import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";
import { validateCollectionName } from "../../../shared/substore/collection-name.js";

const PLATFORMS = new Set(["macos", "iphone", "ipad", "android", "windows", "linux", "all"]);
const CHANNELS = new Set(FRONTIER_CHANNELS ?? ["edge", "current", "previous"]);
const ENUMS = Object.freeze({
  dnsMode: ["stable", "privacy", "speed"], chinaDns: ["alidns", "dnspod", "system"],
  globalDns: ["cloudflare", "google", "quad9"], blockMode: ["balanced", "security", "strict", "off"],
  quicMode: ["allow", "proxy-block", "all-block"], ipv6Mode: ["auto", "ipv4-only"],
});
const DEFAULTS = Object.freeze({ channel: "current", dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", blockMode: "balanced", quicMode: "proxy-block", ipv6Mode: "auto", policyOverrides: "" });
const REQUIRED = new Set(["output", "type", "name", "subscriptionName", "platform"]);
const ALLOWED = new Set([...REQUIRED, "channel", "dnsMode", "chinaDns", "globalDns", "blockMode", "quicMode", "ipv6Mode", "policyOverrides"]);
const PROTOTYPE = new Set(["__proto__", "constructor", "prototype"]);

function ownOptions(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Happ options must be a plain object");
  const proto = Object.getPrototypeOf(raw);
  if (proto !== Object.prototype && proto !== null) throw new TypeError("Happ options must be a plain object");
  const values = new Map();
  for (const key of Reflect.ownKeys(raw)) {
    if (typeof key !== "string" || PROTOTYPE.has(key)) throw new Error("Happ options contain a forbidden key");
    if (!ALLOWED.has(key)) throw new Error(`Unknown Happ option '${key}'`);
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || !descriptor.enumerable || "get" in descriptor || "set" in descriptor) throw new Error("Happ options must contain data properties");
    values.set(key, descriptor.value);
  }
  return values;
}

function required(values, key) {
  if (!values.has(key)) throw new Error(`Option '${key}' is required`);
  return values.get(key);
}

function literal(values, key, expected) {
  const value = required(values, key);
  if (value !== expected) throw new Error(`Option '${key}' must be '${expected}'`);
  return value;
}

function enumValue(values, key) {
  const value = values.has(key) && values.get(key) !== undefined ? values.get(key) : DEFAULTS[key];
  if (typeof value !== "string" || !ENUMS[key].includes(value)) throw new Error(`Option '${key}' has an unsupported value`);
  return value;
}

export function parseHappOptions(raw) {
  const values = ownOptions(raw);
  const output = values.get("output");
  if (output !== "config" && output !== "audit") throw new Error("Option 'output' must be 'config' or 'audit'");
  literal(values, "type", "collection");
  const platform = required(values, "platform");
  if (typeof platform !== "string" || !PLATFORMS.has(platform)) throw new Error("Option 'platform' has an unsupported value");
  if (platform === "all" && output !== "audit") throw new Error("Option 'platform' 'all' is valid only for audit output");
  const options = {
    output, type: "collection", name: validateCollectionName(required(values, "name"), "Option 'name'"),
    subscriptionName: validateCollectionName(required(values, "subscriptionName"), "Option 'subscriptionName'"),
    platform, channel: values.has("channel") ? values.get("channel") : DEFAULTS.channel,
    dnsMode: enumValue(values, "dnsMode"), chinaDns: enumValue(values, "chinaDns"), globalDns: enumValue(values, "globalDns"),
    blockMode: enumValue(values, "blockMode"), quicMode: enumValue(values, "quicMode"), ipv6Mode: enumValue(values, "ipv6Mode"),
    policyOverrides: values.has("policyOverrides") && values.get("policyOverrides") !== undefined ? values.get("policyOverrides") : DEFAULTS.policyOverrides,
  };
  if (!CHANNELS.has(options.channel)) throw new Error("Option 'channel' has an unsupported value");
  if (typeof options.policyOverrides !== "string") throw new Error("Option 'policyOverrides' must be a string");
  return Object.freeze(options);
}

export const HAPP_PLATFORMS = Object.freeze([...PLATFORMS]);
export const HAPP_DEFAULTS = DEFAULTS;
