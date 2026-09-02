import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";
import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { HAPP_GEOSITE_ALIASES } from "../../../shared/happ-geodata-contract.js";

const DEFAULT_OPTIONS = Object.freeze({
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  ipv6Mode: "ipv4-only",
});

function proxyDomains() {
  return orderedRoutingPlan({ adblockMode: "off" })
    .filter(({ dnsClass }) => dnsClass === "proxy")
    .map(({ id }) => `geosite:${HAPP_GEOSITE_ALIASES[id] ?? id.toUpperCase()}`);
}

function domesticExpectIPs() {
  return Object.freeze(["geoip:PRIVATE", "geoip:CN"]);
}

export function renderIncyDns(options = {}, { followTag, directTag, dnsRulesTag } = {}) {
  const value = { ...DEFAULT_OPTIONS, ...options };
  const china = chinaDnsProvider(value.chinaDns);
  const global = globalDnsProvider(value.globalDns);

  return Object.freeze({
    tag: dnsRulesTag,
    servers: [
      Object.freeze({
        tag: directTag,
        address: china.doh,
        domains: Object.freeze(["geosite:CN", "geosite:PRIVATE"]),
        expectIPs: domesticExpectIPs(),
      }),
      Object.freeze({
        tag: followTag,
        address: global.doh,
        domains: Object.freeze(proxyDomains()),
        skipFallback: true,
        ...(global.address ? { clientIp: global.address } : {}),
      }),
    ],
    queryStrategy: value.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP",
  });
}
