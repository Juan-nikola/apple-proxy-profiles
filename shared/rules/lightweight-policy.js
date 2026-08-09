export const DEFAULT_RULE_SOURCE_IDS = Object.freeze([
  "Hijacking", "BlockHttpDNS", "Privacy",
  "DomesticCore", "DomesticGame", "SteamCN",
  "BiliBili", "ByteDance", "XiaoHongShu", "Weibo",
  "OpenAI", "Claude", "Gemini", "Copilot", "GitHub",
  "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
  "Telegram", "Facebook", "Instagram", "Twitter", "TikTok",
  "Apple", "Microsoft", "Download", "PrivateTracker",
  "OverseasGame", "ChinaTLD", "ChinaIP",
]);

export const FULL_ADBLOCK_SOURCE_IDS = Object.freeze([
  "Advertising", "Advertising_Domain",
]);

export const ROUTING_PHASES = Object.freeze([
  "security",
  "earlyDomestic",
  "serviceIntent",
  "overseasGame",
  "lateDomestic",
  "resolvedChinaIp",
]);

const PHASE_SOURCE_IDS = Object.freeze({
  security: Object.freeze([
    "Hijacking", "BlockHttpDNS", "Privacy", "Advertising", "Advertising_Domain",
  ]),
  earlyDomestic: Object.freeze(["DomesticCore", "DomesticGame", "SteamCN"]),
  serviceIntent: Object.freeze([
    "BiliBili", "ByteDance", "XiaoHongShu", "Weibo",
    "OpenAI", "Claude", "Gemini", "Copilot", "GitHub",
    "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
    "Telegram", "Facebook", "Instagram", "Twitter", "TikTok",
    "Apple", "Microsoft", "Download", "PrivateTracker",
  ]),
  overseasGame: Object.freeze(["OverseasGame"]),
  lateDomestic: Object.freeze(["ChinaTLD"]),
  resolvedChinaIp: Object.freeze(["ChinaIP"]),
});

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

const DNS_CLASS_SOURCE_IDS = Object.freeze({
  proxy: EXPLICIT_OVERSEAS_RULE_SOURCE_IDS,
  china: Object.freeze([
    "DomesticCore", "DomesticGame", "SteamCN", "ChinaTLD",
    "BiliBili", "ByteDance", "XiaoHongShu", "Weibo",
    "Apple", "Microsoft", "Download", "PrivateTracker",
  ]),
  none: Object.freeze([
    "Hijacking", "BlockHttpDNS", "Privacy", "Advertising", "Advertising_Domain",
    "ChinaIP",
  ]),
});

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
  ChinaTLD: POLICY_TARGETS.direct,
  ChinaIP: POLICY_TARGETS.direct,
  Advertising: "🧱 常见广告",
  Advertising_Domain: "🧱 常见广告",
});

function uniqueMembership(id, memberships, label) {
  const matches = Object.entries(memberships)
    .filter(([, ids]) => ids.includes(id))
    .map(([name]) => name);
  if (matches.length !== 1) {
    throw new Error(`Lightweight rule source ${id} must have exactly one ${label} membership`);
  }
  return matches[0];
}

function clientRecord(id) {
  const policy = SOURCE_POLICIES[id];
  if (!policy) throw new Error(`Missing policy for lightweight rule source: ${id}`);
  const phase = uniqueMembership(id, PHASE_SOURCE_IDS, "routing phase");
  const dnsClass = uniqueMembership(id, DNS_CLASS_SOURCE_IDS, "DNS class");
  return Object.freeze({
    id,
    policy,
    // The publication pipeline emits normalized, typed Surge/Shadowrocket
    // lines for every compiled source, including domain-only inputs.
    inputFormat: "RULE-SET",
    phase,
    dnsClass,
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

export function orderedRoutingPlan({ adblockMode = "off" } = {}) {
  const selected = ruleClientCatalog({ adblockMode });
  const phaseRank = new Map(ROUTING_PHASES.map((phase, index) => [phase, index]));
  const sourceRank = new Map(
    [...DEFAULT_RULE_SOURCE_IDS, ...FULL_ADBLOCK_SOURCE_IDS]
      .map((id, index) => [id, index]),
  );
  return Object.freeze([...selected].sort((left, right) => (
    phaseRank.get(left.phase) - phaseRank.get(right.phase)
    || sourceRank.get(left.id) - sourceRank.get(right.id)
  )));
}
