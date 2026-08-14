import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { buildGroups as buildLegacyGroups } from "../src/group-catalog.js";
import { fakeNodes } from "./fixtures/nodes.js";

const sharedRoot = new URL("../../../shared/", import.meta.url);

const EXPECTED_SERVICE_NAMES = Object.freeze([
  "🐙 GitHub",
  "📺 YouTube",
  "🎬 海外流媒体",
  "💬 海外社交",
  "🍎 Apple",
  "🪟 Microsoft",
  "🇨🇳 国内平台",
  "🌍 海外游戏",
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
  const expectedContinents = ["🌏 亚太", "🌍 欧洲", "🌎 美洲"];
  const sharedPrimary = shared.find((group) => group.name === "🚀 节点选择");
  const shadowrocketPrimary = shadowrocket.find((group) => group.name === "🚀 节点选择");

  assert.equal(Object.isFrozen(POLICY_TARGET), true);
  assert.deepEqual(sharedPrimary.candidates, ["⚡ 全部自动", "🛟 全部故障转移", ...expectedContinents]);
  assert.equal(sharedPrimary.nodeFilter, null);
  assert.notEqual(POLICY_TARGET.primaryProxy, "PROXY");
  assert.deepEqual(shadowrocketPrimary.items, ["PROXY", "⚡ 全部自动", "🛟 全部故障转移", ...expectedContinents]);
  assert.equal(shadowrocketPrimary.useSubscription, undefined);
  assert.equal(shadowrocketPrimary.filter, undefined);
  assert.deepEqual(
    shared.filter((group) => group.kind === "service").map((group) => group.name),
    EXPECTED_SERVICE_NAMES,
  );
  assert.deepEqual(shared.find((group) => group.name === "☣️ 安全威胁").candidates, ["REJECT", "DIRECT"]);
  assert.equal(shadowrocket.length, shared.length);
  assert.equal(Object.hasOwn(shadowrocket.find((group) => group.name === "🐙 GitHub"), "kind"), false);
});

test("shared modules never import a Shadowrocket client module", async () => {
  const paths = (await readdir(sharedRoot, { recursive: true }))
    .filter((path) => path.endsWith(".js"));
  const sources = await Promise.all(paths.map((path) => readFile(new URL(path, sharedRoot), "utf8")));

  for (let index = 0; index < paths.length; index += 1) {
    assert.doesNotMatch(
      sources[index],
      /(?:from\s+|import\s*\()["'][^"']*clients\/shadowrocket\//,
      `shared/${paths[index]} imports the Shadowrocket client`,
    );
  }
  const catalog = await readFile(new URL("policies/catalog.js", sharedRoot), "utf8");
  assert.doesNotMatch(catalog, /["']PROXY["']/, "shared catalog embeds a Shadowrocket policy literal");
});
