import assert from "node:assert/strict";
import test from "node:test";

import { operator, renderShadowrocketSubscription } from "../src/substore-node-subscription-entry.js";

const VLESS = "vless";
const SS = "ss";
const TROJAN = "trojan";
const HY2 = "hy2";
const TUIC = "tuic";
const UUID_A = "00000000-0000-4000-8000-000000000001";
const UUID_B = "00000000-0000-4000-8000-000000000002";
const UUID_C = "00000000-0000-4000-8000-000000000003";
const UUID_D = "00000000-0000-4000-8000-000000000004";

function node(overrides = {}) {
  return {
    name: "🇯🇵 TEST｜自建·U",
    type: "vless",
    server: "192.0.2.10",
    port: 443,
    uuid: UUID_A,
    udp: true,
    tls: true,
    sni: "example.invalid",
    flow: "xtls-rprx-vision",
    "client-fingerprint": "chrome",
    "reality-opts": { "public-key": "TEST_ONLY_PUBLIC_KEY", "short-id": "00000000" },
    network: "tcp",
    ...overrides,
  };
}

test("serializes a VLESS Reality node as a Shadowrocket subscription URI", () => {
  const text = renderShadowrocketSubscription([node()]);
  const line = text.trim();
  assert.match(line, new RegExp(`^${VLESS}://${UUID_A}@192\\.0\\.2\\.10:443\\?`));
  assert.match(line, /security=reality/);
  assert.match(line, /pbk=TEST_ONLY_PUBLIC_KEY/);
  assert.match(line, /sid=00000000/);
  assert.match(line, /flow=xtls-rprx-vision/);
  assert.match(line, /type=tcp/);
  assert.match(line, /#/);
});

test("serializes Snell, Shadowsocks, Trojan, Hysteria2 and TUIC nodes", () => {
  const inventory = [
    node({ type: "snell", name: "🇯🇵 SNELL｜自建·U", server: "192.0.2.11", port: 8443, psk: "TEST_ONLY_PSK", version: 5, reuse: true, tfo: true }),
    node({ type: "ss", name: "🇸🇬 SS｜自建·U", server: "192.0.2.12", port: 8443, cipher: "aes-256-gcm", password: "TEST_ONLY_PASSWORD" }),
    node({ type: "trojan", name: "🇺🇸 TROJAN｜自建·U", server: "192.0.2.13", port: 443, password: "TEST_ONLY_TROJAN_PASSWORD" }),
    node({ type: "hysteria2", name: "🇺🇸 HY2｜自建·U", server: "192.0.2.14", port: 8443, password: "TEST_ONLY_HY2_PASSWORD" }),
    node({ type: "tuic", name: "🇺🇸 TUIC｜自建·U", server: "192.0.2.15", port: 443, uuid: UUID_B, password: "TEST_ONLY_TUIC_PASSWORD" }),
  ];
  const lines = renderShadowrocketSubscription(inventory).trim().split("\n");
  assert.equal(lines.length, 5);
  assert.match(lines[0], /^snell,192\.0\.2\.11,8443,psk=TEST_ONLY_PSK,version=5,reuse=true,tfo=true#/);
  assert.match(lines[1], new RegExp(`^${SS}://[A-Za-z0-9+/=]+@192\\.0\\.2\\.12:8443#`));
  assert.match(lines[2], new RegExp(`^${TROJAN}://TEST_ONLY_TROJAN_PASSWORD@192\\.0\\.2\\.13:443\\?sni=example\\.invalid&fp=chrome#`));
  assert.match(lines[3], new RegExp(`^${HY2}://TEST_ONLY_HY2_PASSWORD@192\\.0\\.2\\.14:8443\\?sni=example\\.invalid#`));
  assert.match(lines[4], new RegExp(`^${TUIC}://${UUID_B}:TEST_ONLY_TUIC_PASSWORD@192\\.0\\.2\\.15:443\\?sni=example\\.invalid#`));
});

test("fails closed for unsupported protocols", () => {
  assert.throws(
    () => renderShadowrocketSubscription([node({ type: "wireguard" })]),
    /unsupported.*wireguard/iu,
  );
});

test("operator produces a continent-grouped subscription from the collection", async () => {
  const rawNodes = [
    { type: "vless", name: "🇺🇸 US-A", server: "192.0.2.21", port: 443, uuid: UUID_C, tls: true, sni: "example.invalid", flow: "xtls-rprx-vision", "reality-opts": { "public-key": "K", "short-id": "S" }, _subName: "[自建] USA" },
    { type: "vless", name: "🇯🇵 JP-A", server: "192.0.2.22", port: 443, uuid: UUID_D, tls: true, sni: "example.invalid", flow: "xtls-rprx-vision", "reality-opts": { "public-key": "K", "short-id": "S" }, _subName: "[自建] JP" },
    { type: "snell", name: "🇳🇱 NL-A", server: "192.0.2.23", port: 443, psk: "P", version: 5, _subName: "[自建] NL" },
    { type: "snell", name: "🇯🇵 JP-B", server: "192.0.2.24", port: 443, psk: "P", version: 5, _subName: "[自建] JP" },
  ];
  const calls = [];
  const input = { url: "https://example.invalid/source", unchanged: true };
  const result = await operator(input, "Shadowrocket", {
    arguments: { output: "nodes", type: "collection", name: "apple-proxy-sources", clientChain: "off" },
    async produceArtifact(request) {
      calls.push(request);
      return rawNodes;
    },
  });
  assert.deepEqual(calls, [{ type: "collection", name: "apple-proxy-sources", platform: "JSON", produceType: "internal" }]);
  assert.deepEqual({ url: result.url, unchanged: result.unchanged }, input);
  const lines = result.$content.trim().split("\n");
  assert.equal(lines.length, 4);
  // Continent order: Asia-Pacific (JP) before Europe (NL) before Americas (US).
  assert.match(lines[0], /#%F0%9F%87%AF%F0%9F%87%B5/); // 🇯🇵
  assert.match(lines[1], /#%F0%9F%87%AF%F0%9F%87%B5/); // 🇯🇵
  assert.match(lines[2], /#%F0%9F%87%B3%F0%9F%87%B1/); // 🇳🇱
  assert.match(lines[3], /#%F0%9F%87%BA%F0%9F%87%B8/); // 🇺🇸
});

test("operator rejects invalid arguments and empty inventories", async () => {
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { output: "nodes", type: "collection", name: "apple-proxy-sources", unexpected: "x" },
    async produceArtifact() { return [node()]; },
  }), /unknown option/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { output: "config", type: "collection", name: "apple-proxy-sources" },
    async produceArtifact() { return [node()]; },
  }), /output.*nodes/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { output: "nodes", type: "collection", name: "apple-proxy-sources" },
    async produceArtifact() { return []; },
  }), /non-empty/i);
});
