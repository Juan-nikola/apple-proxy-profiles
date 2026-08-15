import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";

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
    cache_capacity: 1024,
  };
}
