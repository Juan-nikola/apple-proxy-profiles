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
];

test("Surge node entry emits only filtered compatible nodes from the source collection", async () => {
  const calls = [];
  const result = await operator(
    { id: "input" },
    "macos",
    {
      arguments: {
        output: "nodes",
        type: "collection",
        name: "apple-proxy-sources",
        clientChain: "off",
      },
      async produceArtifact(request) {
        calls.push(request);
        return nodes;
      },
    },
  );
  assert.deepEqual(calls, [{
    type: "collection",
    name: "apple-proxy-sources",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.match(result.$content, /^\[Proxy\]$/mu);
  assert.match(result.$content, /= snell,198\.51\.100\.20,443/iu);
  assert.doesNotMatch(result.$content, /VLESS|198\.51\.100\.21/u);
});
