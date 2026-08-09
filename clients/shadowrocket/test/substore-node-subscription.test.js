import assert from "node:assert/strict";
import test from "node:test";

import { operator, renderShadowrocketSubscription } from "../src/substore-node-subscription-entry.js";

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

function recordsOf(text) {
  return text.trim().split("\n").slice(1).map((line) => JSON.parse(line.replace(/^  - /, "")));
}

test("serializes a VLESS Reality node as a Shadowrocket proxies record", () => {
  const text = renderShadowrocketSubscription([node()]);
  assert.match(text, /^proxies:\n/);
  const [record] = recordsOf(text);
  assert.equal(record.type, "vless");
  assert.equal(record.server, "192.0.2.10");
  assert.equal(record.port, 443);
  assert.equal(record["reality-opts"]["public-key"], "TEST_ONLY_PUBLIC_KEY");
  assert.equal(record["reality-opts"]["short-id"], "00000000");
  assert.equal(record.flow, "xtls-rprx-vision");
  assert.equal(record.network, "tcp");
});

test("serializes Snell, Shadowsocks, Trojan, Hysteria2 and TUIC nodes", () => {
  const inventory = [
    node({ type: "snell", name: "🇯🇵 SNELL｜自建·U", server: "192.0.2.11", port: 8443, psk: "TEST_ONLY_PSK", version: 5, reuse: true, tfo: true }),
    node({ type: "ss", name: "🇸🇬 SS｜自建·U", server: "192.0.2.12", port: 8443, cipher: "aes-256-gcm", password: "TEST_ONLY_PASSWORD" }),
    node({ type: "trojan", name: "🇺🇸 TROJAN｜自建·U", server: "192.0.2.13", port: 443, password: "TEST_ONLY_TROJAN_PASSWORD" }),
    node({ type: "hysteria2", name: "🇺🇸 HY2｜自建·U", server: "192.0.2.14", port: 8443, password: "TEST_ONLY_HY2_PASSWORD" }),
    node({ type: "tuic", name: "🇺🇸 TUIC｜自建·U", server: "192.0.2.15", port: 443, uuid: UUID_B, password: "TEST_ONLY_TUIC_PASSWORD" }),
  ];
  const records = recordsOf(renderShadowrocketSubscription(inventory));
  assert.equal(records.length, 5);
  assert.deepEqual(records.map((record) => record.type), ["snell", "ss", "trojan", "hysteria2", "tuic"]);
  assert.equal(records[0].psk, "TEST_ONLY_PSK");
  assert.equal(records[0].version, 5);
  assert.equal(records[1].cipher, "aes-256-gcm");
  assert.equal(records[2].password, "TEST_ONLY_TROJAN_PASSWORD");
  assert.equal(records[3].password, "TEST_ONLY_HY2_PASSWORD");
  assert.equal(records[4].password, "TEST_ONLY_TUIC_PASSWORD");
});

test("keeps every Shadowrocket-supported protocol in the raw proxy record", () => {
  const text = renderShadowrocketSubscription([
    node({ type: "wireguard", name: "🇺🇸 WG｜自建·U", server: "192.0.2.16", port: 51820 }),
    node(),
  ]);
  const records = recordsOf(text);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => record.type), ["wireguard", "vless"]);
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
  const records = recordsOf(result.$content);
  assert.equal(records.length, 4);
  // Continent order: Asia-Pacific (JP) before Europe (NL) before Americas (US).
  assert.equal(records[0].name.startsWith("🇯🇵"), true);
  assert.equal(records[1].name.startsWith("🇯🇵"), true);
  assert.equal(records[2].name.startsWith("🇳🇱"), true);
  assert.equal(records[3].name.startsWith("🇺🇸"), true);
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
