import assert from "node:assert/strict";
import test from "node:test";

import { decodeHappGeodata, renderHappGeodata } from "../../../automation/src/render-happ-geodata.js";
import { happProxyGeositeDomains } from "../src/render-dns.js";
import { RULE_KIND } from "../../../shared/rules/model.js";

function ruleSet(id, entries) {
  return { id, entries: entries.map((entry) => ({ ...entry, sourceId: id })) };
}

test("HAPP GeoData is deterministic, sorted, and round-trips through protobuf", () => {
  const input = new Map([
    ["Zulu", ruleSet("Zulu", [
      { kind: RULE_KIND.domainKeyword, value: "needle" },
      { kind: RULE_KIND.ipv6Cidr, value: "2001:db8:1::/48" },
      { kind: RULE_KIND.domain, value: "www.example.com" },
    ])],
    ["Alpha", ruleSet("Alpha", [
      { kind: RULE_KIND.ipv4Cidr, value: "203.0.113.9/24" },
      { kind: RULE_KIND.domainSuffix, value: "example.com" },
    ])],
    ["Advertising", ruleSet("Advertising", [{ kind: RULE_KIND.domainSuffix, value: "ads.example" }])],
  ]);
  const first = renderHappGeodata(input);
  const second = renderHappGeodata(new Map([...input].reverse()));

  assert.deepEqual([...first.files.keys()], ["happ/geosite.dat", "happ/geoip.dat"]);
  assert.deepEqual([...first.files], [...second.files]);
  assert.deepEqual(first.counts, { geosite: 3, geoip: 3, domains: 8, cidrs: 21 });
  assert.deepEqual(decodeHappGeodata(first.files).geosite[0], {
    countryCode: "ALPHA",
    domain: [{ type: "Domain", value: "example.com" }],
  });
  assert.equal(JSON.stringify(decodeHappGeodata(first.files)).includes("ADVERTISING"), false);
});

test("HAPP GeoData uses standard Xray labels and includes required private/CN categories", () => {
  const input = new Map([
    ["Privacy", ruleSet("Privacy", [{ kind: RULE_KIND.domainSuffix, value: "tracker.example" }])],
    ["DomesticCore", ruleSet("DomesticCore", [{ kind: RULE_KIND.domainSuffix, value: "example.cn" }])],
    ["ChinaTLD", ruleSet("ChinaTLD", [{ kind: RULE_KIND.domainSuffix, value: "cn" }])],
    ["ChinaIP", ruleSet("ChinaIP", [{ kind: RULE_KIND.ipv4Cidr, value: "1.0.1.0/24" }])],
    ["OpenAI", ruleSet("OpenAI", [{ kind: RULE_KIND.domainSuffix, value: "openai.com" }])],
  ]);

  const decoded = decodeHappGeodata(renderHappGeodata(input).files);
  const siteCodes = new Set(decoded.geosite.map((entry) => entry.countryCode));
  const ipCodes = new Set(decoded.geoip.map((entry) => entry.countryCode));
  assert.ok(siteCodes.has("PRIVATE"));
  assert.ok(siteCodes.has("CN"));
  assert.ok(siteCodes.has("OPENAI"));
  assert.ok(ipCodes.has("PRIVATE"));
  assert.ok(ipCodes.has("CN"));
  assert.equal([...siteCodes].some((code) => code.startsWith("HAPP-")), false);
  assert.equal([...ipCodes].some((code) => code.startsWith("HAPP-")), false);
});

test("HAPP GeoData rejects unsupported rule kinds", () => {
  assert.throws(() => renderHappGeodata(new Map([
    ["Bad", ruleSet("Bad", [{ kind: RULE_KIND.geoip, value: "cn" }])],
  ])), /unsupported Happ geodata rule kind/u);
});

test("HAPP proxy DNS domains use bundled Xray-compatible geosite codes", () => {
  const domains = happProxyGeositeDomains();
  assert.equal(domains.some((domain) => domain.includes("HAPP-")), false);
  assert.deepEqual(domains, [
    "geosite:OPENAI",
    "geosite:CATEGORY-AI-!CN",
    "geosite:GOOGLE-GEMINI",
    "geosite:GITHUB-COPILOT",
    "geosite:GITHUB",
    "geosite:YOUTUBE",
    "geosite:NETFLIX",
    "geosite:DISNEY",
    "geosite:SPOTIFY",
    "geosite:CATEGORY-MEDIA",
    "geosite:TELEGRAM",
    "geosite:FACEBOOK",
    "geosite:INSTAGRAM",
    "geosite:TWITTER",
    "geosite:TIKTOK",
    "geosite:CATEGORY-GAMES-!CN",
  ]);
});
