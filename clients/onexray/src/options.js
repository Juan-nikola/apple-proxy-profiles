import { OPTION_VALUES } from "../../../shared/contracts.js";

const REQUIRED_KEYS = Object.freeze(["output", "type", "name"]);
const DEFAULTS = Object.freeze({
  channel: "edge",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "auto",
  clientChain: "off",
  clientChainTarget: "",
  policyOverrides: "",
  policyFile: "",
  logLevel: "warning",
});
const OUTPUTS = new Set(["nodes", "profile", "audit"]);
const CHANNELS = new Set(["edge", "current", "previous"]);
const LOG_LEVELS = new Set(["none", "error", "warning", "info", "debug"]);
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const ALLOWED_KEYS = new Set([...REQUIRED_KEYS, "channel", ...Object.keys(DEFAULTS)]);
const NODE_TARGET = /^NODE:(.*)$/iu;
const LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;

function optionError(key, message) {
  return new Error(`OneXray option '${key}' ${message}`);
}

function ownDataOptions(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new TypeError("OneXray options must be a plain object");
  }
  if (Object.getPrototypeOf(raw) !== Object.prototype && Object.getPrototypeOf(raw) !== null) {
    throw new TypeError("OneXray options must be a plain object");
  }

  const values = new Map();
  for (const key of Reflect.ownKeys(raw)) {
    if (typeof key !== "string" || PROTOTYPE_KEYS.has(key)) {
      throw new Error("OneXray options must not contain a prototype option");
    }
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || "get" in descriptor || "set" in descriptor) {
      throw new Error("OneXray options must not contain an accessor option");
    }
    if (!descriptor.enumerable) throw new Error("OneXray options must not contain a hidden option");
    if (!ALLOWED_KEYS.has(key)) throw new Error(`Unknown OneXray option '${key}'`);
    if (descriptor.value === undefined) throw optionError(key, "must not be undefined");
    values.set(key, descriptor.value);
  }
  return values;
}

function requiredSingleLine(values, key) {
  if (!values.has(key)) throw optionError(key, "is required");
  const value = values.get(key);
  if (typeof value !== "string" || value.length === 0 || LINE_TERMINATOR.test(value)) {
    throw optionError(key, "must be a non-empty single-line string");
  }
  return value;
}

function enumValue(values, key, allowed, defaultValue) {
  const value = values.has(key) ? values.get(key) : defaultValue;
  if (typeof value !== "string" || !(allowed instanceof Set ? allowed.has(value) : allowed.includes(value))) {
    throw optionError(key, "has an unsupported value");
  }
  return value;
}

function chainTarget(values) {
  const value = values.has("clientChainTarget")
    ? values.get("clientChainTarget")
    : DEFAULTS.clientChainTarget;
  if (typeof value !== "string") throw optionError("clientChainTarget", "must be a string");
  if (value === "") return value;

  const match = NODE_TARGET.exec(value);
  if (!match || match[1].trim().length === 0 || LINE_TERMINATOR.test(match[1])) {
    throw optionError("clientChainTarget", "must be NODE:<name>");
  }
  return `NODE:${match[1]}`;
}

export function parseOneXrayOptions(raw) {
  const values = ownDataOptions(raw);
  const output = requiredSingleLine(values, "output");
  if (!OUTPUTS.has(output)) throw optionError("output", "has an unsupported value");
  const type = requiredSingleLine(values, "type");
  if (type !== "collection") throw optionError("type", "must be collection");
  const rawName = requiredSingleLine(values, "name");
  const name = rawName.trim();
  if (name.length === 0) throw optionError("name", "must not be blank");

  const clientChain = enumValue(values, "clientChain", OPTION_VALUES.clientChain, DEFAULTS.clientChain);
  const clientChainTarget = chainTarget(values);
  if (clientChain === "on" && clientChainTarget === "") {
    throw optionError("clientChainTarget", "is required when clientChain is on");
  }
  if (clientChain === "off" && clientChainTarget !== "") {
    throw optionError("clientChainTarget", "must be blank when clientChain is off");
  }

  const policyOverrides = values.has("policyOverrides")
    ? values.get("policyOverrides")
    : DEFAULTS.policyOverrides;
  if (typeof policyOverrides !== "string") throw optionError("policyOverrides", "must be a string");

  const policyFile = values.has("policyFile")
    ? values.get("policyFile")
    : DEFAULTS.policyFile;
  if (typeof policyFile !== "string") throw optionError("policyFile", "must be a string");
  if (policyFile !== "" && (LINE_TERMINATOR.test(policyFile) || /[\/\\]/u.test(policyFile) || policyFile.trim() !== policyFile)) {
    throw optionError("policyFile", "must be a plain single-line Sub-Store file name");
  }
  if (policyFile !== "" && policyOverrides !== "") {
    throw optionError("policyFile", "cannot be combined with policyOverrides");
  }

  const logLevel = enumValue(values, "logLevel", LOG_LEVELS, DEFAULTS.logLevel);

  return Object.freeze({
    output,
    type,
    name,
    channel: enumValue(values, "channel", CHANNELS, DEFAULTS.channel),
    dnsMode: enumValue(values, "dnsMode", OPTION_VALUES.dnsMode, DEFAULTS.dnsMode),
    chinaDns: enumValue(values, "chinaDns", OPTION_VALUES.chinaDns, DEFAULTS.chinaDns),
    globalDns: enumValue(values, "globalDns", OPTION_VALUES.globalDns, DEFAULTS.globalDns),
    blockMode: enumValue(values, "blockMode", OPTION_VALUES.blockMode, DEFAULTS.blockMode),
    quicMode: enumValue(values, "quicMode", OPTION_VALUES.quicMode, DEFAULTS.quicMode),
    ipv6Mode: enumValue(values, "ipv6Mode", OPTION_VALUES.ipv6Mode, DEFAULTS.ipv6Mode),
    clientChain,
    clientChainTarget,
    policyOverrides,
    policyFile,
    logLevel,
  });
}
