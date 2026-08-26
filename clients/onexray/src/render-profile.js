import { BUSINESS_TARGETS } from "../../../shared/policies/business-targets.js";
import { CRITICAL_DOMESTIC_DOMAIN_SUFFIXES } from "../../../shared/rules/critical-domestic.js";
import { renderOneXrayOutbound } from "./render-outbound.js";

function dnsServer(options) {
  const china = options.chinaDns === "dnspod" ? "119.29.29.29" : options.chinaDns === "system" ? "localhost" : "223.5.5.5";
  const global = options.globalDns === "google" ? "8.8.8.8" : options.globalDns === "quad9" ? "9.9.9.9" : "1.1.1.1";
  const queryStrategy = options.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP";
  const domesticDomains = ["geosite:cn", "geosite:private", ...CRITICAL_DOMESTIC_DOMAIN_SUFFIXES.map((suffix) => `domain:${suffix}`)];
  return {
    servers: [
      { tag: "china-dns", address: china, domains: domesticDomains, queryStrategy },
      { tag: "global-dns", address: global, domains: ["geosite:apple-proxy-overseas"], queryStrategy },
    ],
    queryStrategy,
    tag: "dnsQuery",
  };
}

function targetTag(resolution, id, fallback = "proxy") {
  return resolution?.targets?.[id]?.resolvedTag ?? fallback;
}

function routingRules({ resolution, options }) {
  const rules = [
    { domain: ["geosite:private"], outboundTag: "direct", ruleTag: "private-direct" },
    { ip: ["geoip:private"], outboundTag: "direct", ruleTag: "private-ip-direct" },
    ...CRITICAL_DOMESTIC_DOMAIN_SUFFIXES.map((suffix) => ({
      domain: [`domain:${suffix}`], outboundTag: "direct", ruleTag: `critical-domestic-${suffix}`,
    })),
    { domain: ["geosite:apple-proxy-security"], outboundTag: options.blockMode === "off" ? "direct" : "block", ruleTag: "security-block" },
    { domain: ["geosite:apple-proxy-privacy"], outboundTag: "direct", ruleTag: "privacy-direct" },
  ];
  for (const target of BUSINESS_TARGETS) {
    const source = target.id === "chinaIp"
      ? { ip: ["geoip:apple-proxy-china-ip"] }
      : { domain: [`geosite:apple-proxy-${target.id}`] };
    rules.push({
      ...source,
      outboundTag: targetTag(resolution, target.id, target.defaultTarget === "DIRECT" ? "direct" : "proxy"),
      ruleTag: `business-${target.id}`,
    });
  }
  rules.push(
    { domain: ["geosite:cn"], outboundTag: "direct", ruleTag: "china-domain-direct" },
    { ip: ["geoip:cn"], outboundTag: "direct", ruleTag: "china-ip-direct" },
    { network: "tcp,udp", outboundTag: resolution?.chain?.enabled ? "chainProxy" : "proxy", ruleTag: "final-follow" },
  );
  return rules;
}

function defaultResolution(nodes, options) {
  const homepageNodes = nodes.filter((node) => node?._profile?.chained !== true);
  return {
    homepageNodes,
    fixedNodes: [],
    finalOutbound: null,
    targets: Object.fromEntries(BUSINESS_TARGETS.map((target) => [target.id, {
      configured: target.defaultTarget,
      resolvedTag: target.defaultTarget === "DIRECT" ? "direct" : "proxy",
      status: target.defaultTarget === "DIRECT" ? "direct" : "follow",
    }])),
    chain: { enabled: options.clientChain === "on", landingTag: options.clientChain === "on" ? "chainProxy" : null, entryCount: homepageNodes.length },
  };
}

export function renderOneXrayProfile({ options, nodes = [], resolution = null } = {}) {
  if (!options || options.output !== "profile") throw new Error("OneXray profile options are required");
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("OneXray profile requires compatible nodes");
  const resolved = resolution ?? defaultResolution(nodes, options);
  const fixedOutbounds = (resolved.fixedNodes ?? []).map(({ node, tag }) => renderOneXrayOutbound(node, { tag }));
  const chainOutbounds = resolved.finalOutbound
    ? [renderOneXrayOutbound(resolved.finalOutbound.node, { tag: resolved.finalOutbound.tag })]
    : [];
  return {
    name: options.name,
    dns: dnsServer(options),
    inbounds: [{ tag: "tun", protocol: "tun", settings: { mtu: 1500 }, sniffing: { enabled: true, routeOnly: true } }],
    outbounds: [
      { protocol: "freedom", tag: "direct" },
      { protocol: "blackhole", tag: "block" },
      ...fixedOutbounds,
      ...chainOutbounds,
    ],
    routing: { domainStrategy: "IPIfNonMatch", rules: routingRules({ resolution: resolved, options }) },
  };
}
