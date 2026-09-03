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

function dnsHosts(providers) {
  const hosts = {};
  for (const provider of providers) {
    if (provider.doh === "system" || provider.address === "local") continue;
    const endpoint = new URL(provider.doh);
    hosts[endpoint.hostname] = provider.address;
    if (typeof provider.serverName === "string" && provider.serverName.length > 0) {
      hosts[provider.serverName] = provider.address;
    }
  }
  return Object.freeze(hosts);
}

export function renderIncyDns(options = {}, { followTag, directTag, dnsRulesTag } = {}) {
  const value = { ...DEFAULT_OPTIONS, ...options };
  const china = chinaDnsProvider(value.chinaDns);
  const global = globalDnsProvider(value.globalDns);
  const privacyMode = value.dnsMode === "privacy";
  const speedMode = value.dnsMode === "speed";
  const hosts = dnsHosts([china, global]);

  return Object.freeze({
    tag: dnsRulesTag,
    servers: [
      Object.freeze({
        tag: directTag,
        address: china.doh,
        domains: Object.freeze(privacyMode ? ["geosite:PRIVATE"] : ["geosite:CN", "geosite:PRIVATE"]),
        expectIPs: domesticExpectIPs(),
      }),
      Object.freeze({
        tag: followTag,
        address: global.doh,
        domains: Object.freeze(privacyMode ? [] : proxyDomains()),
        skipFallback: !(privacyMode || speedMode),
        ...(global.address ? { clientIp: global.address } : {}),
      }),
    ],
    ...(Object.keys(hosts).length > 0 ? { hosts } : {}),
    disableFallback: privacyMode,
    queryStrategy: value.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP",
  });
}
