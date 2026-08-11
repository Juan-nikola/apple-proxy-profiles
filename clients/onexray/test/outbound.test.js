import assert from "node:assert/strict";
import test from "node:test";

import { renderOneXrayOutbound } from "../src/render-outbound.js";

const COMMON = Object.freeze({
  name: "OneXray normalized display name",
  server: "one.example.invalid",
  port: 443,
  _profile: { chained: false },
});
const UUID = "00000000-0000-4000-8000-000000000001";
const REALITY_KEY = "A".repeat(43);

function render(node, tag) {
  return renderOneXrayOutbound(node, { tag });
}

function raw(security = "none") {
  return { network: "raw", rawSettings: {}, security };
}

test("renders every admitted protocol with its exact OneXray settings model", () => {
  const cases = [
    {
      node: { ...COMMON, type: "vless", uuid: UUID, flow: "xtls-rprx-vision", encryption: "none", reverse: { tag: "reverse-entry" }, network: "raw" },
      tag: "ap-node-vless",
      protocol: "vless",
      settings: { address: "one.example.invalid", port: 443, id: UUID, flow: "xtls-rprx-vision", encryption: "none", reverse: { tag: "reverse-entry" } },
      streamSettings: raw(),
    },
    {
      node: { ...COMMON, type: "vmess", uuid: UUID, security: "aes-128-gcm", network: "raw" },
      tag: "ap-node-vmess",
      protocol: "vmess",
      settings: { address: "one.example.invalid", port: 443, id: UUID, security: "aes-128-gcm" },
      streamSettings: raw(),
    },
    {
      node: { ...COMMON, type: "ss", cipher: "aes-128-gcm", password: "TEST_ONLY_SS_PASSWORD" },
      tag: "ap-node-ss",
      protocol: "shadowsocks",
      settings: { address: "one.example.invalid", port: 443, method: "aes-128-gcm", password: "TEST_ONLY_SS_PASSWORD" },
      streamSettings: raw(),
    },
    {
      node: { ...COMMON, type: "trojan", password: "TEST_ONLY_TROJAN_PASSWORD", tls: true },
      tag: "ap-node-trojan",
      protocol: "trojan",
      settings: { address: "one.example.invalid", port: 443, password: "TEST_ONLY_TROJAN_PASSWORD" },
      streamSettings: { ...raw("tls"), tlsSettings: {} },
    },
    {
      node: { ...COMMON, type: "socks5", username: "fixture-user", password: "TEST_ONLY_SOCKS_PASSWORD" },
      tag: "ap-node-socks",
      protocol: "socks",
      settings: { address: "one.example.invalid", port: 443, user: "fixture-user", pass: "TEST_ONLY_SOCKS_PASSWORD" },
      streamSettings: raw(),
    },
    {
      node: { ...COMMON, type: "http", username: "fixture-user", password: "TEST_ONLY_HTTP_PASSWORD", headers: { Host: "proxy.example.invalid" } },
      tag: "ap-node-http",
      protocol: "http",
      settings: { address: "one.example.invalid", port: 443, user: "fixture-user", pass: "TEST_ONLY_HTTP_PASSWORD", headers: { Host: "proxy.example.invalid" } },
      streamSettings: raw(),
    },
    {
      node: { ...COMMON, type: "hysteria2", password: "TEST_ONLY_HYSTERIA_PASSWORD", network: "quic" },
      tag: "ap-node-hysteria",
      protocol: "hysteria",
      settings: { version: 2, address: "one.example.invalid", port: 443 },
      streamSettings: {
        network: "hysteria",
        hysteriaSettings: { version: 2, auth: "TEST_ONLY_HYSTERIA_PASSWORD" },
        security: "tls",
        tlsSettings: {},
      },
    },
  ];

  for (const { node, tag, protocol, settings, streamSettings } of cases) {
    assert.deepEqual(render(node, tag), {
      name: "OneXray normalized display name",
      protocol,
      settings,
      tag,
      streamSettings,
      mux: { enabled: false },
    }, protocol);
  }
});

test("renders TLS and REALITY aliases with the audited false verification default", () => {
  const tlsOutbound = render({
    ...COMMON,
    type: "vless",
    uuid: UUID,
    tls: true,
    sni: "tls.example.invalid",
    alpn: ["h2"],
    "client-fingerprint": "chrome",
  }, "ap-node-tls");
  assert.deepEqual(tlsOutbound, {
    name: "OneXray normalized display name",
    protocol: "vless",
    settings: { address: "one.example.invalid", port: 443, id: UUID, encryption: "none" },
    tag: "ap-node-tls",
    streamSettings: {
      ...raw("tls"),
      tlsSettings: {
        serverName: "tls.example.invalid",
        alpn: ["h2"],
        fingerprint: "chrome",
      },
    },
    mux: { enabled: false },
  });
  assert.equal(Object.hasOwn(tlsOutbound.streamSettings.tlsSettings, "allowInsecure"), false);
  assert.deepEqual(render({
    ...COMMON,
    type: "vless",
    uuid: UUID,
    security: "reality",
    sni: "reality.example.invalid",
    "client-fingerprint": "chrome",
    "reality-opts": { "public-key": REALITY_KEY, "short-id": "0123abcd", "spider-x": "/crawl" },
  }, "ap-node-reality"), {
    name: "OneXray normalized display name",
    protocol: "vless",
    settings: { address: "one.example.invalid", port: 443, id: UUID, encryption: "none" },
    tag: "ap-node-reality",
    streamSettings: {
      ...raw("reality"),
      realitySettings: {
        fingerprint: "chrome",
        serverName: "reality.example.invalid",
        publicKey: REALITY_KEY,
        shortId: "0123abcd",
        spiderX: "/crawl",
      },
    },
    mux: { enabled: false },
  });
});

test("renders every admitted raw, WebSocket, gRPC, HTTPUpgrade, XHTTP, KCP, and Hysteria transport", () => {
  const base = { ...COMMON, type: "vless", uuid: UUID };
  const transports = [
    [{ ...base, network: "raw" }, raw()],
    [{ ...base, network: "ws", "ws-opts": { path: "/ws", headers: { Host: "ws.example.invalid" } } }, { network: "ws", wsSettings: { path: "/ws", host: "ws.example.invalid" }, security: "none" }],
    [{ ...base, network: "grpc", "grpc-opts": { "grpc-service-name": "grpc-service" } }, { network: "grpc", grpcSettings: { serviceName: "grpc-service" }, security: "none" }],
    [{ ...base, network: "httpupgrade", "httpupgrade-opts": { path: "/upgrade", host: "upgrade.example.invalid" } }, { network: "httpupgrade", httpupgradeSettings: { path: "/upgrade", host: "upgrade.example.invalid" }, security: "none" }],
    [{ ...base, network: "xhttp", "xhttp-opts": { path: "/xhttp", host: "xhttp.example.invalid", mode: "auto" } }, { network: "xhttp", xhttpSettings: { path: "/xhttp", host: "xhttp.example.invalid", mode: "auto" }, security: "none" }],
    [{ ...base, network: "kcp", "kcp-opts": {} }, { network: "kcp", kcpSettings: {}, security: "none" }],
  ];
  for (const [node, streamSettings] of transports) {
    assert.deepEqual(render(node, `ap-node-${node.network}`).streamSettings, streamSettings, node.network);
  }
});

test("does not mutate input and keeps raw display names out of all fields except name", () => {
  const node = {
    ...COMMON,
    type: "vless",
    name: "private raw node name",
    uuid: UUID,
    network: "ws",
    "ws-opts": { path: "/ws", headers: { Host: "ws.example.invalid" } },
  };
  const before = structuredClone(node);
  const outbound = render(node, "ap-node-opaque");
  assert.deepEqual(node, before);
  assert.equal(outbound.name, "private raw node name");
  assert.equal(JSON.stringify({ ...outbound, name: undefined }).includes(node.name), false);
});

test("allows only exact node names when explicit display tags are enabled", () => {
  const node = { ...COMMON, type: "vless", uuid: UUID, network: "raw" };
  const outbound = renderOneXrayOutbound(node, {
    tag: node.name,
    allowDisplayTag: true,
  });

  assert.equal(outbound.tag, "OneXray normalized display name");
  assert.throws(
    () => renderOneXrayOutbound(node, { tag: `${node.name} duplicate`, allowDisplayTag: true }),
    { message: "duplicate-onexray-tag" },
  );
});

test("rejects rejected admission shapes, certificate bypasses, and reserved or duplicate tags", () => {
  const node = { ...COMMON, type: "vless", uuid: UUID, network: "raw" };
  for (const tag of ["proxy", "chainProxy", "direct", "fragment", "block", "dnsOut", "tunIn", "pingIn", node.name]) {
    assert.throws(() => render(node, tag), /tag/i, tag);
  }
  assert.throws(() => render({ ...node, type: "hy2" }, "ap-node-rejected"), /unsupported-onexray-protocol/);
  assert.throws(() => render({ ...node, tls: true, "allow-insecure": true }, "ap-node-bypass"), /unsupported-onexray-option/);
  const tags = new Set(["ap-node-duplicate"]);
  assert.throws(() => renderOneXrayOutbound(node, { tag: "ap-node-duplicate", tags }), /duplicate-onexray-tag/);
});

test("rejects VMess TLS security before protocol settings can be rendered", () => {
  assert.throws(
    () => render({ ...COMMON, type: "vmess", uuid: UUID, security: "tls" }, "ap-node-vmess-tls"),
    { message: "invalid-onexray-node-shape" },
  );
});
