import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const nodeBundlePath = new URL("../dist/substore-node-operator.js", import.meta.url);
const profileBundlePath = new URL("../dist/substore-profile-generator.js", import.meta.url);

const nodeArguments = { output: "nodes", clientChain: "off" };
const profileArguments = {
  output: "config",
  type: "collection",
  name: "shadowrocket-sources",
  subscriptionName: "Shadowrocket-Nodes",
  platform: "macos",
};

function loadBundle(source, globals) {
  const lines = [];
  const context = vm.createContext({
    ...globals,
    structuredClone,
    console: { log(value) { lines.push(String(value)); }, info(value) { lines.push(String(value)); } },
  });
  vm.runInContext(source, context, { timeout: 2_000 });
  return { context, lines };
}

test("node bundle is self-contained and runs with Sub-Store globals", async () => {
  const source = await readFile(nodeBundlePath, "utf8");
  assert.match(source, /function operator/);
  assert.doesNotMatch(source, /^\s*(?:import|export)\s/m);

  const { context, lines } = loadBundle(source, { $arguments: nodeArguments });
  assert.equal(typeof context.operator, "function");
  const nodes = await context.operator([{
    name: "Safe synthetic node",
    type: "ss",
    server: "198.51.100.7",
    port: 443,
    cipher: "aes-128-gcm",
    password: "TEST_ONLY_NOT_A_SECRET",
    udp: true,
  }], "Shadowrocket");
  assert.equal(Array.isArray(nodes), true);
  assert.equal(nodes.length, 1);
  assert.match(nodes[0].name, /Safe synthetic node/);
  assert.equal(lines.length, 1);
});

test("profile bundle is self-contained and runs with Sub-Store globals", async () => {
  const source = await readFile(profileBundlePath, "utf8");
  assert.match(source, /function operator/);
  assert.match(source, /produceArtifact/);
  assert.match(source, /\$content/);
  assert.doesNotMatch(source, /^\s*(?:import|export)\s/m);

  const inventory = Array.from({ length: 25 }, (_, index) => ({
    name: `Safe ${index + 1}`,
    _sr: { continent: "asiaPacific", sourceKind: "airport", udp: true, p2p: false, entry: true, chained: false },
  }));
  const { context } = loadBundle(source, {
    $arguments: profileArguments,
    async produceArtifact(request) {
      assert.deepEqual({ ...request }, { type: "collection", name: "shadowrocket-sources", platform: "JSON", produceType: "internal" });
      return inventory;
    },
  });
  assert.equal(typeof context.operator, "function");
  const result = await context.operator({ url: "https://example.invalid/sub" }, "Shadowrocket");
  assert.match(result.$content, /\[General\]/);
  assert.match(result.$content, /\[Proxy Group\]/);
  assert.match(result.$content, /\[Rule\]/);
  assert.doesNotMatch(result.$content, /TEST_ONLY_NOT_A_SECRET|198\.51\.100\.7/);
  assert.match(result.$content, /#proxy=%F0%9F%A7%AD%20DNS%20%E4%B8%8E%E8%A7%84%E5%88%99%E4%B8%8B%E8%BD%BD/);
  assert.doesNotMatch(result.$content, /#proxy=🧭 DNS 与规则下载/);
});

