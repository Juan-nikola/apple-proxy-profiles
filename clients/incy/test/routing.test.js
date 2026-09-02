import assert from "node:assert/strict";
import test from "node:test";

import { parsePrivatePolicy } from "../../../shared/policies/private-policy.js";
import { platformPolicyPreset } from "../../../shared/policies/platform-presets.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { renderIncyBalancers, renderIncyRouting, routeTargetForPolicy } from "../src/render-routing.js";

function node(name, type, extra = {}) {
  return {
    name,
    type,
    server: `${name.toLowerCase().replace(/\s+/gu, "-")}.example.invalid`,
    port: 443,
    ...extra,
  };
}

test("maps policy resolution records to follow, direct, block, and fixed balancers", () => {
  const tags = {
    followTag: "ap-incy-follow/abc",
    directTag: "ap-incy-direct/abc",
    blockTag: "ap-incy-block/abc",
    balancerTags: new Map([["Node A", "balancer-ap-incy-node-a"]]),
  };

  assert.equal(routeTargetForPolicy({ resolved: "FOLLOW" }, tags), "ap-incy-follow/abc");
  assert.equal(routeTargetForPolicy({ resolved: "DIRECT" }, tags), "ap-incy-direct/abc");
  assert.equal(routeTargetForPolicy({ resolved: "REJECT" }, tags), "ap-incy-block/abc");
  assert.match(routeTargetForPolicy({ resolved: "Node A", status: "fixed" }, tags), /^balancer-ap-incy-/u);
});

test("builds one leastPing balancer per fixed node and includes them in observatory selection", () => {
  const fixedA = node("Fixed AI", "vless", {
    _profile: { id: "fixed-ai" },
  });
  const fixedB = node("Fixed GitHub", "trojan", {
    _profile: { id: "fixed-github" },
  });
  const policy = parsePrivatePolicy(JSON.stringify({
    schemaVersion: 2,
    targets: {
      ai: "NODE:Fixed AI",
      github: "NODE:Fixed GitHub",
      final: "FOLLOW",
    },
  }));
  const resolution = resolveUnifiedPolicy({
    policy,
    client: "incy",
    allNodes: [fixedA, fixedB],
    eligibleNodes: [fixedA, fixedB],
  });
  const fixedOutbounds = [
    { nodeId: "fixed-ai", tag: "ap-incy-fixed/fixed-ai" },
    { nodeId: "fixed-github", tag: "ap-incy-fixed/fixed-github" },
  ];

  const { balancers, observatory } = renderIncyBalancers(resolution, fixedOutbounds, "ap-incy-follow/main");

  assert.equal(balancers.length, 2);
  assert.deepEqual(balancers.map(({ strategy }) => strategy.type), ["leastPing", "leastPing"]);
  assert.ok(balancers.every(({ fallbackTag }) => fallbackTag === "ap-incy-follow/main"));
  assert.deepEqual(observatory.subjectSelector, [
    "ap-incy-follow/main",
    "ap-incy-fixed/fixed-ai",
    "ap-incy-fixed/fixed-github",
  ]);
});

test("renders ordered routing rules with DNS hints between ChinaTLD and ChinaIP", () => {
  const fixedA = node("Fixed AI", "vless", {
    _profile: { id: "fixed-ai" },
  });
  const fixedB = node("Fixed GitHub", "trojan", {
    _profile: { id: "fixed-github" },
  });
  const follow = node("Follow", "vless", {
    _profile: { id: "follow" },
  });
  const policy = parsePrivatePolicy(JSON.stringify({
    schemaVersion: 2,
    targets: {
      ai: "NODE:Fixed AI",
      github: "NODE:Fixed GitHub",
      youtube: "FOLLOW",
      dnsAndRules: "FOLLOW",
      final: "FOLLOW",
    },
  }));
  const resolution = resolveUnifiedPolicy({
    policy,
    client: "incy",
    allNodes: [fixedA, fixedB, follow],
    eligibleNodes: [fixedA, fixedB, follow],
  });
  const fixedOutbounds = [
    { nodeId: "fixed-ai", tag: "ap-incy-fixed/fixed-ai" },
    { nodeId: "fixed-github", tag: "ap-incy-fixed/fixed-github" },
  ];
  const balancerTags = new Map([
    ["fixed-ai", "balancer-ap-incy-fixed-ai"],
    ["Fixed AI", "balancer-ap-incy-fixed-ai"],
    ["fixed-github", "balancer-ap-incy-fixed-github"],
    ["Fixed GitHub", "balancer-ap-incy-fixed-github"],
  ]);

  const routing = renderIncyRouting({
    options: {
      platform: "windows",
      quicMode: "allow",
      adblockMode: "off",
      blockMode: "balanced",
    },
    policyResolution: resolution,
    fixedOutbounds,
    followTag: "ap-incy-follow/main",
    directTag: "ap-incy-direct/main",
    blockTag: "ap-incy-block/main",
    balancerTags,
  });

  assert.equal(routing.domainStrategy, "IPIfNonMatch");
  assert.equal(routing.rules[0].outboundTag, "ap-incy-direct/main");
  assert.ok(routing.rules[0].domain.includes("localhost"));
  assert.ok(routing.rules[0].domain.includes("geosite:PRIVATE"));

  const openAiIndex = routing.rules.findIndex((rule) => rule.domain?.includes("geosite:OPENAI"));
  const githubIndex = routing.rules.findIndex((rule) => rule.domain?.includes("geosite:GITHUB"));
  const youtubeIndex = routing.rules.findIndex((rule) => rule.domain?.includes("geosite:YOUTUBE"));
  const dnsHintIndex = routing.rules.findIndex((rule) => rule.ip?.includes("223.5.5.5"));
  const chinaTldIndex = routing.rules.findIndex((rule) => rule.domain?.includes("geosite:CN") && rule.outboundTag === "ap-incy-direct/main");
  const chinaIpIndex = routing.rules.findIndex((rule) => rule.ip?.includes("geoip:CN") && rule.outboundTag === "ap-incy-direct/main");

  assert.ok(openAiIndex > 0);
  assert.ok(githubIndex > openAiIndex);
  assert.ok(youtubeIndex > githubIndex);
  assert.ok(openAiIndex < dnsHintIndex);
  assert.ok(githubIndex < dnsHintIndex);
  assert.ok(youtubeIndex < dnsHintIndex);
  assert.ok(chinaTldIndex < dnsHintIndex);
  assert.ok(dnsHintIndex < chinaIpIndex);
  assert.equal(routing.rules.at(-1).outboundTag, "ap-incy-follow/main");
  assert.equal(routing.rules.find((rule) => rule.domain?.includes("geosite:OPENAI")).outboundTag, "balancer-ap-incy-fixed-ai");
  assert.equal(routing.rules.find((rule) => rule.domain?.includes("geosite:GITHUB")).outboundTag, "balancer-ap-incy-fixed-github");
  assert.equal(routing.rules.find((rule) => rule.ip?.includes("223.5.5.5")).outboundTag, "ap-incy-direct/main");
});

test("keeps domestic and ChinaTLD direct rules on the direct tag while final stays on follow", () => {
  const policy = parsePrivatePolicy(JSON.stringify({
    schemaVersion: 2,
    targets: {
      domesticPlatform: "DIRECT",
      final: "FOLLOW",
    },
  }));
  const resolution = resolveUnifiedPolicy({
    policy,
    client: "incy",
    allNodes: [],
    eligibleNodes: [],
  });
  const routing = renderIncyRouting({
    options: { platform: "macos", quicMode: "allow" },
    policyResolution: resolution,
    fixedOutbounds: [],
    followTag: "ap-incy-follow/direct",
    directTag: "ap-incy-direct/direct",
    blockTag: "ap-incy-block/direct",
  });

  const domesticRules = [
    "geosite:CN",
    "geosite:CATEGORY-GAMES-CN",
    "geosite:STEAM",
  ].map((domain) => routing.rules.find((rule) => rule.domain?.includes(domain)));
  assert.ok(domesticRules.every((rule) => rule?.outboundTag === "ap-incy-direct/direct"));
  assert.equal(routing.rules.at(-1).outboundTag, "ap-incy-follow/direct");
});

test("routes domestic core service rules to the direct tag", () => {
  const routing = renderIncyRouting({
    options: { platform: "macos", quicMode: "allow" },
    policyResolution: undefined,
    fixedOutbounds: [],
    followTag: "ap-incy-follow/core",
    directTag: "ap-incy-direct/core",
    blockTag: "ap-incy-block/core",
  });

  const domesticCore = routing.rules.find((rule) => rule.domain?.includes("geosite:CN"));
  const domesticGame = routing.rules.find((rule) => rule.domain?.includes("geosite:CATEGORY-GAMES-CN"));
  const steam = routing.rules.find((rule) => rule.domain?.includes("geosite:STEAM"));

  assert.equal(domesticCore.outboundTag, "ap-incy-direct/core");
  assert.equal(domesticGame.outboundTag, "ap-incy-direct/core");
  assert.equal(steam.outboundTag, "ap-incy-direct/core");
});

test("supports the system China DNS resolver in routing DNS hints", () => {
  const routing = renderIncyRouting({
    options: { platform: "macos", quicMode: "allow", chinaDns: "system" },
    fixedOutbounds: [],
    followTag: "ap-incy-follow/system",
    directTag: "ap-incy-direct/system",
    blockTag: "ap-incy-block/system",
  });

  const dnsRule = routing.rules.find((rule) => rule.outboundTag === "ap-incy-direct/system" && rule.domain?.includes("cloudflare-dns.com"));
  assert.ok(dnsRule);
});

test("keeps the global DoH endpoint on the follow path in privacy DNS mode", () => {
  const routing = renderIncyRouting({
    options: { platform: "macos", quicMode: "allow", dnsMode: "privacy" },
    fixedOutbounds: [],
    followTag: "ap-incy-follow/privacy",
    directTag: "ap-incy-direct/privacy",
    blockTag: "ap-incy-block/privacy",
  });
  const globalDnsRule = routing.rules.find((rule) => rule.domain?.includes("cloudflare-dns.com"));
  assert.equal(globalDnsRule, undefined);
});

test("maps QUIC modes to explicit UDP/443 routing rules", () => {
  const base = {
    policyResolution: undefined,
    fixedOutbounds: [],
    followTag: "ap-incy-follow/quic",
    directTag: "ap-incy-direct/quic",
    blockTag: "ap-incy-block/quic",
  };
  const proxyBlock = renderIncyRouting({ ...base, options: { quicMode: "proxy-block" } });
  const proxyRule = proxyBlock.rules.find((rule) => rule.network === "udp" && rule.port === 443);
  assert.deepEqual(proxyRule, { type: "field", network: "udp", port: 443, outboundTag: base.directTag });

  const allBlock = renderIncyRouting({ ...base, options: { quicMode: "all-block" } });
  assert.equal(allBlock.rules.find((rule) => rule.network === "udp" && rule.port === 443).outboundTag, base.blockTag);

  const allow = renderIncyRouting({ ...base, options: { quicMode: "allow" } });
  assert.equal(allow.rules.some((rule) => rule.network === "udp" && rule.port === 443), false);
});

test("rejects an unsupported QUIC mode instead of silently weakening routing", () => {
  assert.throws(() => renderIncyRouting({
    options: { quicMode: "unexpected" },
    followTag: "ap-incy-follow/invalid",
    directTag: "ap-incy-direct/invalid",
    blockTag: "ap-incy-block/invalid",
  }), /quicMode/i);
});

test("scales observatory cadence according to the automatic group mode", () => {
  const fixedNodes = Array.from({ length: 31 }, (_, index) => ({ nodeId: `node-${index}`, name: `Node ${index}` }));
  const fixedOutbounds = fixedNodes.map(({ nodeId }) => ({ nodeId, tag: `ap-incy-fixed/${nodeId}` }));
  const { observatory } = renderIncyBalancers({ fixedNodes }, fixedOutbounds, "ap-incy-follow/scale", {
    platform: "macos",
    autoGroupMode: "auto",
  });
  assert.equal(observatory.testInterval, 1200);
  assert.equal(observatory.tolerance, 200);
});

test("exposes the shared observatory preset for the new INCY platforms", () => {
  assert.deepEqual(platformPolicyPreset("androidtv"), { testInterval: 3600, timeout: 8, tolerance: 200 });
  assert.deepEqual(platformPolicyPreset("windows"), { testInterval: 600, timeout: 5, tolerance: 100 });
  assert.deepEqual(platformPolicyPreset("linux"), { testInterval: 600, timeout: 5, tolerance: 100 });
});
