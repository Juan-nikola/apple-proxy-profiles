import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { oneXrayGeoCode, oneXrayGeoNames } from "./geodata-contract.js";
import { renderOneXrayDns } from "./render-dns.js";
import { renderOneXrayOutbound } from "./render-outbound.js";
import { renderOneXrayRouting } from "./render-routing.js";
import { validateOneXrayProfile } from "./validate-profile.js";

const CHANNELS = new Set(["edge", "current", "previous"]);
const RESERVED_TAGS = new Set([
  "proxy", "chainProxy", "direct", "fragment", "block", "dnsOut", "tunIn", "pingIn",
]);

function requiredObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`OneXray ${label} must be an object`);
  return value;
}

function defaultGeo(channel) {
  const names = oneXrayGeoNames(channel);
  return {
    siteName: names.domain,
    code: oneXrayGeoCode,
  };
}

function dnsResult(input, options, routingPlan, geo) {
  if (input.dnsResult && typeof input.dnsResult === "object") return input.dnsResult;
  if (input.dns && typeof input.dns === "object" && Object.hasOwn(input.dns, "dns") && Object.hasOwn(input.dns, "rules")) return input.dns;
  if (input.dns && typeof input.dns === "object" && Array.isArray(input.dns.servers)) {
    if (!Array.isArray(input.dnsRules)) throw new TypeError("OneXray Profile DNS rules are required");
    return { dns: input.dns, rules: input.dnsRules };
  }
  return renderOneXrayDns({ options, routingPlan, geo });
}

function routingResult(input, options, resolution, dnsRules) {
  if (input.routingResult && typeof input.routingResult === "object") return input.routingResult;
  if (input.routing && typeof input.routing === "object" && Array.isArray(input.routing.rules)) return input.routing;
  return renderOneXrayRouting({ options, resolution, dnsRules });
}

function systemOutbounds() {
  return [
    { protocol: "freedom", tag: "direct" },
    { protocol: "blackhole", tag: "block" },
    { protocol: "dns", tag: "dnsOut" },
  ];
}

function renderCustomOutbounds(resolution) {
  const fixedNodes = Array.isArray(resolution.fixedNodes) ? resolution.fixedNodes : [];
  const tags = new Set();
  const fixed = fixedNodes.map((entry) => {
    requiredObject(entry, "fixed outbound resolution");
    requiredObject(entry.node, "fixed outbound node");
    return renderOneXrayOutbound(entry.node, { tag: entry.tag, tags });
  });
  const chain = resolution.finalOutbound;
  if (chain !== null && chain !== undefined) {
    requiredObject(chain, "chain landing resolution");
    requiredObject(chain.node, "chain landing node");
    if (chain.tag !== "chainProxy") throw new Error("OneXray chain landing tag must be chainProxy");
    // `chainProxy` is a runtime-reserved marker and is intentionally not
    // passed through the display-tag escape used by node subscriptions. Render
    // the typed outbound under an internal collision-checked tag, then apply
    // the audited Final Outbound marker exactly once.
    const landingTag = `ap-chain-${chain.node._profile?.id ?? "landing"}`;
    const landing = renderOneXrayOutbound(chain.node, { tag: landingTag, tags });
    landing.tag = "chainProxy";
    fixed.push(landing);
  }
  return fixed;
}

function validateChannel(channel) {
  if (typeof channel !== "string" || !CHANNELS.has(channel)) throw new TypeError("OneXray Profile channel is invalid");
  return channel;
}

/**
 * Compose the native, credential-bearing OneXray Profile. Runtime-selected
 * homepage nodes are intentionally absent: OneXray owns `proxy`, TUN, and
 * ping inbounds. Only fixed business outbounds and the optional Final
 * Outbound landing node are embedded here.
 */
export function renderOneXrayProfile(input = {}) {
  requiredObject(input, "Profile input");
  const options = requiredObject(input.options, "Profile options");
  const channel = validateChannel(options.channel);
  const resolution = requiredObject(input.resolution, "policy resolution");
  const routingPlan = input.routingPlan ?? orderedRoutingPlan();
  const geo = input.geo ?? defaultGeo(channel);
  const dns = dnsResult(input, options, routingPlan, geo);
  requiredObject(dns, "DNS result");
  if (!dns.dns || !Array.isArray(dns.rules)) throw new TypeError("OneXray Profile DNS result is incomplete");
  const routing = routingResult(input, options, resolution, dns.rules);
  requiredObject(routing, "routing result");
  if (!Array.isArray(routing.rules) || routing.domainStrategy !== "IPIfNonMatch") throw new TypeError("OneXray Profile routing result is incomplete");

  const profile = {
    name: `Apple Proxy · OneXray · ${channel}`,
    log: { loglevel: "warning" },
    dns: dns.dns,
    routing,
    // TUN and ping are materialized by OneXray's runtime, not the imported
    // profile. Keeping the section present makes this a native Profile while
    // avoiding platform-specific Raw Config fields.
    inbounds: [],
    outbounds: [...renderCustomOutbounds(resolution), ...systemOutbounds()],
  };

  const validation = validateOneXrayProfile(profile, {
    channel,
    geo,
    resolution,
    chain: resolution.chain,
  });
  if (!validation.valid) throw new Error(`Generated OneXray Profile failed validation: ${validation.errors.join(", ")}`);
  return profile;
}

export { RESERVED_TAGS };
