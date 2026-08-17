import assert from "node:assert/strict";
import test from "node:test";

import {
  POLICY_DEFAULTS,
  decodePolicyOverrides,
  resolvePolicyOverrides,
} from "../src/policy-overrides.js";

const encode = (value) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

test("policy defaults use ordered Chinese primary keys", () => {
  assert.deepEqual(Object.entries(POLICY_DEFAULTS), [
    ["🤖 AI 专用", "FOLLOW"], ["🐙 GitHub", "FOLLOW"], ["📺 YouTube", "FOLLOW"],
    ["🎬 海外流媒体", "FOLLOW"], ["💬 海外社交", "FOLLOW"], ["🍎 Apple", "DIRECT"],
    ["🪟 Microsoft", "DIRECT"], ["🇨🇳 国内平台", "DIRECT"], ["🌍 海外游戏", "FOLLOW"],
    ["⬇️ 下载/P2P", "DIRECT"], ["🧭 DNS 与规则下载", "FOLLOW"], ["最终兜底", "FOLLOW"],
  ]);
});

test("decodePolicyOverrides accepts unpadded UTF-8 Base64URL Chinese aliases and internal IDs", () => {
  const result = decodePolicyOverrides(encode({
    "AI 专用": "node:🇯🇵 東京",
    github: "FOLLOW",
    netflix: "FOLLOW",
    "🍎 Apple": "DIRECT",
    apple: "DIRECT",
  }));
  assert.deepEqual(result, { "🤖 AI 专用": "NODE:🇯🇵 東京", "🐙 GitHub": "FOLLOW", "🎬 海外流媒体": "FOLLOW", "🍎 Apple": "DIRECT" });
});

test("decodePolicyOverrides accepts every documented Chinese and internal alias", () => {
  for (const [primary, aliases] of [
    ["🤖 AI 专用", ["AI 专用", "ai"]], ["🐙 GitHub", ["GitHub", "github"]],
    ["📺 YouTube", ["YouTube", "youtube"]], ["🎬 海外流媒体", ["海外流媒体", "overseasMedia", "Netflix", "netflix", "Disney+", "disney", "Spotify", "spotify", "国际媒体", "globalMedia"]],
    ["💬 海外社交", ["海外社交", "globalSocial", "Telegram", "telegram", "TikTok", "tiktok"]],
    ["🍎 Apple", ["Apple", "apple"]], ["🪟 Microsoft", ["Microsoft", "microsoft"]],
    ["🇨🇳 国内平台", ["国内平台", "domestic", "哔哩哔哩", "bilibili", "抖音", "bytedance", "小红书", "xiaohongshu", "微博", "weibo"]],
    ["🌍 海外游戏", ["海外游戏", "overseasGame"]], ["⬇️ 下载/P2P", ["下载/P2P", "download"]],
    ["🧭 DNS 与规则下载", ["DNS 与规则下载", "dnsAndRules"]], ["最终兜底", ["final"]],
  ]) {
    for (const alias of [primary, ...aliases]) {
      assert.deepEqual(decodePolicyOverrides(encode({ [alias]: "FOLLOW" })), { [primary]: "FOLLOW" }, alias);
    }
  }
});

test("decodePolicyOverrides rejects unsafe encodings and malformed policy objects", () => {
  for (const encoded of ["eyJmb28iOiJiYXIifQ==", "abc+def", "e31", "not_base64url", encode(["FOLLOW"]), encode({ unknown: "FOLLOW" }), encode({ "🤖 AI 专用": 1 }), encode({ "🤖 AI 专用": "NODE:   " }), encode({ "🤖 AI 专用": "PROXY" })]) {
    assert.throws(() => decodePolicyOverrides(encoded));
  }
  assert.throws(() => decodePolicyOverrides(encode({ "🤖 AI 专用": "FOLLOW", ai: "DIRECT" })), /conflict/u);
});

test("resolvePolicyOverrides resolves direct, follow, fixed, and all fixed-node fallbacks without credentials", () => {
  const eligible = [{ name: "Tokyo", _profile: { id: "node-tokyo" }, password: "secret" }];
  const all = [...eligible, { name: "Legacy", _profile: { id: "node-legacy" }, password: "secret" }];
  const resolved = resolvePolicyOverrides({
    encoded: encode({
      "🤖 AI 专用": "DIRECT",
      "🐙 GitHub": "FOLLOW",
      "📺 YouTube": "NODE:Tokyo",
      netflix: "NODE:Missing",
      "💬 海外社交": "NODE:Legacy",
    }),
    allNodes: all,
    eligibleNodes: eligible,
  });

  assert.deepEqual(resolved.targets["🤖 AI 专用"], { configured: "DIRECT", resolved: "DIRECT", status: "direct", warningCode: null, nodeId: null });
  assert.deepEqual(resolved.targets["🐙 GitHub"], { configured: "FOLLOW", resolved: "FOLLOW", status: "follow", warningCode: null, nodeId: null });
  assert.deepEqual(resolved.targets["📺 YouTube"], { configured: "NODE:Tokyo", resolved: "NODE:Tokyo", status: "fixed", warningCode: null, nodeId: "node-tokyo" });
  assert.deepEqual(resolved.targets["🎬 海外流媒体"], { configured: "NODE:Missing", resolved: "FOLLOW", status: "missing-node-fallback", warningCode: "missing-node-fallback", nodeId: null });
  assert.deepEqual(resolved.targets["💬 海外社交"], { configured: "NODE:Legacy", resolved: "FOLLOW", status: "incompatible-node-fallback", warningCode: "incompatible-node-fallback", nodeId: null });
  assert.deepEqual(resolved.fixedNodes, ["node-tokyo"]);
  assert.equal(JSON.stringify(resolved).includes("secret"), false);
});

test("resolvePolicyOverrides requires exact case-sensitive single eligible node matches", () => {
  const node = { name: "Tokyo", _profile: { id: "node-tokyo" } };
  const missing = resolvePolicyOverrides({ encoded: encode({ "🤖 AI 专用": "NODE:tokyo" }), allNodes: [node], eligibleNodes: [node] });
  assert.equal(missing.targets["🤖 AI 专用"].status, "missing-node-fallback");
  const duplicate = resolvePolicyOverrides({ encoded: encode({ "🤖 AI 专用": "NODE:Tokyo" }), allNodes: [node], eligibleNodes: [node, { ...node, _profile: { id: "node-two" } }] });
  assert.equal(duplicate.targets["🤖 AI 专用"].status, "duplicate-node-fallback");
});
