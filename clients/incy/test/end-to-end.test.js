import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CLIENT } from "../../../shared/contracts.js";
import { parsePrivatePolicy } from "../../../shared/policies/private-policy.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { parseSingBoxOptions } from "../../sing-box/src/options.js";
import { renderSingBoxConfig } from "../../sing-box/src/render-config.js";
import { renderHappRouting } from "../../happ/src/render-routing.js";
import { renderIncyRouting } from "../src/render-routing.js";
import { renderIncySubscription } from "../src/render-subscription.js";
import { parseIncyOptions } from "../src/options.js";
import { fixtureNodes, fixturePolicy } from "./fixtures.js";

const nodes = fixtureNodes();
const policy = parsePrivatePolicy(JSON.stringify(fixturePolicy()));

function incyOptions(overrides = {}) {
  return parseIncyOptions({
    output: "config",
    type: "collection",
    name: "apple-proxy-incy",
    subscriptionName: "INCY",
    platform: "macos",
    ...overrides,
  });
}

function policyResolution() {
  return resolveUnifiedPolicy({
    policy,
    channel: "current",
    client: CLIENT.incy,
    allNodes: nodes,
    eligibleNodes: nodes,
  });
}

function firstMatchingRule(rules, request) {
  return rules.find((rule) => {
    if (rule.network === "tcp,udp") return true;
    if (request.domainCategory && rule.domain?.includes(request.domainCategory)) return true;
    if (request.ipCategory && rule.ip?.includes(request.ipCategory)) return true;
    return false;
  });
}

test("shared policy targets resolve identically for HAPP, sing-box, and INCY", () => {
  const resolution = policyResolution();
  const happ = renderHappRouting({
    nodes,
    policyResolution: resolution,
    options: { platform: "macos", quicMode: "allow" },
    followTag: "happ-follow/follow-node",
    fixedNodes: resolution.fixedNodes,
  });
  const singBox = renderSingBoxConfig(
    parseSingBoxOptions({
      output: "config",
      type: "collection",
      name: "sing-box-sources",
      subscriptionName: "sing-box-Nodes",
      platform: "macos",
      channel: "current",
      dnsMode: "stable",
      chinaDns: "alidns",
      globalDns: "cloudflare",
      blockMode: "balanced",
      quicMode: "allow",
      ipv6Mode: "auto",
      autoGroupMode: "full",
      clientChain: "off",
    }),
    nodes,
    { ruleBaseUrl: "https://example.invalid/current/sing-box/rule-sets", policyResolution: resolution },
  );
  const incyRouting = renderIncyRouting({
    options: { platform: "macos", adblockMode: "full", chinaDns: "alidns", globalDns: "cloudflare" },
    policyResolution: resolution,
    fixedOutbounds: resolution.fixedNodes.map(({ nodeId }) => ({ nodeId, tag: `ap-incy-fixed/${nodeId}` })),
    followTag: "ap-incy-follow/follow-node",
    directTag: "ap-incy-direct",
    blockTag: "ap-incy-block",
  });
  const incySubscription = renderIncySubscription({
    nodes,
    options: incyOptions({ adblockMode: "full" }),
    policyResolution: resolution,
  });

  const happFollowTag = happ.observatory.subjectSelector[0];
  const happFixedAiTag = happ.balancers.find(({ selector }) => selector[0].includes("Fixed AI"))?.tag;
  const happFixedGithubTag = happ.balancers.find(({ selector }) => selector[0].includes("Fixed GitHub"))?.tag;
  const happFixedMediaTag = happ.balancers.find(({ selector }) => selector[0].includes("Fixed Media"))?.tag;

  assert.equal(happ.policyTargets.ai, happFixedAiTag, "HAPP AI should resolve through the fixed-node balancer");
  assert.equal(happ.policyTargets.github, happFixedGithubTag, "HAPP GitHub should resolve through the fixed-node balancer");
  assert.equal(happ.policyTargets.youtube, happFollowTag);
  assert.equal(happ.policyTargets.overseasMedia, happFixedMediaTag, "HAPP overseas media should resolve through the fixed-node balancer");
  assert.equal(happ.policyTargets.domesticPlatform, "happ-direct");
  assert.equal(happ.policyTargets.final, happFollowTag);

  assert.equal(singBox.outbounds.find(({ tag }) => tag === "🤖 AI 专用").default, "Fixed AI");
  assert.equal(singBox.outbounds.find(({ tag }) => tag === "🐙 GitHub").default, "Fixed GitHub");
  assert.equal(singBox.outbounds.find(({ tag }) => tag === "📺 YouTube").default, "🚀 节点选择");
  assert.equal(singBox.outbounds.find(({ tag }) => tag === "🎬 海外流媒体").default, "Fixed Media");
  assert.equal(singBox.outbounds.find(({ tag }) => tag === "🇨🇳 国内平台").default, "DIRECT");
  assert.equal(singBox.outbounds.find(({ tag }) => tag === "漏网之鱼").default, "🚀 节点选择");

  assert.equal(incyRouting.domainStrategy, "IPIfNonMatch");
  assert.equal(incyRouting.rules.find((rule) => rule.domain?.includes("geosite:OPENAI")).outboundTag, "balancer-ap-incy-fixed/fixed-ai");
  assert.equal(incyRouting.rules.find((rule) => rule.domain?.includes("geosite:GITHUB")).outboundTag, "balancer-ap-incy-fixed/fixed-github");
  assert.equal(incyRouting.rules.find((rule) => rule.domain?.includes("geosite:YOUTUBE")).outboundTag, "ap-incy-follow/follow-node");
  assert.equal(incyRouting.rules.find((rule) => rule.domain?.includes("geosite:NETFLIX")).outboundTag, "balancer-ap-incy-fixed/fixed-media");
  assert.equal(incyRouting.rules.find((rule) => rule.domain?.includes("geosite:CN") && rule.outboundTag === "ap-incy-direct").outboundTag, "ap-incy-direct");
  assert.equal(incyRouting.rules.at(-1).outboundTag, "ap-incy-follow/follow-node");

  assert.equal(incySubscription.length, 4);
  assert.equal(incySubscription[0].routing.rules.at(-1).outboundTag, "ap-incy-follow/follow-node");
  assert.equal(incySubscription[0].meta.platform, "macos");
  assert.equal(incySubscription[0].meta.schemaVersion, 2);
  assert.doesNotMatch(JSON.stringify(incySubscription[0].meta), /TEST_ONLY_|198\.51\.100\.10|203\.0\.113\.10|192\.0\.2\.10/u);

  const routeCases = [
    { label: "domestic domain", domainCategory: "geosite:CN", ipCategory: "geoip:CN", expected: "ap-incy-direct" },
    { label: "unknown domain resolving to China IP", ipCategory: "geoip:CN", expected: "ap-incy-direct" },
    { label: "OpenAI", domainCategory: "geosite:OPENAI", expected: "balancer-ap-incy-fixed/fixed-ai" },
    { label: "GitHub", domainCategory: "geosite:GITHUB", expected: "balancer-ap-incy-fixed/fixed-github" },
    { label: "YouTube", domainCategory: "geosite:YOUTUBE", expected: "ap-incy-follow/follow-node" },
    { label: "Netflix", domainCategory: "geosite:NETFLIX", expected: "balancer-ap-incy-fixed/fixed-media" },
    { label: "blocked ad", domainCategory: "geosite:ADVERTISING", expected: "ap-incy-block" },
    { label: "literal China IP", ipCategory: "geoip:CN", expected: "ap-incy-direct" },
    { label: "unmatched traffic", expected: "ap-incy-follow/follow-node" },
  ];
  for (const request of routeCases) {
    const matched = firstMatchingRule(incyRouting.rules, request);
    assert.ok(matched, `${request.label} must match a routing rule`);
    assert.equal(matched.outboundTag, request.expected, request.label);
  }
  const chinaTldIndex = incyRouting.rules.findIndex((rule) => rule.domain?.includes("geosite:CN") && rule.outboundTag === "ap-incy-direct");
  const chinaIpIndex = incyRouting.rules.findIndex((rule) => rule.ip?.includes("geoip:CN"));
  assert.ok(chinaTldIndex >= 0 && chinaIpIndex > chinaTldIndex, "ChinaTLD must precede ChinaIP fallback");
});

test("the INCY workspace verify script includes JSON validation", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.match(packageJson.scripts.verify, /npm run check:json/u);
});
