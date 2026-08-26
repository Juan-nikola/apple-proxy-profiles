import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";

export function renderClashDns(options) {
  const china = chinaDnsProvider(options.chinaDns);
  const global = globalDnsProvider(options.globalDns);
  const privacy = options.dnsMode === "privacy";
  return {
    enable: true,
    ipv6: options.ipv6Mode === "auto",
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": ["*.lan", "*.local", "*.home.arpa", "+.push.apple.com"],
    listen: "0.0.0.0:1053",
    "respect-rules": true,
    "prefer-h3": true,
    nameserver: privacy ? [global.doh] : [china.doh],
    fallback: [global.doh],
    "nameserver-policy": privacy ? {} : {
      "geosite:geolocation-!cn": [global.doh],
      "+.openai.com": [global.doh],
      "+.github.com": [global.doh],
      "+.youtube.com": [global.doh],
    },
    "fallback-filter": {
      geoip: true,
      "geoip-code": "CN",
      geosite: ["gfw"],
    },
  };
}
