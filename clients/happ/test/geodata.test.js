import assert from "node:assert/strict";
import test from "node:test";

import { decodeHappGeodata, renderHappGeodata } from "../../../automation/src/render-happ-geodata.js";
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
  assert.deepEqual(first.counts, { geosite: 2, geoip: 2, domains: 3, cidrs: 2 });
  assert.deepEqual(decodeHappGeodata(first.files).geosite[0], {
    countryCode: "HAPP-ALPHA",
    domain: [{ type: "Domain", value: "example.com" }],
  });
  assert.equal(JSON.stringify(decodeHappGeodata(first.files)).includes("ADVERTISING"), false);
});

test("HAPP GeoData rejects unsupported rule kinds", () => {
  assert.throws(() => renderHappGeodata(new Map([
    ["Bad", ruleSet("Bad", [{ kind: RULE_KIND.geoip, value: "cn" }])],
  ])), /unsupported Happ geodata rule kind/u);
});
