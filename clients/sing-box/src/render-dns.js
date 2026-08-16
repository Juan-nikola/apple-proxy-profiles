import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";
import { PROXY_DNS_DOMAIN_SUFFIXES } from "../../../shared/rules/overseas-dns.js";

const proxyDnsSourceIds = Object.freeze(
  orderedRoutingPlan().filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => id),
);
const chinaDnsSourceIds = Object.freeze(
  orderedRoutingPlan().filter(({ dnsClass }) => dnsClass === "china").map(({ id }) => id),
);

const LOCAL_DNS_SUFFIXES = Object.freeze(["local", "lan", "home.arpa"]);

function evaluateAndRespond(match, server) {
  return [
    { ...match, action: "evaluate", server },
    { match_response: true, ...match, action: "respond" },
  ];
}

function dnsRules(options) {
  const rules = [];
  if (options.dnsMode === "privacy") {
    rules.push(...evaluateAndRespond({ domain_suffix: LOCAL_DNS_SUFFIXES }, "dns-direct"));
  }
  rules.push(...evaluateAndRespond({ domain_suffix: PROXY_DNS_DOMAIN_SUFFIXES }, "dns-proxy"));
  if (options.profileMode !== "diagnostic") {
    const sourceIds = options.dnsMode === "privacy" ? chinaDnsSourceIds : proxyDnsSourceIds;
    const server = options.dnsMode === "privacy" ? "dns-direct" : "dns-proxy";
    rules.push(...evaluateAndRespond({ rule_set: sourceIds.map((id) => `rule-${id}`) }, server));
  }
  rules.push({ action: "route", server: options.dnsMode === "privacy" ? "dns-proxy" : "dns-direct" });
  return rules;
}

export function renderSingBoxDns(options) {
  const chinaDns = chinaDnsProvider(options.chinaDns);
  const chinaServer = options.chinaDns === "system"
    ? { type: "local", tag: "dns-direct" }
    : { type: "udp", tag: "dns-direct", server: chinaDns.address, detour: "DIRECT" };
  const globalDns = globalDnsProvider(options.globalDns);
  const proxyServer = {
    type: "https",
    tag: "dns-proxy",
    server: globalDns.address,
    server_port: 443,
    path: "/dns-query",
    tls: { enabled: true, server_name: globalDns.serverName },
    detour: options.dnsMode === "speed" ? "DIRECT" : "🧭 DNS 与规则下载",
  };
  return {
    servers: [chinaServer, proxyServer],
    rules: dnsRules(options),
    final: options.dnsMode === "privacy" ? "dns-proxy" : "dns-direct",
    strategy: options.ipv6Mode === "ipv4-only" ? "ipv4_only" : "prefer_ipv4",
    cache_capacity: 4096,
  };
}
