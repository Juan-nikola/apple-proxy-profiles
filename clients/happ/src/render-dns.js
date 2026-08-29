import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";
import { EXPLICIT_OVERSEAS_RULE_SOURCE_IDS } from "../../../shared/rules/lightweight-policy.js";
import { HAPP_GEOSITE_ALIASES } from "../../../shared/happ-geodata-contract.js";

const PROXY_GEOSITE_DOMAINS = Object.freeze(
  EXPLICIT_OVERSEAS_RULE_SOURCE_IDS.map((id) => `geosite:${HAPP_GEOSITE_ALIASES[id] ?? id.toUpperCase()}`),
);
const defaults = { dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", ipv6Mode: "auto" };
export function renderHappDns(options = {}) {
  const value = { ...defaults, ...options };
  if (!["stable", "privacy", "speed"].includes(value.dnsMode)) throw new Error("Unsupported Happ dnsMode");
  if (!["alidns", "dnspod", "system"].includes(value.chinaDns)) throw new Error("Unsupported Happ chinaDns");
  if (!["cloudflare", "google", "quad9"].includes(value.globalDns)) throw new Error("Unsupported Happ globalDns");
  if (!["auto", "ipv4-only"].includes(value.ipv6Mode)) throw new Error("Unsupported Happ ipv6Mode");
  const domestic = chinaDnsProvider(value.chinaDns);
  const global = globalDnsProvider(value.globalDns);
  const domesticDomains = ["geosite:CN", "geosite:PRIVATE"];
  const domesticExpectIPs = ["geoip:CN"];
  const proxyDomains = PROXY_GEOSITE_DOMAINS;
  return Object.freeze({
    tag: "happ-dns",
    servers: [
      { address: domestic.doh, domains: domesticDomains, expectIPs: domesticExpectIPs },
      { address: global.doh, domains: proxyDomains, skipFallback: true, ...(global.address ? { clientIp: global.address } : {}) },
    ],
    queryStrategy: value.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP",
  });
}
export function renderHappDnsRoutes(options = {}) {
  const followTag = options.followTag ?? "happ-follow/current";
  const globalOutboundTag = options.globalOutboundTag ?? followTag;
  const globalTarget = options.globalBalancerTag
    ? { balancerTag: options.globalBalancerTag }
    : { outboundTag: globalOutboundTag };
  const domesticDomains = ["geosite:CN", "geosite:PRIVATE"];
  const proxyDomains = PROXY_GEOSITE_DOMAINS;
  return [
    { type: "field", domain: domesticDomains, outboundTag: "happ-direct", server: "happ-dns" },
    { type: "field", domain: proxyDomains, ...globalTarget, server: "happ-dns" },
  ];
}

export function happProxyGeositeDomains() {
  return [...PROXY_GEOSITE_DOMAINS];
}
