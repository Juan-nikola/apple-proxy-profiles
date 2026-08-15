import assert from "node:assert/strict";
import test from "node:test";

import { renderSingBoxOutbound } from "../src/render-node.js";

const ANYTLS_NODE = Object.freeze({
  name: "AnyTLS fixture",
  type: "anytls",
  server: "anytls.example.invalid",
  port: 443,
  password: "TEST_ONLY_ANYTLS_PASSWORD",
});

test("renders VLESS Reality WebSocket using official sing-box outbound fields", () => {
  const outbound = renderSingBoxOutbound({
    name: "🇩🇪 [Realm] Frankfurt",
    type: "vless",
    server: "example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    network: "ws",
    "ws-opts": { path: "/gateway", headers: { Host: "example.invalid" } },
    tls: true,
    sni: "example.invalid",
    "client-fingerprint": "chrome",
    "reality-opts": { "public-key": "TEST_ONLY_PUBLIC_KEY", "short-id": "00000000" },
  });
  assert.deepEqual(outbound, {
    type: "vless",
    tag: "🇩🇪 [Realm] Frankfurt",
    server: "example.invalid",
    server_port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    tls: {
      enabled: true,
      server_name: "example.invalid",
      utls: { enabled: true, fingerprint: "chrome" },
      reality: { enabled: true, public_key: "TEST_ONLY_PUBLIC_KEY", short_id: "00000000" },
    },
    transport: { type: "ws", path: "/gateway", headers: { Host: "example.invalid" } },
  });
});

test("renders Sub-Store VLESS fields including packet encoding", () => {
  const outbound = renderSingBoxOutbound({
    name: "🇭🇰 阿里云香港 · VLESS｜自建·U",
    type: "vless",
    server: "vless.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    tls: true,
    sni: "example.invalid",
    flow: "xtls-rprx-vision",
    network: "tcp",
    encryption: "none",
    "packet-encoding": "xudp",
    "client-fingerprint": "chrome",
    "skip-cert-verify": false,
    "reality-opts": {
      "public-key": "TEST_ONLY_PUBLIC_KEY",
      "short-id": "34cde204",
      "_spider-x": "/test-only-spider",
    },
  });
  assert.equal(outbound.packet_encoding, "xudp");
  assert.equal(outbound.tls.reality.spider_x, "/test-only-spider");
  assert.equal(Object.hasOwn(outbound, "encryption"), false);
});

for (const [source, expected] of [
  [{ "packet-encoding": "packetaddr" }, "packetaddr"],
  [{ "packet-encoding": "packet" }, "packetaddr"],
  [{ packetEncoding: "xudp" }, "xudp"],
  [{ xudp: true }, "xudp"],
  [{ "packet-addr": true }, "packetaddr"],
  [{ "packet-encoding": "" }, undefined],
]) {
  test(`maps Sub-Store packet encoding ${JSON.stringify(source)} for VLESS`, () => {
    const outbound = renderSingBoxOutbound({
      name: "packet encoding fixture",
      type: "vless",
      server: "example.invalid",
      port: 443,
      uuid: "00000000-0000-4000-8000-000000000001",
      ...source,
    });
    if (expected === undefined) {
      assert.equal(Object.hasOwn(outbound, "packet_encoding"), false);
    } else {
      assert.equal(outbound.packet_encoding, expected);
    }
  });
}

test("renders every selected AnyTLS field supported by the sing-box adapter", () => {
  const outbound = renderSingBoxOutbound({
    ...ANYTLS_NODE,
    name: "🇯🇵 Tokyo · AnyTLS｜自建",
    tls: true,
    security: "reality",
    network: "tcp",
    sni: "anytls.example.invalid",
    servername: "anytls.example.invalid",
    "skip-cert-verify": true,
    "allow-insecure": true,
    alpn: ["h2", "http/1.1"],
    "client-fingerprint": "chrome",
    udp: true,
    "reality-opts": {
      "public-key": "TEST_ONLY_ANYTLS_PUBLIC_KEY",
      "short-id": "0123abcd",
    },
    "idle-session-check-interval": 30,
    "idle-session-timeout": 60,
    "min-idle-session": 1,
  });
  assert.deepEqual(outbound, {
    type: "anytls",
    tag: "🇯🇵 Tokyo · AnyTLS｜自建",
    server: "anytls.example.invalid",
    server_port: 443,
    password: "TEST_ONLY_ANYTLS_PASSWORD",
    idle_session_check_interval: "30s",
    idle_session_timeout: "60s",
    min_idle_session: 1,
    tls: {
      enabled: true,
      server_name: "anytls.example.invalid",
      alpn: ["h2", "http/1.1"],
      insecure: true,
      utls: { enabled: true, fingerprint: "chrome" },
      reality: {
        enabled: true,
        public_key: "TEST_ONLY_ANYTLS_PUBLIC_KEY",
        short_id: "0123abcd",
      },
    },
  });
});

test("renders AnyTLS UDP flag from Sub-Store without forcing a network field", () => {
  const outbound = renderSingBoxOutbound({
    ...ANYTLS_NODE,
    tls: true,
    sni: "anytls.example.invalid",
    udp: true,
  });
  assert.equal(outbound.type, "anytls");
  assert.equal(Object.hasOwn(outbound, "network"), false);
});

test("renders AnyTLS Reality spider X into the official TLS field", () => {
  const outbound = renderSingBoxOutbound({
    ...ANYTLS_NODE,
    security: "reality",
    "reality-opts": {
      "public-key": "TEST_ONLY_ANYTLS_PUBLIC_KEY",
      "short-id": "0123abcd",
      "_spider-x": "/test-only-spider",
    },
  });
  assert.equal(outbound.tls.reality.spider_x, "/test-only-spider");
});

for (const field of ["future-option", "spider-x"]) {
  test(`rejects nested AnyTLS Reality field '${field}' that the renderer cannot map`, () => {
    assert.throws(() => renderSingBoxOutbound({
      ...ANYTLS_NODE,
      security: "reality",
      "reality-opts": {
        "public-key": "TEST_ONLY_ANYTLS_PUBLIC_KEY",
        "short-id": "0123abcd",
        [field]: "TEST_ONLY_UNMAPPED_REALITY_VALUE",
      },
    }), /unsupported.*AnyTLS.*Reality.*field/iu, field);
  });
}

for (const [label, fields] of [
  ["unknown security", { security: "future-security" }],
  ["disabled security", { security: "none" }],
  ["missing Reality options", { security: "reality" }],
  ["TLS with Reality options", {
    security: "tls",
    "reality-opts": { "public-key": "TEST_ONLY_ANYTLS_PUBLIC_KEY" },
  }],
]) {
  test(`rejects AnyTLS ${label}`, () => {
    assert.throws(() => renderSingBoxOutbound({ ...ANYTLS_NODE, ...fields }), /AnyTLS.*(?:security|Reality)/iu, label);
  });
}

for (const [label, fields] of [
  ["server name aliases", { sni: "one.example.invalid", servername: "two.example.invalid" }],
  ["certificate verification aliases", { "skip-cert-verify": false, "allow-insecure": true }],
]) {
  test(`rejects conflicting AnyTLS ${label} before projection`, () => {
    assert.throws(() => renderSingBoxOutbound({ ...ANYTLS_NODE, ...fields }), /conflicting.*AnyTLS.*aliases/iu, label);
  });
}

for (const [label, fields, pattern] of [
  ["raw network", { network: "raw" }, /AnyTLS.*network/iu],
  ["non-boolean TLS", { tls: "true" }, /AnyTLS.*tls/iu],
  ["disabled TLS", { tls: false }, /AnyTLS.*tls/iu],
  ["empty server name", { sni: "" }, /AnyTLS.*sni/iu],
  ["non-boolean certificate verification", { "skip-cert-verify": "true" }, /AnyTLS.*skip-cert-verify/iu],
  ["empty client fingerprint", { "client-fingerprint": "" }, /AnyTLS.*client-fingerprint/iu],
  ["empty Reality public key", { "reality-opts": { "public-key": "" } }, /AnyTLS.*Reality/iu],
  ["empty Reality short ID", {
    "reality-opts": { "public-key": "TEST_ONLY_ANYTLS_PUBLIC_KEY", "short-id": "" },
  }, /AnyTLS.*Reality/iu],
  ["non-hex Reality short ID", {
    "reality-opts": { "public-key": "TEST_ONLY_ANYTLS_PUBLIC_KEY", "short-id": "not-hex" },
  }, /AnyTLS.*Reality/iu],
  ["invalid ALPN", { alpn: ["h2", ""] }, /ALPN/iu],
]) {
  test(`rejects malformed AnyTLS ${label} instead of dropping it`, () => {
    assert.throws(() => renderSingBoxOutbound({ ...ANYTLS_NODE, ...fields }), pattern, label);
  });
}

test("rejects selected fields that the AnyTLS renderer would otherwise ignore", () => {
  assert.throws(() => renderSingBoxOutbound({
    name: "AnyTLS unsupported field",
    type: "anytls",
    server: "anytls.example.invalid",
    port: 443,
    password: "TEST_ONLY_ANYTLS_PASSWORD",
    flow: "TEST_ONLY_UNSUPPORTED_FLOW",
  }), /unsupported.*AnyTLS.*field/iu);
});

test("rejects unsupported sing-box node fields instead of silently dropping them", () => {
  assert.throws(() => renderSingBoxOutbound({
    name: "fixture",
    type: "ss",
    server: "example.invalid",
    port: 443,
    cipher: "aes-256-gcm",
    password: "TEST_ONLY_PASSWORD",
    "future-option": true,
  }), /unsupported.*field/iu);
});

test("renders native Snell outbound fields available in current sing-box testing", () => {
  const outbound = renderSingBoxOutbound({
    name: "🇺🇸 [自建] Los Angeles",
    type: "snell",
    server: "example.invalid",
    port: 443,
    psk: "TEST_ONLY_PSK",
    version: 4,
    obfs: "http",
    "obfs-host": "example.invalid",
  });
  assert.deepEqual(outbound, {
    type: "snell",
    tag: "🇺🇸 [自建] Los Angeles",
    server: "example.invalid",
    server_port: 443,
    psk: "TEST_ONLY_PSK",
    version: 4,
    obfs_mode: "http",
    obfs_host: "example.invalid",
  });
});

test("renders Snell v5 nodes accepted by current sing-box", () => {
  const outbound = renderSingBoxOutbound({
    name: "🇭🇰 [自建] Snell v5",
    type: "snell",
    server: "example.invalid",
    port: 443,
    psk: "TEST_ONLY_PSK",
    version: 5,
    reuse: true,
    udp: true,
  });
  assert.equal(outbound.version, 4);
  assert.equal(outbound.reuse, true);
});

test("rejects protocols not represented by the sing-box adapter", () => {
  assert.throws(() => renderSingBoxOutbound({
    name: "fixture",
    type: "ssr",
    server: "example.invalid",
    port: 443,
    cipher: "aes-256-gcm",
    password: "TEST_ONLY_PASSWORD",
    protocol: "origin",
    obfs: "plain",
  }), /unsupported.*protocol/iu);
});
