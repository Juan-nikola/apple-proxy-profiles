import assert from "node:assert/strict";
import test from "node:test";

import { CLIENT } from "../../../shared/contracts.js";
import { protocolSupportsClient } from "../../../shared/nodes/protocol-registry.js";
import { renderIncyOutbound } from "../src/render-node.js";

const BASE = Object.freeze({
  server: "example.invalid",
  port: 443,
});

test("INCY supports only the seven verified Xray protocol categories", () => {
  for (const protocol of ["vless", "vmess", "trojan", "shadowsocks", "hy2", "socks5", "http"]) {
    assert.equal(protocolSupportsClient(protocol, CLIENT.incy), true, protocol);
  }
  for (const protocol of ["ssr", "tuic", "snell", "anytls", "ssh", "wireguard"]) {
    assert.equal(protocolSupportsClient(protocol, CLIENT.incy), false, protocol);
  }
});

test("renders VLESS Reality over WebSocket with stable INCY tagging", () => {
  const outbound = renderIncyOutbound({
    name: "vless-node",
    type: "vless",
    ...BASE,
    uuid: "00000000-0000-4000-8000-000000000001",
    tls: true,
    sni: "example.invalid",
    network: "ws",
    "ws-opts": { path: "/gateway", headers: { Host: "example.invalid" } },
    "reality-opts": { "public-key": "TEST_ONLY", "short-id": "0123abcd" },
  }, { tag: "ap-incy-vless" });

  assert.equal(outbound.tag, "ap-incy-vless");
  assert.equal(outbound.protocol, "vless");
  assert.equal(outbound.settings.vnext[0].address, "example.invalid");
  assert.equal(outbound.settings.vnext[0].port, 443);
  assert.equal(outbound.settings.vnext[0].users[0].id, "00000000-0000-4000-8000-000000000001");
  assert.equal(outbound.streamSettings.network, "ws");
  assert.equal(outbound.streamSettings.security, "reality");
});

test("renders VMess, Trojan, Shadowsocks, Hy2, SOCKS5, and HTTP outbounds", () => {
  const cases = [
    ["vmess", {
      type: "vmess",
      ...BASE,
      uuid: "TEST_ONLY",
      tls: true,
      sni: "example.invalid",
      security: "tls",
    }, "vmess"],
    ["trojan", {
      type: "trojan",
      ...BASE,
      password: "TEST_ONLY",
      tls: true,
      sni: "example.invalid",
    }, "trojan"],
    ["shadowsocks", {
      type: "ss",
      ...BASE,
      cipher: "aes-256-gcm",
      password: "TEST_ONLY",
    }, "shadowsocks"],
    ["hy2", {
      type: "hy2",
      ...BASE,
      password: "TEST_ONLY",
      tls: true,
      sni: "example.invalid",
    }, "hysteria"],
    ["socks5", {
      type: "socks5",
      ...BASE,
      username: "TEST_ONLY",
      password: "TEST_ONLY",
    }, "socks"],
    ["http", {
      type: "http",
      ...BASE,
      username: "TEST_ONLY",
      password: "TEST_ONLY",
    }, "http"],
  ];

  for (const [label, node, protocol] of cases) {
    const outbound = renderIncyOutbound(node, { tag: `ap-incy-${label}` });
    assert.equal(outbound.protocol, protocol, label);
    assert.equal(outbound.tag, `ap-incy-${label}`);
    assert.ok(outbound.settings, label);
  }
});

for (const [label, node, pattern] of [
  ["ssr", { type: "ssr", ...BASE, password: "TEST_ONLY" }, /unsupported-incy-protocol/i],
  ["tuic", { type: "tuic", ...BASE, uuid: "TEST_ONLY", password: "TEST_ONLY" }, /unsupported-incy-protocol/i],
  ["snell", { type: "snell", ...BASE, psk: "TEST_ONLY_PSK", version: 4 }, /unsupported-incy-protocol/i],
  ["anytls", { type: "anytls", ...BASE, password: "TEST_ONLY" }, /unsupported-incy-protocol/i],
  ["ssh", { type: "ssh", ...BASE, username: "TEST_ONLY" }, /unsupported-incy-protocol/i],
  ["wireguard", { type: "wireguard", ...BASE, "private-key": "TEST_ONLY_PRIVATE", "public-key": "TEST_ONLY_PUBLIC" }, /unsupported-incy-protocol/i],
  ["missing uuid", { type: "vless", ...BASE, tls: true }, /uuid|field/i],
  ["missing password", { type: "trojan", ...BASE, tls: true }, /password|field/i],
]) {
  test(`rejects ${label}`, () => {
    assert.throws(() => renderIncyOutbound(node, { tag: `ap-incy-${label}` }), pattern, label);
  });
}
