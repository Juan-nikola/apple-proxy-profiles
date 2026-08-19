import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_RULE_SOURCE_IDS } from "../../../shared/rules/lightweight-policy.js";
import { RULE_KIND } from "../../../shared/rules/model.js";
import { oneXrayGeoCode, oneXrayGeoNames } from "../src/geodata-contract.js";
import { decodeXrayGeoData, renderXrayGeoData } from "../../../automation/src/render-xray-geodata.js";

function snapshot(reverse = false) {
  const entries = DEFAULT_RULE_SOURCE_IDS.map((id) => [id, {
    id,
    entries: id === "ChinaIP"
      ? [
        { kind: RULE_KIND.ipv4Cidr, value: "203.0.113.9/24", sourceId: id },
        { kind: RULE_KIND.ipv6Cidr, value: "2001:db8:0:1::9/64", sourceId: id },
      ]
      : [{ kind: RULE_KIND.domainSuffix, value: `${id.toLowerCase()}.example`, sourceId: id }],
  }]);
  entries.push(["Advertising", {
    id: "Advertising",
    entries: [{ kind: RULE_KIND.domainSuffix, value: "ads.example", sourceId: "Advertising" }],
  }]);
  return new Map(reverse ? entries.reverse() : entries);
}

test("OneXray GeoData uses stable channel names and deterministic category codes", () => {
  assert.deepEqual(oneXrayGeoNames("edge"), {
    domain: "AppleProxySiteEdge",
    ip: "AppleProxyIPEdge",
  });
  assert.equal(oneXrayGeoCode("DomesticCore"), "APP-DOMESTICCORE");
  const first = renderXrayGeoData(snapshot(), "edge");
  const second = renderXrayGeoData(snapshot(true), "edge");
  assert.deepEqual(first.domain, second.domain);
  assert.deepEqual(first.ip, second.ip);
  assert.deepEqual(first.manifest, second.manifest);
  assert.equal(first.manifest.channel, "edge");
  assert.equal(first.manifest.domain.name, "AppleProxySiteEdge");
  assert.equal(decodeXrayGeoData(first.domain, "domain").categoryCount, DEFAULT_RULE_SOURCE_IDS.length);
  assert.equal(decodeXrayGeoData(first.ip, "ip").ruleCount, 2);
  assert.equal(first.manifest.sources.some(({ id }) => id === "Advertising"), false);
});

test("OneXray GeoData rejects invalid channels and corrupt bytes", () => {
  assert.throws(() => oneXrayGeoNames("stable"), /channel/u);
  const result = renderXrayGeoData(snapshot(), "edge");
  assert.throws(() => decodeXrayGeoData(result.domain.subarray(0, -1), "domain"), /decode|schema|invalid/u);
  assert.throws(() => renderXrayGeoData(snapshot(), "stable"), /channel/u);
});
