import { OPTION_VALUES } from "../../../shared/contracts.js";
import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";
import { platformPolicyPreset } from "../../../shared/policies/platform-presets.js";
import { validateCollectionName } from "../../../shared/substore/collection-name.js";
import { usesMobileRuleBundles } from "../../../shared/rules/lightweight-policy.js";

const REQUIRED_KEYS = Object.freeze(["output", "type", "name", "subscriptionName", "platform"]);
const DEFAULTS = Object.freeze({
  channel: "current",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "auto",
  autoGroupMode: "auto",
  clientChain: "off",
  profileMode: "light",
  adblockMode: "off",
  nodeErrorMode: "strict",
});
const PLATFORMS = new Set(["macos", "iphone", "ipad", "android"]);
const CHANNELS = new Set(FRONTIER_CHANNELS);
const PROFILE_MODES = new Set(["light", "diagnostic"]);
const ADBLOCK_MODES = new Set(["off", "full"]);
const NODE_ERROR_MODES = new Set(["strict", "compatible"]);
const ALLOWED_KEYS = new Set([...REQUIRED_KEYS, ...Object.keys(DEFAULTS)]);
const PARSED = new WeakSet();

function requiredString(raw, key) {
  const value = raw[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n]/u.test(value)) {
    throw new Error(`Option '${key}' must be a non-empty single-line string`);
  }
  return value;
}

function enumValue(raw, key, defaultValue) {
  const value = raw[key] === undefined ? defaultValue : raw[key];
  if (typeof value !== "string" || !OPTION_VALUES[key]?.includes(value)) throw new Error(`Option '${key}' has an unsupported value`);
  return value;
}

export function parseSingBoxOptions(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("sing-box options must be an object");
  if (Object.hasOwn(raw, "ruleSetFormat")) {
    throw new Error("Option 'ruleSetFormat' was removed; migrate to profileMode and adblockMode");
  }
  for (const key of Object.keys(raw)) {
    if (!key.startsWith("_") && !ALLOWED_KEYS.has(key)) throw new Error(`Unknown sing-box option: ${key}`);
  }
  for (const key of REQUIRED_KEYS) if (!Object.hasOwn(raw, key)) throw new Error(`Option '${key}' is required`);
  const platform = requiredString(raw, "platform");
  if (!PLATFORMS.has(platform)) throw new Error("Option 'platform' has an unsupported value");
  if (requiredString(raw, "output") !== "config") throw new Error("Option 'output' must be config");
  if (requiredString(raw, "type") !== "collection") throw new Error("Option 'type' must be collection");
  const channel = raw.channel === undefined ? DEFAULTS.channel : raw.channel;
  if (typeof channel !== "string" || !CHANNELS.has(channel)) throw new Error("Option 'channel' has an unsupported value");
  const profileMode = raw.profileMode === undefined ? DEFAULTS.profileMode : raw.profileMode;
  if (typeof profileMode !== "string" || !PROFILE_MODES.has(profileMode)) throw new Error("Option 'profileMode' has an unsupported value");
  const adblockMode = raw.adblockMode === undefined ? DEFAULTS.adblockMode : raw.adblockMode;
  if (typeof adblockMode !== "string" || !ADBLOCK_MODES.has(adblockMode)) throw new Error("Option 'adblockMode' has an unsupported value");
  if (usesMobileRuleBundles(platform) && adblockMode === "full") {
    throw new Error("Option 'adblockMode=full' exceeds the mobile client memory budget");
  }
  const nodeErrorMode = raw.nodeErrorMode === undefined ? DEFAULTS.nodeErrorMode : raw.nodeErrorMode;
  if (typeof nodeErrorMode !== "string" || !NODE_ERROR_MODES.has(nodeErrorMode)) throw new Error("Option 'nodeErrorMode' has an unsupported value");
  const options = {
    output: "config",
    type: "collection",
    name: validateCollectionName(raw.name, "Option 'name'"),
    subscriptionName: requiredString(raw, "subscriptionName"),
    platform,
    channel,
    dnsMode: enumValue(raw, "dnsMode", DEFAULTS.dnsMode),
    chinaDns: enumValue(raw, "chinaDns", DEFAULTS.chinaDns),
    globalDns: enumValue(raw, "globalDns", DEFAULTS.globalDns),
    blockMode: enumValue(raw, "blockMode", DEFAULTS.blockMode),
    quicMode: enumValue(raw, "quicMode", DEFAULTS.quicMode),
    ipv6Mode: enumValue(
      raw,
      "ipv6Mode",
      ["macos", "iphone", "ipad"].includes(platform) ? "ipv4-only" : DEFAULTS.ipv6Mode,
    ),
    autoGroupMode: enumValue(raw, "autoGroupMode", DEFAULTS.autoGroupMode),
    clientChain: enumValue(raw, "clientChain", DEFAULTS.clientChain),
    profileMode,
    adblockMode,
    nodeErrorMode,
  };
  platformPolicyPreset(platform);
  Object.freeze(options);
  PARSED.add(options);
  return options;
}

export function isParsedSingBoxOptions(value) {
  return value !== null && typeof value === "object" && PARSED.has(value);
}
