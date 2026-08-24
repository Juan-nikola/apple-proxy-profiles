import assert from "node:assert/strict";
import test from "node:test";
import { operator as nodesOperator } from "../src/substore-node-entry.js";
import { operator as configOperator } from "../src/substore-config-entry.js";
import { renderV2BoxAssetManifest } from "../src/render-assets.js";

test("V2Box node operator uses internal JSON artifact contract", async () => {
  const result = await nodesOperator({}, "JSON", { arguments: { output: "nodes", type: "collection", name: "fixture", platform: "iphone" }, produceArtifact: async (request) => { assert.deepEqual(request, { type: "collection", name: "fixture", platform: "JSON", produceType: "internal" }); return [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }]; } });
  const subscription = JSON.parse(result.$content);
  assert.equal(subscription.outbounds.length, 1);
  assert.equal(Object.hasOwn(subscription.outbounds[0], "name"), false);
  assert.match(result.$content, /\n$/u);
});

test("operators enforce mobile platform but accept JSON artifact targets", async () => {
  const args = { output: "nodes", type: "collection", name: "fixture", platform: "iphone" };
  await assert.rejects(() => nodesOperator({}, "ipad", { arguments: args, produceArtifact: async () => [] }), /target platform/u);
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
    arguments: { output: "config", type: "collection", name: "fixture", platform: "ipad" },
    produceArtifact: async () => [{ name: "bad", type: "future-proto", server: "fixture.invalid", port: 443 }],
  });
  const profile = JSON.parse(result.$content);
  assert.deepEqual(profile.outbounds.map(({ tag }) => tag), ["direct", "block"]);
  assert.equal(profile.routing.rules.at(-1).outboundTag, "block");
  assert.equal(Object.values(profile.renderFailures)[0], 1);
});

test("config operator accepts the platform omitted by Sub-Store File processing", async () => {
  const result = await configOperator({}, undefined, {
    arguments: { output: "config", type: "collection", name: "fixture", platform: "iphone" },
    produceArtifact: async () => [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }],
  });
  assert.equal(JSON.parse(result.$content).outbounds.length, 4);
});

test("config operator propagates malformed GeoData instead of hiding it", async () => {
  await assert.rejects(() => configOperator({}, "JSON", {
    arguments: { output: "config", type: "collection", name: "fixture", platform: "iphone" },
    produceArtifact: async () => [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }],
    assetManifest: { region: "cn", channel: "edge", names: {}, hashes: {}, geosite: {}, geoip: {} },
  }), /asset manifest/u);
});

test("config operator forwards the validated asset manifest", async () => {
  const assetManifest = renderV2BoxAssetManifest({ region: "cn", channel: "edge", geositeSha256: "a".repeat(64), geoipSha256: "b".repeat(64) });
  const result = await configOperator({}, "JSON", {
    arguments: { output: "config", type: "collection", name: "fixture", platform: "iphone", region: "cn", channel: "edge" },
    assetManifest,
    produceArtifact: async () => [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }],
  });
  const profile = JSON.parse(result.$content);
  assert.equal(profile.assets.geosite.url, assetManifest.geosite.url);
  assert.equal(profile.assets.geoip.sha256, assetManifest.geoip.sha256);
});
