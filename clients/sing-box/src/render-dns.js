const CHINA_DNS = Object.freeze({
  alidns: "223.5.5.5",
  dnspod: "119.29.29.29",
  system: "local",
});
const GLOBAL_DNS = Object.freeze({
  cloudflare: "https://1.1.1.1/dns-query",
  google: "https://dns.google/dns-query",
  quad9: "https://dns.quad9.net/dns-query",
});

export function renderSingBoxDns(options) {
  const chinaServer = options.chinaDns === "system"
    ? { type: "local", tag: "dns-direct" }
    : { type: "udp", tag: "dns-direct", server: CHINA_DNS[options.chinaDns] };
  const proxyServer = { type: "https", tag: "dns-proxy", server: GLOBAL_DNS[options.globalDns], detour: "🚀 节点选择" };
  return {
    servers: [chinaServer, proxyServer],
    rules: [
      { rule_set: ["rule-ChinaMax", "rule-ChinaMax_Domain"], action: "route", server: "dns-direct" },
      { rule_set: ["rule-Advertising", "rule-Privacy", "rule-Hijacking"], action: "route", server: "dns-proxy" },
    ],
    final: "dns-proxy",
    strategy: options.ipv6Mode === "ipv4-only" ? "ipv4_only" : "prefer_ipv4",
    cache_capacity: 4096,
  };
}
