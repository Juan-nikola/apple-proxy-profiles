import assert from "node:assert/strict";
import test from "node:test";

import { RULE_CATALOG } from "../src/rule-catalog.js";
import { renderRules, validateCustomRules } from "../src/render-rules.js";

const BLACKMATRIX7_ROOT = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/";
const EXPECTED_CATALOG_IDS = [
  "Hijacking", "BlockHttpDNS", "AdvertisingLite", "Privacy", "BiliBili", "DouYin", "XiaoHongShu", "Weibo",
  "OpenAI", "Claude", "Gemini", "Copilot", "GitHub", "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
  "Telegram", "Facebook", "Instagram", "Twitter", "TikTok", "Apple", "Microsoft", "Game", "Download", "PrivateTracker",
  "ChinaMax",
];

function indexOf(lines, fragment) {
  const index = lines.findIndex((line) => line.includes(fragment));
  assert.notEqual(index, -1, `missing rule containing ${fragment}`);
  return index;
}

test("renders local and remote rules in routing precedence order", () => {
  const lines = renderRules();

  assert.ok(indexOf(lines, "IP-CIDR,192.168.0.0/16") < indexOf(lines, "CUSTOM_PROXY"));
  assert.ok(indexOf(lines, "BiliBili/BiliBili.list") < indexOf(lines, "ChinaMax/ChinaMax.list"));
  assert.ok(indexOf(lines, "OpenAI/OpenAI.list") < indexOf(lines, "Microsoft/Microsoft.list"));
  assert.ok(indexOf(lines, "GitHub/GitHub.list") < indexOf(lines, "Microsoft/Microsoft.list"));
  assert.ok(indexOf(lines, "PROTOCOL,UDP") < indexOf(lines, "Game/Game.list,🕹️ 游戏平台"));
  assert.ok(indexOf(lines, "Download/Download.list") < indexOf(lines, "ChinaMax/ChinaMax.list"));
  assert.ok(indexOf(lines, "GEOIP,CN,DIRECT") < indexOf(lines, "FINAL,🚀 节点选择"));
});

test("uses official Blackmatrix7 catalog URLs with positive coverage thresholds", () => {
  assert.deepEqual(RULE_CATALOG.map((rule) => rule.id), EXPECTED_CATALOG_IDS);
  for (const rule of RULE_CATALOG) {
    assert.match(rule.url, new RegExp(`^${BLACKMATRIX7_ROOT}`));
    assert.ok(rule.minEntries > 0, `${rule.id} must have a positive minEntries`);
  }
});

test("renders every remote catalog entry in its explicit routing order", () => {
  const lines = renderRules();
  const renderedRuleSetIds = lines
    .filter((line) => line.startsWith("RULE-SET,"))
    .map((line) => RULE_CATALOG.find((rule) => line.includes(rule.url))?.id);

  assert.deepEqual(renderedRuleSetIds, EXPECTED_CATALOG_IDS);
  assert.equal(lines.filter((line) => line.includes("Game/Game.list")).length, 2);
  assert.deepEqual(renderedRuleSetIds.slice(-4), ["Game", "Download", "PrivateTracker", "ChinaMax"]);
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
});

