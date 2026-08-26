import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-profile-entry.js";

const nodes = [{
  name: "🇯🇵 [机场] Tokyo A",
  type: "ss",
  server: "198.51.100.10",
  port: 443,
  cipher: "aes-256-gcm",
  password: "TEST_ONLY_PASSWORD",
  _profile: {
    id: "fixture",
    continent: "asiaPacific",
    sourceKind: "airport",
    flag: "🇯🇵",
    udp: true,
    p2p: false,
    entry: true,
    chained: false,
  },
}];
const EMPTY_POLICY = { $content: JSON.stringify({ schemaVersion: 2, targets: {} }) };

test("Sub-Store Surge entry requests a private JSON collection and returns Profile content", async () => {
  const calls = [];
  const result = await operator(
    { id: "input", $content: "old" },
    "macos",
    {
      arguments: {
        output: "config",
        type: "collection",
        name: "surge-sources",
        subscriptionName: "Surge-Nodes",
        platform: "macos",
      },
      async produceArtifact(request) {
        calls.push(request);
        return request.type === "file" ? EMPTY_POLICY : nodes;
      },
    },
  );
  assert.deepEqual(calls, [{
    type: "collection",
    name: "surge-sources",
    platform: "JSON",
    produceType: "internal",
  }, {
    type: "file",
    name: "apple-proxy-policy",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.equal(result.id, "input");
  assert.match(result.$content, /^\[General\]/mu);
  assert.match(result.$content, /current\/surge\/rules/u);
  assert.doesNotMatch(result.$content, /_profile|_subName/u);
});

test("Sub-Store Surge entry applies current channel and full adblock options to the same profile", async () => {
  const result = await operator(
    { id: "input" },
    "macos",
    {
      arguments: {
        output: "config",
        type: "collection",
        name: "surge-sources",
        subscriptionName: "Surge-Nodes",
        platform: "macos",
        channel: "current",
        adblockMode: "full",
      },
      async produceArtifact(request) {
        return request.type === "file" ? EMPTY_POLICY : nodes;
      },
    },
  );
  assert.match(result.$content, /current\/surge\/rules\/DomesticCore\.list/u);
  assert.match(result.$content, /current\/optional\/adblock-full\/surge\/rules\/Advertising\.list/u);
  assert.match(result.$content, /current\/optional\/adblock-full\/surge\/rules\/Advertising_Domain\.list/u);
  assert.doesNotMatch(result.$content, /current\/surge\/rules\/Advertising(?:_Domain)?\.list/u);
});

test("Sub-Store Surge entry normalizes raw collection nodes before rendering", async () => {
  const rawNodes = nodes.map(({ _profile, ...node }) => ({ ...node, reuse: true, tfo: true, udp_relay: true, provider_metadata: "ignored" }));
  const result = await operator(
    { id: "input" },
    "macos",
    {
      arguments: {
        output: "config",
        type: "collection",
        name: "apple-proxy-sources",
        subscriptionName: "Apple-Proxy-Nodes",
        platform: "macos",
      },
      async produceArtifact(request) {
        return request.type === "file" ? EMPTY_POLICY : rawNodes;
      },
    },
  );
  assert.match(result.$content, /^\[General\]/mu);
  assert.match(result.$content, /^\[Proxy\]$/mu);
});

test("Sub-Store Surge profile carries the private remote provider URL", async () => {
  const result = await operator(
    { id: "input" },
    "macos",
    {
      arguments: {
        output: "config",
        type: "collection",
        name: "apple-proxy-sources",
        subscriptionName: "Apple-Proxy-Nodes",
        platform: "macos",
        proxyPolicyUrl: "https://substore.example.invalid/surge-nodes",
      },
      async produceArtifact(request) {
        return request.type === "file" ? EMPTY_POLICY : nodes;
      },
    },
  );
  assert.match(result.$content, /policy-path=https:\/\/substore\.example\.invalid\/surge-nodes/u);
  assert.doesNotMatch(result.$content, / = ss,198\.51\.100\.10,443/u);
});

test("Sub-Store Surge profile skips an unrenderable selected protocol", async () => {
  const privateAnyTls = {
    name: "PRIVATE_SURGE_ANYTLS",
    type: "anytls",
    server: "private-surge.example.invalid",
    port: 443,
    password: "TEST_ONLY_SURGE_ANYTLS_PASSWORD",
    _subName: "[自建] AnyTLS",
  };
  const privateVless = {
    name: "PRIVATE_SURGE_VLESS",
    type: "vless",
    server: "private-vless.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    tls: true,
    sni: "private-vless.example.invalid",
    _subName: "[自建] VLESS",
  };
  const result = await operator({}, "macos", {
    arguments: {
      output: "config",
      type: "collection",
      name: "surge-sources",
      subscriptionName: "Surge-Nodes",
      platform: "macos",
    },
    async produceArtifact(request) { return request.type === "file" ? EMPTY_POLICY : [nodes[0], privateAnyTls, privateVless]; },
  });
  assert.match(result.$content, /PRIVATE_SURGE_ANYTLS/u);
  for (const secret of [privateVless.name, privateVless.server, privateVless.uuid]) {
    assert.equal(result.$content.includes(secret), false);
  }
});
