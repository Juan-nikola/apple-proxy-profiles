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
    "apple-proxy-happ",
    "apple-proxy-v2box",
    "apple-proxy-clash",
  ]);
  assert.equal(config.tasks.length, 30);
  assert.equal(config.tasks.filter(({ kind }) => kind === "remote-js").length, 29);
  assert.equal(config.tasks.filter(({ policyInput }) => policyInput === "apple-proxy-policy").length, 23);
  assert.deepEqual(config.tasks.find(({ name }) => name === "anywhere-strategy"), {
    name: "anywhere-strategy",
    client: "anywhere",
    kind: "remote-js",
    url: "https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-strategy-generator.js#output=strategy&type=collection&name=apple-proxy-anywhere&channel=current",
    output: "strategy",
    collection: "apple-proxy-anywhere",
    channel: "current",
    policyInput: "apple-proxy-policy",
  });
  assert.deepEqual(config.tasks.filter(({ name }) => name.startsWith("v2box-")).map(({ name, platform, output }) => [name, platform, output]), [
    ["v2box-nodes", undefined, "nodes"],
    ["v2box-config-iphone", "iphone", "config"],
    ["v2box-config-ipad", "ipad", "config"],
  ]);
  assert.deepEqual(config.tasks.filter(({ name }) => name.startsWith("clash-")).map(({ name, platform, output }) => [name, platform, output]), [
    ["clash-nodes", undefined, "nodes"],
    ["clash-config-macos", "macos", "config"],
    ["clash-config-iphone", "iphone", "config"],
    ["clash-config-ipad", "ipad", "config"],
    ["clash-config-appletv", "appletv", "config"],
  ]);
  assert.deepEqual(config.tasks.filter(({ name }) => name.startsWith("happ-")).map(({ name, platform, output }) => [name, platform, output]), [
    ["happ-config-macos", "macos", "config"],
    ["happ-config-iphone", "iphone", "config"],
    ["happ-config-ipad", "ipad", "config"],
  ]);
  for (const task of config.tasks.filter(({ name }) => name.startsWith("v2box-config-"))) {
    assert.match(task.url, /region=cn/u, task.name);
    assert.match(task.url, /clientChain=off/u, task.name);
    assert.match(task.url, /blockMode=balanced/u, task.name);
    assert.match(task.url, /quicMode=proxy-block/u, task.name);
    assert.doesNotMatch(task.url, /autoGroupMode=/u, task.name);
    assert.match(task.url, /ipv6Mode=ipv4-only/u, task.name);
  }
  for (const task of config.tasks.filter(({ name }) => name.startsWith("clash-config-"))) {
    assert.match(task.url, /nodeSubscriptionUrl=%3CPRIVATE_CLASH_NODES_URL%3E/u, task.name);
    assert.match(task.url, /clientChain=off/u, task.name);
    assert.match(task.url, /blockMode=balanced/u, task.name);
    assert.match(task.url, /quicMode=proxy-block/u, task.name);
    assert.match(task.url, /autoGroupMode=auto/u, task.name);
  }
  for (const task of config.tasks.filter(({ name, output }) => name.startsWith("egern-") && output === "config")) {
    assert.doesNotMatch(task.url, /subscriptionName=/u, task.name);
    assert.match(task.url, /nodeSubscriptionUrl=%3CPRIVATE_EGERN_NODES_URL%3E/u, task.name);
  }
  assert.equal(validatePrivateSubstoreConfig(config), true);
});

test("canonical private task catalog covers retained clients", () => {
  const catalog = canonicalTaskCatalog("current");
  assert.equal(catalog.length, 30);
  assert.deepEqual(catalog.slice(0, 4).map(({ name }) => name), [
    "egern-nodes", "egern-macos", "egern-iphone", "egern-ipad",
  ]);
  assert.deepEqual(catalog.slice(-12).map(({ name }) => name), [
    "apple-proxy-policy",
    "happ-config-macos", "happ-config-iphone", "happ-config-ipad",
    "v2box-nodes",
    "clash-nodes",
    "clash-config-macos",
    "clash-config-iphone",
    "clash-config-ipad",
    "clash-config-appletv",
    "v2box-config-iphone",
    "v2box-config-ipad",
  ]);
  for (const task of catalog.filter(({ name }) => name.startsWith("v2box-"))) {
    assert.match(task.url, /\/\/(?:juan-nikola\.github\.io)\/apple-proxy-profiles\/(?:current)\/v2box\/scripts\//u);
    if (task.output === "config") assert.match(task.url, /region=cn/u);
  }
});

test("binds the shared policy to every config and audit task, never node tasks", () => {
  const catalog = canonicalTaskCatalog("current");
  const policyTasks = catalog.filter(({ output }) => output === "config" || output === "profile" || output === "audit");
  assert.equal(policyTasks.length, 22);
  assert.ok(policyTasks.every((task) => task.policyInput === "apple-proxy-policy"));
  assert.equal(catalog.filter(({ policyInput }) => policyInput === "apple-proxy-policy").length, 23);
  assert.equal(catalog.find(({ name }) => name === "anywhere-strategy").output, "strategy");
  assert.ok(catalog.filter(({ output }) => output === "nodes").every((task) => !Object.hasOwn(task, "policyInput")));
  assert.equal(
    catalog.find(({ name }) => name === "apple-proxy-policy").policySchema,
    "schemaVersion=2; targets=single-layer; channels=edge,current,previous; readers accept schemaVersion=1",
  );
});

test("rejects invalid channel and source URL", () => {
  assert.throws(() => canonicalTaskCatalog("beta"), /channel/u);
  assert.throws(() => buildPrivateSubstoreConfig({ sourceUrl: "http://example.test" }), /https/u);
});
