import assert from "node:assert/strict";
import test from "node:test";

import { hasExplicitUdp, validateNode } from "../../../shared/nodes/node-validation.js";
import { fakeNodes } from "./fixtures/nodes.js";

test("validates all synthetic fixtures", () => {
  for (const node of fakeNodes) {
    assert.deepEqual(validateNode(node), { valid: true, reason: null, warnings: [] });
  }
});

test("rejects pseudo nodes and missing required authentication", () => {
  assert.deepEqual(validateNode({ name: "剩余流量 100 GB" }), {
    valid: false,
    reason: "pseudo-node",
    warnings: [],
  });
  assert.deepEqual(
    validateNode({ name: "VLESS", type: "vless", server: "example.invalid", port: 443 }),
    { valid: false, reason: "missing-auth", warnings: [] },
  );
});

test("accepts numeric string ports and rejects malformed endpoints", () => {
  const valid = {
    name: "SS",
    type: "ss",
    server: "example.invalid",
    port: "443",
    cipher: "aes-128-gcm",
    password: "test-password",
  };
  assert.equal(validateNode(valid).valid, true);

  for (const port of ["", "443.0", "443x", "0", "65536", 443.5]) {
    assert.deepEqual(validateNode({ ...valid, port }), {
      valid: false,
      reason: "missing-endpoint",
      warnings: [],
    });
  }
  for (const server of ["   ", 1, {}, []]) {
    assert.deepEqual(validateNode({ ...valid, server }), {
      valid: false,
      reason: "missing-endpoint",
      warnings: [],
    });
  }
});

test("requires string credentials and a positive integer Snell version", () => {
  const ss = {
    name: "SS",
    type: "ss",
    server: "example.invalid",
    port: 443,
    cipher: "aes-128-gcm",
    password: "test-password",
  };
  for (const field of ["cipher", "password"]) {
    for (const value of [false, 0, {}, [], "   "]) {
      assert.equal(validateNode({ ...ss, [field]: value }).reason, "missing-auth");
    }
  }
  const vless = { ...ss, type: "vless", uuid: "test-uuid" };
  for (const value of [false, 0, {}, [], "   "]) {
    assert.equal(validateNode({ ...vless, uuid: value }).reason, "missing-auth");
  }
  const snell = { ...ss, type: "snell", psk: "test-psk", version: "4" };
  assert.equal(validateNode(snell).valid, true);
  for (const value of [false, 0, {}, [], "   "]) {
    assert.equal(validateNode({ ...snell, psk: value }).reason, "missing-auth");
  }
  for (const value of [false, 0, {}, [], "   ", "4.0", "4x"]) {
    assert.equal(validateNode({ ...snell, version: value }).reason, "missing-auth");
  }
});

test("requires every protocol's authentication and security fields", () => {
  const common = {
    name: "Protocol contract",
    server: "contract.example.invalid",
    port: 443,
  };
  const contracts = [
    ["ss", { cipher: "aes-128-gcm", password: "TEST_ONLY_PASSWORD" }, ["cipher", "password"]],
    ["shadowsocks", { cipher: "aes-128-gcm", password: "TEST_ONLY_PASSWORD" }, ["cipher", "password"]],
    ["ssr", { cipher: "aes-128-ctr", password: "TEST_ONLY_PASSWORD", protocol: "auth_sha1_v4", obfs: "tls1.2_ticket_auth" }, ["cipher", "password", "protocol", "obfs"]],
    ["snell", { psk: "TEST_ONLY_PSK", version: 4 }, ["psk", "version"]],
    ["vmess", { uuid: "TEST_ONLY_UUID" }, ["uuid"]],
    ["vless", { uuid: "TEST_ONLY_UUID" }, ["uuid"]],
    ["trojan", { password: "TEST_ONLY_PASSWORD", sni: "tls.example.invalid" }, ["password"]],
    ["anytls", { password: "TEST_ONLY_PASSWORD", sni: "tls.example.invalid" }, ["password"]],
    ["hysteria2", { password: "TEST_ONLY_PASSWORD", sni: "tls.example.invalid" }, ["password"]],
    ["hy2", { password: "TEST_ONLY_PASSWORD", sni: "tls.example.invalid" }, ["password"]],
    ["tuic", { uuid: "TEST_ONLY_UUID", password: "TEST_ONLY_PASSWORD", sni: "tls.example.invalid" }, ["uuid", "password"]],
    ["wireguard", { "private-key": "TEST_ONLY_PRIVATE_KEY", "public-key": "TEST_ONLY_PUBLIC_KEY" }, ["private-key", "public-key"]],
    ["sudoku", { key: "TEST_ONLY_SUDOKU_KEY" }, ["key"]],
  ];

  for (const [type, fields, required] of contracts) {
    const valid = { ...common, type, ...fields };
    assert.equal(validateNode(valid).valid, true, `${type} complete`);
    for (const field of required) {
      assert.deepEqual(
        validateNode({ ...valid, [field]: " " }),
        { valid: false, reason: "missing-auth", warnings: [] },
        `${type} missing ${field}`,
      );
    }
  }

  for (const type of ["socks5", "http"]) {
    assert.equal(validateNode({ ...common, type }).valid, true, `${type} supports unauthenticated endpoints`);
  }
});

test("reports UDP only when explicit and warns for unclear TLS verification", () => {
  assert.equal(hasExplicitUdp({ udp: true }), true);
  assert.equal(hasExplicitUdp({ type: "hysteria2" }), false);
  assert.deepEqual(
    validateNode({
      name: "VLESS TLS",
      type: "vless",
      server: "example.invalid",
      port: 443,
      uuid: "00000000-0000-4000-8000-000000000001",
      tls: true,
    }),
    { valid: true, reason: null, warnings: ["tls-verification-unclear"] },
  );
});

test("requires nonblank string TLS identities", () => {
  const node = {
    name: "VLESS TLS",
    type: "vless",
    server: "example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    tls: true,
  };
  for (const identity of [
    { sni: "   " },
    { servername: {} },
    { "reality-opts": { "public-key": [] } },
  ]) {
    assert.deepEqual(validateNode({ ...node, ...identity }).warnings, ["tls-verification-unclear"]);
  }
  assert.deepEqual(validateNode({ ...node, sni: "example.invalid" }).warnings, []);
  assert.deepEqual(validateNode({ ...node, "allow-insecure": true }).warnings, []);
});
