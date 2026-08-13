import assert from "node:assert/strict";
import test from "node:test";

import { renderSingBoxOutbound } from "../src/render-node.js";

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

test("renders every selected AnyTLS field supported by the sing-box adapter", () => {
  const outbound = renderSingBoxOutbound({
    name: "🇯🇵 Tokyo · AnyTLS｜自建",
    type: "anytls",
    server: "anytls.example.invalid",
    port: 443,
    password: "TEST_ONLY_ANYTLS_PASSWORD",
    tls: true,
    sni: "anytls.example.invalid",
    alpn: ["h2", "http/1.1"],
    "client-fingerprint": "chrome",
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
      utls: { enabled: true, fingerprint: "chrome" },
    },
  });
});

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
