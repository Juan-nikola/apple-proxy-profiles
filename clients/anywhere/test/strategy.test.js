import assert from "node:assert/strict";
import test from "node:test";

import { operator as nodesOperator } from "../src/substore-nodes-entry.js";
import { operator as strategyOperator } from "../src/substore-strategy-entry.js";

const NODE_ARGUMENTS = Object.freeze({
  output: "nodes",
  type: "collection",
  name: "apple-proxy-anywhere",
  clientChain: "off",
});

const STRATEGY_ARGUMENTS = Object.freeze({
  output: "strategy",
  type: "collection",
  name: "apple-proxy-anywhere",
  channel: "edge",
});

const policy = JSON.stringify({
  schemaVersion: 2,
  targets: {
    "🤖 AI 专用": "NODE:Anywhere VLESS|vless",
    "🍎 Apple": "DIRECT",
  },
});

const nodes = [{
  name: "Anywhere VLESS",
  type: "vless",
  server: "TEST_ONLY_ANYWHERE_SERVER",
  port: 443,
  uuid: "TEST_ONLY_ANYWHERE_UUID",
  tls: true,
  sni: "TEST_ONLY_ANYWHERE_SNI",
}];

function context(calls, { includePolicy = true } = {}) {
  return {
    arguments: STRATEGY_ARGUMENTS,
    produceArtifact: async (request) => {
      calls.push(request);
      if (request.type === "file") return includePolicy ? { $content: policy } : null;
      return structuredClone(nodes);
    },
  };
}

test("Anywhere strategy entry maps the shared policy without exposing a profile", async () => {
  const calls = [];
  const result = await strategyOperator({ unchanged: true }, "Anywhere", context(calls));
  const strategy = JSON.parse(result.$content);

  assert.deepEqual(calls, [
    { type: "collection", name: "apple-proxy-anywhere", platform: "JSON", produceType: "internal" },
    { type: "file", name: "apple-proxy-policy", platform: "JSON", produceType: "internal" },
  ]);
  assert.equal(result.unchanged, true);
  assert.equal(strategy.client, "anywhere");
  assert.equal(strategy.output, "strategy");
  assert.equal(strategy.counts.eligibleNodes, 1);
  assert.equal(strategy.targets.ai.status, "fixed");
  assert.equal(strategy.targets.ai.resolved, "🌐 Anywhere · VLESS");
  assert.equal(strategy.targets.apple.status, "direct");
  assert.equal(Object.hasOwn(strategy, "proxies"), false);
  assert.doesNotMatch(result.$content, /TEST_ONLY_ANYWHERE_SERVER|TEST_ONLY_ANYWHERE_UUID|TEST_ONLY_ANYWHERE_SNI/u);
});

test("Anywhere strategy entry fails closed when apple-proxy-policy is unavailable", async () => {
  await assert.rejects(
    () => strategyOperator({}, "Anywhere", context([], { includePolicy: false })),
    /policy artifact|content|unavailable/iu,
  );
});

test("Anywhere strategy entry rejects a fixed node that is incompatible with Anywhere", async () => {
  const calls = [];
  const incompatiblePolicy = JSON.stringify({
    schemaVersion: 2,
    targets: { "🤖 AI 专用": "NODE:Anywhere VLESS|vmess" },
  });
  await assert.rejects(
    () => strategyOperator({}, "Anywhere", {
      ...context(calls),
      produceArtifact: async (request) => {
        calls.push(request);
        return request.type === "file" ? { $content: incompatiblePolicy } : structuredClone(nodes);
      },
    }),
    /incompatible|missing/iu,
  );
});

test("Anywhere node entry remains collection-only", async () => {
  const calls = [];
  await nodesOperator({}, "Anywhere", {
    arguments: NODE_ARGUMENTS,
    produceArtifact: async (request) => {
      calls.push(request);
      if (request.type === "file") throw new Error("TEST_ONLY_POLICY_MUST_NOT_BE_REQUESTED");
      return structuredClone(nodes);
    },
  });
  assert.deepEqual(calls, [
    { type: "collection", name: "apple-proxy-anywhere", platform: "JSON", produceType: "internal" },
  ]);
});
