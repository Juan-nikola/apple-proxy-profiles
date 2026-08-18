import assert from "node:assert/strict";
import test from "node:test";

import { renderOneXrayOutbound } from "../src/render-outbound.js";

const VLESS = {
  name: "🇯🇵 Tokyo",
  type: "vless",
  server: "example.invalid",
  port: 443,
  uuid: "00000000-0000-4000-8000-000000000001",
  flow: "xtls-rprx-vision",
  tls: true,
  sni: "www.example.com",
  network: "ws",
  "ws-opts": { path: "/proxy", headers: { Host: "www.example.com" } },
};

test("renders a lossless VLESS structured outbound", () => {
  const input = structuredClone(VLESS);
  const outbound = renderOneXrayOutbound(VLESS, { tag: "ap-node-1" });
  assert.deepEqual(outbound, {
    name: "🇯🇵 Tokyo",
    protocol: "vless",
    tag: "ap-node-1",
    settings: {
      vnext: [{ address: "example.invalid", port: 443, users: [{ id: "00000000-0000-4000-8000-000000000001", encryption: "none", flow: "xtls-rprx-vision" }] }],
    },
    streamSettings: {
      network: "ws",
      security: "tls",
      tlsSettings: { serverName: "www.example.com", allowInsecure: false },
      wsSettings: { path: "/proxy", headers: { Host: "www.example.com" } },
    },
  });
  assert.deepEqual(VLESS, input);
});

test("renders VMess, Shadowsocks, SOCKS5, HTTP, Trojan and Hysteria2", () => {
  const cases = [
    [{ name: "vmess", type: "vmess", server: "vmess.invalid", port: 443, uuid: "u", alterId: 0, security: "auto" }, "vmess"],
    [{ name: "ss", type: "ss", server: "ss.invalid", port: 8388, cipher: "aes-256-gcm", password: "p" }, "shadowsocks"],
    [{ name: "socks", type: "socks5", server: "socks.invalid", port: 1080, username: "u", password: "p" }, "socks"],
    [{ name: "http", type: "http", server: "http.invalid", port: 8080, username: "u", password: "p" }, "http"],
    [{ name: "trojan", type: "trojan", server: "trojan.invalid", port: 443, password: "p", tls: true, sni: "trojan.invalid" }, "trojan"],
    [{ name: "hy2", type: "hysteria2", server: "hy2.invalid", port: 443, password: "p", tls: true, sni: "hy2.invalid" }, "hysteria"],
  ];
  for (const [node, protocol] of cases) {
    const output = renderOneXrayOutbound(node, { tag: `ap-${protocol}` });
    assert.equal(output.protocol, protocol);
    assert.equal(output.tag, `ap-${protocol}`);
    assert.equal(output.name, node.name);
  }
});

test("rejects unsupported protocols and unsafe tags", () => {
  assert.throws(() => renderOneXrayOutbound({ ...VLESS, type: "snell", psk: "p", version: 5 }, { tag: "ap-x" }), /unsupported-onexray-protocol/u);
  assert.throws(() => renderOneXrayOutbound(VLESS, { tag: "🇯🇵 Tokyo" }), /tag/u);
});
