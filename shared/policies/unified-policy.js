import { canonicalBusinessTarget } from "./business-targets.js";

const TARGETS = [
  ["ai", "🤖 AI 专用", "FOLLOW"],
  ["github", "🐙 GitHub", "FOLLOW"],
  ["youtube", "📺 YouTube", "FOLLOW"],
  ["overseasMedia", "🎬 海外流媒体", "FOLLOW"],
  ["globalSocial", "💬 海外社交", "FOLLOW"],
  ["apple", "🍎 Apple", "DIRECT"],
  ["microsoft", "🪟 Microsoft", "DIRECT"],
  ["domesticPlatform", "🇨🇳 国内平台", "DIRECT"],
  ["overseasGame", "🌍 海外游戏", "FOLLOW"],
  ["game", "🎮 游戏连接", "DIRECT"],
  ["download", "⬇️ 下载/P2P", "DIRECT"],
  ["dnsAndRules", "🧭 DNS 与规则下载", "FOLLOW"],
  ["final", "漏网之鱼", "FOLLOW"],
].map(([id, label, defaultTarget]) => Object.freeze({ id, label, defaultTarget }));

export const UNIFIED_POLICY_TARGETS = Object.freeze(TARGETS);
export const UNIFIED_POLICY_TARGET_IDS = Object.freeze(TARGETS.map(({ id }) => id));

const TARGET_BY_KEY = new Map();
for (const target of UNIFIED_POLICY_TARGETS) {
  TARGET_BY_KEY.set(target.id, target);
  TARGET_BY_KEY.set(target.label, target);
}

for (const [alias, id] of Object.entries({
  "AI 专用": "ai",
  AI: "ai",
  GitHub: "github",
  YouTube: "youtube",
  "海外流媒体": "overseasMedia",
  "海外社交": "globalSocial",
  Apple: "apple",
  Microsoft: "microsoft",
  "国内平台": "domesticPlatform",
  domestic: "domesticPlatform",
  domesticCore: "domesticPlatform",
  chinaIp: "domesticPlatform",
  "国内核心": "domesticPlatform",
  "中国 IP": "domesticPlatform",
  "海外游戏": "overseasGame",
  "游戏连接": "game",
  "下载/P2P": "download",
  "DNS 与规则下载": "dnsAndRules",
  "最终兜底": "final",
  "漏网之鱼": "final",
})) {
  TARGET_BY_KEY.set(alias, TARGET_BY_KEY.get(id));
}

export function unifiedPolicyTargetByKey(key) {
  return typeof key === "string" ? TARGET_BY_KEY.get(key) : undefined;
}

export function defaultUnifiedPolicyTargets() {
  return Object.fromEntries(UNIFIED_POLICY_TARGETS.map(({ id, defaultTarget }) => [id, defaultTarget]));
}

export function canonicalUnifiedPolicyTarget(value) {
  return canonicalBusinessTarget(value);
}
