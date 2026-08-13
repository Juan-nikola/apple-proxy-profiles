import assert from "node:assert/strict";
import test from "node:test";

import { decodeHappGeodata, renderHappGeodata } from "../../../automation/src/render-happ-geodata.js";
import { RULE_KIND } from "../../../shared/rules/model.js";

function ruleSet(id, entries) {
  return Object.freeze({ id, entries: Object.freeze(entries.map((entry) => Object.freeze({ ...entry, sourceId: id }))) });
}

function compactedRuleSets() {
  return new Map([
    ["Zulu", ruleSet("Zulu", [
      { kind: RULE_KIND.domainKeyword, value: "needle", noResolve: false },
      { kind: RULE_KIND.ipv6Cidr, value: "2001:db8:1::/48", noResolve: true },
      { kind: RULE_KIND.domain, value: "www.example.com", noResolve: false },
    ])],
    ["Alpha", ruleSet("Alpha", [
      { kind: RULE_KIND.ipv4Cidr, value: "203.0.113.9/24", noResolve: true },
      { kind: RULE_KIND.domainSuffix, value: "example.com", noResolve: false },
    ])],
    ["Advertising", ruleSet("Advertising", [{ kind: RULE_KIND.domainSuffix, value: "ads.example", noResolve: false }])],
    ["Advertising_Domain", ruleSet("Advertising_Domain", [{ kind: RULE_KIND.domain, value: "tracker.example", noResolve: false }])],
  ]);
}

test("renders deterministic Xray geodata with sorted tags, mapped domains, and canonical CIDRs", () => {
  const first = renderHappGeodata(compactedRuleSets());
  const second = renderHappGeodata(new Map([...compactedRuleSets()].reverse()));

  assert.deepEqual([...first.files.keys()], ["happ/geosite.dat", "happ/geoip.dat"]);
  assert.deepEqual(first.files, second.files);
  assert.deepEqual(first.counts, { geosite: 2, geoip: 2, domains: 3, cidrs: 2 });

  assert.deepEqual(decodeHappGeodata(first.files), {
    geosite: [
      { countryCode: "HAPP-ALPHA", domain: [{ type: "Domain", value: "example.com" }] },
      { countryCode: "HAPP-ZULU", domain: [
        { type: "Plain", value: "needle" },
        { type: "Full", value: "www.example.com" },
      ] },
    ],
    geoip: [
      { countryCode: "HAPP-ALPHA", cidr: [{ ip: "cb007100", prefix: 24 }], reverseMatch: false },
      { countryCode: "HAPP-ZULU", cidr: [{ ip: "20010db8000100000000000000000000", prefix: 48 }], reverseMatch: false },
    ],
  });
});

test("omits advertising packs and rejects unsupported rule kinds", () => {
  const { geosite, geoip } = decodeHappGeodata(renderHappGeodata(compactedRuleSets()).files);
  assert.equal([...geosite, ...geoip].some(({ countryCode }) => countryCode.includes("ADVERTISING")), false);
  assert.throws(() => renderHappGeodata(new Map([["Bad", ruleSet("Bad", [
    { kind: RULE_KIND.geoip, value: "cn", noResolve: false },
  ])]])), /unsupported Happ geodata rule kind: geoip/u);
});
