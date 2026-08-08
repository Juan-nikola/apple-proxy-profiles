export const DEFAULT_RULE_SOURCE_IDS = Object.freeze([
  "Hijacking", "BlockHttpDNS", "Privacy",
  "DomesticCore", "DomesticGame",
  "BiliBili", "ByteDance", "XiaoHongShu", "Weibo",
  "OpenAI", "Claude", "Gemini", "Copilot", "GitHub",
  "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
  "Telegram", "Facebook", "Instagram", "Twitter", "TikTok",
  "Apple", "Microsoft", "SteamCN", "OverseasGame",
  "Download", "PrivateTracker", "ChinaIP",
]);

export const FULL_ADBLOCK_SOURCE_IDS = Object.freeze([
  "Advertising", "Advertising_Domain",
]);

export const RULE_BUDGETS = Object.freeze({
  domesticCoreEntries: 2_000,
  defaultEntries: 25_000,
  defaultBytes: 5_000_000,
  startupInlineEntries: 64,
  singBoxRuleRssBytes: 50 * 1024 * 1024,
  singBoxTotalRssBytes: 200 * 1024 * 1024,
});

export const ROUTING_PRECEDENCE = Object.freeze([
  "local", "security", "custom", "domesticCore", "domesticGame",
  "explicitOverseas", "overseasGame", "chinaIp", "defaultProxy",
]);

// These services must use proxy-side DNS before the China-first catch-all.
// Domestic/direct-first services intentionally stay out of this list.
export const EXPLICIT_OVERSEAS_RULE_SOURCE_IDS = Object.freeze([
  "OpenAI", "Claude", "Gemini", "Copilot", "GitHub",
  "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
  "Telegram", "Facebook", "Instagram", "Twitter", "TikTok", "OverseasGame",
]);

export const POLICY_TARGETS = Object.freeze({
  direct: "DIRECT",
  defaultProxy: "🚀 节点选择",
  overseasGame: "🌍 海外游戏",
  reject: "REJECT",
});

const SOURCE_POLICIES = Object.freeze({
  Hijacking: POLICY_TARGETS.reject,
  BlockHttpDNS: POLICY_TARGETS.reject,
  Privacy: "🕵️ 严格跟踪",
  DomesticCore: POLICY_TARGETS.direct,
  DomesticGame: POLICY_TARGETS.direct,
  BiliBili: "📺 哔哩哔哩",
  ByteDance: "🎵 抖音",
  XiaoHongShu: "📕 小红书",
  Weibo: "🧣 微博",
  OpenAI: "🤖 AI 专用",
  Claude: "🤖 AI 专用",
  Gemini: "🤖 AI 专用",
  Copilot: "🤖 AI 专用",
  GitHub: "🐙 GitHub",
  YouTube: "📺 YouTube",
  Netflix: "🎬 Netflix",
  Disney: "🏰 Disney+",
  Spotify: "🎵 Spotify",
  GlobalMedia: "🌍 国际媒体",
  Telegram: "✈️ Telegram",
  Facebook: "💬 海外社交",
  Instagram: "💬 海外社交",
  Twitter: "💬 海外社交",
  TikTok: "🎶 TikTok",
  Apple: "🍎 Apple",
  Microsoft: "🪟 Microsoft",
  SteamCN: POLICY_TARGETS.direct,
  OverseasGame: POLICY_TARGETS.overseasGame,
  Download: "⬇️ 下载/P2P",
  PrivateTracker: "⬇️ 下载/P2P",
  ChinaIP: POLICY_TARGETS.direct,
  Advertising: "🧱 常见广告",
  Advertising_Domain: "🧱 常见广告",
});

function clientRecord(id) {
  const policy = SOURCE_POLICIES[id];
  if (!policy) throw new Error(`Missing policy for lightweight rule source: ${id}`);
  return Object.freeze({
    id,
    policy,
    // The publication pipeline emits normalized, typed Surge/Shadowrocket
    // lines for every compiled source, including domain-only inputs.
    inputFormat: "RULE-SET",
  });
}

export const DEFAULT_RULE_CLIENT_CATALOG = Object.freeze(DEFAULT_RULE_SOURCE_IDS.map(clientRecord));
const FULL_ADBLOCK_RULE_CLIENT_CATALOG = Object.freeze(FULL_ADBLOCK_SOURCE_IDS.map(clientRecord));

/**
 * Returns the client-visible rule sources. Advertising is deliberately opt-in:
 * no default client can load the large advertising pack accidentally.
 */
export function ruleClientCatalog({ adblockMode = "off" } = {}) {
  if (adblockMode !== "off" && adblockMode !== "full") {
    throw new TypeError("adblockMode must be either off or full");
  }
  return adblockMode === "full"
    ? Object.freeze([...DEFAULT_RULE_CLIENT_CATALOG, ...FULL_ADBLOCK_RULE_CLIENT_CATALOG])
    : DEFAULT_RULE_CLIENT_CATALOG;
}
