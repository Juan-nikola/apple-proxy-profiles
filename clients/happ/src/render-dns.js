import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";
import { EXPLICIT_OVERSEAS_RULE_SOURCE_IDS } from "../../../shared/rules/lightweight-policy.js";

// HAPP's bundled Xray reads its application geosite.dat. Keep these aliases
// limited to categories present in that bundled database instead of relying
// on profile-local custom country codes.
const HAPP_GEOSITE_ALIASES = Object.freeze({
  OpenAI: "OPENAI",
  Claude: "CATEGORY-AI-!CN",
  Gemini: "GOOGLE-GEMINI",
  Copilot: "GITHUB-COPILOT",
  GitHub: "GITHUB",
  YouTube: "YOUTUBE",
  Netflix: "NETFLIX",
  Disney: "DISNEY",
  Spotify: "SPOTIFY",
  GlobalMedia: "CATEGORY-MEDIA",
  Telegram: "TELEGRAM",
  Facebook: "FACEBOOK",
  Instagram: "INSTAGRAM",
  Twitter: "TWITTER",
  TikTok: "TIKTOK",
  OverseasGame: "CATEGORY-GAMES-!CN",
});
const HAPP_COMPACT_GEOSITE_ALIASES = Object.freeze({
  OpenAI: "HAPP-OPENAI",
  Claude: "HAPP-CLAUDE",
  Gemini: "HAPP-GEMINI",
  Copilot: "HAPP-COPILOT",
  GitHub: "HAPP-GITHUB",
  YouTube: "HAPP-YOUTUBE",
  Netflix: "HAPP-NETFLIX",
  Disney: "HAPP-DISNEY",
  Spotify: "HAPP-SPOTIFY",
  GlobalMedia: "HAPP-GLOBALMEDIA",
  Telegram: "HAPP-TELEGRAM",
  Facebook: "HAPP-FACEBOOK",
  Instagram: "HAPP-INSTAGRAM",
  Twitter: "HAPP-TWITTER",
  TikTok: "HAPP-TIKTOK",
  OverseasGame: "HAPP-OVERSEASGAME",
});
const HAPP_COMPACT_DOMESTIC_GEOSITES = Object.freeze([
  "HAPP-DOMESTICCORE", "HAPP-DOMESTICGAME", "HAPP-STEAMCN",
  "HAPP-BILIBILI", "HAPP-BYTEDANCE", "HAPP-XIAOHONGSHU", "HAPP-WEIBO",
  "HAPP-APPLE", "HAPP-MICROSOFT", "HAPP-DOWNLOAD", "HAPP-PRIVATETRACKER", "HAPP-CHINATLD",
]);
function usesCompactGeodata(platform) {
  return platform === "iphone" || platform === "ipad";
}
function compactDomains(values) {
  return values.map((value) => `geosite:${value}`);
}
const PROXY_GEOSITE_DOMAINS = Object.freeze(
  EXPLICIT_OVERSEAS_RULE_SOURCE_IDS.map((id) => `geosite:${HAPP_GEOSITE_ALIASES[id] ?? id.toUpperCase()}`),
);
const defaults = { dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", ipv6Mode: "auto" };
export function renderHappDns(options = {}) {
  const value = { ...defaults, ...options };
  if (!["stable", "privacy", "speed"].includes(value.dnsMode)) throw new Error("Unsupported Happ dnsMode");
  if (!["alidns", "dnspod", "system"].includes(value.chinaDns)) throw new Error("Unsupported Happ chinaDns");
  if (!["cloudflare", "google", "quad9"].includes(value.globalDns)) throw new Error("Unsupported Happ globalDns");
  if (!["auto", "ipv4-only"].includes(value.ipv6Mode)) throw new Error("Unsupported Happ ipv6Mode");
  const domestic = chinaDnsProvider(value.chinaDns);
  const global = globalDnsProvider(value.globalDns);
  const compact = usesCompactGeodata(value.platform);
  const domesticDomains = compact ? ["geosite:private", ...compactDomains(HAPP_COMPACT_DOMESTIC_GEOSITES)] : ["geosite:cn", "geosite:private"];
  const domesticExpectIPs = compact ? ["geoip:HAPP-CHINAIP"] : ["geoip:cn"];
  const proxyDomains = compact ? EXPLICIT_OVERSEAS_RULE_SOURCE_IDS.map((id) => `geosite:${HAPP_COMPACT_GEOSITE_ALIASES[id] ?? id.toUpperCase()}`) : PROXY_GEOSITE_DOMAINS;
  return Object.freeze({
    tag: "happ-dns",
    servers: [
      { address: domestic.doh, domains: domesticDomains, expectIPs: domesticExpectIPs },
      { address: global.doh, domains: proxyDomains, skipFallback: true, ...(global.address ? { clientIp: global.address } : {}) },
    ],
    queryStrategy: value.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP",
  });
}
export function renderHappDnsRoutes(options = {}) {
  const followTag = options.followTag ?? "happ-follow/current";
  const globalOutboundTag = options.globalOutboundTag ?? followTag;
  const compact = usesCompactGeodata(options.platform);
  const domesticDomains = compact ? ["geosite:private", ...compactDomains(HAPP_COMPACT_DOMESTIC_GEOSITES)] : ["geosite:cn", "geosite:private"];
  const proxyDomains = compact ? EXPLICIT_OVERSEAS_RULE_SOURCE_IDS.map((id) => `geosite:${HAPP_COMPACT_GEOSITE_ALIASES[id] ?? id.toUpperCase()}`) : PROXY_GEOSITE_DOMAINS;
  return [
    { type: "field", domain: domesticDomains, outboundTag: "happ-direct", server: "happ-dns" },
    { type: "field", domain: proxyDomains, outboundTag: globalOutboundTag, server: "happ-dns" },
  ];
}

export function happProxyGeositeDomains() {
  return [...PROXY_GEOSITE_DOMAINS];
}
