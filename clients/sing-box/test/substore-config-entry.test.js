import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-config-entry.js";

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

test("Sub-Store sing-box entry requests a private collection and returns JSON content", async () => {
  const calls = [];
  const result = await operator(
    { id: "input" },
    "openwrt",
    {
      arguments: {
        output: "config",
        type: "collection",
        name: "sing-box-sources",
        subscriptionName: "sing-box-Nodes",
        platform: "openwrt",
        channel: "edge",
      },
      async produceArtifact(request) {
        calls.push(request);
        return nodes;
      },
    },
  );
  assert.deepEqual(calls, [{
    type: "collection",
    name: "sing-box-sources",
    platform: "JSON",
    produceType: "internal",
  }]);
  const config = JSON.parse(result.$content);
  assert.equal(config.inbounds[0].auto_redirect, true);
  assert.ok(config.route.rule_set[0].url.includes("/edge/sing-box/rules/"));
  assert.equal(result.$content.endsWith("\n"), true);
});
