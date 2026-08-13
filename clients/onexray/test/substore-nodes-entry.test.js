import assert from "node:assert/strict";
import test from "node:test";

import { runOneXrayNodesProcessor } from "../src/substore-nodes-entry.js";

const UUID = "00000000-0000-4000-8000-000000000001";
const ARGUMENTS = Object.freeze({ output: "nodes", type: "collection", name: "apple-proxy-onexray" });
const LANDING = Object.freeze({
  name: "🇩🇪 Frankfurt vless",
  type: "vless",
  server: "landing.example.invalid",
  port: 443,
  uuid: UUID,
  _subName: "[落地]",
});

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

test("normalizes before rejecting a mixed unrenderable inventory", () => {
  const privateName = "PRIVATE_UNSUPPORTED_NODE";
  const privateServer = "private.invalid";
  const privateSecret = "TEST_ONLY_UNSUPPORTED_PSK";
  assert.throws(() => runOneXrayNodesProcessor({
    proxies: [
      sourceNode(),
      sourceNode({
        name: privateName,
        type: "snell",
        server: privateServer,
        psk: privateSecret,
        version: 4,
      }),
    ],
    arguments: ARGUMENTS,
  }), (error) => {
    assert.equal(error.message, "OneXray cannot render selected protocols: snell=1");
    for (const secret of [privateName, privateServer, privateSecret]) assert.equal(error.message.includes(secret), false);
    return true;
  });
});

test("does not emit diagnostics or partial output for mixed compatibility inventories", () => {
  const diagnostics = [];
  let text;
  assert.throws(() => {
    text = runOneXrayNodesProcessor({
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
  }, /OneXray cannot render selected protocols: snell=1/u);

  assert.equal(text, undefined);
  assert.deepEqual(diagnostics, []);
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
      assert.equal(error.message, "OneXray cannot render selected protocols: snell=1");
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

test("uses OneXray native chaining without probing a generic generated chain clone", () => {
  const text = runOneXrayNodesProcessor({
    proxies: [sourceNode(), LANDING],
    arguments: {
      ...ARGUMENTS,
      clientChain: "on",
      clientChainTarget: "NODE:🇩🇪 Frankfurt · VLESS｜落地",
    },
  });
  const output = JSON.parse(text);
  assert.equal(output.outbounds.length, 1);
  assert.equal(output.outbounds[0].name, "🇯🇵 Tokyo · VLESS｜自建");
  assert.equal(text.includes(LANDING.server), false);
});
