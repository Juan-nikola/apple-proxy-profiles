import assert from "node:assert/strict";
import test from "node:test";

import { parseSurgeOptions } from "../src/options.js";
import { renderSurgeProxy } from "../src/render-node.js";
import { renderSurgeProfile } from "../src/render-profile.js";
import { validateSurgeProfile } from "../src/validate-profile.js";

const baseOptions = {
  output: "config",
  type: "collection",
  name: "surge-sources",
  subscriptionName: "Surge-Nodes",
  platform: "macos",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "auto",
  autoGroupMode: "auto",
  clientChain: "off",
};

const normalizedSsNode = {
  name: "🇯🇵 [机场] Tokyo A",
  type: "ss",
  server: "198.51.100.10",
  port: 443,
  cipher: "aes-256-gcm",
  password: "TEST_ONLY_NOT_A_SECRET",
  udp: true,
  _profile: {
    id: "sr-fixture",
    continent: "asiaPacific",
    sourceKind: "airport",
    flag: "🇯🇵",
    udp: true,
    p2p: false,
    entry: true,
    chained: false,
  },
};

test("parses a strict Surge option set for each Apple platform", () => {
  for (const platform of ["macos", "iphone", "ipad"]) {
    assert.equal(parseSurgeOptions({ ...baseOptions, platform }).platform, platform);
  }
  assert.throws(() => parseSurgeOptions({ ...baseOptions, platform: "android" }), /platform/iu);
  assert.throws(() => parseSurgeOptions({ ...baseOptions, unknown: "value" }), /unknown/iu);
});

test("renders a private Surge profile with shared policy sections and no internal metadata", () => {
  const profile = renderSurgeProfile(parseSurgeOptions(baseOptions), [normalizedSsNode], {
    ruleBaseUrl: "https://example.invalid/current/surge/rules",
  });
  assert.match(profile, /^\[General\]/mu);
  assert.match(profile, /^\[Proxy\]/mu);
  assert.match(profile, /^\[Proxy Group\]/mu);
  assert.match(profile, /^\[Rule\]/mu);
  assert.match(profile, /🇯🇵 \[机场\] Tokyo A = ss,198\.51\.100\.10,443/iu);
  assert.match(profile, /TEST_ONLY_NOT_A_SECRET/u);
  assert.doesNotMatch(profile, /_profile|_subName|_resolved/u);
  assert.deepEqual(validateSurgeProfile(profile), { valid: true, errors: [] });
});

test("renders every Surge platform without changing shared group names", () => {
  for (const platform of ["macos", "iphone", "ipad"]) {
    const profile = renderSurgeProfile(parseSurgeOptions({ ...baseOptions, platform }), [normalizedSsNode], {
      ruleBaseUrl: "https://example.invalid/current/surge/rules",
    });
    assert.match(profile, /^FINAL,🚀 节点选择$/mu);
    assert.match(profile, /^🚀 节点选择 = /mu);
    assert.deepEqual(validateSurgeProfile(profile), { valid: true, errors: [] }, platform);
  }
});

test("accepts common upstream transport metadata on Snell nodes", () => {
  const node = {
    name: "Snell with upstream metadata",
    type: "snell",
    server: "198.51.100.11",
    port: 443,
    psk: "TEST_ONLY_SNELL_PSK",
    version: 4,
    reuse: true,
    udp_relay: true,
    tfo: true,
  };
  assert.match(renderSurgeProxy(node), /^Snell with upstream metadata = snell,/u);
});
