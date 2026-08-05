import assert from "node:assert/strict";
import test from "node:test";

import { renderSurgeProxy } from "../src/render-node.js";

test("renders VLESS Reality WebSocket transport with explicit TLS fields", () => {
  const line = renderSurgeProxy({
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
  assert.match(line, /vless,example\.invalid,443/iu);
  assert.match(line, /username=00000000-0000-4000-8000-000000000001/u);
  assert.match(line, /ws=true/iu);
  assert.match(line, /ws-path=\/gateway/iu);
  assert.match(line, /reality=true/iu);
  assert.match(line, /public-key=TEST_ONLY_PUBLIC_KEY/iu);
});

test("rejects unknown Surge node fields before rendering", () => {
  assert.throws(() => renderSurgeProxy({
    name: "fixture",
    type: "ss",
    server: "example.invalid",
    port: 443,
    cipher: "aes-256-gcm",
    password: "TEST_ONLY_PASSWORD",
    "future-option": true,
  }), /unsupported field/iu);
});
