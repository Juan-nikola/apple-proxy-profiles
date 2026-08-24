import assert from "node:assert/strict";
import test from "node:test";
import { renderXrayNodeError, renderXrayOutbound, renderXraySubscription } from "../../../shared/nodes/render-xray-outbound.js";

const VLESS = { name: "shared", type: "vless", server: "shared.example", port: 443, uuid: "00000000-0000-4000-8000-000000000001" };

test("shared Xray primitive renders audited protocol mappings for clients", () => {
  const outbound = renderXrayOutbound(VLESS, { tag: "ap-shared", client: "v2rayn" });
  assert.equal(outbound.protocol, "vless");
  assert.equal(outbound.settings.vnext[0].address, "shared.example");
});

test("shared subscription is newline terminated and rejects duplicate names", () => {
  const text = renderXraySubscription({ nodes: [VLESS], client: "v2box" });
  assert.equal(text.endsWith("\n"), true);
  assert.equal(JSON.parse(text).outbounds.length, 1);
  assert.throws(() => renderXraySubscription({ nodes: [VLESS, VLESS], client: "v2box" }), /duplicate node names/u);
});

test("shared unsupported diagnostics contain no node values", () => {
  const diagnostic = renderXrayNodeError(new Error("unsupported-v2box-protocol secret"), "v2box");
  assert.deepEqual(diagnostic, { client: "v2box", excluded: { "unsupported-v2box-protocol": 1 } });
  assert.equal(JSON.stringify(diagnostic).includes("shared.example"), false);
});

test("v2rayN and V2Box share the lossless common protocol and transport matrix", () => {
  const protocols = [
    ["vless", { uuid: VLESS.uuid }], ["vmess", { uuid: VLESS.uuid }],
    ["ss", { cipher: "aes-128-gcm", password: "TEST_ONLY_PASSWORD" }],
    ["shadowsocks", { cipher: "aes-128-gcm", password: "TEST_ONLY_PASSWORD" }],
    ["trojan", { password: "TEST_ONLY_PASSWORD" }], ["socks5", {}], ["http", {}],
    ["hysteria2", { password: "TEST_ONLY_PASSWORD" }], ["hy2", { password: "TEST_ONLY_PASSWORD" }],
  ];
  const transports = ["tcp", "ws", "grpc", "http2", "httpupgrade", "xhttp", "kcp"];
  for (const client of ["v2rayn", "v2box"]) for (const [type, fields] of protocols) {
    const node = { name: `${client}-${type}`, type, server: "matrix.example", port: 443, ...fields };
    const baseline = renderXrayOutbound(node, { tag: "ap-matrix", client });
    assert.equal(baseline.protocol.length > 0, true);
    for (const network of transports) {
      const withTransport = { ...node, network, ...(network === "ws" ? { "ws-opts": { path: "/x" } } : {}), ...(network === "grpc" ? { "grpc-opts": { "grpc-service-name": "x" } } : {}) };
      const rendered = renderXrayOutbound(withTransport, { tag: "ap-matrix", client });
      if (network === "tcp") assert.equal(rendered.streamSettings, undefined);
      else assert.equal(rendered.streamSettings.network, network === "http2" ? "http" : network === "kcp" ? "kcp" : network);
    }
  }
  assert.throws(() => renderXrayOutbound({ ...VLESS, type: "snell" }, { tag: "ap-x", client: "v2rayn" }), /unsupported-v2rayn-protocol/u);
  assert.throws(() => renderXrayOutbound({ ...VLESS, type: "snell" }, { tag: "ap-x", client: "v2box" }), /unsupported-v2box-protocol/u);
  for (const client of ["v2rayn", "v2box"]) {
    const tls = renderXrayOutbound({ ...VLESS, name: `${client}-tls`, tls: true }, { tag: "ap-tls", client });
    const reality = renderXrayOutbound({ ...VLESS, name: `${client}-reality`, security: "reality", "reality-opts": { "public-key": "fixture-key" } }, { tag: "ap-reality", client });
    assert.equal(tls.streamSettings.security, "tls");
    assert.equal(reality.streamSettings.security, "reality");
  }
});

test("node errors are count-only for malformed and credential-bearing inputs", () => {
  for (const client of ["v2rayn", "v2box"]) for (const error of [
    new Error("invalid node TEST_ONLY_SECRET_PASSWORD"), new Error("unsupported-v2box-protocol " + "vmess://" + "secret"),
    new Error("subscription https://user" + ":pass@example.invalid/list"),
  ]) {
    const diagnostic = renderXrayNodeError(error, client);
    const text = JSON.stringify(diagnostic);
    assert.equal(text.includes("secret-password"), false);
    assert.equal(text.includes("vmess://"), false);
    assert.equal(text.includes("user:pass"), false);
    assert.deepEqual(Object.keys(diagnostic), ["client", "excluded"]);
  }
});
