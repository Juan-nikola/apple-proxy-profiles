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
  return Object.freeze({
    tag: "happ-dns",
    servers: [
      { address: domestic.doh, domains: ["geosite:cn", "geosite:private"], expectIPs: ["geoip:cn"] },
      { address: global.doh, domains: PROXY_GEOSITE_DOMAINS, skipFallback: true, ...(global.address ? { clientIp: global.address } : {}) },
    ],
    queryStrategy: value.ipv6Mode === "ipv4-only" ? "UseIPv4" : "UseIP",
  });
}
export function renderHappDnsRoutes(options = {}) {
  const followTag = options.followTag ?? "happ-follow/current";
  const globalOutboundTag = options.globalOutboundTag ?? followTag;
  return [
    { type: "field", domain: ["geosite:cn", "geosite:private"], outboundTag: "happ-direct", server: "happ-dns" },
    { type: "field", domain: PROXY_GEOSITE_DOMAINS, outboundTag: globalOutboundTag, server: "happ-dns" },
  ];
}

export function happProxyGeositeDomains() {
  return [...PROXY_GEOSITE_DOMAINS];
}
