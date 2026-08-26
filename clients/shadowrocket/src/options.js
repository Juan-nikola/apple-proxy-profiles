import { OPTION_VALUES } from "../../../shared/contracts.js";
import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";
import { platformPolicyPreset } from "../../../shared/policies/platform-presets.js";
import { validateCollectionName } from "../../../shared/substore/collection-name.js";

const REQUIRED_KEYS = Object.freeze([
  "output",
  "type",
  "name",
  "subscriptionName",
  "platform",
]);

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
  adblockMode: "off",
});

const CHANNELS = new Set(FRONTIER_CHANNELS);
const ADBLOCK_MODES = new Set(["off", "full"]);

const ALLOWED_KEYS = new Set([...REQUIRED_KEYS, ...Object.keys(DEFAULTS)]);

function requiredString(raw, key) {
  if (!Object.hasOwn(raw, key)) {
    throw new Error(`Option '${key}' must be a non-empty string`);
  }
  const value = raw[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Option '${key}' must be a non-empty string`);
  }
  return value.trim();
}

function subscriptionDisplayName(raw) {
  if (!Object.hasOwn(raw, "subscriptionName")) {
    throw new Error("Option 'subscriptionName' must be a non-empty string");
  }
  const value = raw.subscriptionName;
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Option 'subscriptionName' must be a non-empty string");
  }
  if (/[\r\n]/.test(value)) {
    throw new Error("Option 'subscriptionName' must not contain CR or LF");
  }
  if (value.trim() !== value) {
    throw new Error("Option 'subscriptionName' must not have leading or trailing whitespace");
  }
  return value;
}

function enumValue(raw, key) {
  const value = requiredString(raw, key);
  if (!OPTION_VALUES[key].includes(value)) {
    throw new Error(`Option '${key}' has an unsupported value: ${value}`);
  }
  return value;
}

export function parseOptions(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("Options must be an object");
  }

  for (const key of Object.keys(raw)) {
    if (!key.startsWith("_") && !ALLOWED_KEYS.has(key)) {
      throw new Error(`Unknown option: ${key}`);
    }
  }

  const options = {};
  for (const key of REQUIRED_KEYS) {
    options[key] = key === "subscriptionName"
      ? subscriptionDisplayName(raw)
      : key === "name"
        ? validateCollectionName(raw.name, "Option 'name'")
      : OPTION_VALUES[key]
        ? enumValue(raw, key)
        : requiredString(raw, key);
  }
  for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
    const platformDefault = key === "ipv6Mode" && options.platform === "macos"
      ? "ipv4-only"
      : defaultValue;
    if (key === "channel") {
      const value = Object.hasOwn(raw, key) && raw[key] !== undefined ? raw[key] : platformDefault;
      if (typeof value !== "string" || !CHANNELS.has(value)) {
        throw new Error(`Option '${key}' has an unsupported value: ${value}`);
      }
      options[key] = value;
    } else if (key === "adblockMode") {
      const value = Object.hasOwn(raw, key) && raw[key] !== undefined ? raw[key] : platformDefault;
      if (typeof value !== "string" || !ADBLOCK_MODES.has(value)) {
        throw new Error(`Option '${key}' has an unsupported value: ${value}`);
      }
      options[key] = value;
    } else {
      options[key] = Object.hasOwn(raw, key) && raw[key] !== undefined
        ? enumValue(raw, key)
        : platformDefault;
    }
  }
  return options;
}

export function platformPreset(platform) {
  return platformPolicyPreset(platform);
}
