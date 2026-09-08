import assert from "node:assert/strict";
import test from "node:test";
import { CLIENT } from "../shared/contracts.js";
import { clientAdapter } from "../shared/release/client-catalog.js";
import { protocolSupportsClient } from "../shared/nodes/protocol-registry.js";
import { evaluateNodeForClient } from "../shared/nodes/capabilities.js";

test("registers Hiddify Next as a six-platform sing-box-compatible client", () => {
  assert.equal(CLIENT.hiddify, "hiddify");
  assert.deepEqual(clientAdapter("hiddify"), {
    id: "hiddify",
    displayName: "Hiddify Next",
    state: "active",
    platforms: ["android", "iphone", "ipad", "macos", "windows", "linux"],
    configFormat: "hiddify-sing-box-json",
    ruleFormat: "sing-box-source-json",
    nodeValidator: "hiddify",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "hiddify-v1",
    publicDirectory: "hiddify",
  });

});

test("Hiddify accepts the shared sing-box protocol boundary", () => {
  for (const protocol of ["ss", "vmess", "vless", "trojan", "anytls", "hysteria2", "tuic", "socks5", "http", "ssh", "wireguard"]) {
    assert.equal(protocolSupportsClient(protocol, "hiddify"), true, protocol);
  }
  for (const protocol of ["snell", "ssr", "sudoku"]) assert.equal(protocolSupportsClient(protocol, "hiddify"), false, protocol);
  const node = { name: "vless", type: "vless", server: "192.0.2.1", port: 443, uuid: "00000000-0000-4000-8000-000000000001" };
  assert.deepEqual(evaluateNodeForClient(node, "hiddify"), { supported: true, reason: null });
});
