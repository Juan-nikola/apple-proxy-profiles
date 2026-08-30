import assert from "node:assert/strict";
import test from "node:test";

import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import {
  DEFAULT_RULE_SOURCE_IDS,
  FULL_ADBLOCK_SOURCE_IDS,
} from "../../../shared/rules/lightweight-policy.js";
import { CUSTOM_AI, CUSTOM_BLOCK, CUSTOM_DIRECT, CUSTOM_PROXY } from "../src/custom-rules.js";
import { RULE_CATALOG } from "../src/rule-catalog.js";
import { renderRules, validateCustomRules } from "../src/render-rules.js";

const RULE_BASE_URL = "https://example.invalid/current/shadowrocket/rules";
const FORBIDDEN_DEFAULT_IDS = Object.freeze([
  "Advertising",
  "Advertising_Domain",
  "ChinaMax_Domain",
  "ChinaMax",
  "Game",
]);

function indexOf(lines, fragment) {
  const index = lines.findIndex((line) => line.includes(fragment));
  assert.notEqual(index, -1, `missing rule containing ${fragment}`);
  return index;
}

test("renders ChinaTLD after OverseasGame and before ChinaIP in the shared lightweight precedence", () => {
  const lines = renderRules({ ruleBaseUrl: RULE_BASE_URL });

  for (const id of FORBIDDEN_DEFAULT_IDS) {
    assert.equal(lines.some((line) => line.includes(`/${id}.list`)), false, id);
  }
  assert.ok(indexOf(lines, "IP-CIDR,192.168.0.0/16") < indexOf(lines, "# CUSTOM_PROXY"));
  assert.ok(indexOf(lines, "/Hijacking.list") < indexOf(lines, "# CUSTOM_BLOCK"));
  assert.ok(indexOf(lines, "# CUSTOM_AI") < indexOf(lines, "/DomesticCore.list"));
  assert.ok(indexOf(lines, "DOMAIN-SUFFIX,baidupcs.com,DIRECT") < indexOf(lines, "/DomesticCore.list"));
  assert.ok(indexOf(lines, "/DomesticCore.list") < indexOf(lines, "/DomesticGame.list"));
  assert.ok(indexOf(lines, "/DomesticGame.list") < indexOf(lines, "/SteamCN.list"));
  assert.ok(indexOf(lines, "/SteamCN.list") < indexOf(lines, "/OpenAI.list"));
  assert.ok(indexOf(lines, "/OpenAI.list") < indexOf(lines, "/OverseasGame.list"));
  assert.ok(indexOf(lines, "/OverseasGame.list") < indexOf(lines, "/ChinaTLD.list"));
  assert.ok(indexOf(lines, "/ChinaTLD.list") < indexOf(lines, "/ChinaIP.list"));
  assert.ok(indexOf(lines, "/ChinaIP.list") < indexOf(lines, "GEOIP,CN,DIRECT"));

  assert.match(lines[indexOf(lines, "/DomesticCore.list")], /^RULE-SET,.*\/DomesticCore\.list,DIRECT,/u);
  assert.match(lines[indexOf(lines, "/DomesticGame.list")], /^RULE-SET,.*\/DomesticGame\.list,DIRECT,/u);
  assert.match(lines[indexOf(lines, "/SteamCN.list")], /^RULE-SET,.*\/SteamCN\.list,DIRECT,/u);
  assert.match(lines[indexOf(lines, "/OverseasGame.list")], /^RULE-SET,.*\/OverseasGame\.list,🌍 海外游戏,/u);
  assert.match(lines[indexOf(lines, "/ChinaTLD.list")], /ChinaTLD\.list,DIRECT,/u);
  assert.match(lines[indexOf(lines, "/ChinaIP.list")], /^RULE-SET,.*\/ChinaIP\.list,DIRECT,/u);
  assert.equal(lines.at(-2), "GEOIP,CN,DIRECT");
  assert.equal(lines.at(-1), "FINAL,漏网之鱼");
});

test("uses the selected publication and keeps rule downloads on the fallback policy", () => {
  const lines = renderRules({ ruleBaseUrl: RULE_BASE_URL });
  const remoteLines = lines.filter((line) => /^(?:RULE-SET|DOMAIN-SET),/u.test(line));

  assert.equal(remoteLines.length, DEFAULT_RULE_SOURCE_IDS.length);
  assert.equal(remoteLines.every((line) => line.includes(`${RULE_BASE_URL}/`)), true);
  assert.equal(lines.includes("DOMAIN,example.invalid,🧭 DNS 与规则下载"), true);
});

test("keeps full ad blocking isolated to exactly two optional Shadowrocket URLs", () => {
  const off = renderRules({ ruleBaseUrl: RULE_BASE_URL });
  const full = renderRules({ ruleBaseUrl: RULE_BASE_URL, adblockMode: "full" });
  const optionalBase = "https://example.invalid/current/optional/adblock-full/shadowrocket/rules";
  const optionalUrls = full
    .filter((line) => /\/(?:Advertising|Advertising_Domain)\.list/u.test(line))
    .map((line) => line.split(",")[1]);

  assert.deepEqual(FULL_ADBLOCK_SOURCE_IDS, ["Advertising", "Advertising_Domain"]);
  assert.equal(off.some((line) => /\/Advertising(?:_Domain)?\.list/u.test(line)), false);
  assert.deepEqual(optionalUrls, [
    `${optionalBase}/Advertising.list`,
    `${optionalBase}/Advertising_Domain.list`,
  ]);
  assert.equal(full.some((line) => line.includes(`${RULE_BASE_URL}/Advertising`)), false);
});

test("shared Shadowrocket catalog contains only the lightweight default sources", () => {
  assert.deepEqual(RULE_CATALOG.map(({ id }) => id), DEFAULT_RULE_SOURCE_IDS);
  for (const source of RULE_CATALOG) {
    assert.equal(typeof source.sourcePath, "string", source.id);
    assert.equal(typeof source.policy, "string", source.id);
    assert.ok(["RULE-SET", "DOMAIN-SET"].includes(source.inputFormat), source.id);
    assert.ok(source.minEntries > 0, source.id);
  }
});

test("rejects unsafe or incompatible rule publication URLs", () => {
  for (const ruleBaseUrl of [
    "http://example.invalid/current/shadowrocket/rules",
    "https://example.invalid/current/shadowrocket/rules,REJECT",
    "https://example.invalid/current/shadowrocket/other",
    "https://example.invalid/current/shadowrocket/rules\nFINAL,REJECT",
  ]) {
    assert.throws(() => renderRules({ ruleBaseUrl }), /Shadowrocket.*URL|base URL/iu, ruleBaseUrl);
  }
});

test("rejects invalid custom rules without reflecting CR/LF payloads", () => {
  const valid = [
    ["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,example.com"], "REJECT"],
    ["CUSTOM_PROXY", [
      "DOMAIN-SUFFIX,example.net",
      "DOMAIN-WILDCARD,a?.example.com",
      "DST-PORT,443-8443",
    ], "🚀 节点选择"],
  ];
  assert.doesNotThrow(() => validateCustomRules(valid));

  const invalidConfigurations = [
    [["CUSTOM_BLOCK", [42], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,example.com\ninjected"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,example.com,DIRECT"], "REJECT"]],
    [["CUSTOM_BLOCK", ["URL-REGEX,^https://example.com/(a,b)$"], "REJECT"]],
    [["CUSTOM_BLOCK", ["IP-CIDR,not-a-cidr"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,..bad.."], "REJECT"]],
    [["CUSTOM_BLOCK", ["IP-ASN,ASbad"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN,*.example.com"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,a?.example.com"], "REJECT"]],
    [["CUSTOM_BLOCK", ["DST-PORT,8443-443"], "REJECT"]],
    [
      ["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,example.com"], "REJECT"],
      ["CUSTOM_DIRECT", ["DOMAIN-SUFFIX,example.com"], "DIRECT"],
    ],
  ];
  const unsafeMarkers = ["", " ", " CUSTOM_BLOCK", "CUSTOM_BLOCK ", "CUSTOM,BLOCK", "CUSTOM=BLOCK", "CUSTOM\nBLOCK", "CUSTOM\rBLOCK"];
  const unsafePolicies = ["", " ", " DIRECT", "DIRECT ", "DIRECT,REJECT", "DIRECT=REJECT", "DIRECT\nREJECT", "DIRECT\rREJECT"];
  invalidConfigurations.push(
    ...unsafeMarkers.map((marker) => [[marker, ["DOMAIN-SUFFIX,example.com"], "REJECT"]]),
    ...unsafePolicies.map((policy) => [["CUSTOM_BLOCK", ["DOMAIN-SUFFIX,example.com"], policy]]),
  );

  for (const rules of invalidConfigurations) {
    assert.throws(() => validateCustomRules(rules), (error) => {
      assert.equal(/[\r\n]/.test(error.message), false);
      return true;
    });
  }

  assert.deepEqual(CUSTOM_RULES.ai, CUSTOM_AI);
  assert.strictEqual(CUSTOM_BLOCK, CUSTOM_RULES.block);
  assert.strictEqual(CUSTOM_DIRECT, CUSTOM_RULES.direct);
  assert.strictEqual(CUSTOM_PROXY, CUSTOM_RULES.proxy);
  assert.strictEqual(CUSTOM_AI, CUSTOM_RULES.ai);
});
