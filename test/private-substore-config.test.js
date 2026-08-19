import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrivateSubstoreConfig,
  canonicalTaskCatalog,
  validatePrivateSubstoreConfig,
} from "../scripts/configure-substore.mjs";

test("builds a private Sub-Store config without exposing the source value", () => {
  const sourceUrl = "https://substore.example.test/subs?api=synthetic-private-key";
  const config = buildPrivateSubstoreConfig({ sourceUrl, channel: "current" });
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.sourceUrl, sourceUrl);
  assert.deepEqual(config.collections, [
    "apple-proxy-all",
    "apple-proxy-egern",
    "apple-proxy-anywhere",
    "apple-proxy-shadowrocket",
    "apple-proxy-surge",
    "apple-proxy-singbox",
    "apple-proxy-onexray",
    "apple-proxy-happ",
  ]);
  assert.equal(config.tasks.length, 28);
  assert.equal(config.tasks.filter(({ kind }) => kind === "remote-js").length, 27);
  assert.deepEqual(config.tasks.filter(({ name }) => name.startsWith("happ-") && name !== "happ-routing-audit").map(({ name, platform }) => [name, platform]), [
    ["happ-macos", "macos"],
    ["happ-iphone", "iphone"],
    ["happ-ipad", "ipad"],
    ["happ-android", "android"],
    ["happ-windows", "windows"],
    ["happ-linux", "linux"],
  ]);
  assert.equal(validatePrivateSubstoreConfig(config), true);
});

test("canonical private task catalog covers all HAPP platforms", () => {
  const catalog = canonicalTaskCatalog("current");
  assert.equal(catalog.length, 28);
  assert.deepEqual(catalog.slice(0, 4).map(({ name }) => name), [
    "egern-nodes", "egern-macos", "egern-iphone", "egern-ipad",
  ]);
  assert.deepEqual(catalog.slice(-11).map(({ name }) => name), [
    "apple-proxy-policy",
    "onexray-nodes",
    "onexray-profile",
    "onexray-routing-audit",
    "happ-macos",
    "happ-iphone",
    "happ-ipad",
    "happ-android",
    "happ-windows",
    "happ-linux",
    "happ-routing-audit",
  ]);
});

test("rejects invalid channel and source URL", () => {
  assert.throws(() => canonicalTaskCatalog("beta"), /channel/u);
  assert.throws(() => buildPrivateSubstoreConfig({ sourceUrl: "http://example.test" }), /https/u);
});
