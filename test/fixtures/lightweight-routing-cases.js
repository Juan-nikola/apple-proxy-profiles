export const LIGHTWEIGHT_ROUTING_CASES = Object.freeze([
  Object.freeze({ domain: "www.bilibili.com", sourceId: "DomesticCore", expected: "DIRECT" }),
  Object.freeze({ domain: "www.douyin.com", sourceId: "DomesticCore", expected: "DIRECT" }),
  Object.freeze({ domain: "www.xiaohongshu.com", sourceId: "DomesticCore", expected: "DIRECT" }),
  Object.freeze({ domain: "www.weibo.com", sourceId: "DomesticCore", expected: "DIRECT" }),
  Object.freeze({ domain: "www.iqiyi.com", sourceId: "DomesticCore", expected: "DIRECT" }),
  Object.freeze({ domain: "www.qq.com", sourceId: "DomesticCore", expected: "DIRECT" }),
  Object.freeze({ domain: "store.steampowered.com", sourceId: "OverseasGame", expected: "🌍 海外游戏" }),
  Object.freeze({ domain: "chat.openai.com", sourceId: "OpenAI", expected: "OpenAI policy" }),
  Object.freeze({ domain: "custom.example", customPolicy: "DIRECT", expected: "DIRECT" }),
  Object.freeze({ domain: "unknown.example", resolvedCountry: "CN", expected: "DIRECT" }),
  Object.freeze({ domain: "unknown.example", resolvedCountry: "US", expected: "🚀 节点选择" }),
  Object.freeze({ domain: "unknown.example", resolution: "failed", expected: "🚀 节点选择" }),
]);

export const LIGHTWEIGHT_CLIENTS = Object.freeze([
  "shadowrocket",
  "surge",
  "egern",
  "singbox",
  "anywhere",
]);
