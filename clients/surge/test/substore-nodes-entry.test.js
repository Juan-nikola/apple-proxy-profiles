import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-nodes-entry.js";

const nodes = [
  {
    name: "🇭🇰 自建 · Snell",
    type: "snell",
    server: "198.51.100.20",
    port: 443,
    psk: "TEST_ONLY_SNELL_PSK",
    version: 4,
    _profile: {
      id: "snell-fixture",
      continent: "asiaPacific",
      sourceKind: "selfHosted",
      flag: "🇭🇰",
      udp: true,
      p2p: true,
      entry: true,
      chained: false,
    },
  },
  {
    name: "🇯🇵 自建 · VLESS",
    type: "vless",
    server: "198.51.100.21",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    tls: true,
    sni: "example.invalid",
    _profile: {
      id: "vless-fixture",
      continent: "asiaPacific",
      sourceKind: "selfHosted",
      flag: "🇯🇵",
      udp: true,
      p2p: true,
      entry: true,
      chained: false,
    },
  },
  {
    name: "🇺🇸 自建 · AnyTLS",
    type: "anytls",
    server: "198.51.100.22",
    port: 443,
    password: "TEST_ONLY_ANYTLS_PASSWORD",
    tls: true,
    sni: "anytls.example.invalid",
    _profile: {
      id: "anytls-fixture",
      continent: "americas",
      sourceKind: "selfHosted",
      flag: "🇺🇸",
      udp: true,
      p2p: true,
      entry: true,
      chained: false,
    },
  },
];

test("Surge node entry skips an unrenderable VLESS selection and logs render-failure counts", async () => {
  const calls = [];
  const lines = [];
  const result = await operator({ id: "input" }, "macos", {
    arguments: {
      output: "nodes",
      type: "collection",
      name: "apple-proxy-surge",
      clientChain: "off",
      channel: "current",
    },
    async produceArtifact(request) {
      calls.push(request);
      return nodes;
    },
    logger: { info(line) { lines.push(line); } },
  });
  assert.deepEqual(calls, [{
    type: "collection",
    name: "apple-proxy-surge",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.equal(result.id, "input");
  assert.match(result.$content, /^\[Proxy\]/mu);
  assert.match(result.$content, / = snell,/u);
  assert.match(result.$content, / = anytls,/u);
  for (const secret of [nodes[1].name, nodes[1].server, nodes[1].uuid]) {
    assert.equal(result.$content.includes(secret), false);
  }
  assert.equal(lines.length, 1);
  const diagnostics = JSON.parse(lines[0].slice("[surge-nodes] ".length));
  assert.equal(diagnostics.accepted, 2);
  assert.deepEqual(diagnostics.renderFailures, { vless: 1 });
});

test("Surge node entry forwards the parsed safe collection name and rejects unsafe names", async () => {
  const calls = [];
  await assert.rejects(operator({}, "macos", {
    arguments: { output: "nodes", type: "collection", name: "中文", clientChain: "off" },
    async produceArtifact(request) { calls.push(request); return nodes; },
  }), /name/i);
  assert.deepEqual(calls, []);

  await assert.rejects(operator({}, "macos", {
    arguments: { output: "nodes", type: "collection", name: "surge/sources", clientChain: "off" },
    async produceArtifact(request) { calls.push(request); return nodes; },
  }), /name/i);
  assert.deepEqual(calls, []);

  await assert.rejects(operator({}, "macos", {
    arguments: { output: "nodes", type: "collection", name: "apple-proxy-surge", clientChain: "off", channel: "edge" },
    async produceArtifact(request) { calls.push(request); return nodes; },
  }), /channel/i);
  assert.deepEqual(calls, []);
});
