import assert from "node:assert/strict";
import test from "node:test";

import { resolvePolicyOverrides } from "../src/policy-overrides.js";
import { HAPP_OBSERVATORY, renderHappRouting } from "../src/render-routing.js";

const encode = (value) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
const options = Object.freeze({
  adblockMode: "off", blockMode: "balanced", quicMode: "proxy-block",
  dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", ipv6Mode: "auto",
});

function render({ followNodeId = "sr-follow-7x2a", overrides = {} } = {}) {
  const nodes = [
    { name: "Current", _profile: { id: followNodeId } },
    { name: "Tokyo", _profile: { id: "sr-fixed-tokyo" } },
    { name: "Osaka", _profile: { id: "sr-fixed-osaka" } },
  ];
  return renderHappRouting({
    options,
    followNodeId,
    policyResolution: resolvePolicyOverrides({ encoded: encode(overrides), allNodes: nodes, eligibleNodes: nodes }),
  });
}

function matchingOutboundTags(selector, candidateTags) {
  return candidateTags.filter((tag) => selector.some((prefix) => tag.startsWith(prefix)));
}

test("translates direct, follow, and fixed business targets without leaking a node name", () => {
  const { policyTargets } = render({
    overrides: {
      "🤖 AI 专用": "DIRECT",
      "🐙 GitHub": "FOLLOW",
      "📺 YouTube": "NODE:Tokyo",
    },
  });

  assert.deepEqual(policyTargets["🤖 AI 专用"], { outboundTag: "happ-direct" });
  assert.deepEqual(policyTargets["🐙 GitHub"], { outboundTag: "happ-follow/sr-follow-7x2a" });
  assert.match(policyTargets["📺 YouTube"].balancerTag, /^happ-fixed\/[A-Za-z0-9_-]+\/balancer$/u);
  assert.doesNotMatch(policyTargets["📺 YouTube"].balancerTag, /Tokyo|sr-fixed-tokyo/u);
});

test("builds one fixed candidate and leastPing balancer per distinct node with exact selectors", () => {
  const { routing, observatory, policyTargets } = render({
    overrides: {
      "🤖 AI 专用": "NODE:Tokyo",
      "🐙 GitHub": "NODE:Tokyo",
      "📺 YouTube": "NODE:Osaka",
      "🧭 DNS 与规则下载": "NODE:Tokyo",
    },
  });
  const candidateTags = [...new Set(Object.values(policyTargets)
    .map((target) => target.candidateTag)
    .filter(Boolean))];

  assert.equal(candidateTags.length, 2);
  assert.equal(routing.balancers.length, 2);
  assert.deepEqual(observatory, {
    subjectSelector: candidateTags.sort(),
    probeUrl: HAPP_OBSERVATORY.probeUrl,
    probeInterval: HAPP_OBSERVATORY.probeInterval,
    enableConcurrency: HAPP_OBSERVATORY.enableConcurrency,
  });
  for (const balancer of routing.balancers) {
    assert.equal(balancer.strategy.type, "leastPing");
    assert.equal(balancer.fallbackTag, "happ-follow/sr-follow-7x2a");
    assert.equal(balancer.selector.length, 1);
    assert.deepEqual(matchingOutboundTags(balancer.selector, candidateTags), [balancer.selector[0]]);
  }
  assert.equal(policyTargets["🧭 DNS 与规则下载"].dnsOutboundTag, policyTargets["🧭 DNS 与规则下载"].candidateTag);
});

test("collapses a self-fixed target to FOLLOW without a balancer or observatory selector", () => {
  const { routing, observatory, policyTargets } = render({
    overrides: { "🤖 AI 专用": "NODE:Current" },
  });

  assert.deepEqual(policyTargets["🤖 AI 专用"], { outboundTag: "happ-follow/sr-follow-7x2a" });
  assert.deepEqual(routing.balancers, []);
  assert.deepEqual(observatory, {
    subjectSelector: [],
    probeUrl: HAPP_OBSERVATORY.probeUrl,
    probeInterval: HAPP_OBSERVATORY.probeInterval,
    enableConcurrency: HAPP_OBSERVATORY.enableConcurrency,
  });
});
