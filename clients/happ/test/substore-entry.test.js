import assert from "node:assert/strict";
import test from "node:test";

import { operator as configOperator } from "../src/substore-config-entry.js";
import { operator as auditOperator } from "../src/substore-audit-entry.js";

const nodes = [
  { name: "TEST_ONLY_Happ", type: "vless", server: "example.test", port: 443, uuid: "TEST_ONLY_UUID", tls: true, sni: "example.test" },
  { name: "TEST_ONLY_Happ_2", type: "trojan", server: "example.test", port: 443, password: "TEST_ONLY_PASSWORD", tls: true, sni: "example.test" },
  { name: "TEST_ONLY_Snell", type: "snell", server: "example.test", port: 443, psk: "TEST_ONLY_PSK", version: 4 },
];

function context(argumentsValue) {
  return {
    arguments: argumentsValue,
    produceArtifact: async () => nodes,
  };
}

test("HAPP Sub-Store config entry filters incompatible nodes and emits an Xray JSON array", async () => {
  const result = await configOperator({}, "JSON", context({
    output: "config",
    type: "collection",
    name: "TEST_ONLY_Happ_Collection",
    subscriptionName: "TEST_ONLY_Happ_Subscription",
    platform: "macos",
  }));
  const configs = JSON.parse(result.$content);
  assert.equal(configs.length, 2);
  assert.deepEqual(configs.map(({ remarks }) => remarks).sort(), ["🌐 TEST_ONLY_Happ · VLESS", "🌐 TEST_ONLY_Happ_2 · Trojan"].sort());
  assert.ok(configs.every((config) => config.outbounds.every((outbound) => outbound.tag !== "TEST_ONLY_Snell")));
});

test("HAPP audit entry emits only redacted counts and routing status", async () => {
  const result = await auditOperator({}, "JSON", context({
    output: "audit",
    type: "collection",
    name: "TEST_ONLY_Happ_Collection",
    subscriptionName: "TEST_ONLY_Happ_Subscription",
    platform: "all",
  }));
  const audit = JSON.parse(result.$content);
  assert.equal(audit.client, "happ");
  assert.equal(audit.counts.eligibleNodes, 2);
  assert.doesNotMatch(result.$content, /TEST_ONLY_PASSWORD|TEST_ONLY_UUID|example\.test/);
});
