import assert from "node:assert/strict";
import test from "node:test";

import {
  operator,
  renderShadowrocketSubscription,
} from "../src/substore-node-subscription-entry.js";
import {
  assertShadowrocketNodeSet,
  renderShadowrocketProxyRecord,
} from "../src/render-node.js";

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

function anytlsNode(overrides = {}) {
  return {
    name: "🇯🇵 Tokyo · AnyTLS｜自建·U",
    type: "anytls",
    server: "192.0.2.30",
    port: 443,
    password: "TEST_ONLY_SHADOWROCKET_ANYTLS_PASSWORD",
    tls: true,
    sni: "anytls.example.invalid",
    alpn: ["h2", "http/1.1"],
    "client-fingerprint": "chrome",
    "idle-session-check-interval": 30,
    "idle-session-timeout": 60,
    "min-idle-session": 1,
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

test("serializes every supported AnyTLS field and keeps the protocol label", () => {
  const anytls = anytlsNode();
  const record = renderShadowrocketProxyRecord(anytls);
  assert.equal(record.name, anytls.name);
  assert.equal(record.type, "anytls");
  assert.equal(record.password, anytls.password);
  assert.deepEqual(record.alpn, ["h2", "http/1.1"]);
  assert.equal(record["client-fingerprint"], "chrome");
  assert.equal(record["idle-session-check-interval"], 30);
  assert.equal(record["idle-session-timeout"], 60);
  assert.equal(record["min-idle-session"], 1);
  assert.doesNotThrow(() => assertShadowrocketNodeSet([anytls]));
  const records = recordsOf(renderShadowrocketSubscription([anytls]));
  assert.equal(records.length, 1);
  assert.deepEqual(records[0], record);

  assert.throws(
    () => renderShadowrocketProxyRecord({
      ...anytls,
      "unsupported-shadowrocket-field": "TEST_ONLY_UNSUPPORTED_FIELD",
    }),
    /^Error: Shadowrocket cannot render protocol: anytls$/u,
  );
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

test("rejects an unknown mixed protocol instead of serializing a partial record", () => {
  assert.throws(
    () => renderShadowrocketSubscription([
      node({ type: " Future-Proto ", name: "PRIVATE_FUTURE_NODE", server: "192.0.2.16", password: "TEST_ONLY_FUTURE_PASSWORD" }),
      anytlsNode({ name: "🇺🇸 Future peer · AnyTLS｜自建", password: "TEST_ONLY_GOOD_ANYTLS_PASSWORD" }),
    ]),
    (error) => error.message === "Shadowrocket cannot render selected protocols: future-proto=1"
      && !error.message.includes("PRIVATE_FUTURE_NODE")
      && !error.message.includes("192.0.2.16")
      && !error.message.includes("TEST_ONLY_FUTURE_PASSWORD"),
  );
});

test("operator produces a continent-grouped subscription from the collection", async () => {
  const rawNodes = [
    { type: "vless", name: "🇺🇸 US-A", server: "192.0.2.21", port: 443, uuid: UUID_C, tls: true, sni: "example.invalid", flow: "xtls-rprx-vision", "reality-opts": { "public-key": "K", "short-id": "S" }, _subName: "[自建] USA" },
    { type: "vless", name: "🇯🇵 JP-A", server: "192.0.2.22", port: 443, uuid: UUID_D, tls: true, sni: "example.invalid", flow: "xtls-rprx-vision", "reality-opts": { "public-key": "K", "short-id": "S" }, _subName: "[自建] JP" },
    { type: "snell", name: "🇳🇱 NL-A", server: "192.0.2.23", port: 443, psk: "P", version: 5, _subName: "[自建] NL" },
    { type: "snell", name: "🇯🇵 JP-B", server: "192.0.2.24", port: 443, psk: "P", version: 5, _subName: "[自建] JP" },
    { type: "anytls", name: "🇯🇵 JP AnyTLS", server: "192.0.2.25", port: 443, password: "TEST_ONLY_OPERATOR_ANYTLS_PASSWORD", alpn: ["h2"], "client-fingerprint": "chrome", "idle-session-timeout": 60, _subName: "[自建] JP" },
  ];
  const calls = [];
  const input = { url: "https://example.invalid/source", unchanged: true };
  const result = await operator(input, "Shadowrocket", {
    arguments: { output: "nodes", type: "collection", name: "apple-proxy-shadowrocket", clientChain: "off" },
    async produceArtifact(request) {
      calls.push(request);
      return rawNodes;
    },
  });
  assert.deepEqual(calls, [{ type: "collection", name: "apple-proxy-shadowrocket", platform: "JSON", produceType: "internal" }]);
  assert.deepEqual({ url: result.url, unchanged: result.unchanged }, input);
  const records = recordsOf(result.$content);
  assert.equal(records.length, 5);
  // Continent order: Asia-Pacific (JP) before Europe (NL) before Americas (US).
  assert.equal(records[0].name.startsWith("🇯🇵"), true);
  assert.equal(records[1].name.startsWith("🇯🇵"), true);
  assert.match(records[0].name + records[1].name + records[2].name, / · AnyTLS｜自建/u);
  assert.equal(records[3].name.startsWith("🇳🇱"), true);
  assert.equal(records[4].name.startsWith("🇺🇸"), true);
});

test("operator rejects invalid arguments and empty inventories", async () => {
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { output: "nodes", type: "collection", name: "apple-proxy-shadowrocket", unexpected: "x" },
    async produceArtifact() { return [node()]; },
  }), /unknown option/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { output: "config", type: "collection", name: "apple-proxy-shadowrocket" },
    async produceArtifact() { return [node()]; },
  }), /output.*nodes/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { output: "nodes", type: "collection", name: "apple-proxy-shadowrocket" },
    async produceArtifact() { return []; },
  }), /non-empty/i);
});

test("operator rejects a mixed Shadowrocket collection without partial subscription output", async () => {
  const privateNode = {
    name: "PRIVATE_SHADOWROCKET_SSH",
    type: "ssh",
    server: "private-shadowrocket.example.invalid",
    port: 22,
    username: "TEST_ONLY_SHADOWROCKET_USERNAME",
    password: "TEST_ONLY_SHADOWROCKET_PASSWORD",
    _subName: "[落地] SSH",
  };
  const lines = [];
  let result;
  await assert.rejects(
    async () => {
      result = await operator({}, "Shadowrocket", {
        arguments: { output: "nodes", type: "collection", name: "apple-proxy-shadowrocket", clientChain: "off" },
        async produceArtifact() { return [anytlsNode({ password: "TEST_ONLY_MIXED_ANYTLS_PASSWORD" }), privateNode]; },
        logger: { info(line) { lines.push(line); } },
      });
    },
    (error) => {
      assert.equal(error.message, "Shadowrocket cannot render selected protocols: ssh=1");
      for (const secret of [privateNode.name, privateNode.server, privateNode.password]) {
        assert.equal(error.message.includes(secret), false);
      }
      return true;
    },
  );
  assert.equal(result, undefined);
  assert.deepEqual(lines, []);
});
