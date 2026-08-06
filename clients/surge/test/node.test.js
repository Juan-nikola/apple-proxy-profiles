import assert from "node:assert/strict";
import test from "node:test";

import { renderSurgeProxy } from "../src/render-node.js";

test("rejects VLESS because Surge does not support the proxy type", () => {
  assert.throws(() => renderSurgeProxy({
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
  }), /unsupported Surge protocol: vless/iu);
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
