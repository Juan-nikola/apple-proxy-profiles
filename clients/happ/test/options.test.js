import assert from "node:assert/strict";
import test from "node:test";

import { parseHappOptions } from "../src/options.js";

const required = Object.freeze({
  output: "config",
  type: "collection",
  name: "Happ macOS",
  subscriptionName: "Example subscription",
  platform: "macos",
});

test("parseHappOptions applies the approved config defaults and freezes the result", () => {
  const options = parseHappOptions(required);

  assert.deepEqual(options, {
    ...required,
    channel: "edge",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    policyOverrides: "",
    adblockMode: "off",
  });
  assert.equal(Object.isFrozen(options), true);
});

test("parseHappOptions accepts every Happ platform and audit-only all", () => {
  for (const platform of ["macos", "iphone", "ipad", "android", "windows", "linux"]) {
    assert.equal(parseHappOptions({ ...required, platform }).platform, platform);
  }
  assert.equal(parseHappOptions({ ...required, output: "audit", platform: "all" }).platform, "all");
  assert.throws(() => parseHappOptions({ ...required, platform: "all" }), /platform/u);
  assert.throws(() => parseHappOptions({ ...required, output: "audit", platform: "macos" }), /platform/u);
});

test("parseHappOptions rejects malformed, unsupported, and misleading options", () => {
  for (const value of ["preview", "nodes"]) {
    assert.throws(() => parseHappOptions({ ...required, output: value }), /output/u);
  }
  for (const [key, value] of [["channel", "beta"], ["dnsMode", "unsafe"], ["policyOverrides", 42], ["adblockMode", "full"], ["_policyOverrides", "ignored"], ["extra", "value"]]) {
    assert.throws(() => parseHappOptions({ ...required, [key]: value }), new RegExp(key, "u"));
  }
  assert.throws(() => parseHappOptions({ ...required, name: " Happ" }), /name/u);
  assert.throws(() => parseHappOptions({ ...required, subscriptionName: "Example\nsubscription" }), /subscriptionName/u);
});
