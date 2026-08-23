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
    "apple-proxy-v2rayn",
    "apple-proxy-v2box",
  ]);
  assert.equal(config.tasks.length, 34);
  assert.equal(config.tasks.filter(({ kind }) => kind === "remote-js").length, 33);
  assert.deepEqual(config.tasks.filter(({ name }) => name.startsWith("happ-") && name !== "happ-routing-audit").map(({ name, platform }) => [name, platform]), [
    ["happ-macos", "macos"],
    ["happ-iphone", "iphone"],
    ["happ-ipad", "ipad"],
    ["happ-android", "android"],
    ["happ-windows", "windows"],
    ["happ-linux", "linux"],
  ]);
  assert.deepEqual(config.tasks.filter(({ name }) => name.startsWith("v2rayn-")).map(({ name, platform, output }) => [name, platform, output]), [
    ["v2rayn-nodes", undefined, "nodes"],
    ["v2rayn-config-windows", "windows", "config"],
    ["v2rayn-config-macos", "macos", "config"],
  ]);
  assert.deepEqual(config.tasks.filter(({ name }) => name.startsWith("v2box-")).map(({ name, platform, output }) => [name, platform, output]), [
    ["v2box-nodes", undefined, "nodes"],
    ["v2box-config-iphone", "iphone", "config"],
    ["v2box-config-ipad", "ipad", "config"],
  ]);
  for (const task of config.tasks.filter(({ name }) => name.startsWith("v2rayn-config-") || name.startsWith("v2box-config-"))) {
    assert.match(task.url, /region=cn/u, task.name);
    assert.match(task.url, /clientChain=off/u, task.name);
    assert.match(task.url, /blockMode=balanced/u, task.name);
    assert.match(task.url, /quicMode=proxy-block/u, task.name);
    assert.doesNotMatch(task.url, /autoGroupMode=/u, task.name);
    assert.match(task.url, task.platform === "macos" ? /ipv6Mode=ipv4-only/u : /ipv6Mode=auto/u, task.name);
  }
  assert.equal(validatePrivateSubstoreConfig(config), true);
});

test("canonical private task catalog covers all HAPP platforms", () => {
  const catalog = canonicalTaskCatalog("current");
  assert.equal(catalog.length, 34);
  assert.deepEqual(catalog.slice(0, 4).map(({ name }) => name), [
    "egern-nodes", "egern-macos", "egern-iphone", "egern-ipad",
  ]);
  assert.deepEqual(catalog.slice(-17).map(({ name }) => name), [
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
    "v2rayn-nodes",
    "v2rayn-config-windows",
    "v2rayn-config-macos",
    "v2box-nodes",
    "v2box-config-iphone",
    "v2box-config-ipad",
  ]);
  for (const task of catalog.filter(({ name }) => name.startsWith("happ-"))) {
    assert.equal(task.channel, "current");
    assert.equal(task.url.includes("/current/happ/scripts/"), true);
    assert.equal(task.url.includes("channel="), false);
  }
  for (const task of catalog.filter(({ name }) => name.startsWith("v2rayn-") || name.startsWith("v2box-"))) {
    assert.match(task.url, /\/\/(?:juan-nikola\.github\.io)\/apple-proxy-profiles\/(?:current)\/(?:v2rayn|v2box)\/scripts\//u);
    if (task.output === "config") assert.match(task.url, /region=cn/u);
  }
});

test("rejects invalid channel and source URL", () => {
  assert.throws(() => canonicalTaskCatalog("beta"), /channel/u);
  assert.throws(() => buildPrivateSubstoreConfig({ sourceUrl: "http://example.test" }), /https/u);
});
