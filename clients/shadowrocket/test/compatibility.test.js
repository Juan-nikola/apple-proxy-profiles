import assert from "node:assert/strict";
import test from "node:test";

import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { buildGroups as buildLegacyGroups } from "../src/group-catalog.js";
import { fakeNodes } from "./fixtures/nodes.js";

const EXPECTED_16_SERVICE_NAMES = Object.freeze([
  "🐙 GitHub",
  "📺 YouTube",
  "🎬 Netflix",
  "🏰 Disney+",
  "🎵 Spotify",
  "🌍 国际媒体",
  "✈️ Telegram",
  "💬 海外社交",
  "🎶 TikTok",
  "🍎 Apple",
  "🪟 Microsoft",
  "📺 哔哩哔哩",
  "🎵 抖音",
  "📕 小红书",
  "🧣 微博",
  "🕹️ 游戏平台",
]);

function makeNormalizedInventory() {
  return normalizeNodes(fakeNodes).nodes;
}

test("shared policy records preserve the Shadowrocket catalog", () => {
  const options = {
    platform: "iphone",
    blockMode: "balanced",
    autoGroupMode: "full",
    clientChain: "off",
  };
  const nodes = makeNormalizedInventory();
  const shared = buildPolicyGroups(options, nodes);
  const shadowrocket = buildLegacyGroups(options, nodes);

  assert.equal(shared.find((group) => group.name === "🚀 节点选择").candidates[0], "PROXY");
  assert.deepEqual(
    shared.filter((group) => group.kind === "service").map((group) => group.name),
    EXPECTED_16_SERVICE_NAMES,
  );
  assert.deepEqual(shared.find((group) => group.name === "☣️ 安全威胁").candidates, ["REJECT", "DIRECT"]);
  assert.equal(shadowrocket.length, shared.length);
  assert.equal(Object.hasOwn(shadowrocket.find((group) => group.name === "🐙 GitHub"), "kind"), false);
});
