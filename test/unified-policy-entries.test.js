import assert from "node:assert/strict";
import test from "node:test";

import { operator as singboxOperator } from "../clients/sing-box/src/substore-config-entry.js";
import { operator as shadowrocketOperator } from "../clients/shadowrocket/src/substore-profile-entry.js";
import { operator as surgeOperator } from "../clients/surge/src/substore-profile-entry.js";
import { operator as egernOperator } from "../clients/egern/src/substore-profile-entry.js";
import { operator as v2boxOperator } from "../clients/v2box/src/substore-config-entry.js";

const nodes = [{
  name: "🇺🇸qqpw家宽",
  type: "trojan",
  server: "fixture.invalid",
  port: 443,
  password: "TEST_ONLY_PASSWORD",
  tls: true,
  sni: "fixture.invalid",
}];

const policy = JSON.stringify({
  schemaVersion: 2,
  targets: {
    "🤖 AI 专用": "NODE:🇺🇸qqpw家宽|trojan",
    "🎬 海外流媒体": "DIRECT",
  },
});

function context(argumentsValue, calls = [], inventory = nodes) {
  return {
    arguments: argumentsValue,
    produceArtifact: async (request) => {
      calls.push(request);
      return request.type === "file" ? { $content: policy } : inventory;
    },
  };
}

test("interactive entries load apple-proxy-policy and preserve a fixed-node candidate", async () => {
  const calls = [];
  const singbox = await singboxOperator({}, "JSON", context({
    output: "config", type: "collection", name: "fixture",
    subscriptionName: "Fixture", platform: "iphone", channel: "current",
  }, calls));
  const singboxConfig = JSON.parse(singbox.$content);
  const singboxAi = singboxConfig.outbounds.find(({ tag }) => tag === "🤖 AI 专用");
  assert.equal(singboxAi.default, "🇺🇸 qqpw家宽 · Trojan");
  assert.ok(singboxAi.outbounds.includes("🇺🇸 qqpw家宽 · Trojan"));

  const shadowrocket = await shadowrocketOperator({}, "JSON", context({
    output: "config", type: "collection", name: "fixture",
    subscriptionName: "Fixture", platform: "iphone", channel: "current",
    dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare",
    blockMode: "balanced", quicMode: "proxy-block", ipv6Mode: "auto",
    autoGroupMode: "auto", clientChain: "off",
  }, calls));
  assert.match(shadowrocket.$content, /🤖 AI 专用 = [^\n]*policy-select-name=🇺🇸 qqpw家宽 · Trojan/u);

  const surge = await surgeOperator({}, "JSON", context({
    output: "config", type: "collection", name: "fixture",
    subscriptionName: "Fixture", platform: "iphone", channel: "current",
    dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare",
    blockMode: "balanced", quicMode: "proxy-block", ipv6Mode: "auto",
    autoGroupMode: "auto", clientChain: "off",
  }, calls));
  assert.match(surge.$content, /🤖 AI 专用 = [^\n]*policy-select-name=🇺🇸 qqpw家宽 · Trojan/u);

  assert.equal(calls.filter(({ type, name }) => type === "file" && name === "apple-proxy-policy").length, 3);

  const egern = await egernOperator({}, "JSON", context({
    output: "config", type: "collection", name: "fixture",
    nodeSubscriptionUrl: "https://example.invalid/private/egern-nodes",
    platform: "iphone", channel: "current",
  }, calls));
  assert.match(egern.$content, /name: "🤖 AI 专用"/u);
  assert.match(egern.$content, /- "🇺🇸 qqpw家宽 · Trojan"/u);
  assert.equal(calls.filter(({ type, name }) => type === "file" && name === "apple-proxy-policy").length, 4);
});

test("interactive entries fail closed when the policy artifact is missing", async () => {
  await assert.rejects(
    () => singboxOperator({}, "JSON", {
      arguments: {
        output: "config", type: "collection", name: "fixture",
        subscriptionName: "Fixture", platform: "iphone",
      },
      produceArtifact: async (request) => request.type === "file" ? null : nodes,
    }),
    /policy artifact|content|unavailable/iu,
  );
});

test("V2Box config entries load the shared policy artifact and route fixed targets", async () => {
  const calls = [];
  const fixedPolicy = JSON.stringify({
    schemaVersion: 2,
    targets: { "最终兜底": "NODE:🇺🇸qqpw家宽|trojan" },
  });
  const fixedContext = (argumentsValue) => ({
    arguments: argumentsValue,
    produceArtifact: async (request) => {
      calls.push(request);
      return request.type === "file" ? { $content: fixedPolicy } : nodes;
    },
  });
  const v2box = await v2boxOperator({}, "JSON", fixedContext({
    output: "config", type: "collection", name: "fixture",
    subscriptionName: "Fixture", platform: "iphone", channel: "current",
    region: "cn", clientChain: "off",
  }, calls));
  const v2boxProfile = JSON.parse(v2box.$content);
  assert.ok(v2boxProfile.routing.rules.some(({ outboundTag }) => outboundTag === "ap-node-0"));

  assert.equal(calls.filter(({ type, name }) => type === "file" && name === "apple-proxy-policy").length, 1);
  assert.equal(calls.filter(({ type }) => type === "collection").length, 1);
});

test("V2Box fails closed when its shared policy artifact is missing", async () => {
  for (const [operator, platform] of [[v2boxOperator, "iphone"]]) {
    await assert.rejects(
      () => operator({}, "JSON", {
        arguments: {
          output: "config", type: "collection", name: "fixture",
          subscriptionName: "Fixture", platform,
        },
        produceArtifact: async (request) => request.type === "file" ? null : nodes,
      }),
      /policy artifact|content|unavailable/iu,
    );
  }
});

test("V2Box does not emit an empty profile when a fixed policy target is unavailable", async () => {
  const unavailablePolicy = JSON.stringify({
    schemaVersion: 2,
    targets: { "🤖 AI 专用": "NODE:missing" },
  });
  for (const [operator, platform] of [[v2boxOperator, "iphone"]]) {
    await assert.rejects(
      () => operator({}, "JSON", {
        arguments: {
          output: "config", type: "collection", name: "fixture",
          subscriptionName: "Fixture", platform,
        },
        produceArtifact: async (request) => request.type === "file" ? { $content: unavailablePolicy } : nodes,
      }),
      /missing|unavailable/iu,
    );
  }
});
