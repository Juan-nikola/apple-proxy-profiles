import assert from "node:assert/strict";
import test from "node:test";

import {
  activeClientIds,
  allClientIds,
  clientAdapter,
  lightweightRuleClientIds,
  plannedClientIds,
  publicDirectoryForClient,
} from "../shared/release/client-catalog.js";
import { protocolSupportsClient } from "../shared/nodes/protocol-registry.js";

const REQUIRED_FIELDS = [
  "id", "displayName", "state", "platforms", "configFormat", "ruleFormat",
  "nodeValidator", "separatesProfile", "supportsPolicyOverrides", "adapterSchema",
  "publicDirectory",
];

test("registers clients in stable publication order", () => {
  assert.deepEqual(allClientIds(), [
    "anywhere", "egern", "shadowrocket", "surge", "singbox", "onexray", "happ", "v2rayn", "v2box", "clash",
  ]);
  assert.deepEqual(activeClientIds(), ["anywhere", "egern", "shadowrocket", "surge", "singbox", "onexray", "happ", "v2rayn", "v2box", "clash"]);
  assert.deepEqual(plannedClientIds(), []);
  assert.equal(clientAdapter("happ").state, "active");
  assert.equal(publicDirectoryForClient("singbox"), "sing-box");
  assert.deepEqual(clientAdapter("v2rayn").platforms, ["windows", "macos"]);
  assert.deepEqual(clientAdapter("v2box").platforms, ["iphone", "ipad"]);
  assert.deepEqual(clientAdapter("clash").platforms, ["iphone", "ipad", "macos", "appletv"]);
  assert.deepEqual(lightweightRuleClientIds(), [
    "anywhere", "egern", "shadowrocket", "surge", "singbox", "clash",
  ]);
  assert.throws(() => clientAdapter("unknown"), /unknown client/i);
});

test("client records expose a complete frozen capability contract", () => {
  const deepFrozen = (value) => {
    assert.equal(Object.isFrozen(value), true);
    if (value && typeof value === "object") {
      for (const child of Object.values(value)) deepFrozen(child);
    }
  };

  deepFrozen(allClientIds());
  deepFrozen(activeClientIds());
  deepFrozen(plannedClientIds());
  for (const id of allClientIds()) {
    const adapter = clientAdapter(id);
    assert.deepEqual(Object.keys(adapter).sort(), [...REQUIRED_FIELDS].sort());
    deepFrozen(adapter);
    assert.equal(typeof adapter.displayName, "string");
    assert.ok(adapter.displayName.length > 0);
    assert.ok(["active", "planned"].includes(adapter.state));
    assert.ok(Array.isArray(adapter.platforms));
    assert.equal(typeof adapter.configFormat, "string");
    assert.equal(typeof adapter.ruleFormat, "string");
    assert.equal(typeof adapter.nodeValidator, "string");
    assert.equal(typeof adapter.separatesProfile, "boolean");
    assert.equal(typeof adapter.supportsPolicyOverrides, "boolean");
    assert.equal(typeof adapter.adapterSchema, "string");
    assert.ok(adapter.adapterSchema.length > 0);
    assert.equal(typeof adapter.publicDirectory, "string");
  }
});

test("unknown capabilities stay explicitly unsupported", () => {
  for (const id of allClientIds()) {
    const adapter = clientAdapter(id);
    assert.equal(Object.hasOwn(adapter, "unknownCapability"), false);
    assert.equal(adapter.separatesProfile, false);
    assert.equal(adapter.supportsPolicyOverrides, false);
  }
});

test("HAPP and OneXray expose only the audited Xray protocol boundary", () => {
  for (const client of ["happ", "onexray"]) {
    for (const protocol of ["vless", "vmess", "ss", "trojan", "hysteria2", "socks5"]) {
      assert.equal(protocolSupportsClient(protocol, client), true, `${client} should support ${protocol}`);
    }
    const unsupported = client === "onexray"
      ? ["snell", "anytls", "tuic", "ssh", "wireguard", "ssr"]
      : ["snell", "anytls", "tuic", "ssh", "wireguard", "ssr", "http"];
    for (const protocol of unsupported) {
      assert.equal(protocolSupportsClient(protocol, client), false, `${client} must reject ${protocol}`);
    }
  }
});

test("V2RayN and V2Box expose only the common Xray protocol boundary", () => {
  for (const client of ["v2rayn", "v2box"]) {
    for (const protocol of ["vless", "vmess", "ss", "shadowsocks", "trojan", "socks5", "http", "hysteria2", "hy2"]) {
      assert.equal(protocolSupportsClient(protocol, client), true, `${client} should support ${protocol}`);
    }
    for (const protocol of ["ssr", "snell", "anytls", "tuic", "ssh", "wireguard", "sudoku"]) {
      assert.equal(protocolSupportsClient(protocol, client), false, `${client} must reject ${protocol}`);
    }
  }
});

test("Clash exposes its audited Mihomo protocol boundary", () => {
  for (const protocol of ["ss", "shadowsocks", "ssr", "snell", "vmess", "vless", "trojan", "anytls", "hysteria2", "hy2", "tuic", "socks5", "http", "ssh", "wireguard"]) {
    assert.equal(protocolSupportsClient(protocol, "clash"), true, `clash should support ${protocol}`);
  }
  assert.equal(protocolSupportsClient("sudoku", "clash"), false);
});
