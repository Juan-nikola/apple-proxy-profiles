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
        return nodes;
      },
    },
  );
  assert.deepEqual(calls, [{
    type: "collection",
    name: "surge-sources",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.equal(result.id, "input");
  assert.match(result.$content, /^\[General\]/mu);
  assert.match(result.$content, /current\/surge\/rules/u);
  assert.doesNotMatch(result.$content, /_profile|_subName/u);
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
      async produceArtifact() {
        return rawNodes;
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
      async produceArtifact() {
        return nodes;
      },
    },
  );
  assert.match(result.$content, /policy-path=https:\/\/substore\.example\.invalid\/surge-nodes/u);
  assert.doesNotMatch(result.$content, / = ss,198\.51\.100\.10,443/u);
});
