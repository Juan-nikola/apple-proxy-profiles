import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const nodeBundlePath = new URL("../dist/shadowrocket-node-operator.js", import.meta.url);
const profileBundlePath = new URL("../dist/shadowrocket-profile-generator.js", import.meta.url);
const legacyNodeBundlePath = new URL("../dist/substore-node-operator.js", import.meta.url);
const legacyProfileBundlePath = new URL("../dist/substore-profile-generator.js", import.meta.url);

const nodeArguments = { output: "nodes", clientChain: "off" };
const profileArguments = {
  output: "config",
  type: "collection",
  name: "apple-proxy-shadowrocket",
  subscriptionName: "Shadowrocket-Nodes",
  platform: "macos",
};
const EMPTY_POLICY = { $content: JSON.stringify({ schemaVersion: 2, targets: {} }) };

function loadBundle(source, globals) {
  const lines = [];
  const context = vm.createContext({
    ...globals,
    structuredClone,
    TextDecoder,
    TextEncoder,
    console: { log(value) { lines.push(String(value)); }, info(value) { lines.push(String(value)); } },
  });
  vm.runInContext(source, context, { timeout: 2_000 });
  return { context, lines };
}

function anytlsNode() {
  return {
    name: "AnyTLS landing",
    type: "anytls",
    server: "anytls.example.invalid",
    port: 443,
    password: "TEST_ONLY_ANYTLS_PASSWORD",
    alpn: ["h2"],
    "client-fingerprint": "chrome",
    "idle-session-check-interval": 30,
    "idle-session-timeout": 60,
    "min-idle-session": 1,
    _subName: "[落地] AnyTLS",
  };
}

function unsupportedNodes() {
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

test("Shadowrocket client-prefixed bundles match their legacy compatibility aliases", async () => {
  assert.equal(await readFile(nodeBundlePath, "utf8"), await readFile(legacyNodeBundlePath, "utf8"));
  assert.equal(await readFile(profileBundlePath, "utf8"), await readFile(legacyProfileBundlePath, "utf8"));
});

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

test("node bundle retains labeled AnyTLS fields with client chaining enabled", async () => {
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
    anytlsNode(),
  ], "Shadowrocket");

  assert.deepEqual(Array.from(nodes, (node) => node.type), ["anytls", "ss"]);
  const anytls = Array.from(nodes).find((node) => node.type === "anytls");
  assert.match(anytls.name, / · AnyTLS｜落地$/u);
  assert.deepEqual(Array.from(anytls.alpn), ["h2"]);
  assert.equal(anytls["idle-session-timeout"], 60);
  assert.equal(nodes.some((node) => node?._profile?.chained), false);
  const diagnostics = JSON.parse(lines[0].replace(/^\[shadowrocket-profile\] /, ""));
  assert.equal(diagnostics.accepted, 2);
  assert.equal(diagnostics.excluded["chain-protocol-unsupported"], 1);
});

test("node bundle skips unsupported mixed inventory and reports render-failure counts", async () => {
  const source = await readFile(nodeBundlePath, "utf8");
  const unsupported = unsupportedNodes();
  const cases = [
    [[unsupported[0]], "Shadowrocket cannot render selected protocols: ssh=1"],
    [[unsupported[1]], "Shadowrocket cannot render selected protocols: wireguard=1"],
    [[unsupported[0], unsupported[1]], "Shadowrocket cannot render selected protocols: ssh=1,wireguard=1"],
  ];

  for (const [inventory, expectedMessage] of cases) {
    const { context, lines } = loadBundle(source, {
      $arguments: { output: "nodes", clientChain: "on" },
    });
    let message = "";
    await assert.rejects(context.operator(inventory, "Shadowrocket"), (error) => {
      message = error.message;
      return message === expectedMessage;
    });
    assert.deepEqual(lines, []);
    for (const node of inventory) {
      for (const value of [node.name, node.server, node.password, node["private-key"], node["public-key"]]) {
        if (value !== undefined) assert.equal(message.includes(value), false);
      }
    }
  }

  const { context, lines } = loadBundle(source, {
    $arguments: { output: "nodes", clientChain: "on" },
  });
  const mixed = [anytlsNode(), unsupported[0]];
  const nodes = await context.operator(mixed, "Shadowrocket");
  assert.equal(Array.isArray(nodes), true);
  assert.equal(nodes.length, 1);
  assert.equal(nodes[0].type, "anytls");
  for (const node of unsupported) {
    for (const value of [node.name, node.server, node.password, node["private-key"], node["public-key"]]) {
      if (value !== undefined) assert.equal(JSON.stringify(nodes).includes(value), false);
    }
  }
  assert.equal(lines.length, 1);
  const diagnostics = JSON.parse(lines[0].replace(/^\[shadowrocket-profile\] /, ""));
  assert.deepEqual(diagnostics.renderFailures, { ssh: 1 });
});

test("profile bundle is self-contained and runs with Sub-Store globals", async () => {
  const source = await readFile(profileBundlePath, "utf8");
  assert.match(source, /function operator/);
  assert.match(source, /produceArtifact/);
  assert.match(source, /\$content/);
  assert.doesNotMatch(source, /^\s*(?:import|export)\s/m);

  const inventory = [...Array.from({ length: 25 }, (_, index) => ({
    name: `🇯🇵 Safe ${index + 1}`,
    type: "ss",
    server: "198.51.100.7",
    port: 443,
    cipher: "aes-128-gcm",
    password: "TEST_ONLY_NOT_A_SECRET",
    udp: true,
    _subName: "[机场]示例",
  })), anytlsNode()];
  const calls = [];
  const { context } = loadBundle(source, {
    $arguments: profileArguments,
    async produceArtifact(request) {
      calls.push({ ...request });
      return request.type === "file" ? EMPTY_POLICY : inventory;
    },
  });
  assert.equal(typeof context.ShadowrocketProfileBundle, "object");
  assert.equal(typeof context.operator, "function");
  assert.equal(context.operator.length, 2);
  const result = await context.operator({ url: "https://example.invalid/sub" }, "Shadowrocket");
  assert.deepEqual(calls, [
    { type: "collection", name: "apple-proxy-shadowrocket", platform: "JSON", produceType: "internal" },
    { type: "file", name: "apple-proxy-policy", platform: "JSON", produceType: "internal" },
  ]);
  assert.match(result.$content, /\[General\]/);
  assert.match(result.$content, /\[Proxy Group\]/);
  assert.match(result.$content, /\[Rule\]/);
  assert.match(result.$content, /node-count=2/u);
  assert.doesNotMatch(result.$content, /TEST_ONLY_NOT_A_SECRET|198\.51\.100\.7/);
  assert.match(result.$content, /#proxy=%F0%9F%A7%AD%20DNS%20%E4%B8%8E%E8%A7%84%E5%88%99%E4%B8%8B%E8%BD%BD/);
  assert.doesNotMatch(result.$content, /#proxy=🧭 DNS 与规则下载/);
});
