import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_RULE_SOURCE_IDS } from "../../../shared/rules/lightweight-policy.js";
import { parseSurgeOptions } from "../src/options.js";
import { renderSurgeProxy } from "../src/render-node.js";
import { renderSurgeProfile } from "../src/render-profile.js";
import { validateSurgeProfile } from "../src/validate-profile.js";
import { CONTINENTS, continentFilter } from "../../../shared/policies/filters.js";

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

const ruleBaseUrl = "https://example.invalid/current/surge/rules";

function ruleLines(profile) {
  const lines = profile.split("\n");
  return lines.slice(lines.indexOf("[Rule]") + 1).filter(Boolean);
}

const normalizedSsNode = {
  name: "🇯🇵 Tokyo A｜机场·U",
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
    const options = parseSurgeOptions({ ...baseOptions, platform });
    assert.equal(options.platform, platform);
    assert.equal(options.channel, "edge");
    assert.equal(options.adblockMode, "off");
  }
  assert.equal(parseSurgeOptions({ ...baseOptions, channel: "current" }).channel, "current");
  assert.equal(parseSurgeOptions({ ...baseOptions, adblockMode: "full" }).adblockMode, "full");
  assert.throws(() => parseSurgeOptions({ ...baseOptions, platform: "android" }), /platform/iu);
  assert.throws(() => parseSurgeOptions({ ...baseOptions, channel: "beta" }), /channel/iu);
  assert.throws(() => parseSurgeOptions({ ...baseOptions, adblockMode: "balanced" }), /adblockMode/iu);
  assert.throws(() => parseSurgeOptions({ ...baseOptions, unknown: "value" }), /unknown/iu);
});

test("matches compact and normalized country-flag node names", () => {
  const asia = CONTINENTS.find((continent) => continent.name === "🌏 亚太");
  const filter = new RegExp(continentFilter(asia), "u");
  assert.match("🇯🇵Neburst1|DMIT-T1", filter);
  assert.match("🇯🇵 Tokyo A｜机场·U", filter);
});

test("renders a private Surge profile with shared policy sections and no internal metadata", () => {
  const profile = renderSurgeProfile(parseSurgeOptions(baseOptions), [normalizedSsNode], {
    ruleBaseUrl,
  });
  assert.match(profile, /^\[General\]/mu);
  assert.match(profile, /^\[Proxy\]/mu);
  assert.match(profile, /^\[Proxy Group\]/mu);
  assert.match(profile, /^\[Rule\]/mu);
  assert.match(profile, /🇯🇵 Tokyo A｜机场·U = ss,198\.51\.100\.10,443/iu);
  assert.match(profile, /TEST_ONLY_NOT_A_SECRET/u);
  assert.doesNotMatch(profile, /_profile|_subName|_resolved/u);
  assert.deepEqual(validateSurgeProfile(profile), { valid: true, errors: [] });
});

test("renders ChinaTLD after OverseasGame and before ChinaIP in the lightweight Surge precedence", () => {
  const profile = renderSurgeProfile(parseSurgeOptions(baseOptions), [normalizedSsNode], { ruleBaseUrl });
  const rules = ruleLines(profile);
  const indexOf = (fragment) => rules.findIndex((line) => line.includes(fragment));
  const remoteRules = rules.filter((line) => /^(?:RULE-SET|DOMAIN-SET),/u.test(line));

  assert.doesNotMatch(profile, /\/(?:Advertising|Advertising_Domain|ChinaMax_Domain)\.list/u);
  assert.equal(remoteRules.length, DEFAULT_RULE_SOURCE_IDS.length);
  assert.match(profile, new RegExp(`^RULE-SET,${ruleBaseUrl}/DomesticCore\\.list,DIRECT,`, "mu"));
  assert.match(profile, new RegExp(`^RULE-SET,${ruleBaseUrl}/DomesticGame\\.list,DIRECT,`, "mu"));
  assert.match(profile, new RegExp(`^RULE-SET,${ruleBaseUrl}/SteamCN\\.list,DIRECT,`, "mu"));
  assert.match(profile, new RegExp(`^RULE-SET,${ruleBaseUrl}/OverseasGame\\.list,🌍 海外游戏,`, "mu"));
  assert.match(profile, new RegExp(`^RULE-SET,${ruleBaseUrl}/ChinaTLD\\.list,DIRECT,`, "mu"));
  assert.match(rules[indexOf("/ChinaTLD.list")], /ChinaTLD\.list,DIRECT,/u);
  assert.match(profile, new RegExp(`^RULE-SET,${ruleBaseUrl}/ChinaIP\\.list,DIRECT,`, "mu"));
  assert.match(profile, /^GEOIP,CN,DIRECT$/mu);
  assert.doesNotMatch(profile, /^GEOIP,CN,DIRECT,no-resolve$/mu);
  assert.equal(rules.at(-1), "FINAL,🚀 节点选择,dns-failed");

  assert.ok(indexOf("/Hijacking.list") < indexOf("# CUSTOM_BLOCK"));
  assert.ok(indexOf("# CUSTOM_AI") < indexOf("/DomesticCore.list"));
  assert.ok(indexOf("/DomesticCore.list") < indexOf("/DomesticGame.list"));
  assert.ok(indexOf("/DomesticGame.list") < indexOf("/SteamCN.list"));
  assert.ok(indexOf("/SteamCN.list") < indexOf("/OpenAI.list"));
  assert.ok(indexOf("/OpenAI.list") < indexOf("/OverseasGame.list"));
  assert.ok(indexOf("/OverseasGame.list") < indexOf("/ChinaTLD.list"));
  assert.ok(indexOf("/ChinaTLD.list") < indexOf("/ChinaIP.list"));
  assert.ok(indexOf("/ChinaIP.list") < indexOf("GEOIP,CN,DIRECT"));
});

test("keeps full ad blocking isolated to the optional Surge publication", () => {
  const profile = renderSurgeProfile(parseSurgeOptions({ ...baseOptions, adblockMode: "full" }), [normalizedSsNode], {
    ruleBaseUrl,
  });
  const optionalBase = "https://example.invalid/current/optional/adblock-full/surge/rules";
  const optionalUrls = [...profile.matchAll(/https:\/\/[^,\s]+\/(?:Advertising|Advertising_Domain)\.list/gu)].map(([url]) => url);
  assert.deepEqual(optionalUrls, [
    `${optionalBase}/Advertising.list`,
    `${optionalBase}/Advertising_Domain.list`,
  ]);
  assert.doesNotMatch(profile, new RegExp(`${ruleBaseUrl}/Advertising(?:_Domain)?\\.list`, "u"));
});

test("keeps unknown-name DNS domestic while explicit overseas domains resolve through the proxy", () => {
  for (const platform of ["macos", "iphone", "ipad"]) {
    const profile = renderSurgeProfile(parseSurgeOptions({ ...baseOptions, platform }), [normalizedSsNode], { ruleBaseUrl });
    const rules = ruleLines(profile);
    const overseas = rules.findIndex((line) => line.startsWith(`RULE-SET,${ruleBaseUrl}/OpenAI.list,🤖 AI 专用,`));
    const chinaIp = rules.findIndex((line) => line.includes("/ChinaIP.list,DIRECT,"));

    assert.match(profile, /^dns-server = 223\.5\.5\.5$/mu);
    assert.doesNotMatch(profile, /^\[Host\]$/mu);
    assert.doesNotMatch(profile, /^RULE-SET:https:\/\/.* = server:/mu);
    assert.ok(overseas >= 0 && overseas < chinaIp, platform);
    assert.match(profile, /^DOMAIN,example\.invalid,🧭 DNS 与规则下载$/mu);
  }
});

test("renders every Surge platform without changing shared group names", () => {
  for (const platform of ["macos", "iphone", "ipad"]) {
    const profile = renderSurgeProfile(parseSurgeOptions({ ...baseOptions, platform }), [normalizedSsNode], {
      ruleBaseUrl,
    });
    assert.match(profile, /^FINAL,🚀 节点选择,dns-failed$/mu);
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

test("renders a pure remote Surge profile without embedding node transport details", () => {
  const profile = renderSurgeProfile(parseSurgeOptions({
    ...baseOptions,
    proxyPolicyUrl: "https://substore.example.invalid/surge-nodes",
  }), [normalizedSsNode], {
    ruleBaseUrl: "https://example.invalid/current/surge/rules",
  });
  const proxySection = profile.split("[Proxy]\n", 2)[1].split("\n\n[Proxy Group]", 1)[0];
  assert.doesNotMatch(proxySection, / = (?:ss|snell|vmess|hysteria2),/iu);
  assert.match(profile, /📦 远程节点池 = select,policy-path=https:\/\/substore\.example\.invalid\/surge-nodes,update-interval=21600,hidden=1/u);
  assert.match(profile, /⚡ 全部自动 = url-test,include-other-group=📦 远程节点池,policy-regex-filter=/u);
  assert.match(profile, /🚀 节点选择 = select,⚡ 全部自动,include-other-group=📦 远程节点池,policy-regex-filter=/u);
  assert.deepEqual(validateSurgeProfile(profile), { valid: true, errors: [] });
});

test("renders one remote policy pool and preserves filters after URL replacement", () => {
  const defaultPolicyUrl = "https://default.example.invalid/surge-nodes";
  const manualPolicyUrl = "https://manual.example.invalid/surge-nodes";
  const profile = renderSurgeProfile(parseSurgeOptions({
    ...baseOptions,
    proxyPolicyUrl: defaultPolicyUrl,
  }), [normalizedSsNode], {
    ruleBaseUrl: "https://example.invalid/current/surge/rules",
  });
  const policyPaths = profile.split("\n").filter((line) => line.includes("policy-path="));
  assert.equal(policyPaths.length, 1);
  assert.match(policyPaths[0], /📦 远程节点池 = select,policy-path=https:\/\/default\.example\.invalid\/surge-nodes,update-interval=21600,hidden=1/u);
  assert.doesNotMatch(profile, /🧩 个人节点池|🛠 节点来源/u);
  const filteredGroups = profile.split("\n").filter((line) => line.includes("policy-regex-filter="));
  assert.ok(filteredGroups.length > 0);
  for (const line of filteredGroups) assert.match(line, /include-other-group=📦 远程节点池/u);
  const proxySection = profile.split("[Proxy]\n", 2)[1].split("\n\n[Proxy Group]", 1)[0];
  assert.doesNotMatch(proxySection, / = (?:ss|snell|vmess|hysteria2),/iu);
  assert.deepEqual(validateSurgeProfile(profile), { valid: true, errors: [] });

  const manuallySwitched = profile.replace(defaultPolicyUrl, manualPolicyUrl);
  assert.match(manuallySwitched, /📦 远程节点池 = select,policy-path=https:\/\/manual\.example\.invalid\/surge-nodes,update-interval=21600,hidden=1/u);
  assert.deepEqual(
    manuallySwitched.split("\n").filter((line) => line.includes("policy-regex-filter=")),
    filteredGroups,
  );
  assert.deepEqual(validateSurgeProfile(manuallySwitched), { valid: true, errors: [] });
});

test("rejects personalPolicyUrl as a second remote source", () => {
  assert.throws(
    () => parseSurgeOptions({ ...baseOptions, personalPolicyUrl: "https://personal.example.invalid/surge-nodes" }),
    /unknown.*personalPolicyUrl/iu,
  );
});

test("rejects unsafe remote policy URLs", () => {
  const credentialedPolicyUrl = ["https://user", ":pass@substore.example.invalid/surge-nodes"].join("");
  for (const proxyPolicyUrl of [
    "http://substore.example.invalid/surge-nodes",
    credentialedPolicyUrl,
    "https://substore.example.invalid/surge-nodes#fragment",
    "https://substore.example.invalid/surge-nodes\nnext",
  ]) {
    assert.throws(() => parseSurgeOptions({ ...baseOptions, proxyPolicyUrl }), /proxyPolicyUrl/iu);
  }
});
