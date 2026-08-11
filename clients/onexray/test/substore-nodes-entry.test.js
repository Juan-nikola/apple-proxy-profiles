import assert from "node:assert/strict";
import test from "node:test";

import { runOneXrayNodesProcessor } from "../src/substore-nodes-entry.js";

const UUID = "00000000-0000-4000-8000-000000000001";
const ARGUMENTS = Object.freeze({ output: "nodes", type: "collection", name: "OneXray nodes" });

function sourceNode(overrides = {}) {
  return {
    name: "🇯🇵 Tokyo vless",
    type: "vless",
    server: "tokyo.example.invalid",
    port: 443,
    uuid: UUID,
    _subName: "[自建]",
    ...overrides,
  };
}

test("normalizes before filtering and renders only compatible nodes", () => {
  const text = runOneXrayNodesProcessor({
    proxies: [
      sourceNode(),
      sourceNode({
        name: "PRIVATE_UNSUPPORTED_NODE",
        type: "snell",
        server: "private.invalid",
        psk: "TEST_ONLY_UNSUPPORTED_PSK",
        version: 4,
      }),
    ],
    arguments: ARGUMENTS,
  });
  const output = JSON.parse(text);

  assert.deepEqual(output.outbounds.map((outbound) => ({ name: outbound.name, tag: outbound.tag })), [
    { name: "🇯🇵 Tokyo｜自建", tag: "🇯🇵 Tokyo｜自建" },
  ]);
  assert.equal(text.includes("PRIVATE_UNSUPPORTED_NODE"), false);
  assert.equal(text.includes("TEST_ONLY_UNSUPPORTED_PSK"), false);
});

test("emits deterministic count-only diagnostics for mixed compatibility inventories", () => {
  const diagnostics = [];
  const text = runOneXrayNodesProcessor({
    proxies: [
      sourceNode(),
      sourceNode({
        name: "PRIVATE_UNSUPPORTED_NODE",
        type: "snell",
        server: "private.invalid",
        psk: "TEST_ONLY_UNSUPPORTED_PSK",
        version: 4,
      }),
    ],
    arguments: ARGUMENTS,
    onDiagnostics(value) { diagnostics.push(value); },
  });

  assert.deepEqual(diagnostics, [{
    accepted: 1,
    excluded: { "unsupported-onexray-protocol": 1 },
  }]);
  assert.equal(text.includes("PRIVATE_UNSUPPORTED_NODE"), false);
  assert.equal(text.includes("TEST_ONLY_UNSUPPORTED_PSK"), false);
});

test("fails closed with count-only diagnostics when no normalized node is compatible", () => {
  const privateName = "PRIVATE_ONEXRAY_UNSUPPORTED_NODE";
  const privateSecret = "TEST_ONLY_PRIVATE_ONEXRAY_PSK";
  assert.throws(
    () => runOneXrayNodesProcessor({
      proxies: [sourceNode({ name: privateName, type: "snell", psk: privateSecret, version: 4 })],
      arguments: ARGUMENTS,
    }),
    (error) => {
      assert.match(error.message, /^OneXray nodes: no-compatible-nodes; excluded counts: unsupported-onexray-protocol=1$/u);
      assert.equal(error.message.includes(privateName), false);
      assert.equal(error.message.includes(privateSecret), false);
      return true;
    },
  );
});

test("accepts only the nodes output and never exposes raw arguments or nodes in errors", () => {
  const privateArgument = "PRIVATE_ONEXRAY_ARGUMENT";
  const privateNode = "PRIVATE_ONEXRAY_NODE";
  for (const argumentsValue of [
    { ...ARGUMENTS, output: "profile", name: privateArgument },
    { ...ARGUMENTS, unexpected: privateArgument },
  ]) {
    assert.throws(
      () => runOneXrayNodesProcessor({
        proxies: [sourceNode({ name: privateNode })],
        arguments: argumentsValue,
      }),
      (error) => {
        assert.match(error.message, /^OneXray nodes: /u);
        assert.equal(error.message.includes(privateArgument), false);
        assert.equal(error.message.includes(privateNode), false);
        return true;
      },
    );
  }
});

test("maps policy failures to a stable error code without leaking target input", () => {
  const sentinel = "PRIVATE_ARGUMENT_SENTINEL";
  assert.throws(
    () => runOneXrayNodesProcessor({
      proxies: [sourceNode()],
      arguments: {
        ...ARGUMENTS,
        clientChain: "on",
        clientChainTarget: `NODE:${sentinel}`,
      },
    }),
    (error) => {
      assert.equal(error.message, "OneXray nodes: invalid-policy");
      assert.equal(error.message.includes(sentinel), false);
      return true;
    },
  );
});
