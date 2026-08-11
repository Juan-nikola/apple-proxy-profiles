import assert from "node:assert/strict";
import test from "node:test";

import {
  BUSINESS_TARGETS,
  businessTargetByKey,
  parseBusinessOverrides,
} from "../shared/policies/business-targets.js";

function base64url(value) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

const EXPECTED_TARGETS = [
  ["ai", "🤖 AI 专用", "AI 专用", "FOLLOW"],
  ["github", "🐙 GitHub", "GitHub", "FOLLOW"],
  ["youtube", "📺 YouTube", "YouTube", "FOLLOW"],
  ["globalMedia", "🎬 海外流媒体", "海外流媒体", "FOLLOW"],
  ["globalSocial", "💬 海外社交", "海外社交", "FOLLOW"],
  ["apple", "🍎 Apple", "Apple", "DIRECT"],
  ["microsoft", "🪟 Microsoft", "Microsoft", "DIRECT"],
  ["domestic", "🇨🇳 国内平台", "国内平台", "DIRECT"],
  ["overseasGame", "🌍 海外游戏", "海外游戏", "FOLLOW"],
  ["download", "⬇️ 下载/P2P", "下载/P2P", "DIRECT"],
  ["dnsAndRules", "🧭 DNS 与规则下载", "DNS 与规则下载", "FOLLOW"],
  ["final", "最终兜底", "最终兜底", "FOLLOW"],
];

test("pins frozen ordered business records and resolves their approved aliases", () => {
  assert.deepEqual(
    BUSINESS_TARGETS.map(({ id, label, defaultTarget }) => [id, label, defaultTarget]),
    EXPECTED_TARGETS.map(([id, label, , defaultTarget]) => [id, label, defaultTarget]),
  );
  assert.equal(Object.isFrozen(BUSINESS_TARGETS), true);

  for (const [id, label, alias, defaultTarget] of EXPECTED_TARGETS) {
    const target = BUSINESS_TARGETS.find((entry) => entry.id === id);
    assert.deepEqual(target.aliases, [alias, id]);
    assert.equal(target.defaultTarget, defaultTarget);
    assert.equal(Object.isFrozen(target), true);
    assert.equal(Object.isFrozen(target.aliases), true);
    assert.equal(businessTargetByKey(id), target);
    assert.equal(businessTargetByKey(alias), target);
    assert.equal(businessTargetByKey(label), target);
  }
  assert.equal(businessTargetByKey("unknown"), undefined);
});

test("parses URL-safe override JSON by canonical business id", () => {
  const encoded = base64url({
    "🤖 AI 专用": "node:🇯🇵 Tokyo｜自建·U",
    youtube: "follow",
    "Apple": "direct",
  });
  assert.deepEqual(parseBusinessOverrides(encoded), {
    ai: "NODE:🇯🇵 Tokyo｜自建·U",
    youtube: "FOLLOW",
    apple: "DIRECT",
  });
  assert.equal(Object.isFrozen(parseBusinessOverrides(encoded)), true);
  assert.deepEqual(parseBusinessOverrides(""), {});
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
  const secret = "PRIVATE_POLICY_VALUE";
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
  for (const encoded of ["eyJhaSI6IkZPTExPVyJ9=", "a+b", "a/b", malformedUtf8, base64url([]), base64url(null)]) {
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
