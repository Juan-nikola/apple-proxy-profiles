import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-config-entry.js";

const nodes = [{
  name: "🇯🇵 [机场] Tokyo A",
  type: "ss",
  server: "198.51.100.10",
  port: 443,
  cipher: "aes-256-gcm",
  password: "TEST_ONLY_PASSWORD",
  _profile: {
    id: "fixture",
    continent: "asiaPacific",
    sourceKind: "airport",
    flag: "🇯🇵",
    udp: true,
    p2p: false,
    entry: true,
    chained: false,
  },
}];

test("Sub-Store sing-box entry requests a private collection and returns JSON content", async () => {
  const calls = [];
  const result = await operator(
    { id: "input" },
    "openwrt",
    {
      arguments: {
        output: "config",
        type: "collection",
        name: "apple-proxy-singbox",
        subscriptionName: "sing-box-Nodes",
        platform: "openwrt",
        channel: "edge",
      },
      async produceArtifact(request) {
        calls.push(request);
        return nodes;
      },
    },
  );
  assert.deepEqual(calls, [{
    type: "collection",
    name: "apple-proxy-singbox",
    platform: "JSON",
    produceType: "internal",
  }]);
  const config = JSON.parse(result.$content);
  assert.equal(config.inbounds[0].auto_redirect, true);
  assert.ok(config.route.rule_set[0].url.includes("/edge/sing-box/rule-sets/"));
  assert.equal(config.route.rule_set.every(({ format, url }) => format === "binary" && url.endsWith(".srs")), true);
  assert.equal(result.$content.endsWith("\n"), true);
});

test("Sub-Store passes the light/diagnostic profile API and never emits source rules", async () => {
  const result = await operator(
    { id: "input" },
    "macos",
    {
      arguments: {
        output: "config",
        type: "collection",
        name: "sing-box-sources",
        subscriptionName: "sing-box-Nodes",
        platform: "macos",
        profileMode: "diagnostic",
      },
      async produceArtifact() { return nodes; },
    },
  );
  const config = JSON.parse(result.$content);
  assert.deepEqual(config.route.rule_set, []);
  assert.equal(result.$content.includes('"format": "source"'), false);
});

test("Sub-Store sing-box entry normalizes raw collection nodes before rendering", async () => {
  const rawNodes = nodes.map(({ _profile, ...node }) => ({ ...node, reuse: true, tfo: true, udp_relay: true }));
  const result = await operator(
    { id: "input" },
    "macos",
    {
      arguments: {
        output: "config",
        type: "collection",
        name: "apple-proxy-sources",
        subscriptionName: "Apple-Proxy-Nodes",
        platform: "macos",
      },
      async produceArtifact() {
        return rawNodes;
      },
    },
  );
  const config = JSON.parse(result.$content);
  assert.equal(config.log.level, "info");
  assert.ok(config.outbounds.some((outbound) => outbound.type === "shadowsocks"));
});

test("Sub-Store sing-box entry retains normalized AnyTLS fields in the complete config", async () => {
  const result = await operator({}, "macos", {
    arguments: {
      output: "config",
      type: "collection",
      name: "apple-proxy-singbox",
      subscriptionName: "sing-box-Nodes",
      platform: "macos",
    },
    async produceArtifact() {
      return [{
        name: "Tokyo AnyTLS",
        type: "anytls",
        server: "anytls.example.invalid",
        port: 443,
        password: "TEST_ONLY_ANYTLS_PASSWORD",
        tls: true,
        sni: "anytls.example.invalid",
        alpn: ["h2"],
        "client-fingerprint": "chrome",
        "idle-session-check-interval": 30,
        "idle-session-timeout": 60,
        "min-idle-session": 1,
        _subName: "[自建] AnyTLS",
      }];
    },
  });
  const outbound = JSON.parse(result.$content).outbounds.find(({ type }) => type === "anytls");
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
      alpn: ["h2"],
      utls: { enabled: true, fingerprint: "chrome" },
    },
  });
});

test("Sub-Store sing-box entry keeps VLESS, AnyTLS and Snell from a real mixed inventory", async () => {
  const lines = [];
  const result = await operator({}, "macos", {
    arguments: {
      output: "config",
      type: "collection",
      name: "apple-proxy-singbox",
      subscriptionName: "sing-box-Nodes",
      platform: "macos",
    },
    async produceArtifact() {
      return [{
        name: "🇭🇰 阿里云香港 · VLESS｜自建·U",
        type: "vless",
        server: "vless.example.invalid",
        port: 48254,
        udp: true,
        tls: true,
        sni: "apple.com",
        flow: "xtls-rprx-vision",
        network: "tcp",
        encryption: "none",
        "packet-encoding": "xudp",
        "client-fingerprint": "chrome",
        "skip-cert-verify": false,
        uuid: "00000000-0000-4000-8000-000000000001",
        "reality-opts": {
          "public-key": "TEST_ONLY_SINGBOX_PUBLIC_KEY",
          "short-id": "34cde204",
          "_spider-x": "/test-only-spider",
        },
        _subName: "[自建] VLESS",
      }, {
        name: "🇯🇵 Neburst-JP · AnyTLS·U",
        type: "anytls",
        server: "anytls.example.invalid",
        port: 37311,
        udp: true,
        tls: true,
        sni: "anytls.example.invalid",
        alpn: ["h2", "http/1.1"],
        "client-fingerprint": "chrome",
        "idle-session-check-interval": 30,
        "idle-session-timeout": 30,
        "min-idle-session": 0,
        "skip-cert-verify": false,
        password: "TEST_ONLY_ANYTLS_PASSWORD",
        _subName: "[自建] AnyTLS",
      }, {
        name: "🇭🇰 阿里云香港 · Snell｜自建·U",
        type: "snell",
        server: "snell.example.invalid",
        port: 60001,
        udp: true,
        psk: "TEST_ONLY_SNELL_PSK",
        version: 5,
        reuse: true,
        tfo: true,
        _subName: "[自建] Snell",
      }];
    },
    logger: { info(line) { lines.push(line); } },
  });
  const config = JSON.parse(result.$content);
  const types = config.outbounds.map(({ type }) => type);
  assert.deepEqual(types.filter((type) => ["vless", "anytls", "snell"].includes(type)).sort(), ["anytls", "snell", "vless"]);
  const vless = config.outbounds.find(({ type }) => type === "vless");
  assert.equal(vless.packet_encoding, "xudp");
  assert.equal(Object.hasOwn(vless.tls.reality, "spider_x"), false);
  assert.equal(config.outbounds.find(({ type }) => type === "anytls").server_port, 37311);
  assert.equal(config.outbounds.find(({ type }) => type === "snell").version, 4);
  assert.equal(config.outbounds.some(({ tls }) => tls?.reality && Object.hasOwn(tls.reality, "spider_x")), false);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes('"accepted":3,"renderFailures":{}'), true);
});

test("Sub-Store sing-box entry rejects unsafe collection names before artifact production", async () => {
  for (const name of ["中文", "sing-box/sources", "sing-box?sources", "sing-box#sources", " sing-box-sources", "sing-box-sources ", "sing-box\nsources", "prototype"]) {
    let called = false;
    await assert.rejects(operator({}, "macos", {
      arguments: {
        output: "config",
        type: "collection",
        name,
        subscriptionName: "sing-box-Nodes",
        platform: "macos",
      },
      async produceArtifact() { called = true; return nodes; },
    }), /name/i, JSON.stringify(name));
    assert.equal(called, false, JSON.stringify(name));
  }
});

test("Sub-Store sing-box entry keeps the compatible subset and reports skipped protocols", async () => {
  const privateNode = {
    name: "PRIVATE_SINGBOX_SUDOKU",
    type: "sudoku",
    server: "private-singbox.example.invalid",
    port: 443,
    key: "TEST_ONLY_SINGBOX_SUDOKU_KEY",
    _subName: "[自建] Sudoku",
  };
  const lines = [];
  const result = await operator({}, "macos", {
    arguments: {
      output: "config",
      type: "collection",
      name: "sing-box-sources",
      subscriptionName: "sing-box-Nodes",
      platform: "macos",
    },
    async produceArtifact() { return [nodes[0], privateNode]; },
    logger: { info(line) { lines.push(line); } },
  });
  const config = JSON.parse(result.$content);
  assert.equal(config.outbounds.some(({ type }) => type === "shadowsocks"), true);
  assert.equal(JSON.stringify(config).includes(privateNode.name), false);
  assert.equal(JSON.stringify(config).includes(privateNode.key), false);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes('"accepted":1,"renderFailures":{"sudoku":1}'), true);
  assert.equal(lines[0].includes(privateNode.name), false);
});

test("Sub-Store sing-box renderability skips an unsupported selected AnyTLS field", async () => {
  const privateNode = {
    name: "PRIVATE_SINGBOX_ANYTLS",
    type: "anytls",
    server: "private-anytls.example.invalid",
    port: 443,
    password: "TEST_ONLY_SINGBOX_ANYTLS_PASSWORD",
    "future-option": "TEST_ONLY_SINGBOX_FUTURE_VALUE",
    _subName: "[自建] AnyTLS",
  };
  const lines = [];
  const result = await operator({}, "macos", {
    arguments: {
      output: "config",
      type: "collection",
      name: "apple-proxy-singbox",
      subscriptionName: "sing-box-Nodes",
      platform: "macos",
    },
    async produceArtifact() { return [nodes[0], privateNode]; },
    logger: { info(line) { lines.push(line); } },
  });
  const config = JSON.parse(result.$content);
  assert.equal(config.outbounds.some(({ type }) => type === "shadowsocks"), true);
  assert.equal(config.outbounds.some(({ type }) => type === "anytls"), false);
  assert.equal(JSON.stringify(config).includes(privateNode["future-option"]), false);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes('"accepted":1,"renderFailures":{"anytls":1}'), true);
  assert.equal(lines[0].includes(privateNode.name), false);
});

test("Sub-Store sing-box probe skips an unmapped nested AnyTLS Reality field", async () => {
  const privateNode = {
    name: "PRIVATE_SINGBOX_ANYTLS_REALITY",
    type: "anytls",
    server: "private-anytls-reality.example.invalid",
    port: 443,
    password: "TEST_ONLY_SINGBOX_ANYTLS_REALITY_PASSWORD",
    security: "reality",
    "reality-opts": {
      "public-key": "TEST_ONLY_SINGBOX_ANYTLS_PUBLIC_KEY",
      "short-id": "0123abcd",
      "future-option": "TEST_ONLY_SINGBOX_NESTED_FUTURE_VALUE",
    },
    _subName: "[自建] AnyTLS",
  };
  const lines = [];
  const result = await operator({}, "macos", {
    arguments: {
      output: "config",
      type: "collection",
      name: "apple-proxy-singbox",
      subscriptionName: "sing-box-Nodes",
      platform: "macos",
    },
    async produceArtifact() { return [nodes[0], privateNode]; },
    logger: { info(line) { lines.push(line); } },
  });
  const config = JSON.parse(result.$content);
  assert.equal(config.outbounds.some(({ type }) => type === "shadowsocks"), true);
  assert.equal(config.outbounds.some(({ type }) => type === "anytls"), false);
  assert.equal(JSON.stringify(config).includes(privateNode["reality-opts"]["public-key"]), false);
  assert.equal(JSON.stringify(config).includes(privateNode["reality-opts"]["future-option"]), false);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes('"accepted":1,"renderFailures":{"anytls":1}'), true);
  assert.equal(lines[0].includes(privateNode.name), false);
});
