import { OPTION_VALUES } from "../../../shared/contracts.js";
import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";
import { validateCollectionName } from "../../../shared/substore/collection-name.js";
import { parseRegion } from "../../../shared/rules/region-values.js";
import { parseBusinessOverrides } from "../../../shared/policies/business-targets.js";

const DEFAULTS = Object.freeze({ channel: "edge", region: "cn", dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", blockMode: "balanced", quicMode: "proxy-block", ipv6Mode: "auto", clientChain: "off", clientChainTarget: "", policyOverrides: "" });
const ALLOWED = new Set(["output", "type", "name", "subscriptionName", "platform", ...Object.keys(DEFAULTS)]);
const required = (raw, key) => { const value = raw[key]; if (typeof value !== "string" || !value || value.trim() !== value || /[\r\n]/u.test(value)) throw new Error(`v2rayN option '${key}' is invalid`); return value; };
export function parseV2rayNOptions(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("v2rayN options must be an object");
  for (const key of Object.keys(raw)) if (!key.startsWith("_") && !ALLOWED.has(key)) throw new Error(`Unknown v2rayN option: ${key}`);
  for (const key of ["output", "type", "name"]) if (!Object.hasOwn(raw, key)) throw new Error(`v2rayN option '${key}' is required`);
  const output = required(raw, "output"); if (!["nodes", "config"].includes(output)) throw new Error("v2rayN option 'output' is unsupported");
  if (required(raw, "type") !== "collection") throw new Error("v2rayN option 'type' must be collection");
  const platform = raw.platform === undefined ? undefined : required(raw, "platform");
  if (output === "config" && platform === undefined) throw new Error("v2rayN option 'platform' is required");
  if (platform !== undefined && !["windows", "macos"].includes(platform)) throw new Error("v2rayN option 'platform' is unsupported");
  const options = { output, type: "collection", name: validateCollectionName(raw.name, "v2rayN option 'name'"), subscriptionName: raw.subscriptionName === undefined ? "" : required(raw, "subscriptionName"), platform, channel: raw.channel ?? DEFAULTS.channel, region: parseRegion(raw.region ?? DEFAULTS.region), dnsMode: raw.dnsMode ?? DEFAULTS.dnsMode, chinaDns: raw.chinaDns ?? DEFAULTS.chinaDns, globalDns: raw.globalDns ?? DEFAULTS.globalDns, blockMode: raw.blockMode ?? DEFAULTS.blockMode, quicMode: raw.quicMode ?? DEFAULTS.quicMode, ipv6Mode: raw.ipv6Mode ?? DEFAULTS.ipv6Mode, clientChain: raw.clientChain ?? DEFAULTS.clientChain, clientChainTarget: raw.clientChainTarget ?? DEFAULTS.clientChainTarget, policyOverrides: raw.policyOverrides ?? DEFAULTS.policyOverrides };
  if (!FRONTIER_CHANNELS.includes(options.channel)) throw new Error("v2rayN option 'channel' is unsupported");
  for (const key of ["dnsMode", "chinaDns", "globalDns", "blockMode", "quicMode", "ipv6Mode", "clientChain"]) if (!OPTION_VALUES[key]?.includes(options[key])) throw new Error(`v2rayN option '${key}' is unsupported`);
  if (options.clientChain === "off" && options.clientChainTarget !== "") throw new Error("v2rayN clientChainTarget requires clientChain=on");
  if (options.clientChain === "on" && !/^NODE:.+$/u.test(options.clientChainTarget)) throw new Error("v2rayN clientChainTarget is required when clientChain=on");
  if (typeof options.policyOverrides !== "string" || /[\r\n]/u.test(options.policyOverrides)) throw new Error("v2rayN policyOverrides is invalid");
  parseBusinessOverrides(options.policyOverrides);
  return Object.freeze(options);
}
