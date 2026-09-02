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
    "anywhere", "egern", "shadowrocket", "surge", "singbox", "happ", "v2box", "clash", "incy",
  ]);
  assert.deepEqual(activeClientIds(), ["anywhere", "egern", "shadowrocket", "surge", "singbox", "happ", "v2box", "clash", "incy"]);
  assert.deepEqual(plannedClientIds(), []);
  assert.equal(publicDirectoryForClient("singbox"), "sing-box");
  assert.deepEqual(clientAdapter("v2box").platforms, ["iphone", "ipad"]);
  assert.deepEqual(clientAdapter("happ").platforms, ["macos", "iphone", "ipad"]);
  assert.deepEqual(clientAdapter("clash").platforms, ["iphone", "ipad", "macos", "appletv"]);
  assert.deepEqual(clientAdapter("incy").platforms, ["iphone", "ipad", "appletv", "android", "androidtv", "macos", "windows", "linux"]);
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

test("INCY exposes the audited active catalog contract", () => {
  const adapter = clientAdapter("incy");
  assert.deepEqual(adapter, {
    id: "incy",
    displayName: "INCY",
    state: "active",
    platforms: ["iphone", "ipad", "appletv", "android", "androidtv", "macos", "windows", "linux"],
    configFormat: "xray-json-array",
    ruleFormat: "xray-geodata",
    nodeValidator: "incy",
    separatesProfile: false,
    supportsPolicyOverrides: false,
    adapterSchema: "incy-v1",
    publicDirectory: "incy",
  });
});

test("V2Box exposes only the common Xray protocol boundary", () => {
  for (const client of ["v2box"]) {
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

test("INCY exposes only the seven verified Xray protocol categories", () => {
  for (const protocol of ["ss", "shadowsocks", "vmess", "vless", "trojan", "hysteria2", "hy2", "socks5", "http"]) {
    assert.equal(protocolSupportsClient(protocol, "incy"), true, `incy should support ${protocol}`);
  }
  for (const protocol of ["ssr", "snell", "anytls", "tuic", "ssh", "wireguard", "sudoku"]) {
    assert.equal(protocolSupportsClient(protocol, "incy"), false, `incy must reject ${protocol}`);
  }
});
