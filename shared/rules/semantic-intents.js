const intent = ({ id, ruleId, label, sourceIds, policy, defaultTarget, phase, dnsClass }) => Object.freeze({
  id,
  ruleId,
  label,
  sourceIds: Object.freeze([...sourceIds]),
  policy,
  defaultTarget,
  phase,
  dnsClass,
});

/**
 * Stable internal routing meanings. Client renderers consume the compiled
 * source IDs, while this catalog keeps the business intent independent from
 * any one client's rule syntax or UI labels.
 */
export const SEMANTIC_INTENTS = Object.freeze([
  intent({ id: "security", ruleId: "Security", label: "安全拦截", sourceIds: ["Hijacking", "BlockHttpDNS"], policy: "REJECT", defaultTarget: "REJECT", phase: "security", dnsClass: "none" }),
  intent({ id: "privacy", ruleId: "Privacy", label: "🕵️ 严格跟踪", sourceIds: ["Privacy"], policy: "🕵️ 严格跟踪", defaultTarget: "DIRECT", phase: "security", dnsClass: "none" }),
  intent({ id: "domesticCore", ruleId: "DomesticCore", label: "国内核心", sourceIds: ["DomesticCore", "DomesticGame", "SteamCN"], policy: "DIRECT", defaultTarget: "DIRECT", phase: "earlyDomestic", dnsClass: "china" }),
  intent({ id: "domesticPlatform", ruleId: "DomesticPlatform", label: "🇨🇳 国内平台", sourceIds: ["BiliBili", "ByteDance", "XiaoHongShu", "Weibo"], policy: "🇨🇳 国内平台", defaultTarget: "DIRECT", phase: "serviceIntent", dnsClass: "china" }),
  intent({ id: "ai", ruleId: "AI", label: "🤖 AI 专用", sourceIds: ["OpenAI", "Claude", "Gemini", "Copilot"], policy: "🤖 AI 专用", defaultTarget: "FOLLOW", phase: "serviceIntent", dnsClass: "proxy" }),
  intent({ id: "github", ruleId: "GitHub", label: "🐙 GitHub", sourceIds: ["GitHub"], policy: "🐙 GitHub", defaultTarget: "FOLLOW", phase: "serviceIntent", dnsClass: "proxy" }),
  intent({ id: "youtube", ruleId: "YouTube", label: "📺 YouTube", sourceIds: ["YouTube"], policy: "📺 YouTube", defaultTarget: "FOLLOW", phase: "serviceIntent", dnsClass: "proxy" }),
  intent({ id: "overseasMedia", ruleId: "OverseasMedia", label: "🎬 海外流媒体", sourceIds: ["Netflix", "Disney", "Spotify", "GlobalMedia"], policy: "🎬 海外流媒体", defaultTarget: "FOLLOW", phase: "serviceIntent", dnsClass: "proxy" }),
  intent({ id: "globalSocial", ruleId: "OverseasSocial", label: "💬 海外社交", sourceIds: ["Telegram", "Facebook", "Instagram", "Twitter", "TikTok"], policy: "💬 海外社交", defaultTarget: "FOLLOW", phase: "serviceIntent", dnsClass: "proxy" }),
  intent({ id: "apple", ruleId: "Apple", label: "🍎 Apple", sourceIds: ["Apple"], policy: "🍎 Apple", defaultTarget: "DIRECT", phase: "serviceIntent", dnsClass: "china" }),
  intent({ id: "microsoft", ruleId: "Microsoft", label: "🪟 Microsoft", sourceIds: ["Microsoft"], policy: "🪟 Microsoft", defaultTarget: "DIRECT", phase: "serviceIntent", dnsClass: "china" }),
  intent({ id: "download", ruleId: "Download", label: "⬇️ 下载/P2P", sourceIds: ["Download", "PrivateTracker"], policy: "⬇️ 下载/P2P", defaultTarget: "DIRECT", phase: "serviceIntent", dnsClass: "china" }),
  intent({ id: "overseasGame", ruleId: "OverseasGame", label: "🌍 海外游戏", sourceIds: ["OverseasGame"], policy: "🌍 海外游戏", defaultTarget: "FOLLOW", phase: "overseasGame", dnsClass: "proxy" }),
  intent({ id: "chinaIp", ruleId: "ChinaIP", label: "中国 IP", sourceIds: ["ChinaIP"], policy: "DIRECT", defaultTarget: "DIRECT", phase: "resolvedChinaIp", dnsClass: "none" }),
]);

const SOURCE_TO_INTENT = new Map(
  SEMANTIC_INTENTS.flatMap((entry) => entry.sourceIds.map((sourceId) => [sourceId, entry])),
);

export function semanticIntentForSource(sourceId) {
  return SOURCE_TO_INTENT.get(sourceId);
}
