import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-profile-entry.js";
import { fakeNodes } from "./fixtures/nodes.js";

const argumentsForProfile = Object.freeze({
  output: "config",
  type: "collection",
  name: "apple-proxy-shadowrocket",
  subscriptionName: "Shadowrocket-Nodes",
  platform: "macos",
});
const EMPTY_POLICY = { $content: JSON.stringify({ schemaVersion: 2, targets: {} }) };

function anytlsNode() {
  return {
    name: "Tokyo AnyTLS",
    type: "anytls",
    server: "198.51.100.40",
    port: 443,
    password: "TEST_ONLY_PROFILE_ANYTLS_PASSWORD",
    tls: true,
    sni: "anytls.example.invalid",
    alpn: ["h2"],
    "client-fingerprint": "chrome",
    "idle-session-check-interval": 30,
    "idle-session-timeout": 60,
    "min-idle-session": 1,
    _subName: "[自建] Tokyo AnyTLS",
  };
}

function clientChainInventory() {
  return [
    {
      ...fakeNodes[0],
      name: "Singapore entry",
      server: "profile-entry.example.invalid",
      password: "TEST_ONLY_PROFILE_CHAIN_ENTRY_PASSWORD",
      _subDisplayName: undefined,
      _subName: "[机场] Entry",
    },
    {
      ...fakeNodes[0],
      name: "Tokyo landing",
      server: "profile-landing.example.invalid",
      password: "TEST_ONLY_PROFILE_CHAIN_LANDING_PASSWORD",
      _subDisplayName: undefined,
      _subName: "[落地] Landing",
    },
  ];
}

test("file operator produces a Profile artifact and preserves the input", async () => {
  const input = { url: "https://example.invalid/sub", unchanged: true };
  const calls = [];
  const result = await operator(input, "Shadowrocket", {
    arguments: argumentsForProfile,
    async produceArtifact(request) {
      calls.push(request);
      return request.type === "file" ? EMPTY_POLICY : [...fakeNodes, anytlsNode()];
    },
  });

  assert.deepEqual(calls, [
    { type: "collection", name: "apple-proxy-shadowrocket", platform: "JSON", produceType: "internal" },
    { type: "file", name: "apple-proxy-policy", platform: "JSON", produceType: "internal" },
  ]);
  assert.deepEqual({ url: result.url, unchanged: result.unchanged }, input);
  assert.equal(typeof result.$content, "string");
  assert.deepEqual(Object.keys(result).sort(), ["$content", "unchanged", "url"]);
  assert.match(result.$content, /\[Proxy Group\]/);
  assert.match(result.$content, /edge\/shadowrocket\/rules\/DomesticCore\.list/u);
  assert.match(result.$content, /node-count=5/u);
  assert.doesNotMatch(result.$content, /\/Advertising(?:_Domain)?\.list/u);
});

test("file operator accepts the full documented option set", async () => {
  const result = await operator({}, "Shadowrocket", {
    arguments: {
      ...argumentsForProfile,
      platform: "iphone",
      dnsMode: "privacy",
      chinaDns: "dnspod",
      globalDns: "google",
      blockMode: "strict",
      quicMode: "allow",
      ipv6Mode: "auto",
      autoGroupMode: "full",
      clientChain: "on",
      channel: "current",
      adblockMode: "full",
      _internal: "ignored",
    },
    async produceArtifact(request) { return request.type === "file" ? EMPTY_POLICY : fakeNodes; },
  });

  assert.equal(typeof result.$content, "string");
  assert.match(result.$content, /current\/shadowrocket\/rules\/DomesticCore\.list/u);
  assert.match(result.$content, /current\/optional\/adblock-full\/shadowrocket\/rules\/Advertising\.list/u);
  assert.match(result.$content, /current\/optional\/adblock-full\/shadowrocket\/rules\/Advertising_Domain\.list/u);
});

test("Profile operator accepts the generated clientChain clone through the shared assertion", async () => {
  const result = await operator({}, "Shadowrocket", {
    arguments: { ...argumentsForProfile, clientChain: "on" },
    async produceArtifact(request) { return request.type === "file" ? EMPTY_POLICY : clientChainInventory(); },
  });

  assert.match(result.$content, /node-count=3/u);
  assert.match(result.$content, /🎯 客户端落地/u);
  assert.match(result.$content, /🔗 入口节点/u);
});

test("file operator fails closed for invalid integration input", async () => {
  await assert.rejects(operator({}, "Shadowrocket", { arguments: argumentsForProfile }), /produceArtifact/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { ...argumentsForProfile, output: "nodes" },
    async produceArtifact() { return fakeNodes; },
  }), /output.*config/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: argumentsForProfile,
    async produceArtifact() { return []; },
  }), /non-empty|nodes/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { ...argumentsForProfile, quicMode: "invalid" },
    async produceArtifact() { return fakeNodes; },
  }), /quicMode/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { ...argumentsForProfile, unexpected: "x" },
    async produceArtifact() { return nodes; },
  }), /Unknown option: unexpected/);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { ...argumentsForProfile, channel: "beta" },
    async produceArtifact() { return nodes; },
  }), /channel/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { ...argumentsForProfile, adblockMode: "balanced" },
    async produceArtifact() { return nodes; },
  }), /adblockMode/i);
});

test("file operator retains its JavaScript function arity", () => {
  assert.equal(operator.length, 2);
});

test("file operator skips unknown mixed inventory while rendering the supported Profile", async () => {
  const privateNode = {
    name: "PRIVATE_SHADOWROCKET_PROFILE_FUTURE",
    type: " Future-Proto ",
    server: "private-profile.example.invalid",
    port: 443,
    password: "TEST_ONLY_PROFILE_PASSWORD",
    _subName: "[自建] Future",
  };
  const result = await operator({}, "Shadowrocket", {
    arguments: argumentsForProfile,
    async produceArtifact(request) { return request.type === "file" ? EMPTY_POLICY : [anytlsNode(), privateNode]; },
  });
  assert.match(result.$content, /node-count=1/u);
  for (const secret of [privateNode.name, privateNode.server, privateNode.password]) {
    assert.equal(result.$content.includes(secret), false);
  }
});
