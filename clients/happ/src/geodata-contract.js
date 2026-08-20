// One label contract shared by HAPP routing, DNS, profiles, and GeoData.
export const HAPP_GEOSITE_ALIASES = Object.freeze({
  Hijacking: "CATEGORY-ADS-ALL",
  BlockHttpDNS: "CATEGORY-HTTPDNS-CN",
  Privacy: "PRIVATE",
  DomesticCore: "CN",
  DomesticGame: "CATEGORY-GAMES-CN",
  SteamCN: "STEAM",
  BiliBili: "BILIBILI",
  ByteDance: "BYTEDANCE",
  XiaoHongShu: "XIAOHONGSHU",
  Weibo: "CATEGORY-SOCIAL-MEDIA-CN",
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
  Apple: "APPLE",
  Microsoft: "MICROSOFT",
  Download: "CATEGORY-NETDISK-!CN",
  PrivateTracker: "CATEGORY-PT",
  OverseasGame: "CATEGORY-GAMES-!CN",
  ChinaTLD: "CN",
});
export const HAPP_GEOIP_ALIASES = Object.freeze({ ChinaIP: "CN" });

export const HAPP_PROFILE_DIRECT_SITES = Object.freeze([
  "geosite:PRIVATE", "geosite:CN", "geosite:CATEGORY-GAMES-CN", "geosite:STEAM",
  "geosite:BILIBILI", "geosite:BYTEDANCE", "geosite:XIAOHONGSHU",
  "geosite:CATEGORY-SOCIAL-MEDIA-CN", "geosite:APPLE", "geosite:MICROSOFT",
  "geosite:CATEGORY-NETDISK-!CN", "geosite:CATEGORY-PT",
]);
export const HAPP_PROFILE_PROXY_SITES = Object.freeze([
  "geosite:OPENAI", "geosite:CATEGORY-AI-!CN", "geosite:GOOGLE-GEMINI",
  "geosite:GITHUB-COPILOT", "geosite:GITHUB", "geosite:YOUTUBE", "geosite:NETFLIX",
  "geosite:DISNEY", "geosite:SPOTIFY", "geosite:CATEGORY-MEDIA", "geosite:TELEGRAM",
  "geosite:FACEBOOK", "geosite:INSTAGRAM", "geosite:TWITTER", "geosite:TIKTOK",
  "geosite:CATEGORY-GAMES-!CN",
]);
export const HAPP_PROFILE_BLOCK_SITES = Object.freeze([
  "geosite:CATEGORY-ADS-ALL", "geosite:CATEGORY-HTTPDNS-CN",
]);
export const HAPP_PROFILE_DIRECT_IP = Object.freeze([
  "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "169.254.0.0/16",
  "224.0.0.0/4", "255.255.255.255", "geoip:PRIVATE", "geoip:CN",
]);

export const HAPP_PRIVATE_IPV4 = Object.freeze([
  "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
  "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24", "192.168.0.0/16",
  "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4",
  "240.0.0.0/4", "255.255.255.255/32",
]);
export const HAPP_PRIVATE_IPV6 = Object.freeze(["::1/128", "::ffff:0:0/96", "fc00::/7", "fe80::/10", "ff00::/8"]);
export const HAPP_PRIVATE_DOMAINS = Object.freeze(["localhost", "localhost.localdomain", "local", "localdomain", "lan"]);
