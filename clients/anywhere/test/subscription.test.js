import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { toAnywhereProxy } from "../src/render-node.js";
import {
  prepareAnywhereInventory,
  renderAnywhereSubscription,
} from "../src/render-subscription.js";
import { assertAnywhereSubscription } from "../src/validate-subscription.js";

const BASE = Object.freeze({
  name: "Anywhere Node",
  server: "node.example.invalid",
  port: 443,
});

test("maps exact representative Anywhere Clash proxy objects", () => {
  assert.deepEqual(toAnywhereProxy({
    ...BASE,
    type: "vless",
    uuid: "00000000-0000-4000-8000-000000000001",
    network: "ws",
    tls: true,
    servername: "front.example.invalid",
    alpn: ["h2", "http/1.1"],
    "client-fingerprint": "chrome",
    "ech-opts": { enable: true, config: "TEST_ONLY_ECH_CONFIG" },
    "ws-opts": {
      path: "/edge",
      headers: { Host: "front.example.invalid" },
      "v2ray-http-upgrade": false,
      "max-early-data": 2048,
      "early-data-header-name": "Sec-WebSocket-Protocol",
    },
  }), {
    name: "Anywhere Node",
    type: "vless",
    server: "node.example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    network: "ws",
    encryption: "none",
    tls: true,
    servername: "front.example.invalid",
    alpn: ["h2", "http/1.1"],
    "client-fingerprint": "chrome",
    "ech-opts": { enable: true, config: "TEST_ONLY_ECH_CONFIG" },
    "ws-opts": {
      path: "/edge",
      headers: { Host: "front.example.invalid" },
      "v2ray-http-upgrade": false,
      "max-early-data": 2048,
      "early-data-header-name": "Sec-WebSocket-Protocol",
    },
  });

  assert.deepEqual(toAnywhereProxy({
    ...BASE,
    type: "hy2",
    password: "TEST_ONLY_HYSTERIA_PASSWORD",
    network: "quic",
    sni: "hysteria.example.invalid",
    up: "30 Mbps",
    down: 100,
    obfs: "gecko",
    obfs_password: "TEST_ONLY_GECKO_PASSWORD",
    obfs_min_packet_size: 512,
    obfs_max_packet_size: 1200,
  }), {
    name: "Anywhere Node",
    type: "hysteria2",
    server: "node.example.invalid",
    port: 443,
    password: "TEST_ONLY_HYSTERIA_PASSWORD",
    sni: "hysteria.example.invalid",
    up: "30 Mbps",
    down: 100,
    obfs: "gecko",
    "obfs-password": "TEST_ONLY_GECKO_PASSWORD",
    "obfs-min-packet-size": 512,
    "obfs-max-packet-size": 1200,
  });

  assert.deepEqual(toAnywhereProxy({
    ...BASE,
    type: "trojan",
    password: "TEST_ONLY_TROJAN_PASSWORD",
    sni: "trojan.example.invalid",
  }), {
    ...BASE,
    type: "trojan",
    password: "TEST_ONLY_TROJAN_PASSWORD",
    network: "tcp",
    tls: true,
    servername: "trojan.example.invalid",
  });

  assert.deepEqual(toAnywhereProxy({
    ...BASE,
    type: "anytls",
    password: "TEST_ONLY_ANYTLS_PASSWORD",
    tls: true,
    udp: true,
    sni: "anytls.example.invalid",
    alpn: ["h2", "http/1.1"],
    "client-fingerprint": "chrome",
    "idle-session-check-interval": 30,
    "idle-session-timeout": 60,
    "min-idle-session": 1,
  }), {
    ...BASE,
    type: "anytls",
    password: "TEST_ONLY_ANYTLS_PASSWORD",
    network: "tcp",
    tls: true,
    udp: true,
    servername: "anytls.example.invalid",
    alpn: ["h2", "http/1.1"],
    "client-fingerprint": "chrome",
    "idle-session-check-interval": 30,
    "idle-session-timeout": 60,
    "min-idle-session": 1,
  });

  assert.deepEqual(toAnywhereProxy({
    ...BASE,
    type: "shadowsocks",
    cipher: "2022-blake3-aes-256-gcm",
    password: "TEST_ONLY_SS_PASSWORD",
  }), {
    ...BASE,
    type: "ss",
    cipher: "2022-blake3-aes-256-gcm",
    password: "TEST_ONLY_SS_PASSWORD",
    network: "tcp",
  });

  assert.deepEqual(toAnywhereProxy({
    ...BASE,
    type: "socks5",
    username: "TEST_ONLY_SOCKS_USER",
    password: "TEST_ONLY_SOCKS_PASSWORD",
  }), {
    ...BASE,
    type: "socks5",
    username: "TEST_ONLY_SOCKS_USER",
    password: "TEST_ONLY_SOCKS_PASSWORD",
  });
});

test("rejects an unsupported AnyTLS field before subscription validation", () => {
  const node = {
    ...BASE,
    type: "anytls",
    password: "TEST_ONLY_ANYTLS_UNSUPPORTED_PASSWORD",
    "idle-session-timeout": 60,
    "unsupported-anytls-field": "TEST_ONLY_UNSUPPORTED_ANYTLS_VALUE",
  };
  assert.throws(
    () => toAnywhereProxy(node),
    (error) => error.message === "Anywhere cannot render protocol: anytls"
      && !error.message.includes(node.name)
      && !error.message.includes(node.server)
      && !error.message.includes(node.password),
  );
  assert.throws(
    () => renderAnywhereSubscription([node]),
    /^Error: Anywhere cannot render selected protocols: anytls=1$/u,
  );
});

test("renders AnyTLS nodes carrying Sub-Store collection metadata", () => {
  const node = {
    ...BASE,
    type: "anytls",
    password: "TEST_ONLY_ANYTLS_METADATA_PASSWORD",
    tls: true,
    udp: true,
    sni: "anytls.example.invalid",
    alpn: ["h2", "http/1.1"],
    "client-fingerprint": "chrome",
    "idle-session-check-interval": 30,
    "idle-session-timeout": 30,
    "min-idle-session": 0,
    "skip-cert-verify": false,
    _subName: "anytls",
    _subDisplayName: "",
    _collectionName: "apple-proxy-anywhere",
    _collectionDisplayName: "Apple Proxy Anywhere",
    id: 9,
  };
  const proxy = toAnywhereProxy(node);
  assert.equal(proxy.type, "anytls");
  assert.equal(proxy.udp, true);
  assert.equal(proxy.servername, "anytls.example.invalid");
  assert.match(renderAnywhereSubscription([node]), /^proxies:\n/u);
});

test("canonicalizes every verified Sudoku alias without losing semantics", () => {
  assert.deepEqual(toAnywhereProxy({
    ...BASE,
    type: "sudoku",
    key: "TEST_ONLY_SUDOKU_KEY",
    aead: "aes-128-gcm",
    ascii: "ascii",
    custom_tables: ["one", "two"],
    padding_min: 5,
    padding_max: 25,
    enable_pure_downlink: false,
    multiplex: "on",
    httpmask: { disable: false, mode: "ws", tls: true, host: "mask.example.invalid", path_root: "edge" },
  }), {
    ...BASE,
    type: "sudoku",
    key: "TEST_ONLY_SUDOKU_KEY",
    "aead-method": "aes-128-gcm",
    "table-type": "prefer_ascii",
    "custom-tables": ["one", "two"],
    "padding-min": 5,
    "padding-max": 25,
    "enable-pure-downlink": false,
    multiplex: "on",
    httpmask: { disable: false, mode: "ws", tls: true, host: "mask.example.invalid", "path-root": "edge" },
  });
});

test("rejects a mixed inventory without diagnostics or partial YAML", () => {
  const nodes = [
    { ...BASE, name: "Good AnyTLS", type: "anytls", password: "TEST_ONLY_GOOD_PASSWORD" },
    { ...BASE, name: "Bad future protocol", type: " Future-Proto ", password: "TEST_ONLY_FUTURE_PASSWORD" },
    { ...BASE, name: "Bad transport", type: "trojan", password: "TEST_ONLY_BAD_PASSWORD", network: "grpc" },
  ];
  let diagnostics;
  assert.throws(
    () => prepareAnywhereInventory(nodes, { onDiagnostics: (value) => { diagnostics = value; } }),
    /Anywhere cannot render selected protocols: future-proto=1,trojan=1/u,
  );
  let yaml;
  assert.throws(
    () => { yaml = renderAnywhereSubscription(nodes); },
    (error) => {
      assert.equal(error.message, "Anywhere cannot render selected protocols: future-proto=1,trojan=1");
      for (const node of nodes) {
        for (const value of [node.name, node.server, node.password]) {
          if (value !== undefined) assert.equal(error.message.includes(String(value)), false);
        }
      }
      return true;
    },
  );
  assert.equal(diagnostics, undefined);
  assert.equal(yaml, undefined);
});

test("independently round-trips the actual YAML and exposes only proxies at root", (t) => {
  const yaml = renderAnywhereSubscription([
    { ...BASE, type: "ss", cipher: "aes-128-gcm", password: "TEST_ONLY_ROUNDTRIP_PASSWORD" },
  ]);
  const ruby = spawnSync(
    "ruby",
    ["-e", "require 'json'; require 'yaml'; puts JSON.generate(YAML.safe_load(STDIN.read, aliases: false))"],
    { input: yaml, encoding: "utf8" },
  );
  if (ruby.error?.code === "ENOENT") {
    t.skip("Ruby/Psych independent YAML parser is unavailable");
    return;
  }
  assert.equal(ruby.status, 0, ruby.stderr);
  const parsed = JSON.parse(ruby.stdout);
  assert.deepEqual(Object.keys(parsed), ["proxies"]);
  assert.equal(parsed.proxies.length, 1);
  assert.equal(parsed.proxies[0].type, "ss");
});

test("fails closed for duplicate names, unrenderable protocols, and mutated YAML", () => {
  const good = { ...BASE, type: "ss", cipher: "aes-128-gcm", password: "TEST_ONLY_PASSWORD" };
  assert.throws(() => renderAnywhereSubscription([good, { ...good, server: "other.example.invalid" }]), /Duplicate Anywhere proxy name/);
  assert.throws(
    () => renderAnywhereSubscription([{ ...BASE, type: "snell" }]),
    /Anywhere cannot render selected protocols: snell=1/u,
  );
  const yaml = renderAnywhereSubscription([good]);
  const proxies = prepareAnywhereInventory([good]).proxies;
  for (const mutation of [
    `${yaml}dns: {}\n`,
    yaml.replace("proxies:", "proxies: &nodes"),
    yaml.replace('type: "ss"', 'type: "trojan"'),
    yaml.replace('password: "TEST_ONLY_PASSWORD"', 'password: "TEST_ONLY_CHANGED_PASSWORD"'),
  ]) {
    assert.throws(() => assertAnywhereSubscription(mutation, proxies), /Invalid Anywhere subscription/);
  }
});

test("renders the shared normalized inventory and contains hostile failures", () => {
  const normalized = normalizeNodes([{
    ...BASE,
    name: "机场 香港",
    type: "ss",
    cipher: "aes-128-gcm",
    password: "TEST_ONLY_NORMALIZED_PASSWORD",
    _subDisplayName: "机场订阅",
  }]);
  assert.equal(normalized.nodes[0].name, "🇭🇰 机场 香港 · SS");
  assert.equal(prepareAnywhereInventory(normalized.nodes).proxies[0].name, "🇭🇰 机场 香港 · SS");
  const yaml = renderAnywhereSubscription(normalized.nodes);
  assert.match(yaml, /^proxies:\n/u);
  assert.match(yaml, /name: "🇭🇰 机场 香港 · SS"/u);
  assert.match(yaml, /type: "ss"/u);

  const anytls = normalizeNodes([{
    ...BASE,
    name: "东京 AnyTLS",
    type: "anytls",
    password: "TEST_ONLY_NORMALIZED_ANYTLS_PASSWORD",
    alpn: ["h2"],
    "client-fingerprint": "chrome",
    "idle-session-check-interval": 30,
    "idle-session-timeout": 60,
    "min-idle-session": 1,
    udp: true,
    _subDisplayName: "[自建] 东京 AnyTLS",
  }]).nodes;
  const anytlsYaml = renderAnywhereSubscription(anytls);
  assert.match(anytls[0].name, / · AnyTLS｜自建·U$/u);
  assert.match(anytlsYaml, /^proxies:\n/u);
  assert.match(anytlsYaml, / · AnyTLS｜自建/u);
  assert.match(anytlsYaml, /udp: true/u);
  assert.deepEqual(assertAnywhereSubscription(anytlsYaml, prepareAnywhereInventory(anytls).proxies), { proxyCount: 1 });

  const hostileMarker = "SHOULD_NOT_ESCAPE_ANYWHERE_ERRORS";
  const hostile = {};
  Object.defineProperty(hostile, "type", { get() { throw new Error(hostileMarker); } });
  assert.throws(
    () => renderAnywhereSubscription([hostile]),
    (error) => error.message === "Anywhere cannot render selected protocols: unknown=1"
      && !error.message.includes(hostileMarker),
  );
  assert.throws(
    () => toAnywhereProxy(hostile),
    (error) => error.message === "Anywhere cannot render protocol: unknown" && !error.message.includes(hostileMarker),
  );

  const hostileOptions = {};
  Object.defineProperty(hostileOptions, "onDiagnostics", { get() { throw new Error(hostileMarker); } });
  for (const options of [null, [], { unknown: true }, hostileOptions]) {
    assert.throws(
      () => renderAnywhereSubscription(normalized.nodes, options),
      (error) => error.message === "Invalid Anywhere render options" && !error.message.includes(hostileMarker),
    );
  }
});
