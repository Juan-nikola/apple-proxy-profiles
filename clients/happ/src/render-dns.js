import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";
const defaults = { dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", ipv6Mode: "auto" };
export function renderHappDns(options = {}) {
  const value = { ...defaults, ...options };
  if (!["stable", "privacy", "speed"].includes(value.dnsMode)) throw new Error("Unsupported Happ dnsMode");
  if (!["alidns", "dnspod", "system"].includes(value.chinaDns)) throw new Error("Unsupported Happ chinaDns");
  if (!["cloudflare", "google", "quad9"].includes(value.globalDns)) throw new Error("Unsupported Happ globalDns");
  if (!["auto", "ipv4-only"].includes(value.ipv6Mode)) throw new Error("Unsupported Happ ipv6Mode");
  const domestic = chinaDnsProvider(value.chinaDns);
  const global = globalDnsProvider(value.globalDns);
  return Object.freeze({
    tag: "happ-dns",
    servers: [
      { address: domestic.doh, domains: ["geosite:cn", "geosite:private"], expectIPs: ["geoip:cn"] },
      { address: global.doh, domains: ["geosite:HAPP-PROXY"], skipFallback: true, ...(global.address ? { clientIp: global.address } : {}) },
    ],
    queryStrategy: value.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP",
  });
}
export function renderHappDnsRoutes(options = {}) {
  const followTag = options.followTag ?? "happ-follow/current";
  return [
    { type: "field", domain: ["geosite:cn", "geosite:private"], outboundTag: "happ-direct", server: "happ-dns" },
    { type: "field", domain: ["geosite:HAPP-PROXY"], outboundTag: followTag, server: "happ-dns" },
  ];
}
