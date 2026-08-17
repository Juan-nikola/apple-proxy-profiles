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

// Keep domestic direct routing and security coverage on iOS while avoiding
// the larger overseas service catalog under NetworkExtension's RSS ceiling.
export const MOBILE_RULE_BUNDLES = Object.freeze([
  Object.freeze({ id: "Security", sourceIds: Object.freeze(["Hijacking", "BlockHttpDNS"]), policy: "REJECT", phase: "security", dnsClass: "none" }),
  Object.freeze({ id: "Privacy", sourceIds: Object.freeze(["Privacy"]), policy: "🕵️ 严格跟踪", phase: "security", dnsClass: "none" }),
  Object.freeze({ id: "DomesticCore", sourceIds: Object.freeze(["DomesticCore", "DomesticGame", "SteamCN"]), policy: "DIRECT", phase: "earlyDomestic", dnsClass: "china" }),
  Object.freeze({ id: "DomesticPlatform", sourceIds: Object.freeze(["BiliBili", "ByteDance", "XiaoHongShu", "Weibo"]), policy: "🇨🇳 国内平台", phase: "serviceIntent", dnsClass: "china" }),
  Object.freeze({ id: "AI", sourceIds: Object.freeze(["OpenAI", "Claude", "Gemini", "Copilot"]), policy: "🤖 AI 专用", phase: "serviceIntent", dnsClass: "proxy" }),
  Object.freeze({ id: "GitHub", sourceIds: Object.freeze(["GitHub"]), policy: "🐙 GitHub", phase: "serviceIntent", dnsClass: "proxy" }),
  Object.freeze({ id: "YouTube", sourceIds: Object.freeze(["YouTube"]), policy: "📺 YouTube", phase: "serviceIntent", dnsClass: "proxy" }),
  Object.freeze({ id: "OverseasMedia", sourceIds: Object.freeze(["Netflix", "Disney", "Spotify", "GlobalMedia"]), policy: "🎬 海外流媒体", phase: "serviceIntent", dnsClass: "proxy" }),
  Object.freeze({ id: "OverseasSocial", sourceIds: Object.freeze(["Telegram", "Facebook", "Instagram", "Twitter", "TikTok"]), policy: "💬 海外社交", phase: "serviceIntent", dnsClass: "proxy" }),
  Object.freeze({ id: "Apple", sourceIds: Object.freeze(["Apple"]), policy: "🍎 Apple", phase: "serviceIntent", dnsClass: "china" }),
  Object.freeze({ id: "Microsoft", sourceIds: Object.freeze(["Microsoft"]), policy: "🪟 Microsoft", phase: "serviceIntent", dnsClass: "china" }),
  Object.freeze({ id: "Download", sourceIds: Object.freeze(["Download", "PrivateTracker"]), policy: "⬇️ 下载/P2P", phase: "serviceIntent", dnsClass: "china" }),
  Object.freeze({ id: "OverseasGame", sourceIds: Object.freeze(["OverseasGame"]), policy: "🌍 海外游戏", phase: "overseasGame", dnsClass: "proxy" }),
  Object.freeze({ id: "ChinaIP", sourceIds: Object.freeze(["ChinaIP"]), policy: "DIRECT", phase: "resolvedChinaIp", dnsClass: "none" }),
]);

export const MOBILE_RULE_SOURCE_IDS = Object.freeze(MOBILE_RULE_BUNDLES.map(({ id }) => id));

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
  overseasMedia: "🎬 海外流媒体",
  overseasSocial: "💬 海外社交",
  domesticPlatform: "🇨🇳 国内平台",
  reject: "REJECT",
});

const SOURCE_POLICIES = Object.freeze({
  Hijacking: POLICY_TARGETS.reject,
  BlockHttpDNS: POLICY_TARGETS.reject,
  Privacy: "🕵️ 严格跟踪",
  DomesticCore: POLICY_TARGETS.direct,
  DomesticGame: POLICY_TARGETS.direct,
  BiliBili: POLICY_TARGETS.domesticPlatform,
  ByteDance: POLICY_TARGETS.domesticPlatform,
  XiaoHongShu: POLICY_TARGETS.domesticPlatform,
  Weibo: POLICY_TARGETS.domesticPlatform,
  OpenAI: "🤖 AI 专用",
  Claude: "🤖 AI 专用",
  Gemini: "🤖 AI 专用",
  Copilot: "🤖 AI 专用",
  GitHub: "🐙 GitHub",
  YouTube: "📺 YouTube",
  Netflix: POLICY_TARGETS.overseasMedia,
  Disney: POLICY_TARGETS.overseasMedia,
  Spotify: POLICY_TARGETS.overseasMedia,
  GlobalMedia: POLICY_TARGETS.overseasMedia,
  Telegram: POLICY_TARGETS.overseasSocial,
  Facebook: POLICY_TARGETS.overseasSocial,
  Instagram: POLICY_TARGETS.overseasSocial,
  Twitter: POLICY_TARGETS.overseasSocial,
  TikTok: POLICY_TARGETS.overseasSocial,
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

export const MOBILE_RULE_CLIENT_CATALOG = Object.freeze(MOBILE_RULE_BUNDLES.map((bundle) => Object.freeze({
  id: bundle.id,
  policy: bundle.policy,
  inputFormat: "RULE-SET",
  phase: bundle.phase,
  dnsClass: bundle.dnsClass,
})));

export function mobileRuleClientCatalog() {
  return MOBILE_RULE_CLIENT_CATALOG;
}

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
