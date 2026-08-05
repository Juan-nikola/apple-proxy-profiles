import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

import { operator as sourceOperator } from "../src/substore-nodes-entry.js";

const BUNDLE = new URL("../dist/anywhere-node-generator.js", import.meta.url);
const LEGACY_BUNDLE = new URL("../dist/substore-node-generator.js", import.meta.url);
const BUILD = new URL("../scripts/build.mjs", import.meta.url);
const ARGUMENTS = { output: "nodes", type: "collection", name: "apple-proxy-sources", clientChain: "off" };

function inventory() {
  return [{
    name: "Tokyo SS",
    type: "ss",
    server: "198.51.100.31",
    port: 443,
    cipher: "aes-128-gcm",
    password: "TEST_ONLY_ANYWHERE_BUNDLE_PASSWORD",
    _subName: "[自建] Tokyo",
  }];
}

test("Anywhere client-prefixed bundle matches the legacy compatibility alias", async () => {
  assert.equal(await readFile(BUNDLE, "utf8"), await readFile(LEGACY_BUNDLE, "utf8"));
});

function loadBundle(source, { restricted = false, produced = inventory(), onProduce } = {}) {
  const lines = [];
  const requests = [];
  const context = vm.createContext({
    console: { info(value) { lines.push(String(value)); }, log(value) { lines.push(String(value)); } },
  });
  context.__argumentsJson = JSON.stringify(ARGUMENTS);
  context.__producedJson = JSON.stringify(produced);
  context.__request = (request) => requests.push({ ...request });
  context.__onProduce = () => onProduce?.(context);
  vm.runInContext([
    "{",
    "  const produced = JSON.parse(globalThis.__producedJson);",
    "  const recordRequest = globalThis.__request;",
    "  const producerHook = globalThis.__onProduce;",
    "  globalThis.$arguments = JSON.parse(globalThis.__argumentsJson);",
    "  globalThis.produceArtifact = async (request) => { recordRequest(request); producerHook(); return produced; };",
    "}",
    restricted ? "delete globalThis.structuredClone;" : "globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));",
    "delete globalThis.__argumentsJson; delete globalThis.__producedJson; delete globalThis.__request; delete globalThis.__onProduce;",
  ].join("\n"), context);
  vm.runInContext(source, context, { timeout: 2_000 });
  return { context, lines, requests };
}

async function sourceRun() {
  const lines = [];
  const requests = [];
  const result = await sourceOperator({}, "Anywhere", {
    arguments: ARGUMENTS,
    async produceArtifact(request) { requests.push(request); return structuredClone(inventory()); },
    logger: { info(line) { lines.push(line); } },
  });
  return { result, lines, requests };
}

test("Anywhere bundle is a self-contained exact two-argument IIFE", async () => {
  const source = await readFile(BUNDLE, "utf8");
  assert.match(source, /^var AnywhereNodeBundle = \(\(\) => \{/u);
  assert.doesNotMatch(source, /^\s*(?:import|export)\s/mu);
  assert.doesNotMatch(source, /\bprocess\b|\bnode:|\brequire\s*\(/u);
  assert.doesNotMatch(source, /\beval\s*\(|\bFunction\s*\(/u);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/u);
  assert.doesNotMatch(source, /\/Users\/|\\Users\\|TEST_ONLY_ANYWHERE_BUNDLE_PASSWORD/u);
  assert.doesNotMatch(source, /[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:/u);
  assert.equal(source.includes("\r"), false);
  const wrapper = "\nasync function operator(input, targetPlatform) {\n  return AnywhereNodeBundle.operator(input, targetPlatform, { arguments: $arguments, produceArtifact, logger: console });\n}\n";
  assert.equal(source.endsWith(wrapper), true);
  const loaded = loadBundle(source);
  assert.equal(typeof loaded.context.operator, "function");
  assert.equal(loaded.context.operator.length, 2);
});

test("restricted Anywhere bundle keeps the pre-await argument snapshot", async () => {
  const source = await readFile(BUNDLE, "utf8");
  const hostileMarker = "TEST_ONLY_MUTATED_BUNDLE_ARGUMENT";
  const loaded = loadBundle(source, {
    restricted: true,
    onProduce(context) {
      vm.runInContext(`
        globalThis.$arguments.name = "${hostileMarker}";
        globalThis.$arguments.clientChain = "on";
        globalThis.$arguments = { output: "config", type: "subscription", name: "${hostileMarker}", clientChain: "on" };
      `, context);
    },
  });
  const result = await vm.runInContext('operator({}, "Anywhere")', loaded.context);
  assert.match(result.$content, /^proxies:\n/u);
  assert.deepEqual(loaded.requests, [{
    type: "collection",
    name: "apple-proxy-sources",
    platform: "JSON",
    produceType: "internal",
  }]);
  assert.equal(result.$content.includes(hostileMarker), false);
  assert.equal(loaded.lines.some((line) => line.includes(hostileMarker)), false);
});

test("restricted Anywhere bundle renders every admitted protocol together", async () => {
  const source = await readFile(BUNDLE, "utf8");
  const common = { server: "protocol.example.invalid", port: 443 };
  const produced = [
    { ...common, name: "VLESS", type: "vless", uuid: "00000000-0000-4000-8000-000000000001" },
    { ...common, name: "Hysteria", type: "hysteria2", network: "quic", password: "TEST_ONLY_HY2" },
    { ...common, name: "Trojan", type: "trojan", password: "TEST_ONLY_TROJAN" },
    { ...common, name: "AnyTLS", type: "anytls", password: "TEST_ONLY_ANYTLS" },
    { ...common, name: "SS", type: "ss", cipher: "aes-128-gcm", password: "TEST_ONLY_SS" },
    { ...common, name: "SOCKS", type: "socks5" },
    { ...common, name: "Sudoku", type: "sudoku", key: "TEST_ONLY_SUDOKU" },
  ];
  const loaded = loadBundle(source, { restricted: true, produced });
  const result = await vm.runInContext('operator({}, "Anywhere")', loaded.context);
  for (const type of ["vless", "hysteria2", "trojan", "anytls", "ss", "socks5", "sudoku"]) {
    assert.match(result.$content, new RegExp(`type: "${type}"`, "u"));
  }
  assert.equal(loaded.requests.length, 1);
  assert.equal(loaded.lines.length, 1);
});

test("Anywhere bundle matches source in normal and restricted runtimes", async () => {
  const source = await readFile(BUNDLE, "utf8");
  const expected = await sourceRun();
  for (const restricted of [false, true]) {
    const loaded = loadBundle(source, { restricted });
    const actual = await vm.runInContext('operator({}, "Anywhere")', loaded.context);
    assert.equal(actual.$content, expected.result.$content);
    assert.deepEqual(loaded.lines, expected.lines);
    assert.deepEqual(loaded.requests, expected.requests);
    assert.match(actual.$content, /^proxies:\n/u);
  }
});

test("Anywhere bundle build is byte deterministic", async () => {
  const before = await readFile(BUNDLE);
  const result = spawnSync(process.execPath, [fileURLToPath(BUILD)], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const middle = await readFile(BUNDLE);
  assert.deepEqual(await readFile(LEGACY_BUNDLE), middle);
  const repeated = spawnSync(process.execPath, [fileURLToPath(BUILD)], { encoding: "utf8" });
  assert.equal(repeated.status, 0, repeated.stderr);
  const after = await readFile(BUNDLE);
  assert.deepEqual(await readFile(LEGACY_BUNDLE), after);
  assert.deepEqual(middle, before);
  assert.deepEqual(after, middle);
});
