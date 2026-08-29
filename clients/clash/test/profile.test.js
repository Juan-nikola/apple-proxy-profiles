import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_RULE_SOURCE_IDS,
  FULL_ADBLOCK_SOURCE_IDS,
  MOBILE_RULE_SOURCE_IDS,
} from "../../../shared/rules/lightweight-policy.js";
import { allCompatibleNodes } from "../../egern/test/fixtures/nodes.js";
import { parseClashOptions, PUBLIC_SNAPSHOT_BASE_URL } from "../src/options.js";
import { renderClashGroups, renderClashProfile } from "../src/render-profile.js";
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

function regionalNodes() {
  return [
    { ...allCompatibleNodes[0], name: "🇸🇬 亚太节点", _profile: { ...allCompatibleNodes[0]._profile, continent: "asiaPacific", flag: "🇸🇬" } },
    { ...allCompatibleNodes[1], name: "🇩🇪 欧洲节点", _profile: { ...allCompatibleNodes[1]._profile, continent: "europe", flag: "🇩🇪" } },
    { ...allCompatibleNodes[2], name: "🇺🇸 美洲节点", _profile: { ...allCompatibleNodes[2]._profile, continent: "americas", flag: "🇺🇸" } },
  ];
}

test("parses the final Clash Apple option contract", () => {
  const options = parseClashOptions(rawOptions());
  assert.equal(options.platform, "macos");
  assert.equal(options.channel, "current");
  assert.equal(options.adblockMode, "off");
  assert.equal(options.dnsMode, "stable");
  assert.equal(options.publicBaseUrl, PUBLIC_SNAPSHOT_BASE_URL);
});

test("uses compact rule providers for Clash mobile platforms", () => {
  for (const platform of ["iphone", "ipad", "appletv"]) {
    const rules = renderClashRules({
      publicBaseUrl: PUBLIC_SNAPSHOT_BASE_URL,
      platform,
      adblockMode: "off",
    });
    assert.deepEqual(Object.keys(rules.providers), MOBILE_RULE_SOURCE_IDS, platform);
    for (const provider of Object.values(rules.providers)) {
      assert.match(provider.url, /\/clash\/mobile-rules\/[^/]+\.yaml$/u, platform);
    }
  }
});

test("keeps the complete rule providers on Clash macOS", () => {
  const rules = renderClashRules({
    publicBaseUrl: PUBLIC_SNAPSHOT_BASE_URL,
    platform: "macos",
    adblockMode: "off",
  });
  assert.deepEqual(Object.keys(rules.providers), DEFAULT_RULE_SOURCE_IDS);
  assert.equal(Object.values(rules.providers).some(({ url }) => url.includes("/mobile-rules/")), false);
});

test("rejects the full advertising pack for Clash mobile platforms", () => {
  for (const platform of ["iphone", "ipad", "appletv"]) {
    assert.throws(
      () => parseClashOptions(rawOptions({ platform, adblockMode: "full" })),
      /adblockMode=full.*mobile.*memory/iu,
      platform,
    );
  }
  assert.doesNotThrow(() => parseClashOptions(rawOptions({ platform: "macos", adblockMode: "full" })));
});

test("uses a stable IPv4-only default on macOS while preserving mobile IPv6 defaults", () => {
  assert.equal(parseClashOptions(rawOptions()).ipv6Mode, "ipv4-only");
  assert.equal(parseClashOptions(rawOptions({ platform: "iphone" })).ipv6Mode, "auto");
  assert.equal(parseClashOptions(rawOptions({ platform: "ipad" })).ipv6Mode, "auto");
  assert.equal(parseClashOptions(rawOptions({ platform: "appletv" })).ipv6Mode, "auto");
  assert.equal(parseClashOptions(rawOptions({ ipv6Mode: "auto" })).ipv6Mode, "auto");
});

test("disables IPv6 in both Clash root and DNS defaults on macOS", () => {
  const yaml = renderClashProfile(rawOptions(), allCompatibleNodes);
  assert.match(yaml, /^ipv6: false$/mu);
  assert.match(yaml, /^  ipv6: false$/mu);
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

test("renders mobile profiles against compact provider files", () => {
  const yaml = renderClashProfile(rawOptions({ platform: "iphone" }), allCompatibleNodes);
  for (const id of MOBILE_RULE_SOURCE_IDS) {
    assert.match(yaml, new RegExp(`url: "${PUBLIC_SNAPSHOT_BASE_URL}/clash/mobile-rules/${id}\\.yaml"`, "u"), id);
  }
  assert.doesNotMatch(yaml, /\/clash\/rules\/(?:Hijacking|DomesticCore)\.yaml/u);
});

test("matches sing-box region selection semantics and hides automatic helpers at the end", () => {
  const groups = renderClashGroups(regionalNodes(), parseClashOptions(rawOptions()));
  const names = groups.map((item) => item.name);
  assert.deepEqual(names.slice(0, 4), ["🚀 节点选择", "🌏 亚太", "🌍 欧洲", "🌎 美洲"]);

  const primary = groups[0];
  assert.equal(primary.type, "select");
  assert.deepEqual(primary.proxies, ["⚡ 全部自动", "🌏 亚太", "🌍 欧洲", "🌎 美洲"]);

  for (const [region, helper] of [["🌏 亚太", "⚡ 亚太自动"], ["🌍 欧洲", "⚡ 欧洲自动"], ["🌎 美洲", "⚡ 美洲自动"]]) {
    const group = groups.find((item) => item.name === region);
    assert.equal(group.type, "select");
    assert.ok(group.proxies.includes(helper));
    assert.ok(group.proxies.some((value) => value.endsWith("节点")));
  }

  const firstHelper = groups.findIndex((item) => item.hidden === true);
  assert.ok(firstHelper > 0);
  assert.ok(groups.slice(firstHelper).every((item) => item.hidden === true));
  assert.ok(groups.slice(firstHelper).every((item) => item.type === "url-test"));
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
  const baidu = rules.rules.findIndex((rule) => rule === "DOMAIN-SUFFIX,baidupcs.com,DIRECT");
  assert.ok(baidu >= 0 && baidu < domestic);
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
