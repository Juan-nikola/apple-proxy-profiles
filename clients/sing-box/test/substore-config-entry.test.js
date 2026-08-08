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
  assert.ok(config.route.rule_set[0].url.includes("/edge/sing-box/rule-sets/"));
  assert.equal(config.route.rule_set.every(({ format, url }) => format === "binary" && url.endsWith(".srs")), true);
  assert.equal(result.$content.endsWith("\n"), true);
});

test("Sub-Store passes the light/diagnostic profile API and never emits source rules", async () => {
  const result = await operator(
    { id: "input" },
    "macos",
    {
      arguments: {
        output: "config",
        type: "collection",
        name: "sing-box-sources",
        subscriptionName: "sing-box-Nodes",
        platform: "macos",
        profileMode: "diagnostic",
      },
      async produceArtifact() { return nodes; },
    },
  );
  const config = JSON.parse(result.$content);
  assert.deepEqual(config.route.rule_set, []);
  assert.equal(result.$content.includes('"format": "source"'), false);
});

test("Sub-Store sing-box entry normalizes raw collection nodes before rendering", async () => {
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
  const config = JSON.parse(result.$content);
  assert.equal(config.log.level, "info");
  assert.ok(config.outbounds.some((outbound) => outbound.type === "shadowsocks"));
});
