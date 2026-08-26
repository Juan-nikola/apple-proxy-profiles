import { OPTION_VALUES } from "../../../shared/contracts.js";
import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";
import { validateCollectionName } from "../../../shared/substore/collection-name.js";

const OUTPUTS = new Set(["nodes", "profile", "audit"]);
const CHANNELS = new Set(FRONTIER_CHANNELS);
const DEFAULTS = Object.freeze({
  channel: "current",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "auto",
  clientChain: "off",
  clientChainTarget: "",
  policyOverrides: "",
});
const REQUIRED = Object.freeze(["output", "type", "name"]);
const ALLOWED = new Set([...REQUIRED, ...Object.keys(DEFAULTS)]);

function requiredString(raw, key) {
  const value = raw[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n]/u.test(value)) {
    throw new Error(`OneXray option '${key}' must be a non-empty single-line string`);
  }
  return value;
}

function enumValue(raw, key) {
  const value = raw[key] ?? DEFAULTS[key];
  if (typeof value !== "string" || !OPTION_VALUES[key]?.includes(value)) {
    throw new Error(`OneXray option '${key}' has an unsupported value`);
  }
  return value;
}

export function parseOneXrayOptions(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("OneXray options must be an object");
  for (const key of Object.keys(raw)) {
    if (!key.startsWith("_") && !ALLOWED.has(key)) throw new Error(`Unknown OneXray option: ${key}`);
  }
  for (const key of REQUIRED) if (!Object.hasOwn(raw, key)) throw new Error(`OneXray option '${key}' is required`);
  const output = requiredString(raw, "output");
  if (!OUTPUTS.has(output)) throw new Error("OneXray option 'output' has an unsupported value");
  if (requiredString(raw, "type") !== "collection") throw new Error("OneXray option 'type' must be collection");
  const channel = raw.channel ?? DEFAULTS.channel;
  if (typeof channel !== "string" || !CHANNELS.has(channel)) throw new Error("OneXray option 'channel' has an unsupported value");
  const clientChain = raw.clientChain ?? DEFAULTS.clientChain;
  if (!OPTION_VALUES.clientChain.includes(clientChain)) throw new Error("OneXray option 'clientChain' has an unsupported value");
  const clientChainTarget = raw.clientChainTarget ?? DEFAULTS.clientChainTarget;
  if (typeof clientChainTarget !== "string" || /[\r\n]/u.test(clientChainTarget)) {
    throw new Error("OneXray option 'clientChainTarget' is invalid");
  }
  if (clientChain === "off" && clientChainTarget !== "") throw new Error("OneXray clientChainTarget requires clientChain=on");
  if (clientChain === "on" && !/^NODE:.+$/u.test(clientChainTarget)) throw new Error("OneXray clientChainTarget is required when clientChain=on");
  const policyOverrides = raw.policyOverrides ?? DEFAULTS.policyOverrides;
  if (typeof policyOverrides !== "string" || /[\r\n]/u.test(policyOverrides)) throw new Error("OneXray option 'policyOverrides' is invalid");
  const options = {
    output,
    type: "collection",
    name: validateCollectionName(raw.name, "OneXray option 'name'"),
    channel,
    dnsMode: enumValue(raw, "dnsMode"),
    chinaDns: enumValue(raw, "chinaDns"),
    globalDns: enumValue(raw, "globalDns"),
    blockMode: enumValue(raw, "blockMode"),
    quicMode: enumValue(raw, "quicMode"),
    ipv6Mode: enumValue(raw, "ipv6Mode"),
    clientChain,
    clientChainTarget,
    policyOverrides,
  };
  return Object.freeze(options);
}
