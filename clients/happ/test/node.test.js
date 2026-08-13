import test from "node:test";
import assert from "node:assert/strict";
import { renderHappOutbound, renderHappStreamSettings } from "../src/render-node.js";
import {
  hysteria2,
  fixtureUuid,
  shadowsocksUdp,
  socks5Authenticated,
  socks5Unauthenticated,
  trojanGrpc,
  trojanTls,
  trojanWebSocket,
  vlessGrpc,
  vlessRealityRaw,
  vlessWebSocket,
  vmessGrpc,
  vmessTls,
} from "./fixtures/nodes.js";

test("renders VLESS vnext users with REALITY over raw", () => {
  assert.deepEqual(renderHappOutbound(vlessRealityRaw, "happ-node-7v3kq"), {
    tag: "happ-node-7v3kq",
    protocol: "vless",
    settings: {
      vnext: [{
        address: "vless-reality.example.invalid",
        port: 443,
        users: [{
          id: fixtureUuid,
          encryption: "none",
          flow: "xtls-rprx-vision",
        }],
      }],
    },
    streamSettings: {
      method: "raw",
      rawSettings: {},
      security: "reality",
      realitySettings: {
        serverName: "reality.example.invalid",
        fingerprint: "chrome",
        password: "A".repeat(43),
        shortId: "0123abcd",
        spiderX: "/crawl?seed=1",
      },
    },
  });
});

test("refuses REALITY options without current Xray output fields", () => {
  assert.throws(
    () => renderHappStreamSettings({ ...vlessRealityRaw, alpn: ["h2"] }),
    /unsupported-happ-reality/,
  );
  assert.throws(
    () => renderHappStreamSettings({ ...vlessRealityRaw, "allow-insecure": true }),
    /unsupported-happ-reality/,
  );
});

test("omits explicit false REALITY certificate-bypass aliases", () => {
  assert.deepEqual(renderHappStreamSettings({
    ...vlessRealityRaw,
    "skip-cert-verify": false,
    "allow-insecure": false,
  }), {
    method: "raw",
    rawSettings: {},
    security: "reality",
    realitySettings: {
      serverName: "reality.example.invalid",
      fingerprint: "chrome",
      password: "A".repeat(43),
      shortId: "0123abcd",
      spiderX: "/crawl?seed=1",
    },
  });
});

test("renders VLESS WebSocket and gRPC transport settings exactly", () => {
  assert.deepEqual(renderHappStreamSettings(vlessWebSocket), {
    method: "websocket",
    wsSettings: {
      path: "/vless",
      headers: { Host: "edge.example.invalid", "X-Test": "fixture" },
    },
    security: "tls",
    tlsSettings: { serverName: "ws.example.invalid" },
  });
  assert.deepEqual(renderHappStreamSettings(vlessGrpc), {
    method: "grpc",
    grpcSettings: { serviceName: "vless-edge" },
    security: "tls",
    tlsSettings: {},
  });
});

test("renders VMess users with TLS and each admitted transport", () => {
  assert.deepEqual(renderHappOutbound(vmessTls, "happ-node-vmess-ws"), {
    tag: "happ-node-vmess-ws",
    protocol: "vmess",
    settings: {
      vnext: [{
        address: "vmess.example.invalid",
        port: 443,
        users: [{ id: fixtureUuid, alterId: 0, security: "aes-128-gcm" }],
      }],
    },
    streamSettings: {
      method: "websocket",
      wsSettings: { path: "/vmess", headers: { Host: "vmess-edge.example.invalid" } },
      security: "tls",
      tlsSettings: {
        serverName: "vmess.example.invalid",
        alpn: ["http/1.1"],
        fingerprint: "firefox",
        allowInsecure: true,
      },
    },
  });
  assert.deepEqual(renderHappStreamSettings(vmessGrpc), {
    method: "grpc",
    grpcSettings: { serviceName: "vmess-edge" },
    security: "tls",
    tlsSettings: {},
  });
});

test("renders Trojan servers with raw, WebSocket, and gRPC TLS transports", () => {
  assert.deepEqual(renderHappOutbound(trojanTls, "happ-node-trojan-raw"), {
    tag: "happ-node-trojan-raw",
    protocol: "trojan",
    settings: { servers: [{ address: "trojan.example.invalid", port: 443, password: "TEST_ONLY_TROJAN_PASSWORD" }] },
    streamSettings: { method: "raw", rawSettings: {}, security: "tls", tlsSettings: { serverName: "trojan.example.invalid" } },
  });
  assert.deepEqual(renderHappStreamSettings(trojanWebSocket), {
    method: "websocket",
    wsSettings: { path: "/trojan" },
    security: "tls",
    tlsSettings: {},
  });
  assert.deepEqual(renderHappStreamSettings(trojanGrpc), {
    method: "grpc",
    grpcSettings: { serviceName: "trojan-edge" },
    security: "tls",
    tlsSettings: {},
  });
});

test("renders Shadowsocks server credentials with native UDP and TCP Fast Open", () => {
  assert.deepEqual(renderHappOutbound(shadowsocksUdp, "happ-node-ss-udp"), {
    tag: "happ-node-ss-udp",
    protocol: "shadowsocks",
    settings: {
      servers: [{
        address: "ss.example.invalid",
        port: 8388,
        method: "aes-128-gcm",
        password: "TEST_ONLY_SS_PASSWORD",
      }],
    },
    streamSettings: { method: "raw", rawSettings: {}, security: "none", sockopt: { tcpFastOpen: true } },
  });
});

test("renders SOCKS5 servers with optional private credentials", () => {
  assert.deepEqual(renderHappOutbound(socks5Authenticated, "happ-node-socks-auth"), {
    tag: "happ-node-socks-auth",
    protocol: "socks",
    settings: {
      servers: [{
        address: "socks.example.invalid",
        port: 1080,
        users: [{ user: "TEST_ONLY_SOCKS_USER", pass: "TEST_ONLY_SOCKS_PASSWORD" }],
      }],
    },
    streamSettings: { method: "raw", rawSettings: {}, security: "none" },
  });
  assert.deepEqual(renderHappOutbound(socks5Unauthenticated, "happ-node-socks-open").settings, {
    servers: [{ address: "socks-public.example.invalid", port: 1080 }],
  });
});

test("renders Hysteria2 as the Hysteria proxy plus Hysteria transport", () => {
  assert.deepEqual(renderHappOutbound(hysteria2, "happ-node-hy2"), {
    tag: "happ-node-hy2",
    protocol: "hysteria",
    settings: { version: 2, address: "hy2.example.invalid", port: 443 },
    streamSettings: {
      method: "hysteria",
      hysteriaSettings: { version: 2, auth: "TEST_ONLY_HYSTERIA_AUTH" },
      security: "tls",
      tlsSettings: { serverName: "hy2.example.invalid", alpn: ["h3"], fingerprint: "chrome" },
      finalmask: {
        udp: [{ type: "salamander", settings: { password: "TEST_ONLY_HYSTERIA_OBFS" } }],
      },
    },
  });
});

test("retains only supplied opaque tags and never derives them from normalized names", () => {
  const outbounds = [
    renderHappOutbound(vlessRealityRaw, "happ-node-b5f7c"),
    renderHappOutbound(vmessTls, "happ-node-q2m9x"),
  ];
  const tags = outbounds.map((outbound) => outbound.tag);
  assert.equal(new Set(tags).size, tags.length);
  for (const [outbound, node] of [[outbounds[0], vlessRealityRaw], [outbounds[1], vmessTls]]) {
    assert.equal(outbound.tag.includes(node.name), false);
    assert.equal(outbound.tag.includes(node.server), false);
    assert.equal(outbound.tag.includes(node.uuid), false);
  }
});

test("rejects tags that contain private node credentials", () => {
  for (const [node, credential] of [
    [vlessRealityRaw, vlessRealityRaw.uuid],
    [vlessRealityRaw, vlessRealityRaw["reality-opts"]["public-key"]],
    [trojanTls, trojanTls.password],
    [socks5Authenticated, socks5Authenticated.username],
    [socks5Authenticated, socks5Authenticated.password],
    [hysteria2, hysteria2.password],
    [hysteria2, hysteria2["obfs-password"]],
  ]) {
    assert.throws(
      () => renderHappOutbound(node, `happ-node-${credential}`),
      /tag must be opaque/,
    );
  }
});
