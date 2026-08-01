import test from "node:test";
import assert from "node:assert/strict";
import { CLIENT } from "../shared/contracts.js";
import { evaluateNodeForClient, filterNodesForClient } from "../shared/nodes/capabilities.js";

test("filters by verified client subscription capabilities", () => {
  assert.deepEqual(evaluateNodeForClient({ type: "snell" }, CLIENT.egern), { supported: true, reason: null });
  assert.deepEqual(evaluateNodeForClient({ type: "snell" }, CLIENT.anywhere), { supported: false, reason: "unsupported-protocol" });
  assert.deepEqual(evaluateNodeForClient({ type: "vless", network: "grpc" }, CLIENT.anywhere), { supported: false, reason: "unsupported-vless-network" });
  assert.deepEqual(evaluateNodeForClient({ type: "trojan", network: "ws" }, CLIENT.anywhere), { supported: false, reason: "unsupported-trojan-transport" });
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
