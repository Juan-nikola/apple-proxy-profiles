import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";
import { PROXY_DNS_DOMAIN_SUFFIXES } from "../../../shared/rules/overseas-dns.js";

const proxyDnsSourceIds = Object.freeze(
  orderedRoutingPlan().filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => id),
);

export function renderSingBoxDns(options) {
  const chinaDns = chinaDnsProvider(options.chinaDns);
  const chinaServer = options.chinaDns === "system"
    ? { type: "local", tag: "dns-direct" }
    : { type: "udp", tag: "dns-direct", server: chinaDns.address };
  const globalDns = globalDnsProvider(options.globalDns);
  const proxyServer = {
    type: "https",
    tag: "dns-proxy",
    server: globalDns.address,
    server_port: 443,
    path: "/dns-query",
    tls: { enabled: true, server_name: globalDns.serverName },
    detour: "🚀 节点选择",
  };
  const proxyDnsRuleSets = proxyDnsSourceIds.map((id) => `rule-${id}`);
  return {
    servers: [chinaServer, proxyServer],
    rules: options.profileMode === "diagnostic" ? [] : [
      {
        domain_suffix: PROXY_DNS_DOMAIN_SUFFIXES,
        action: "evaluate",
        server: "dns-proxy",
      },
      {
        match_response: true,
        domain_suffix: PROXY_DNS_DOMAIN_SUFFIXES,
        action: "respond",
      },
      {
        rule_set: proxyDnsRuleSets,
        action: "evaluate",
        server: "dns-proxy",
      },
      {
        match_response: true,
        rule_set: proxyDnsRuleSets,
        action: "respond",
      },
      { action: "route", server: "dns-direct" },
    ],
    final: "dns-direct",
    strategy: options.ipv6Mode === "ipv4-only" ? "ipv4_only" : "prefer_ipv4",
    cache_capacity: 4096,
  };
}
