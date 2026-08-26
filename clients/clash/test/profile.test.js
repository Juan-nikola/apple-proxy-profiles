import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_RULE_SOURCE_IDS,
  FULL_ADBLOCK_SOURCE_IDS,
} from "../../../shared/rules/lightweight-policy.js";
import { allCompatibleNodes } from "../../egern/test/fixtures/nodes.js";
import { parseClashOptions, PUBLIC_SNAPSHOT_BASE_URL } from "../src/options.js";
import { renderClashProfile } from "../src/render-profile.js";
import { renderClashRules } from "../src/render-rules.js";
import { validateClashProfile } from "../src/validate-profile.js";

const PRIVATE_URL = "https://example.invalid/private/clash-nodes?key=TEST_ONLY_PROFILE_QUERY";

function rawOptions(overrides = {}) {
  return {
    output: "config",
    type: "collection",
    name: "clash-profile",
    nodeSubscriptionUrl: PRIVATE_URL,
    platform: "macos",
    ...overrides,
  };
}

test("parses the final Clash Apple option contract", () => {
  const options = parseClashOptions(rawOptions());
  assert.equal(options.platform, "macos");
  assert.equal(options.channel, "edge");
  assert.equal(options.adblockMode, "off");
  assert.equal(options.dnsMode, "stable");
  assert.equal(options.publicBaseUrl, PUBLIC_SNAPSHOT_BASE_URL.replace("/current", "/edge"));
});

test("renders a complete mihomo profile with nodes, groups, DNS, providers, and terminal rules", () => {
  const yaml = renderClashProfile(rawOptions(), allCompatibleNodes);
  assert.deepEqual(validateClashProfile(yaml), { valid: true, errors: [] });
  assert.match(yaml, /^(?:mixed-port|port):/mu);
  assert.match(yaml, /^proxies:/mu);
  assert.match(yaml, /^proxy-groups:/mu);
  assert.match(yaml, /^rule-providers:/mu);
  assert.match(yaml, /^dns:/mu);
  assert.match(yaml, /RULE-SET,DomesticCore,DIRECT/u);
  assert.match(yaml, /RULE-SET,OpenAI,🤖 AI 专用/u);
  assert.match(yaml, /GEOIP,CN,DIRECT/u);
  assert.match(yaml, /MATCH,🚀 节点选择/u);
});

test("keeps the shared routing plan ordered and channel closed", () => {
  const rules = renderClashRules({ publicBaseUrl: PUBLIC_SNAPSHOT_BASE_URL, adblockMode: "off" });
  assert.deepEqual(
    Object.keys(rules.providers).sort(),
    [...DEFAULT_RULE_SOURCE_IDS].sort(),
  );
  const domestic = rules.rules.findIndex((rule) => rule === "RULE-SET,DomesticCore,DIRECT");
  const game = rules.rules.findIndex((rule) => rule === "RULE-SET,OverseasGame,🌍 海外游戏");
  const chinaIp = rules.rules.findIndex((rule) => rule === "RULE-SET,ChinaIP,DIRECT");
  assert.ok(domestic >= 0 && domestic < game && game < chinaIp);
  for (const rule of rules.rules) assert.doesNotMatch(rule, /current|previous/u);
});

test("isolates full advertising providers from the default profile", () => {
  const off = renderClashRules({ publicBaseUrl: PUBLIC_SNAPSHOT_BASE_URL, adblockMode: "off" });
  const full = renderClashRules({ publicBaseUrl: PUBLIC_SNAPSHOT_BASE_URL, adblockMode: "full" });
  assert.deepEqual(FULL_ADBLOCK_SOURCE_IDS, ["Advertising", "Advertising_Domain"]);
  assert.equal(Object.hasOwn(off.providers, "Advertising"), false);
  assert.equal(Object.hasOwn(full.providers, "Advertising"), true);
  assert.equal(Object.hasOwn(full.providers, "Advertising_Domain"), true);
});

test("rejects malformed or unsupported Clash profiles", () => {
  assert.throws(() => parseClashOptions({ ...rawOptions(), platform: "android" }));
  assert.throws(() => parseClashOptions({ ...rawOptions(), nodeSubscriptionUrl: "http://insecure.invalid/x" }));
  assert.deepEqual(validateClashProfile("proxies: []\n"), { valid: false, errors: ["missing proxy-groups", "missing rule-providers", "missing dns", "missing rules", "missing terminal MATCH rule", "missing primary proxy group"] });
});
