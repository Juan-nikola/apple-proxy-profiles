import assert from "node:assert/strict";
import test from "node:test";
import { operator as nodesOperator } from "../src/substore-node-entry.js";
import { operator as configOperator } from "../src/substore-config-entry.js";

const EMPTY_POLICY = { $content: JSON.stringify({ schemaVersion: 2, targets: {} }) };

test("v2rayN node operator uses internal JSON artifact contract", async () => {
  const result = await nodesOperator({}, "JSON", { arguments: { output: "nodes", type: "collection", name: "fixture", platform: "windows" }, produceArtifact: async (request) => { assert.deepEqual(request, { type: "collection", name: "fixture", platform: "JSON", produceType: "internal" }); return [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }]; } });
  const decoded = Buffer.from(result.$content.trim(), "base64").toString("utf8");
  assert.match(decoded, /^vless:\/\/TEST_ONLY_UUID@fixture\.invalid:443\?/u);
  assert.match(decoded, /#%F0%9F%8C%90%20fixture%20%C2%B7%20VLESS$/u);
  assert.match(result.$content, /\n$/u);
});

test("operators enforce configured platform but accept JSON artifact targets", async () => {
  const args = { output: "nodes", type: "collection", name: "fixture", platform: "windows" };
  await assert.rejects(() => nodesOperator({}, "macos", { arguments: args, produceArtifact: async () => [] }), /target platform/u);
  const logs = [];
  const result = await nodesOperator({}, "JSON", { arguments: args, logger: { info: (line) => logs.push(line) }, produceArtifact: async () => [
    { name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" },
    { name: "future", type: "future-proto", server: "fixture.invalid", port: 443 },
  ] });
  assert.ok(result.$content);
  assert.match(logs[0], /renderFailures/iu);
});

test("config operator returns parseable fail-closed diagnostics for an incompatible inventory", async () => {
  const result = await configOperator({}, "JSON", {
    arguments: { output: "config", type: "collection", name: "fixture", platform: "macos" },
    produceArtifact: async (request) => request.type === "file"
      ? EMPTY_POLICY
      : [{ name: "bad", type: "future-proto", server: "fixture.invalid", port: 443 }],
  });
  const profile = JSON.parse(result.$content);
  assert.deepEqual(profile.outbounds.map(({ tag }) => tag), ["direct", "block"]);
  assert.equal(profile.routing.rules.at(-1).outboundTag, "block");
  assert.equal(profile.renderFailures["unsupported-v2rayn-protocol"], 1);
});

test("config operator accepts the platform omitted by Sub-Store File processing", async () => {
  const result = await configOperator({}, undefined, {
    arguments: { output: "config", type: "collection", name: "fixture", platform: "windows" },
    produceArtifact: async (request) => request.type === "file"
      ? EMPTY_POLICY
      : [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }],
  });
  assert.equal(JSON.parse(result.$content).outbounds.length, 3);
});

test("config operator propagates malformed GeoData instead of hiding it", async () => {
  await assert.rejects(() => configOperator({}, "JSON", {
    arguments: { output: "config", type: "collection", name: "fixture", platform: "windows" },
    produceArtifact: async (request) => request.type === "file"
      ? EMPTY_POLICY
      : [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }],
    geoData: { manifest: { schemaVersion: 1, region: "windows", channel: "current" } },
  }), /GeoData/u);
});
