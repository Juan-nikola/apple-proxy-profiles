import assert from "node:assert/strict";
import test from "node:test";

import { HAPP_PRIVATE_TASKS, operator } from "../src/substore-config-entry.js";

const rawNodes = Object.freeze([
  Object.freeze({
    name: "[机场] Tokyo SS",
    type: "ss",
    server: "private-tokyo.example.invalid",
    port: 443,
    cipher: "aes-256-gcm",
    password: "TEST_ONLY_OPERATOR_SECRET",
    udp: true,
  }),
  Object.freeze({
    name: "Unsupported Snell",
    type: "snell",
    server: "private-snell.example.invalid",
    port: 443,
    psk: "TEST_ONLY_SNELL_SECRET",
    version: 5,
  }),
]);

function configArguments(platform = "macos") {
  return {
    output: "config", type: "collection", name: "happ-config-macos",
    subscriptionName: "happ-config-macos", platform, policyOverrides: "e30",
  };
}

test("Happ operator requests a private collection, normalizes it, filters unsupported nodes, and logs no credentials", async () => {
  const requests = [];
  const lines = [];
  const result = await operator({ unchanged: true }, "Happ", {
    arguments: configArguments(),
    async produceArtifact(request) { requests.push(request); return structuredClone(rawNodes); },
    logger: { info(line) { lines.push(line); } },
  });

  assert.deepEqual(requests, [{ type: "collection", name: "happ-config-macos", platform: "JSON", produceType: "internal" }]);
  assert.equal(result.unchanged, true);
  assert.equal(result.$content.endsWith("\n"), true);
  const configs = JSON.parse(result.$content);
  assert.equal(configs.length, 1);
  assert.equal(configs[0].remarks.includes("Tokyo"), true);
  assert.equal(result.$content.includes("TEST_ONLY_OPERATOR_SECRET"), true);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /"accepted":1/u);
  assert.doesNotMatch(lines[0], /TEST_ONLY_OPERATOR_SECRET|private-tokyo\.example/u);
});

test("Happ operator emits private audit JSON from the same normalized eligible inventory", async () => {
  const result = await operator({}, "Happ", {
    arguments: { ...configArguments("all"), output: "audit", name: "happ-routing-audit", subscriptionName: "happ-routing-audit" },
    async produceArtifact() { return structuredClone(rawNodes); },
  });
  const audit = JSON.parse(result.$content);
  assert.equal(audit.counts.eligibleNodes, 1);
  assert.equal(audit.schemaVersion, 1);
  assert.equal(result.$content.endsWith("\n"), true);
  assert.doesNotMatch(result.$content, /private-tokyo|TEST_ONLY_OPERATOR_SECRET/u);
});

test("Happ operator fails stably for absent arguments and zero eligible nodes", async () => {
  await assert.rejects(() => operator({}, "Happ", {}), /Option 'output' is required/u);
  await assert.rejects(
    () => operator({}, "Happ", { arguments: configArguments(), async produceArtifact() { return [rawNodes[1]]; } }),
    /没有可用于 Happ 的节点/u,
  );
});

test("Happ private task contract contains six platform configs and one shared audit argument set", () => {
  const expectedNames = ["happ-config-macos", "happ-config-iphone", "happ-config-ipad", "happ-config-android", "happ-config-windows", "happ-config-linux", "happ-routing-audit"];
  assert.deepEqual(HAPP_PRIVATE_TASKS.map(({ name }) => name), expectedNames);
  assert.equal(new Set(HAPP_PRIVATE_TASKS.map(({ policyOverrides }) => policyOverrides)).size, 1);
  for (const task of HAPP_PRIVATE_TASKS.slice(0, 6)) {
    assert.deepEqual(task, { output: "config", type: "collection", name: task.name, subscriptionName: task.name, platform: task.name.slice("happ-config-".length), policyOverrides: "e30" });
  }
  assert.deepEqual(HAPP_PRIVATE_TASKS.at(-1), { output: "audit", type: "collection", name: "happ-routing-audit", subscriptionName: "happ-routing-audit", platform: "all", policyOverrides: "e30" });
});
