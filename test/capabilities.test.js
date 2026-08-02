import test from "node:test";
import assert from "node:assert/strict";
import { CLIENT } from "../shared/contracts.js";
import { evaluateNodeForClient, filterNodesForClient } from "../shared/nodes/capabilities.js";

const ALLOWED_PROTOCOLS = Object.freeze({
  [CLIENT.shadowrocket]: ["ss", "shadowsocks", "ssr", "snell", "vmess", "vless", "trojan", "hysteria2", "hy2", "tuic", "socks5", "http"],
  [CLIENT.egern]: ["ss", "shadowsocks", "snell", "vmess", "vless", "trojan", "anytls", "hysteria2", "hy2", "tuic", "socks5", "http", "wireguard"],
  [CLIENT.anywhere]: ["ss", "shadowsocks", "vless", "trojan", "anytls", "hysteria2", "hy2", "socks5", "sudoku"],
});

const ALL_PROTOCOLS = [...new Set(Object.values(ALLOWED_PROTOCOLS).flat())];

function nodeForCapability(protocol, client) {
  if (client === CLIENT.anywhere && protocol === "vless") return { type: protocol, network: "tcp" };
  if (client === CLIENT.anywhere && protocol === "trojan") return { type: protocol, network: "tcp" };
  return { type: protocol };
}

test("enforces the complete client protocol contracts including aliases", () => {
  for (const [client, allowed] of Object.entries(ALLOWED_PROTOCOLS)) {
    for (const protocol of ALL_PROTOCOLS) {
      assert.deepEqual(
        evaluateNodeForClient(nodeForCapability(protocol, client), client),
        allowed.includes(protocol)
          ? { supported: true, reason: null }
          : { supported: false, reason: "unsupported-protocol" },
        `${client} ${protocol}`,
      );
    }
  }

  assert.deepEqual(evaluateNodeForClient({ type: " SS " }, CLIENT.shadowrocket), { supported: true, reason: null });
  assert.deepEqual(evaluateNodeForClient({ type: "SNELL" }, CLIENT.anywhere), { supported: false, reason: "unsupported-protocol" });
  assert.deepEqual(evaluateNodeForClient({ type: "ss" }, "unknown-client"), { supported: false, reason: "unsupported-client" });
});

test("allows only verified Anywhere transports and Shadowsocks forms", () => {
  assert.deepEqual(evaluateNodeForClient({ type: "vless", network: "tcp" }, CLIENT.anywhere), { supported: true, reason: null });
  assert.deepEqual(evaluateNodeForClient({ type: "vless", network: "ws" }, CLIENT.anywhere), { supported: true, reason: null });
  assert.deepEqual(evaluateNodeForClient({ type: "vless" }, CLIENT.anywhere), { supported: false, reason: "unsupported-vless-network" });
  assert.deepEqual(evaluateNodeForClient({ type: "trojan", network: "tcp" }, CLIENT.anywhere), { supported: true, reason: null });
  assert.deepEqual(evaluateNodeForClient({ type: "trojan", network: "tcp", "grpc-opts": {} }, CLIENT.anywhere), { supported: false, reason: "unsupported-trojan-transport" });
  assert.deepEqual(evaluateNodeForClient({ type: "trojan", network: "tcp", "reality-opts": {} }, CLIENT.anywhere), { supported: false, reason: "unsupported-trojan-transport" });
  assert.deepEqual(evaluateNodeForClient({ type: "trojan", network: "tcp", "ss-opts": { enabled: true } }, CLIENT.anywhere), { supported: false, reason: "unsupported-trojan-transport" });
  assert.deepEqual(evaluateNodeForClient({ type: "ss", plugin: "v2ray-plugin" }, CLIENT.anywhere), { supported: false, reason: "unsupported-shadowsocks-plugin" });
});

test("normalizes valid nodes before applying AnyTLS and WireGuard client capabilities", async () => {
  const { normalizeNodes } = await import("../shared/nodes/normalize-nodes.js");
  const common = { server: "integration.example.invalid", port: 443 };
  const nodes = [
    {
      ...common,
      name: "SAFE_BASE_NODE",
      type: "ss",
      cipher: "aes-128-gcm",
      password: "TEST_ONLY_BASE_PASSWORD",
    },
    {
      ...common,
      name: "VALID_ANYTLS_NODE",
      type: "anytls",
      password: "TEST_ONLY_ANYTLS_PASSWORD",
      sni: "tls.example.invalid",
    },
    {
      ...common,
      name: "INVALID_ANYTLS_NODE",
      type: "anytls",
    },
    {
      ...common,
      name: "VALID_WIREGUARD_NODE",
      type: "wireguard",
      "private-key": "TEST_ONLY_WIREGUARD_PRIVATE_KEY",
      "public-key": "TEST_ONLY_WIREGUARD_PUBLIC_KEY",
    },
    {
      ...common,
      name: "INVALID_WIREGUARD_NODE",
      type: "wireguard",
      "private-key": "TEST_ONLY_INCOMPLETE_PRIVATE_KEY",
    },
  ];

  const normalized = normalizeNodes(nodes);
  assert.deepEqual(normalized.nodes.map((node) => node.type).sort(), ["anytls", "ss", "wireguard"]);
  assert.equal(normalized.diagnostics.excluded["missing-auth"], 2);

  assert.deepEqual(
    filterNodesForClient(normalized.nodes, CLIENT.shadowrocket).nodes.map((node) => node.type),
    ["ss"],
  );
  assert.deepEqual(
    filterNodesForClient(normalized.nodes, CLIENT.egern).nodes.map((node) => node.type).sort(),
    ["anytls", "ss", "wireguard"],
  );
  assert.deepEqual(
    filterNodesForClient(normalized.nodes, CLIENT.anywhere).nodes.map((node) => node.type).sort(),
    ["anytls", "ss"],
  );

  const diagnosticsJson = JSON.stringify(normalized.diagnostics);
  for (const node of nodes) {
    assert.equal(diagnosticsJson.includes(node.name), false);
    assert.equal(diagnosticsJson.includes(node.server), false);
    for (const value of [node.password, node["private-key"], node["public-key"]]) {
      if (value) assert.equal(diagnosticsJson.includes(value), false);
    }
  }
});

test("reports only accepted and excluded counts for client filtering", () => {
  const accepted = {
    name: "COUNT_SAFE_ACCEPTED_NODE",
    type: "vless",
    network: "tcp",
    server: "accepted.example.invalid",
    password: "TEST_ONLY_ACCEPTED_PASSWORD",
  };
  const excludedProtocol = {
    name: "COUNT_SAFE_EXCLUDED_PROTOCOL",
    type: "snell",
    server: "excluded-protocol.example.invalid",
    password: "TEST_ONLY_EXCLUDED_PROTOCOL_PASSWORD",
  };
  const excludedTransport = {
    name: "COUNT_SAFE_EXCLUDED_TRANSPORT",
    type: "trojan",
    network: "ws",
    server: "excluded-transport.example.invalid",
    password: "TEST_ONLY_EXCLUDED_TRANSPORT_PASSWORD",
  };

  const result = filterNodesForClient(
    [accepted, excludedProtocol, excludedTransport],
    CLIENT.anywhere,
  );

  assert.deepEqual(result.nodes, [accepted]);
  assert.deepEqual(result.diagnostics, {
    accepted: 1,
    excluded: {
      "unsupported-protocol": 1,
      "unsupported-trojan-transport": 1,
    },
  });
  const diagnosticsJson = JSON.stringify(result.diagnostics);
  for (const node of [accepted, excludedProtocol, excludedTransport]) {
    assert.equal(diagnosticsJson.includes(node.name), false);
    assert.equal(diagnosticsJson.includes(node.server), false);
    assert.equal(diagnosticsJson.includes(node.password), false);
  }
});
