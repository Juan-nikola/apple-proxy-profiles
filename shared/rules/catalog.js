const RULE_ROOT = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket";

function rule(id, policy, minEntries, inputFormat = "RULE-SET", directory = id) {
  const sourcePath = `${directory}/${id}.list`;
  return Object.freeze({
    id,
    sourcePath,
    upstreamUrl: `${RULE_ROOT}/${sourcePath}`,
    policy,
    minEntries,
    inputFormat,
  });
}

export const RULE_SOURCE_CATALOG = Object.freeze([
  rule("Hijacking", "☣️ 安全威胁", 150),
  rule("BlockHttpDNS", "☣️ 安全威胁", 40),
  rule("Advertising", "🧱 常见广告", 10_000),
  rule("Privacy", "🕵️ 严格跟踪", 15),
  rule("BiliBili", "📺 哔哩哔哩", 80),
  rule("ByteDance", "🎵 抖音", 300),
  rule("XiaoHongShu", "📕 小红书", 3),
  rule("Weibo", "🧣 微博", 3),
  rule("OpenAI", "🤖 AI 专用", 20),
  rule("Claude", "🤖 AI 专用", 2),
  rule("Gemini", "🤖 AI 专用", 8),
  rule("Copilot", "🤖 AI 专用", 30),
  rule("GitHub", "🐙 GitHub", 20),
  rule("YouTube", "📺 YouTube", 120),
  rule("Netflix", "🎬 Netflix", 800),
  rule("Disney", "🏰 Disney+", 100),
  rule("Spotify", "🎵 Spotify", 20),
  rule("GlobalMedia", "🌍 国际媒体", 700),
  rule("Telegram", "✈️ Telegram", 25),
  rule("Facebook", "💬 海外社交", 350),
  rule("Instagram", "💬 海外社交", 3),
  rule("Twitter", "💬 海外社交", 20),
  rule("TikTok", "🎶 TikTok", 20),
  rule("Apple", "🍎 Apple", 25),
  rule("Microsoft", "🪟 Microsoft", 400),
  rule("SteamCN", "DIRECT", 10),
  rule("ChinaMax_Domain", "DIRECT", 100_000, "DOMAIN-SET", "ChinaMax"),
  rule("Game", "🕹️ 游戏平台", 400),
  rule("Download", "⬇️ 下载/P2P", 5),
  rule("PrivateTracker", "⬇️ 下载/P2P", 150),
  rule("ChinaMax", "DIRECT", 8_000),
]);

export function orderedRuleAssignments() {
  return RULE_SOURCE_CATALOG.map(({ id, policy }) => Object.freeze({ sourceId: id, policy }));
}
