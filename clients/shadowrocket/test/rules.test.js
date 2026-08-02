import assert from "node:assert/strict";
import test from "node:test";

import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import { RULE_SOURCE_CATALOG, orderedRuleAssignments } from "../../../shared/rules/catalog.js";
import { CUSTOM_AI, CUSTOM_BLOCK, CUSTOM_DIRECT, CUSTOM_PROXY } from "../src/custom-rules.js";
import { RULE_CATALOG } from "../src/rule-catalog.js";
import { renderRules, validateCustomRules } from "../src/render-rules.js";

const BLACKMATRIX7_ROOT = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket";
const EXPECTED_CATALOG_IDS = [
  "Hijacking", "BlockHttpDNS", "Advertising", "Privacy", "BiliBili", "ByteDance", "XiaoHongShu", "Weibo",
  "OpenAI", "Claude", "Gemini", "Copilot", "GitHub", "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
  "Telegram", "Facebook", "Instagram", "Twitter", "TikTok", "Apple", "Microsoft", "SteamCN", "ChinaMax_Domain",
  "Game", "Download", "PrivateTracker", "ChinaMax",
];
const EXPECTED_ASSIGNMENTS = [
  { sourceId: "Hijacking", policy: "☣️ 安全威胁" },
  { sourceId: "BlockHttpDNS", policy: "☣️ 安全威胁" },
  { sourceId: "Advertising", policy: "🧱 常见广告" },
  { sourceId: "Privacy", policy: "🕵️ 严格跟踪" },
  { sourceId: "BiliBili", policy: "📺 哔哩哔哩" },
  { sourceId: "ByteDance", policy: "🎵 抖音" },
  { sourceId: "XiaoHongShu", policy: "📕 小红书" },
  { sourceId: "Weibo", policy: "🧣 微博" },
  { sourceId: "OpenAI", policy: "🤖 AI 专用" },
  { sourceId: "Claude", policy: "🤖 AI 专用" },
  { sourceId: "Gemini", policy: "🤖 AI 专用" },
  { sourceId: "Copilot", policy: "🤖 AI 专用" },
  { sourceId: "GitHub", policy: "🐙 GitHub" },
  { sourceId: "YouTube", policy: "📺 YouTube" },
  { sourceId: "Netflix", policy: "🎬 Netflix" },
  { sourceId: "Disney", policy: "🏰 Disney+" },
  { sourceId: "Spotify", policy: "🎵 Spotify" },
  { sourceId: "GlobalMedia", policy: "🌍 国际媒体" },
  { sourceId: "Telegram", policy: "✈️ Telegram" },
  { sourceId: "Facebook", policy: "💬 海外社交" },
  { sourceId: "Instagram", policy: "💬 海外社交" },
  { sourceId: "Twitter", policy: "💬 海外社交" },
  { sourceId: "TikTok", policy: "🎶 TikTok" },
  { sourceId: "Apple", policy: "🍎 Apple" },
  { sourceId: "Microsoft", policy: "🪟 Microsoft" },
  { sourceId: "SteamCN", policy: "DIRECT" },
  { sourceId: "ChinaMax_Domain", policy: "DIRECT" },
  { sourceId: "Game", policy: "🕹️ 游戏平台" },
  { sourceId: "Download", policy: "⬇️ 下载/P2P" },
  { sourceId: "PrivateTracker", policy: "⬇️ 下载/P2P" },
  { sourceId: "ChinaMax", policy: "DIRECT" },
];
const EXPECTED_CUSTOM_AI = [
  "DOMAIN-SUFFIX,perplexity.ai",
  "DOMAIN-SUFFIX,pplx.ai",
  "DOMAIN-SUFFIX,x.ai",
  "DOMAIN-SUFFIX,grok.com",
  "DOMAIN-SUFFIX,poe.com",
  "DOMAIN-SUFFIX,poecdn.net",
];
const EXPECTED_SOURCE_DETAILS = [
  ["Hijacking/Hijacking.list", 150, "RULE-SET"],
  ["BlockHttpDNS/BlockHttpDNS.list", 40, "RULE-SET"],
  ["Advertising/Advertising.list", 10_000, "RULE-SET"],
  ["Privacy/Privacy.list", 15, "RULE-SET"],
  ["BiliBili/BiliBili.list", 80, "RULE-SET"],
  ["ByteDance/ByteDance.list", 300, "RULE-SET"],
  ["XiaoHongShu/XiaoHongShu.list", 3, "RULE-SET"],
  ["Weibo/Weibo.list", 3, "RULE-SET"],
  ["OpenAI/OpenAI.list", 20, "RULE-SET"],
  ["Claude/Claude.list", 2, "RULE-SET"],
  ["Gemini/Gemini.list", 8, "RULE-SET"],
  ["Copilot/Copilot.list", 30, "RULE-SET"],
  ["GitHub/GitHub.list", 20, "RULE-SET"],
  ["YouTube/YouTube.list", 120, "RULE-SET"],
  ["Netflix/Netflix.list", 800, "RULE-SET"],
  ["Disney/Disney.list", 100, "RULE-SET"],
  ["Spotify/Spotify.list", 20, "RULE-SET"],
  ["GlobalMedia/GlobalMedia.list", 700, "RULE-SET"],
  ["Telegram/Telegram.list", 25, "RULE-SET"],
  ["Facebook/Facebook.list", 350, "RULE-SET"],
  ["Instagram/Instagram.list", 3, "RULE-SET"],
  ["Twitter/Twitter.list", 20, "RULE-SET"],
  ["TikTok/TikTok.list", 20, "RULE-SET"],
  ["Apple/Apple.list", 25, "RULE-SET"],
  ["Microsoft/Microsoft.list", 400, "RULE-SET"],
  ["SteamCN/SteamCN.list", 10, "RULE-SET"],
  ["ChinaMax/ChinaMax_Domain.list", 100_000, "DOMAIN-SET"],
  ["Game/Game.list", 400, "RULE-SET"],
  ["Download/Download.list", 5, "RULE-SET"],
  ["PrivateTracker/PrivateTracker.list", 150, "RULE-SET"],
  ["ChinaMax/ChinaMax.list", 8_000, "RULE-SET"],
];

function indexOf(lines, fragment) {
  const index = lines.findIndex((line) => line.includes(fragment));
  assert.notEqual(index, -1, `missing rule containing ${fragment}`);
  return index;
}

test("renders local and remote rules in routing precedence order", () => {
  const lines = renderRules();

  assert.ok(indexOf(lines, "IP-CIDR,192.168.0.0/16") < indexOf(lines, "CUSTOM_PROXY"));
  assert.ok(indexOf(lines, "BiliBili/BiliBili.list") < indexOf(lines, "ChinaMax/ChinaMax.list"));
  assert.ok(indexOf(lines, "OpenAI/OpenAI.list") < indexOf(lines, "Microsoft/Microsoft.list"));
  assert.ok(indexOf(lines, "GitHub/GitHub.list") < indexOf(lines, "Microsoft/Microsoft.list"));
  assert.ok(indexOf(lines, "ByteDance/ByteDance.list,🎵 抖音") < indexOf(lines, "ChinaMax/ChinaMax_Domain.list,DIRECT"));
  for (const domain of ["leiting.com", "leitingcn.com", "g-bits.com"]) {
    assert.ok(indexOf(lines, `DOMAIN-SUFFIX,${domain},DIRECT`) < indexOf(lines, "SteamCN/SteamCN.list"));
  }
  assert.ok(indexOf(lines, "SteamCN/SteamCN.list") < indexOf(lines, "ChinaMax/ChinaMax_Domain.list"));
  assert.ok(indexOf(lines, "ChinaMax/ChinaMax_Domain.list") < indexOf(lines, "PROTOCOL,UDP"));
  assert.ok(indexOf(lines, "PROTOCOL,UDP") < indexOf(lines, "Game/Game.list,🕹️ 游戏平台"));
  assert.ok(indexOf(lines, "Download/Download.list") < indexOf(lines, "ChinaMax/ChinaMax.list"));
  assert.ok(indexOf(lines, "GEOIP,CN,DIRECT") < indexOf(lines, "FINAL,🚀 节点选择"));
});

test("shared rule intent preserves exact source order, policies, and client adapters", () => {
  assert.strictEqual(RULE_CATALOG, RULE_SOURCE_CATALOG);
  assert.deepEqual(RULE_SOURCE_CATALOG.map((rule) => rule.id), EXPECTED_CATALOG_IDS);
  assert.deepEqual(orderedRuleAssignments(), EXPECTED_ASSIGNMENTS);
  assert.deepEqual(
    RULE_SOURCE_CATALOG.map(({ id, policy }) => ({ sourceId: id, policy })),
    EXPECTED_ASSIGNMENTS,
  );
  assert.deepEqual(
    RULE_SOURCE_CATALOG.map(({ sourcePath, minEntries, inputFormat }) => (
      [sourcePath, minEntries, inputFormat]
    )),
    EXPECTED_SOURCE_DETAILS,
  );
  for (const rule of RULE_SOURCE_CATALOG) {
    assert.deepEqual(
      Object.keys(rule),
      ["id", "sourcePath", "upstreamUrl", "policy", "minEntries", "inputFormat"],
    );
    assert.equal(rule.upstreamUrl, `${BLACKMATRIX7_ROOT}/${rule.sourcePath}`);
    assert.ok(rule.minEntries > 0, `${rule.id} must have a positive minEntries`);
  }
  assert.equal(RULE_SOURCE_CATALOG.find((rule) => rule.id === "ChinaMax_Domain").inputFormat, "DOMAIN-SET");
  assert.equal(
    RULE_SOURCE_CATALOG.find((rule) => rule.id === "ChinaMax_Domain").sourcePath,
    "ChinaMax/ChinaMax_Domain.list",
  );
});

test("shared rule intent includes complete domestic and advertising sources", () => {
  const ids = RULE_SOURCE_CATALOG.map((rule) => rule.id);
  assert.deepEqual(ids.filter((id) => id.startsWith("China")), ["ChinaMax_Domain", "ChinaMax"]);
  assert.ok(ids.indexOf("ChinaMax_Domain") < ids.indexOf("ChinaMax"));
  assert.equal(ids.includes("AdvertisingLite"), false);
  assert.equal(RULE_SOURCE_CATALOG.find((rule) => rule.id === "Advertising").minEntries, 10_000);
  assert.deepEqual(CUSTOM_RULES.ai, EXPECTED_CUSTOM_AI);
  assert.deepEqual(Object.keys(CUSTOM_RULES), ["block", "direct", "proxy", "ai"]);
  assert.strictEqual(CUSTOM_BLOCK, CUSTOM_RULES.block);
  assert.strictEqual(CUSTOM_DIRECT, CUSTOM_RULES.direct);
  assert.strictEqual(CUSTOM_PROXY, CUSTOM_RULES.proxy);
  assert.strictEqual(CUSTOM_AI, CUSTOM_RULES.ai);
});

test("renders every remote catalog entry in its explicit routing order", () => {
  const lines = renderRules();
  const renderedRuleSetIds = lines
    .filter((line) => /^(?:RULE-SET|DOMAIN-SET),/.test(line))
    .map((line) => RULE_CATALOG.find((rule) => line.includes(rule.upstreamUrl))?.id);

  assert.deepEqual(renderedRuleSetIds, EXPECTED_CATALOG_IDS);
  assert.equal(lines.filter((line) => line.includes("Game/Game.list")).length, 2);
  assert.deepEqual(renderedRuleSetIds.slice(-4), ["Game", "Download", "PrivateTracker", "ChinaMax"]);
  assert.equal(lines.filter((line) => line.startsWith("DOMAIN-SET,")).length, 1);
});

test("rejects invalid custom rules without reflecting CR/LF payloads", () => {
  const valid = [
    ["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,example.com"], "REJECT"],
    ["CUSTOM_PROXY", [
      "DOMAIN-SUFFIX,example.net",
      "DOMAIN-WILDCARD,a?.example.com",
      "DST-PORT,443-8443",
    ], "🚀 节点选择"],
  ];
  assert.doesNotThrow(() => validateCustomRules(valid));

  const invalidConfigurations = [
    [["CUSTOM_BLOCK", [42], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,example.com\ninjected"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,example.com,DIRECT"], "REJECT"]],
    [["CUSTOM_BLOCK", ["URL-REGEX,^https://example.com/(a,b)$"], "REJECT"]],
    [["CUSTOM_BLOCK", ["IP-CIDR,not-a-cidr"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,..bad.."], "REJECT"]],
    [["CUSTOM_BLOCK", ["IP-ASN,ASbad"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN,*.example.com"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,a?.example.com"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DST-PORT,8443-443"], "REJECT"]],
    [
      ["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,example.com"], "REJECT"],
      ["CUSTOM_DIRECT", ["DOMAIN-SUFFIX,example.com"], "DIRECT"],
    ],
  ];
  const unsafeMarkers = ["", " ", " CUSTOM_BLOCK", "CUSTOM_BLOCK ", "CUSTOM,BLOCK", "CUSTOM=BLOCK", "CUSTOM\nBLOCK", "CUSTOM\rBLOCK"];
  const unsafePolicies = ["", " ", " DIRECT", "DIRECT ", "DIRECT,REJECT", "DIRECT=REJECT", "DIRECT\nREJECT", "DIRECT\rREJECT"];
  invalidConfigurations.push(
    ...unsafeMarkers.map((marker) => [[marker, ["DOMAIN-SUFFIX,example.com"], "REJECT"]]),
    ...unsafePolicies.map((policy) => [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,example.com"], policy]]),
  );

  for (const rules of invalidConfigurations) {
    assert.throws(() => validateCustomRules(rules), (error) => {
      assert.equal(/[\r\n]/.test(error.message), false);
      return true;
    });
  }
});
