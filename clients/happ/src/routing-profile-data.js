const PROFILE_NAME = "Apple Proxy Profiles Happ";
const REMOTE_DNS = Object.freeze({ type: "DoH", domain: "https://cloudflare-dns.com/dns-query", ip: "1.1.1.1" });
const DOMESTIC_DNS = Object.freeze({ type: "DoH", domain: "https://dns.alidns.com/dns-query", ip: "223.5.5.5" });

const DIRECT_SITES = Object.freeze([
  "geosite:HAPP-PRIVACY",
  "geosite:HAPP-DOMESTICCORE",
  "geosite:HAPP-DOMESTICGAME",
  "geosite:HAPP-STEAMCN",
  "geosite:HAPP-BILIBILI",
  "geosite:HAPP-BYTEDANCE",
  "geosite:HAPP-XIAOHONGSHU",
  "geosite:HAPP-WEIBO",
  "geosite:HAPP-APPLE",
  "geosite:HAPP-MICROSOFT",
  "geosite:HAPP-DOWNLOAD",
  "geosite:HAPP-PRIVATETRACKER",
  "geosite:HAPP-CHINATLD",
]);
const PROXY_SITES = Object.freeze([
  "geosite:HAPP-OPENAI",
  "geosite:HAPP-CLAUDE",
  "geosite:HAPP-GEMINI",
  "geosite:HAPP-COPILOT",
  "geosite:HAPP-GITHUB",
  "geosite:HAPP-YOUTUBE",
  "geosite:HAPP-NETFLIX",
  "geosite:HAPP-DISNEY",
  "geosite:HAPP-SPOTIFY",
  "geosite:HAPP-GLOBALMEDIA",
  "geosite:HAPP-TELEGRAM",
  "geosite:HAPP-FACEBOOK",
  "geosite:HAPP-INSTAGRAM",
  "geosite:HAPP-TWITTER",
  "geosite:HAPP-TIKTOK",
  "geosite:HAPP-OVERSEASGAME",
]);
const BLOCK_SITES = Object.freeze([
  "geosite:HAPP-HIJACKING",
  "geosite:HAPP-BLOCKHTTPDNS",
]);
const DIRECT_IP = Object.freeze([
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "169.254.0.0/16",
  "224.0.0.0/4",
  "255.255.255.255",
  "geoip:HAPP-CHINAIP",
]);

function immutableBaseUrl(value) {
  if (typeof value !== "string" || !/^https:\/\/[^\s?#]+(?:\/[^\s?#]+)*$/u.test(value)) {
    throw new TypeError("Happ immutable base URL must be an HTTPS URL without query or fragment");
  }
  return value.replace(/\/+$/u, "");
}

function unixTimestamp(value) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new TypeError("Happ generatedAt must be an ISO timestamp");
  return String(Math.floor(Date.parse(value) / 1000));
}

export function renderHappRoutingProfile({ baseUrl, generatedAt }) {
  const base = immutableBaseUrl(baseUrl);
  return Object.freeze({
    Name: PROFILE_NAME,
    GlobalProxy: "true",
    RouteOrder: "block-proxy-direct",
    RemoteDNSType: REMOTE_DNS.type,
    RemoteDNSDomain: REMOTE_DNS.domain,
    RemoteDNSIP: REMOTE_DNS.ip,
    DomesticDNSType: DOMESTIC_DNS.type,
    DomesticDNSDomain: DOMESTIC_DNS.domain,
    DomesticDNSIP: DOMESTIC_DNS.ip,
    Geoipurl: base + "/happ/geoip.dat",
    Geositeurl: base + "/happ/geosite.dat",
    LastUpdated: unixTimestamp(generatedAt),
    DnsHosts: Object.freeze({ "cloudflare-dns.com": REMOTE_DNS.ip, "dns.alidns.com": DOMESTIC_DNS.ip }),
    DirectSites: DIRECT_SITES,
    DirectIp: DIRECT_IP,
    ProxySites: PROXY_SITES,
    ProxyIp: Object.freeze([]),
    BlockSites: BLOCK_SITES,
    BlockIp: Object.freeze([]),
    DomainStrategy: "IPIfNonMatch",
    FakeDNS: "false",
    UseChunkFiles: "true",
  });
}

export function renderHappRoutingDeepLink(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) throw new TypeError("Happ routing profile must be an object");
  return "happ://routing/onadd/" + Buffer.from(JSON.stringify(profile), "utf8").toString("base64");
}
