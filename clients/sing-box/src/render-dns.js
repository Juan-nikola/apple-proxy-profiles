const CHINA_DNS = Object.freeze({
  alidns: "223.5.5.5",
  dnspod: "119.29.29.29",
  system: "local",
});
const GLOBAL_DNS = Object.freeze({
  cloudflare: Object.freeze({ server: "1.1.1.1", serverName: "cloudflare-dns.com" }),
  google: Object.freeze({ server: "8.8.8.8", serverName: "dns.google" }),
  quad9: Object.freeze({ server: "9.9.9.9", serverName: "dns.quad9.net" }),
});

export function renderSingBoxDns(options) {
  const chinaServer = options.chinaDns === "system"
    ? { type: "local", tag: "dns-direct" }
    : { type: "udp", tag: "dns-direct", server: CHINA_DNS[options.chinaDns] };
  const globalDns = GLOBAL_DNS[options.globalDns];
  if (!globalDns) throw new Error(`Unsupported global DNS provider: ${options.globalDns}`);
  const proxyServer = {
    type: "https",
    tag: "dns-proxy",
    server: globalDns.server,
    server_port: 443,
    path: "/dns-query",
    tls: { enabled: true, server_name: globalDns.serverName },
    detour: "🚀 节点选择",
  };
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
