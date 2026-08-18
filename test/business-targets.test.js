import assert from "node:assert/strict";
import test from "node:test";

import {
  BUSINESS_TARGETS,
  businessTargetByKey,
  canonicalBusinessTarget,
  parseBusinessOverrides,
} from "../shared/policies/business-targets.js";

function base64url(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

const EXPECTED_TARGETS = [
  ["ai", "🤖 AI 专用", ["AI 专用", "ai"], "FOLLOW"],
  ["github", "🐙 GitHub", ["GitHub", "github"], "FOLLOW"],
  ["youtube", "📺 YouTube", ["YouTube", "youtube"], "FOLLOW"],
  ["overseasMedia", "🎬 海外流媒体", ["海外流媒体", "overseasMedia", "Netflix", "netflix", "Disney+", "disney", "Spotify", "spotify", "国际媒体", "globalMedia"], "FOLLOW"],
  ["globalSocial", "💬 海外社交", ["海外社交", "globalSocial", "Telegram", "telegram", "TikTok", "tiktok"], "FOLLOW"],
  ["overseasGame", "🌍 海外游戏", ["海外游戏", "overseasGame"], "FOLLOW"],
  ["domesticCore", "国内核心", ["国内核心", "domesticCore"], "DIRECT"],
  ["domesticPlatform", "🇨🇳 国内平台", ["国内平台", "domestic", "🇨🇳 国内平台", "domesticPlatform", "哔哩哔哩", "bilibili", "抖音", "bytedance", "小红书", "xiaohongshu", "微博", "weibo"], "DIRECT"],
  ["chinaIp", "中国 IP", ["中国 IP", "chinaIp"], "DIRECT"],
  ["apple", "🍎 Apple", ["Apple", "apple"], "DIRECT"],
  ["microsoft", "🪟 Microsoft", ["Microsoft", "microsoft"], "DIRECT"],
  ["download", "⬇️ 下载/P2P", ["下载/P2P", "download"], "DIRECT"],
];

test("pins frozen ordered business records and resolves their approved aliases", () => {
  assert.deepEqual(
    BUSINESS_TARGETS.map(({ id, label, defaultTarget }) => [id, label, defaultTarget]),
    EXPECTED_TARGETS.map(([id, label, , defaultTarget]) => [id, label, defaultTarget]),
  );
  assert.equal(Object.isFrozen(BUSINESS_TARGETS), true);

  for (const [id, label, aliases, defaultTarget] of EXPECTED_TARGETS) {
    const target = BUSINESS_TARGETS.find((entry) => entry.id === id);
    assert.deepEqual(target.aliases, aliases);
    assert.equal(target.defaultTarget, defaultTarget);
    assert.equal(Object.isFrozen(target), true);
    assert.equal(Object.isFrozen(target.aliases), true);
    assert.equal(businessTargetByKey(id), target);
    for (const alias of aliases) assert.equal(businessTargetByKey(alias), target);
    assert.equal(businessTargetByKey(label), target);
  }
  assert.equal(businessTargetByKey("unknown"), undefined);
});

test("parses URL-safe override JSON by canonical business id", () => {
  const encoded = base64url({
    "🤖 AI 专用": "node:🇯🇵 Tokyo｜自建·U",
    youtube: "follow",
    "国内平台": "direct",
    "Apple": "direct",
  });
  assert.deepEqual(parseBusinessOverrides(encoded), {
    ai: "NODE:🇯🇵 Tokyo｜自建·U",
    youtube: "FOLLOW",
    domesticPlatform: "DIRECT",
    apple: "DIRECT",
  });
  assert.equal(Object.isFrozen(parseBusinessOverrides(encoded)), true);
  assert.deepEqual(parseBusinessOverrides(""), {});
});

test("canonicalizes only approved keywords and preserves node display names", () => {
  assert.equal(canonicalBusinessTarget("follow"), "FOLLOW");
  assert.equal(canonicalBusinessTarget("DIRECT"), "DIRECT");
  assert.equal(canonicalBusinessTarget("node:🇯🇵 Tokyo｜MixedCase"), "NODE:🇯🇵 Tokyo｜MixedCase");
  for (const value of ["NODE:", "NODE:  ", "NODE:Tokyo\n", "BLOCK", 7]) {
    assert.throws(() => canonicalBusinessTarget(value));
  }
});

test("merges identical aliases and rejects conflicting aliases with the business label", () => {
  assert.deepEqual(
    parseBusinessOverrides(base64url({ ai: "FOLLOW", "AI 专用": "follow" })),
    { ai: "FOLLOW" },
  );
  assert.throws(
    () => parseBusinessOverrides(base64url({ ai: "FOLLOW", "🤖 AI 专用": "DIRECT" })),
    /🤖 AI 专用/u,
  );
});

test("rejects unknown keys and invalid target values without exposing encoded policy input", () => {
  const secret = "TEST_ONLY_POLICY_VALUE";
  const invalidCases = [
    base64url({ unknown: "FOLLOW" }),
    base64url({ ai: 7 }),
    base64url({ ai: "" }),
    base64url({ ai: "NODE:" }),
    base64url({ ai: "BLOCK" }),
    base64url({ ai: `NODE:${secret}\n` }),
  ];

  for (const encoded of invalidCases) {
    assert.throws(
      () => parseBusinessOverrides(encoded),
      (error) => {
        assert.equal(error.message.includes(encoded), false);
        assert.equal(error.message.includes(secret), false);
        return true;
      },
    );
  }
});

test("rejects non-Base64URL, malformed UTF-8 and non-object policy documents", () => {
  const malformedUtf8 = Buffer.from([0xff]).toString("base64url");
  const bomPolicy = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('{"ai":"FOLLOW"}', "utf8")]).toString("base64url");
  for (const encoded of ["eyJhaSI6IkZPTExPVyJ9=", "a+b", "a/b", malformedUtf8, bomPolicy, base64url([]), base64url(null)]) {
    assert.throws(
      () => parseBusinessOverrides(encoded),
      (error) => {
        assert.equal(error.message.includes(encoded), false);
        return true;
      },
    );
  }
});

test("rejects Base64URL encodings with non-canonical unused bits", () => {
  assert.throws(() => parseBusinessOverrides("e31"));
});

test("rejects duplicate JSON keys before JSON parsing can discard the conflict", () => {
  const encoded = Buffer.from('{"ai":"FOLLOW","ai":"DIRECT"}', "utf8").toString("base64url");
  assert.throws(
    () => parseBusinessOverrides(encoded),
    (error) => {
      assert.equal(error.message.includes(encoded), false);
      return true;
    },
  );
});

test("rejects Unicode line separators in fixed node target names", () => {
  const secret = "TEST_ONLY_NODE_TARGET";
  for (const separator of ["\u2028", "\u2029"]) {
    const encoded = base64url({ ai: `NODE:${secret}${separator}Tokyo` });
    assert.throws(
      () => parseBusinessOverrides(encoded),
      (error) => {
        assert.match(error.message, /🤖 AI 专用/u);
        assert.equal(error.message.includes(secret), false);
        return true;
      },
    );
  }
});
