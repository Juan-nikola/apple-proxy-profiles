import { OPTION_VALUES } from "../../../shared/contracts.js";
import { platformPolicyPreset } from "../../../shared/policies/platform-presets.js";

const REQUIRED_KEYS = Object.freeze(["output", "type", "name", "subscriptionName", "platform"]);
const DEFAULTS = Object.freeze({
  channel: "edge",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "auto",
  autoGroupMode: "auto",
  clientChain: "off",
  adblockMode: "off",
});
const PLATFORMS = new Set(["macos", "iphone", "ipad"]);
const CHANNELS = new Set(["edge", "current"]);
const ADBLOCK_MODES = new Set(["off", "full"]);
const PARSED = new WeakSet();
const ALLOWED_KEYS = new Set([...REQUIRED_KEYS, ...Object.keys(DEFAULTS)]);

function requiredString(raw, key) {
  const value = raw[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n]/u.test(value)) {
    throw new Error(`Option '${key}' must be a non-empty single-line string`);
  }
  return value;
}

function enumValue(raw, key, defaultValue) {
  const value = raw[key] === undefined ? defaultValue : raw[key];
  if (typeof value !== "string" || !OPTION_VALUES[key]?.includes(value)) {
    throw new Error(`Option '${key}' has an unsupported value`);
  }
  return value;
}

export function parseSurgeOptions(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Surge options must be an object");
  for (const key of Object.keys(raw)) {
    if (!key.startsWith("_") && !ALLOWED_KEYS.has(key)) throw new Error(`Unknown Surge option: ${key}`);
  }
  for (const key of REQUIRED_KEYS) {
    if (!Object.hasOwn(raw, key)) throw new Error(`Option '${key}' is required`);
  }
  const platform = requiredString(raw, "platform");
  if (!PLATFORMS.has(platform)) throw new Error("Option 'platform' has an unsupported value");
  if (requiredString(raw, "output") !== "config") throw new Error("Option 'output' must be config");
  if (requiredString(raw, "type") !== "collection") throw new Error("Option 'type' must be collection");
  const channel = raw.channel === undefined ? DEFAULTS.channel : raw.channel;
  if (typeof channel !== "string" || !CHANNELS.has(channel)) throw new Error("Option 'channel' has an unsupported value");
  const adblockMode = raw.adblockMode === undefined ? DEFAULTS.adblockMode : raw.adblockMode;
  if (typeof adblockMode !== "string" || !ADBLOCK_MODES.has(adblockMode)) {
    throw new Error("Option 'adblockMode' has an unsupported value");
  }
  const options = {
    output: "config",
    type: "collection",
    name: requiredString(raw, "name"),
    subscriptionName: requiredString(raw, "subscriptionName"),
    platform,
    channel,
    dnsMode: enumValue(raw, "dnsMode", DEFAULTS.dnsMode),
    chinaDns: enumValue(raw, "chinaDns", DEFAULTS.chinaDns),
    globalDns: enumValue(raw, "globalDns", DEFAULTS.globalDns),
    blockMode: enumValue(raw, "blockMode", DEFAULTS.blockMode),
    quicMode: enumValue(raw, "quicMode", DEFAULTS.quicMode),
    ipv6Mode: enumValue(raw, "ipv6Mode", platform === "macos" ? "ipv4-only" : DEFAULTS.ipv6Mode),
    autoGroupMode: enumValue(raw, "autoGroupMode", DEFAULTS.autoGroupMode),
    clientChain: enumValue(raw, "clientChain", DEFAULTS.clientChain),
    adblockMode,
  };
  platformPolicyPreset(platform);
  Object.freeze(options);
  PARSED.add(options);
  return options;
}

export function isParsedSurgeOptions(value) {
  return value !== null && typeof value === "object" && PARSED.has(value);
}
