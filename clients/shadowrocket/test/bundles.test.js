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

function egernOnlyNodes() {
  return [
    {
      name: "SSH landing",
      type: "ssh",
      server: "ssh.example.invalid",
      port: 22,
      username: "TEST_ONLY_SSH_USERNAME",
      password: "TEST_ONLY_SSH_PASSWORD",
      _subName: "[落地] SSH",
    },
    {
      name: "AnyTLS landing",
      type: "anytls",
      server: "anytls.example.invalid",
      port: 443,
      password: "TEST_ONLY_ANYTLS_PASSWORD",
      _subName: "[落地] AnyTLS",
    },
    {
      name: "WireGuard landing",
      type: "wireguard",
      server: "wireguard.example.invalid",
      port: 443,
      "private-key": "TEST_ONLY_WIREGUARD_PRIVATE_KEY",
      "public-key": "TEST_ONLY_WIREGUARD_PUBLIC_KEY",
      ip: "192.0.2.23/32",
      _subName: "[落地] WireGuard",
    },
  ];
}

test("node bundle is self-contained and runs with Sub-Store globals", async () => {
  const source = await readFile(nodeBundlePath, "utf8");
  assert.match(source, /function operator/);
  assert.doesNotMatch(source, /^\s*(?:import|export)\s/m);

  const { context, lines } = loadBundle(source, { $arguments: nodeArguments });
  assert.equal(typeof context.ShadowrocketNodeBundle, "object");
  assert.equal(typeof context.operator, "function");
  assert.equal(context.operator.length, 2);
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

test("node bundle excludes Egern-only nodes with client chaining enabled", async () => {
  const source = await readFile(nodeBundlePath, "utf8");
  const { context, lines } = loadBundle(source, {
    $arguments: { output: "nodes", clientChain: "on" },
  });
  const nodes = await context.operator([
    {
      name: "Supported entry",
      type: "ss",
      server: "entry.example.invalid",
      port: 443,
      cipher: "aes-128-gcm",
      password: "TEST_ONLY_ENTRY_PASSWORD",
      _subName: "[自建] Entry",
    },
    ...egernOnlyNodes(),
  ], "Shadowrocket");

  assert.deepEqual(Array.from(nodes, (node) => node.type), ["ss"]);
  assert.equal(nodes.some((node) => node?._profile?.chained), false);
  const diagnostics = JSON.parse(lines[0].replace(/^\[shadowrocket-profile\] /, ""));
  assert.equal(diagnostics.accepted, 1);
  assert.equal(diagnostics.excluded["unsupported-protocol"], 3);
});

test("node bundle fails closed without diagnostics for all-Egern inventories", async () => {
  const source = await readFile(nodeBundlePath, "utf8");
  const unsupported = egernOnlyNodes();
  const inventories = [...unsupported.map((node) => [node]), [unsupported[0], unsupported[1], unsupported[2]]];

  for (const inventory of inventories) {
    const { context, lines } = loadBundle(source, {
      $arguments: { output: "nodes", clientChain: "on" },
    });
    let message = "";
    await assert.rejects(context.operator(inventory, "Shadowrocket"), (error) => {
      message = error.message;
      return message === "No compatible Shadowrocket nodes";
    });
    assert.deepEqual(lines, []);
    for (const node of inventory) {
      for (const value of [node.name, node.server, node.password, node["private-key"], node["public-key"]]) {
        if (value !== undefined) assert.equal(message.includes(value), false);
      }
    }
  }
});

test("profile bundle is self-contained and runs with Sub-Store globals", async () => {
  const source = await readFile(profileBundlePath, "utf8");
  assert.match(source, /function operator/);
  assert.match(source, /produceArtifact/);
  assert.match(source, /\$content/);
  assert.doesNotMatch(source, /^\s*(?:import|export)\s/m);

  const inventory = Array.from({ length: 25 }, (_, index) => ({
    name: `Safe ${index + 1}`,
    _profile: { continent: "asiaPacific", sourceKind: "airport", udp: true, p2p: false, entry: true, chained: false },
  }));
  const { context } = loadBundle(source, {
    $arguments: profileArguments,
    async produceArtifact(request) {
      assert.deepEqual({ ...request }, { type: "collection", name: "shadowrocket-sources", platform: "JSON", produceType: "internal" });
      return inventory;
    },
  });
  assert.equal(typeof context.ShadowrocketProfileBundle, "object");
  assert.equal(typeof context.operator, "function");
  assert.equal(context.operator.length, 2);
  const result = await context.operator({ url: "https://example.invalid/sub" }, "Shadowrocket");
  assert.match(result.$content, /\[General\]/);
  assert.match(result.$content, /\[Proxy Group\]/);
  assert.match(result.$content, /\[Rule\]/);
  assert.doesNotMatch(result.$content, /TEST_ONLY_NOT_A_SECRET|198\.51\.100\.7/);
  assert.match(result.$content, /#proxy=%F0%9F%A7%AD%20DNS%20%E4%B8%8E%E8%A7%84%E5%88%99%E4%B8%8B%E8%BD%BD/);
  assert.doesNotMatch(result.$content, /#proxy=🧭 DNS 与规则下载/);
});
