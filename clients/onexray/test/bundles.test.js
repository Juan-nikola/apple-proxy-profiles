import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

import { runOneXrayNodesProcessor } from "../src/substore-nodes-entry.js";
import { runOneXrayProfileProcessor } from "../src/substore-profile-entry.js";

const NODE_BUNDLE = new URL("../dist/onexray-nodes-generator.js", import.meta.url);
const NODE_ALIAS = new URL("../dist/substore-nodes-generator.js", import.meta.url);
const PROFILE_BUNDLE = new URL("../dist/onexray-profile-generator.js", import.meta.url);
const PROFILE_ALIAS = new URL("../dist/substore-profile-generator.js", import.meta.url);
const BUILD_SCRIPT = new URL("../scripts/build.mjs", import.meta.url);

const UUID = "00000000-0000-4000-8000-000000000001";
const NODE_ARGUMENTS = Object.freeze({ output: "nodes", type: "collection", name: "fixture-source" });
const PROFILE_ARGUMENTS = Object.freeze({ output: "profile", type: "collection", name: "fixture-source" });

function inventory() {
  return [{
    name: "Fixture node",
    type: "vless",
    server: "198.51.100.10",
    port: 443,
    uuid: UUID,
    network: "raw",
    _subName: "[fixture]",
  }];
}

function loadBundle(source, arguments_, produced = inventory(), onProduce) {
  const requests = [];
  const lines = [];
  const context = vm.createContext({
    TextEncoder,
    Uint8Array,
    DataView,
    URL,
    console: {
      info(value) { lines.push(String(value)); },
      log(value) { lines.push(String(value)); },
    },
  });
  context.__argumentsJson = JSON.stringify(arguments_);
  context.__producedJson = JSON.stringify(produced);
  context.produceArtifact = async (request) => {
    requests.push(structuredClone(request));
    onProduce?.(context);
    return vm.runInContext("JSON.parse(globalThis.__producedJson)", context);
  };
  vm.runInContext([
    "globalThis.$arguments = JSON.parse(globalThis.__argumentsJson);",
    "globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));",
    "delete globalThis.__argumentsJson;",
  ].join("\n"), context);
  vm.runInContext(source, context, { timeout: 2_000 });
  return { context, requests, lines };
}

test("OneXray client aliases are byte-identical", async () => {
  assert.equal(await readFile(NODE_BUNDLE, "utf8"), await readFile(NODE_ALIAS, "utf8"));
  assert.equal(await readFile(PROFILE_BUNDLE, "utf8"), await readFile(PROFILE_ALIAS, "utf8"));
});

test("OneXray bundles are browser/IIFE programs with no Node-only surface", async () => {
  for (const [url, globalName] of [
    [NODE_BUNDLE, "OneXrayNodesBundle"],
    [PROFILE_BUNDLE, "OneXrayProfileBundle"],
  ]) {
    const source = await readFile(url, "utf8");
    assert.match(source, new RegExp(`^var ${globalName} = \\(\\(\\) => \\{`, "u"));
    assert.doesNotMatch(source, /^\s*(?:import|export)\s/mu);
    assert.doesNotMatch(source, /\b(?:node:|process\b|Buffer\b|require\s*\(|dynamicImport)\b/u);
    assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/u);
    assert.doesNotMatch(source, /\/Users\/|\\\\Users\\\\|[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:/u);
    assert.equal(source.includes("\r"), false);
    assert.equal(source.endsWith("\n"), true);
    assert.match(source, /async function operator\(input, targetPlatform\)/u);
    const loaded = loadBundle(source, globalName === "OneXrayNodesBundle" ? NODE_ARGUMENTS : PROFILE_ARGUMENTS);
    assert.equal(typeof loaded.context[globalName], "object");
    assert.equal(typeof loaded.context.operator, "function");
    assert.equal(loaded.context.operator.length, 2);
  }
});

test("node bundle matches the pure processor and keeps Sub-Store request framing", async () => {
  const source = await readFile(NODE_BUNDLE, "utf8");
  const loaded = loadBundle(source, NODE_ARGUMENTS);
  const actual = await loaded.context.operator({ unchanged: true }, "OneXray");
  const expected = runOneXrayNodesProcessor({ proxies: inventory(), arguments: NODE_ARGUMENTS });
  assert.equal(actual.unchanged, true);
  assert.equal(actual.$content, expected);
  assert.deepEqual(loaded.requests, [{
    type: "collection",
    name: "fixture-source",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.equal(actual.$content.endsWith("\n"), true);
  assert.equal(loaded.lines.length, 1);
});

test("profile bundle matches the pure processor and returns one deep-link line", async () => {
  const source = await readFile(PROFILE_BUNDLE, "utf8");
  const loaded = loadBundle(source, PROFILE_ARGUMENTS);
  const actual = await loaded.context.operator({ unchanged: true }, "OneXray");
  const expected = runOneXrayProfileProcessor({ proxies: inventory(), arguments: PROFILE_ARGUMENTS });
  assert.equal(actual.unchanged, true);
  assert.equal(actual.$content, expected);
  assert.match(actual.$content, /^onexray:\/\/onexray\.com\/config\/add\?type=profile&data=.+\n$/u);
  assert.equal(loaded.requests.length, 1);
  assert.equal(loaded.lines.length, 0);
});

test("bundles snapshot own arguments before awaiting a mutable Sub-Store producer", async () => {
  const source = await readFile(NODE_BUNDLE, "utf8");
  const loaded = loadBundle(source, NODE_ARGUMENTS, inventory(), (context) => {
    vm.runInContext(`
      globalThis.$arguments.output = "profile";
      globalThis.$arguments.type = "not-a-collection";
      globalThis.$arguments.name = "MUTATED_PRIVATE_ARGUMENT";
      globalThis.$arguments = { output: "profile", type: "collection", name: "replacement" };
    `, context);
  });
  const actual = await loaded.context.operator({ unchanged: true }, "OneXray");
  assert.equal(typeof actual.$content, "string");
  assert.equal(loaded.requests[0].name, "fixture-source");
  assert.equal(actual.$content.includes("MUTATED_PRIVATE_ARGUMENT"), false);
});

test("bundles preserve stable processor failures without leaking inventory values", async () => {
  const privateName = "PRIVATE_BUNDLE_NODE_NAME";
  const privateSecret = "PRIVATE_BUNDLE_NODE_SECRET";
  const produced = [{
    name: privateName,
    type: "snell",
    server: "192.0.2.20",
    port: 443,
    psk: privateSecret,
    version: 4,
  }];
  const node = loadBundle(await readFile(NODE_BUNDLE, "utf8"), NODE_ARGUMENTS, produced);
  await assert.rejects(
    node.context.operator({}, "OneXray"),
    (error) => {
      assert.equal(error.message, "OneXray nodes: no-compatible-nodes; excluded counts: unsupported-onexray-protocol=1");
      assert.equal(error.message.includes(privateName), false);
      assert.equal(error.message.includes(privateSecret), false);
      return true;
    },
  );
  const profile = loadBundle(await readFile(PROFILE_BUNDLE, "utf8"), PROFILE_ARGUMENTS, produced);
  await assert.rejects(profile.context.operator({}, "OneXray"), { message: "OneXray profile: no-compatible-nodes" });
});

test("OneXray bundle output is byte-deterministic across rebuilds", async () => {
  const before = await Promise.all([NODE_BUNDLE, NODE_ALIAS, PROFILE_BUNDLE, PROFILE_ALIAS].map((url) => readFile(url)));
  const first = spawnSync(process.execPath, [fileURLToPath(BUILD_SCRIPT)], { encoding: "utf8" });
  assert.equal(first.status, 0, first.stderr);
  const middle = await Promise.all([NODE_BUNDLE, NODE_ALIAS, PROFILE_BUNDLE, PROFILE_ALIAS].map((url) => readFile(url)));
  const second = spawnSync(process.execPath, [fileURLToPath(BUILD_SCRIPT)], { encoding: "utf8" });
  assert.equal(second.status, 0, second.stderr);
  const after = await Promise.all([NODE_BUNDLE, NODE_ALIAS, PROFILE_BUNDLE, PROFILE_ALIAS].map((url) => readFile(url)));
  assert.deepEqual(middle, before);
  assert.deepEqual(after, middle);
  assert.deepEqual(middle[0], middle[1]);
  assert.deepEqual(middle[2], middle[3]);
});
