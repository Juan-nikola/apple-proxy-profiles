import { OPTION_VALUES } from "../../../shared/contracts.js";
import { EgernUrlFallback } from "./runtime-fallbacks.js";

export const PUBLIC_SNAPSHOT_BASE_URL =
  "https://juan-nikola.github.io/apple-proxy-profiles/current";
export const PUBLIC_RULE_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";

const REQUIRED_KEYS = Object.freeze([
  "output",
  "type",
  "name",
  "nodeSubscriptionUrl",
  "platform",
]);

const DEFAULTS = Object.freeze({
  channel: "edge",
  adblockMode: "off",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  autoGroupMode: "auto",
  clientChain: "off",
});

const ENUM_KEYS = Object.freeze([
  "dnsMode",
  "chinaDns",
  "globalDns",
  "blockMode",
  "quicMode",
  "ipv6Mode",
  "autoGroupMode",
  "clientChain",
]);

const ALLOWED_KEYS = new Set([...REQUIRED_KEYS, ...ENUM_KEYS]);
ALLOWED_KEYS.add("channel");
ALLOWED_KEYS.add("adblockMode");
const SUPPORTED_PLATFORMS = new Set(["macos", "iphone", "ipad"]);
const CHANNELS = new Set(["edge", "current"]);
const ADBLOCK_MODES = new Set(["off", "full"]);
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const AMBIGUOUS_WHITESPACE = /[\t\v\f\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]/u;
const FORBIDDEN_URL_CHARACTER = /[\u0000-\u001f\u007f\\]/u;
const ENCODED_URL_CONTROL = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/iu;
const PARSED_OPTIONS = new WeakSet();

function optionError(key, reason) {
  return new Error(`Option '${key}' ${reason}`);
}

function ownDataOptions(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("Options must be a plain object");
  }

  let prototype;
  try {
    prototype = Object.getPrototypeOf(raw);
  } catch {
    throw new TypeError("Options must be a plain object");
  }

  if (prototype !== Object.prototype && prototype !== null) {
    for (const key in raw) {
      if (!Object.hasOwn(raw, key)) {
        throw new Error("Options must not contain an inherited option");
      }
    }
    throw new TypeError("Options must be a plain object");
  }

  for (const key in raw) {
    if (!Object.hasOwn(raw, key)) {
      throw new Error("Options must not contain an inherited option");
    }
  }

  const values = new Map();
  let keys;
  try {
    keys = Reflect.ownKeys(raw);
  } catch {
    throw new TypeError("Options must be a plain object");
  }

  for (const key of keys) {
    if (typeof key !== "string") {
      throw new Error("Unknown Egern option key");
    }
    if (PROTOTYPE_KEYS.has(key)) {
      throw new Error("Options must not contain a prototype option");
    }

    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || "get" in descriptor || "set" in descriptor) {
      throw new Error("Options must not contain an accessor option");
    }
    if (!descriptor.enumerable) {
      throw new Error("Options must not contain a hidden option");
    }
    if (!key.startsWith("_") && !ALLOWED_KEYS.has(key)) {
      throw new Error("Unknown Egern option");
    }
    values.set(key, descriptor.value);
  }

  return values;
}

function ownValue(values, key) {
  if (!values.has(key)) {
    throw optionError(key, "is required");
  }
  return values.get(key);
}

function exactLiteral(values, key, expected) {
  const value = ownValue(values, key);
  if (typeof value !== "string" || value !== expected) {
    throw optionError(key, `must be '${expected}'`);
  }
  return value;
}

function profileName(values) {
  const value = ownValue(values, "name");
  if (typeof value !== "string" || value.length === 0) {
    throw optionError("name", "must be a non-empty string");
  }
  if (/\r|\n/u.test(value)) {
    throw optionError("name", "must not contain CR or LF");
  }
  if (value.trim() !== value || AMBIGUOUS_WHITESPACE.test(value)) {
    throw optionError("name", "contains ambiguous whitespace");
  }
  return value;
}

function platformValue(values) {
  const value = ownValue(values, "platform");
  if (typeof value !== "string" || !SUPPORTED_PLATFORMS.has(value)) {
    throw optionError("platform", "has an unsupported value");
  }
  return value;
}

function enumValue(values, key, defaultValue) {
  const value = values.has(key) && values.get(key) !== undefined
    ? values.get(key)
    : defaultValue;
  if (typeof value !== "string" || !OPTION_VALUES[key].includes(value)) {
    throw optionError(key, "has an unsupported value");
  }
  return value;
}

function localEnumValue(values, key, defaultValue, supported) {
  const value = values.has(key) && values.get(key) !== undefined
    ? values.get(key)
    : defaultValue;
  if (typeof value !== "string" || !supported.has(value)) {
    throw optionError(key, "has an unsupported value");
  }
  return value;
}

export function ruleBaseUrlForChannel(channel) {
  if (typeof channel !== "string" || !CHANNELS.has(channel)) {
    throw optionError("channel", "has an unsupported value");
  }
  return `${PUBLIC_RULE_ROOT}/${channel}`;
}

export function validateEgernNodeSubscriptionUrl(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw optionError("nodeSubscriptionUrl", "must be an absolute HTTPS URL");
  }
  if (
    value.trim() !== value
    || FORBIDDEN_URL_CHARACTER.test(value)
    || ENCODED_URL_CONTROL.test(value)
    || !/^https:\/\//iu.test(value)
    || (typeof value.isWellFormed === "function" && !value.isWellFormed())
  ) {
    throw optionError("nodeSubscriptionUrl", "must be an absolute HTTPS URL without forbidden characters");
  }

  let parsed;
  try {
    new EgernUrlFallback(value);
    parsed = new URL(value);
  } catch {
    throw optionError("nodeSubscriptionUrl", "must be an absolute HTTPS URL");
  }

  const authority = value.slice(value.indexOf("//") + 2).split(/[/?#]/u, 1)[0];
  if (
    parsed.protocol !== "https:"
    || !parsed.hostname
    || parsed.username
    || parsed.password
    || authority.includes("@")
  ) {
    throw optionError("nodeSubscriptionUrl", "must use HTTPS without authority credentials");
  }
  if (value.includes("#")) {
    throw optionError("nodeSubscriptionUrl", "must not contain a fragment");
  }
  return value;
}

function privateNodeUrl(values) {
  return validateEgernNodeSubscriptionUrl(ownValue(values, "nodeSubscriptionUrl"));
}

export function parseEgernOptions(raw) {
  const values = ownDataOptions(raw);
  const platform = platformValue(values);
  const channel = localEnumValue(values, "channel", DEFAULTS.channel, CHANNELS);

  const options = {
    output: exactLiteral(values, "output", "config"),
    type: exactLiteral(values, "type", "collection"),
    name: profileName(values),
    nodeSubscriptionUrl: privateNodeUrl(values),
    platform,
    channel,
    adblockMode: localEnumValue(values, "adblockMode", DEFAULTS.adblockMode, ADBLOCK_MODES),
    publicBaseUrl: ruleBaseUrlForChannel(channel),
    dnsMode: enumValue(values, "dnsMode", DEFAULTS.dnsMode),
    chinaDns: enumValue(values, "chinaDns", DEFAULTS.chinaDns),
    globalDns: enumValue(values, "globalDns", DEFAULTS.globalDns),
    blockMode: enumValue(values, "blockMode", DEFAULTS.blockMode),
    quicMode: enumValue(values, "quicMode", DEFAULTS.quicMode),
    autoGroupMode: enumValue(values, "autoGroupMode", DEFAULTS.autoGroupMode),
    clientChain: enumValue(values, "clientChain", DEFAULTS.clientChain),
    ipv6Mode: enumValue(
      values,
      "ipv6Mode",
      platform === "macos" ? "ipv4-only" : "auto",
    ),
  };

  Object.freeze(options);
  PARSED_OPTIONS.add(options);
  return options;
}

export function isParsedEgernOptions(value) {
  return value !== null && typeof value === "object" && PARSED_OPTIONS.has(value);
}
