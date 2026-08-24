import assert from "node:assert/strict";
import test from "node:test";

import { encodeBase64UrlUtf8 } from "../../../shared/encoding/base64url.js";
import { operator as nodesOperator } from "../src/substore-nodes-entry.js";
import { operator as profileOperator } from "../src/substore-profile-entry.js";
import { operator as auditOperator } from "../src/substore-audit-entry.js";

const nodes = [
  { name: "TEST_ONLY_Entry", type: "vless", server: "entry.invalid", port: 443, uuid: "TEST_ONLY_UUID", _profile: { id: "entry", entry: true, sourceKind: "airport", chained: false } },
  { name: "TEST_ONLY_Fixed", type: "trojan", server: "fixed.invalid", port: 443, password: "TEST_ONLY_PASSWORD", tls: true, sni: "fixed.invalid", _profile: { id: "fixed", entry: true, sourceKind: "selfHosted", chained: false } },
  { name: "TEST_ONLY_Snell", type: "snell", server: "snell.invalid", port: 443, psk: "TEST_ONLY_PSK", version: 4 },
];
const POLICY = {
  $content: JSON.stringify({
    schemaVersion: 2,
    targets: { "🤖 AI 专用": "NODE:TEST_ONLY_Fixed|trojan" },
  }),
};

function context(argumentsValue) {
  return {
    arguments: argumentsValue,
    produceArtifact: async (request) => request.type === "file" ? POLICY : nodes,
  };
}

const common = {
  type: "collection",
  name: "TEST_ONLY_OneXray_Collection",
  channel: "edge",
};

test("OneXray nodes entry emits only compatible homepage outbounds", async () => {
  const result = await nodesOperator({}, "JSON", context({ ...common, output: "nodes" }));
  const parsed = JSON.parse(result.$content);
  assert.equal(parsed.outbounds.length, 2);
  assert.deepEqual(parsed.outbounds.map(({ name }) => name).sort(), ["🌐 TEST_ONLY_Entry · VLESS", "🌐 TEST_ONLY_Fixed · Trojan"].sort());
  assert.match(result.$content, /TEST_ONLY_PASSWORD/u);
  assert.doesNotMatch(result.$content, /TEST_ONLY_PSK/u);
});

test("OneXray profile entry resolves fixed policy before rendering", async () => {
  const policyOverrides = encodeBase64UrlUtf8(JSON.stringify({ ai: "NODE:🌐 TEST_ONLY_Fixed · Trojan" }));
  const result = await profileOperator({}, "JSON", context({ ...common, output: "profile", policyOverrides }));
  const profile = JSON.parse(result.$content);
  assert.equal(profile.routing.rules.at(-1).outboundTag, "proxy");
  assert.equal(profile.outbounds.filter(({ tag }) => tag.startsWith("ap-fixed-")).length, 1);
});

test("OneXray audit entry contains counts and target statuses only", async () => {
  const result = await auditOperator({}, "JSON", context({ ...common, output: "audit" }));
  const audit = JSON.parse(result.$content);
  assert.equal(audit.client, "onexray");
  assert.equal(audit.counts.eligibleNodes, 2);
  assert.doesNotMatch(result.$content, /TEST_ONLY_PASSWORD|TEST_ONLY_UUID|fixed\.invalid/);
});
