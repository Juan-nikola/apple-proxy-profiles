import assert from "node:assert/strict";
import test from "node:test";

import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { resolvePolicyOverrides } from "../src/policy-overrides.js";
import { renderHappRouting } from "../src/render-routing.js";

const encode = (value) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

const options = Object.freeze({
  adblockMode: "off",
  blockMode: "balanced",
  quicMode: "proxy-block",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  ipv6Mode: "auto",
});

function routingContext(overrides = {}) {
  const follow = { name: "Current", _profile: { id: "sr-current-7x2a" } };
  return {
    options,
    followNodeId: follow._profile.id,
    policyResolution: resolvePolicyOverrides({
      encoded: encode(overrides),
      allNodes: [follow],
      eligibleNodes: [follow],
    }),
  };
}

function sourceId(rule) {
  const entry = rule.domain?.[0] ?? rule.ip?.[0];
  return /^geo(?:site|ip):HAPP-/u.test(entry ?? "") ? entry.replace(/^geo(?:site|ip):HAPP-/u, "") : null;
}

test("renders DNS before local, custom, and the authoritative shared source order", () => {
  const { routing } = renderHappRouting(routingContext());
  const rules = routing.rules;
  const sourceRules = rules.filter((rule) => orderedRoutingPlan().some(({ id }) => id === rule.ruleTag));

  assert.deepEqual(rules.slice(0, 2), [
    { inboundTag: ["happ-dns"], ip: ["223.5.5.5"], outboundTag: "happ-direct" },
    { inboundTag: ["happ-dns"], ip: ["1.1.1.1"], outboundTag: "happ-follow/sr-current-7x2a" },
  ]);
  assert.equal(rules[2].outboundTag, "happ-direct", "local/private rules follow resolver-only routes");
  assert.equal(rules[3].outboundTag, "happ-direct", "local/private rules precede generated sources");

  assert.deepEqual(sourceRules.map(sourceId), orderedRoutingPlan().map(({ id }) => id.toUpperCase()));
  assert.deepEqual(sourceRules.find((rule) => sourceId(rule) === "OPENAI").domain, ["geosite:HAPP-OPENAI"]);
  assert.deepEqual(sourceRules.find((rule) => sourceId(rule) === "CHINAIP").ip, ["geoip:HAPP-CHINAIP"]);
  assert.ok(rules.findIndex((rule) => sourceId(rule) === "BLOCKHTTPDNS") < rules.findIndex((rule) => sourceId(rule) === "BILIBILI"));
  assert.ok(rules.findIndex((rule) => sourceId(rule) === "CHINATLD") < rules.findIndex((rule) => sourceId(rule) === "CHINAIP"));
  assert.equal(routing.domainStrategy, "IPIfNonMatch");
  assert.deepEqual(rules.at(-1), {
    network: "tcp,udp",
    outboundTag: "happ-follow/sr-current-7x2a",
    ruleTag: "最终兜底",
  });
});

test("keeps proxy QUIC blocking ahead of proxy service rules and maps only approved business keys", () => {
  const { routing } = renderHappRouting(routingContext({
    "🤖 AI 专用": "DIRECT",
    "🍎 Apple": "FOLLOW",
  }));
  const rules = routing.rules;
  const openAi = rules.find((rule) => rule.ruleTag === "OpenAI");
  const apple = rules.find((rule) => rule.ruleTag === "Apple");
  const customAi = rules.find((rule) => rule.ruleTag === "custom-ai-0");
  const quicOpenAi = rules.find((rule) => rule.ruleTag === "quic-block-OPENAI");

  assert.deepEqual(openAi, {
    domain: ["geosite:HAPP-OPENAI"], outboundTag: "happ-direct", ruleTag: "OpenAI",
  });
  assert.deepEqual(apple, {
    domain: ["geosite:HAPP-APPLE"], outboundTag: "happ-follow/sr-current-7x2a", ruleTag: "Apple",
  });
  assert.deepEqual(customAi, {
    domain: ["domain:perplexity.ai"], outboundTag: "happ-direct", ruleTag: "custom-ai-0",
  });
  assert.deepEqual(quicOpenAi, {
    domain: ["geosite:HAPP-OPENAI"], network: "udp", port: "443", outboundTag: "happ-block", ruleTag: "quic-block-OPENAI",
  });
  assert.ok(rules.indexOf(quicOpenAi) < rules.indexOf(openAi));
  for (const rule of rules) {
    if (Object.hasOwn(rule, "outboundTag") || Object.hasOwn(rule, "balancerTag")) {
      assert.notEqual(Object.hasOwn(rule, "outboundTag"), Object.hasOwn(rule, "balancerTag"), rule.ruleTag);
    }
  }
});
