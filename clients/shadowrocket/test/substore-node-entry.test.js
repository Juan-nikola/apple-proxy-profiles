import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-node-entry.js";
import { fakeNodes } from "./fixtures/nodes.js";

function egernOnlyNodes() {
  return [
    {
      name: "SSH landing",
      type: "ssh",
      server: "ssh-landing.example.invalid",
      port: 22,
      username: "TEST_ONLY_SSH_USERNAME",
      password: "TEST_ONLY_SSH_PASSWORD",
      _subName: "[落地] SSH",
    },
    {
      name: "WireGuard landing",
      type: "wireguard",
      server: "wireguard-landing.example.invalid",
      port: 443,
      "private-key": "TEST_ONLY_WIREGUARD_PRIVATE_KEY",
      "public-key": "TEST_ONLY_WIREGUARD_PUBLIC_KEY",
      ip: "192.0.2.22/32",
      _subName: "[落地] WireGuard",
    },
  ];
}

function anytlsNode() {
  return {
    name: "Tokyo AnyTLS",
    type: "anytls",
    server: "anytls-landing.example.invalid",
    port: 443,
    password: "TEST_ONLY_ANYTLS_PASSWORD",
    alpn: ["h2"],
    "client-fingerprint": "chrome",
    "idle-session-check-interval": 30,
    "idle-session-timeout": 60,
    "min-idle-session": 1,
    _subName: "[自建] AnyTLS",
  };
}

test("operator returns every normalized node including labeled AnyTLS", async () => {
  const result = await operator([...fakeNodes, anytlsNode()], "Shadowrocket", {
    arguments: { output: "nodes", clientChain: "off" },
  });

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, fakeNodes.length + 1);
  const anytls = result.find((node) => node.type === "anytls");
  assert.match(anytls.name, / · AnyTLS｜自建$/u);
  assert.equal(anytls["idle-session-timeout"], 60);
});

test("operator accepts only the documented node arguments", async () => {
  for (const arguments_ of [
    { output: "nodes" },
    { output: "nodes", clientChain: "off" },
    { output: "nodes", clientChain: "on" },
    { output: "nodes", _internal: "ignored" },
  ]) {
    const result = await operator(fakeNodes, "Shadowrocket", { arguments: arguments_ });
    assert.equal(Array.isArray(result), true);
  }

  for (const arguments_ of [
    { output: "config" },
    { output: "nodes", clientChain: "invalid" },
  ]) {
    await assert.rejects(
      operator(fakeNodes, "Shadowrocket", { arguments: arguments_ }),
      /output must be nodes|clientChain must be off or on/,
    );
  }
});

test("operator fails closed when there are no valid nodes", async () => {
  await assert.rejects(
    operator([], "Shadowrocket", { arguments: { output: "nodes" } }),
    /no valid nodes/i,
  );
});

test("operator rejects unknown non-internal options", async () => {
  await assert.rejects(
    operator(fakeNodes, "Shadowrocket", { arguments: { output: "nodes", unexpected: "x" } }),
    /Unknown option: unexpected/,
  );
});

test("operator retains its JavaScript function arity", () => {
  assert.equal(operator.length, 0);
});

test("operator logs one aggregate diagnostics line without node values", async () => {
  const lines = [];
  await operator(fakeNodes, "Shadowrocket", {
    arguments: { output: "nodes", clientChain: "off" },
    logger: { info(line) { lines.push(line); } },
  });

  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[shadowrocket-profile\] \{/);
  for (const secret of ["198.51.100.10", "TEST_ONLY_NOT_A_SECRET", "00000000-0000-4000-8000-000000000001"]) {
    assert.equal(lines[0].includes(secret), false);
  }
});

test("operator rejects a mixed inventory before Shadowrocket output and logging", async () => {
  const unsupported = egernOnlyNodes();
  const lines = [];
  await assert.rejects(
    operator([fakeNodes[0], ...unsupported], "Shadowrocket", {
      arguments: { output: "nodes", clientChain: "on" },
      logger: { info(line) { lines.push(line); } },
    }),
    (error) => {
      assert.equal(error.message, "Shadowrocket cannot render selected protocols: ssh=1,wireguard=1");
      for (const secret of ["SSH landing", "ssh-landing.example.invalid", "TEST_ONLY_SSH_PASSWORD"]) {
        assert.equal(error.message.includes(secret), false);
      }
      return true;
    },
  );
  assert.deepEqual(lines, []);
});

test("operator reports protocol counts without logging when every selected protocol is unrenderable", async () => {
  const unsupported = egernOnlyNodes();
  const inventories = [...unsupported.map((node) => [node]), [unsupported[0], unsupported[1]]];

  for (const inventory of inventories) {
    const lines = [];
    let message = "";
    await assert.rejects(
      operator(inventory, "Shadowrocket", {
        arguments: { output: "nodes", clientChain: "on" },
        logger: { info(line) { lines.push(line); } },
      }),
      (error) => {
        message = error.message;
        return /^Shadowrocket cannot render selected protocols: /u.test(message);
      },
    );
    assert.deepEqual(lines, []);
    for (const node of inventory) {
      for (const value of [node.name, node.server, node.password, node["private-key"], node["public-key"]]) {
        if (value !== undefined) assert.equal(message.includes(value), false);
      }
    }
  }
});
