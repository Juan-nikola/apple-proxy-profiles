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

function ssrNode(overrides = {}) {
  return {
    name: "🇸🇬 Singapore · SSR｜机场·U",
    type: "ssr",
    server: "192.0.2.31",
    port: 443,
    cipher: "aes-128-ctr",
    password: "TEST_ONLY_SHADOWROCKET_SSR_PASSWORD",
    protocol: "auth_sha1_v4",
    obfs: "tls1.2_ticket_auth",
    "obfs-host": "ssr-obfs.example.invalid",
    udp: true,
    ...overrides,
  };
}

function clientChainInventory() {
  return [
    {
      name: "Singapore entry",
      type: "ss",
      server: "entry-chain.example.invalid",
      port: 443,
      cipher: "aes-128-gcm",
      password: "TEST_ONLY_CHAIN_ENTRY_PASSWORD",
      _subName: "[机场] Entry",
    },
    {
      name: "Tokyo landing",
      type: "ss",
      server: "landing-chain.example.invalid",
      port: 443,
      cipher: "aes-256-gcm",
      password: "TEST_ONLY_CHAIN_LANDING_PASSWORD",
      _subName: "[落地] Landing",
    },
  ];
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

test("serializes the complete supported SSR record without admitting unknown fields", () => {
  const ssr = ssrNode();
  assert.deepEqual(renderShadowrocketProxyRecord(ssr), ssr);
  assert.doesNotThrow(() => assertShadowrocketNodeSet([ssr]));
  assert.deepEqual(recordsOf(renderShadowrocketSubscription([ssr])), [ssr]);

  assert.throws(
    () => renderShadowrocketProxyRecord({
      ...ssr,
      "unsupported-ssr-field": "TEST_ONLY_UNSUPPORTED_SSR_VALUE",
    }),
    /^Error: Shadowrocket cannot render protocol: ssr$/u,
  );
});

test("serializes existing Shadowrocket chain records without widening unknown fields", () => {
  const chained = node({ chain: "existing-hop" });
  assert.equal(renderShadowrocketProxyRecord(chained).chain, "existing-hop");
  assert.throws(
    () => renderShadowrocketProxyRecord({ ...chained, detour: "unknown-hop" }),
    /^Error: Shadowrocket cannot render protocol: vless$/u,
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

test("skips an unknown mixed protocol and serializes only renderable records", () => {
  const future = node({
    type: " Future-Proto ",
    name: "PRIVATE_FUTURE_NODE",
    server: "192.0.2.16",
    password: "TEST_ONLY_FUTURE_PASSWORD",
  });
  const text = renderShadowrocketSubscription([
    future,
    anytlsNode({ name: "🇺🇸 Future peer · AnyTLS｜自建", password: "TEST_ONLY_GOOD_ANYTLS_PASSWORD" }),
  ]);
  const records = recordsOf(text);
  assert.equal(records.length, 1);
  assert.equal(records[0].type, "anytls");
  assert.equal(records[0].password, "TEST_ONLY_GOOD_ANYTLS_PASSWORD");
  for (const secret of [future.name, future.server, future.password]) {
    assert.equal(text.includes(secret), false);
  }
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

test("operator accepts the canonical publication channel parameter", async () => {
  const result = await operator({}, "Shadowrocket", {
    arguments: {
      output: "nodes",
      type: "collection",
      name: "apple-proxy-shadowrocket",
      clientChain: "off",
      channel: "current",
    },
    async produceArtifact() { return [node()]; },
  });

  assert.equal(recordsOf(result.$content).length, 1);
});

test("node subscription accepts the generated clientChain clone through the shared assertion", async () => {
  const result = await operator({}, "Shadowrocket", {
    arguments: {
      output: "nodes",
      type: "collection",
      name: "apple-proxy-shadowrocket",
      clientChain: "on",
    },
    async produceArtifact() { return clientChainInventory(); },
  });

  const records = recordsOf(result.$content);
  assert.equal(records.length, 3);
  const chained = records.find((record) => record["underlying-proxy"] === "🔗 入口节点");
  assert.ok(chained);
  assert.match(chained.name, /^🔗 /u);
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

test("operator skips a mixed Shadowrocket collection and logs render-failure counts", async () => {
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
  const result = await operator({}, "Shadowrocket", {
    arguments: { output: "nodes", type: "collection", name: "apple-proxy-shadowrocket", clientChain: "off" },
    async produceArtifact() { return [anytlsNode({ password: "TEST_ONLY_MIXED_ANYTLS_PASSWORD" }), privateNode]; },
    logger: { info(line) { lines.push(line); } },
  });
  const records = recordsOf(result.$content);
  assert.equal(records.length, 1);
  assert.equal(records[0].type, "anytls");
  assert.equal(records[0].password, "TEST_ONLY_MIXED_ANYTLS_PASSWORD");
  for (const secret of [privateNode.name, privateNode.server, privateNode.password]) {
    assert.equal(result.$content.includes(secret), false);
  }
  assert.equal(lines.length, 1);
  const diagnostics = JSON.parse(lines[0].slice("[shadowrocket-node-subscription] ".length));
  assert.deepEqual(diagnostics.renderFailures, { ssh: 1 });
});
