import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_RULE_SOURCE_IDS } from "../../../shared/rules/lightweight-policy.js";
import { RULE_KIND } from "../../../shared/rules/model.js";
import {
  oneXrayGeoCode,
  oneXrayGeoNames,
} from "../src/geodata-contract.js";
import {
  decodeXrayGeoData,
  renderXrayGeoData,
} from "../../../automation/src/render-xray-geodata.js";

function fixtureSnapshot({ reverse = false } = {}) {
  const records = DEFAULT_RULE_SOURCE_IDS.map((sourceId, index) => {
    const entries = sourceId === "ChinaIP"
      ? [
        {
          kind: RULE_KIND.ipv4Cidr,
          value: "203.0.113.9/24",
          noResolve: true,
          sourceId,
        },
        {
          kind: RULE_KIND.ipv6Cidr,
          value: "2001:db8:0:1::9/64",
          noResolve: true,
          sourceId,
        },
      ]
      : [{
        kind: RULE_KIND.domainSuffix,
        value: `${sourceId.toLowerCase()}.example`,
        noResolve: false,
        sourceId,
      }];
    return [sourceId, {
      id: sourceId,
      source: { id: sourceId },
      entries,
      order: index,
    }];
  });
  records.push(["Advertising", {
    id: "Advertising",
    source: { id: "Advertising" },
    entries: [{
      kind: RULE_KIND.domainSuffix,
      value: "ads.example",
      sourceId: "Advertising",
    }],
  }]);
  records.push(["Advertising_Domain", {
    id: "Advertising_Domain",
    source: { id: "Advertising_Domain" },
    entries: [{
      kind: RULE_KIND.domainSuffix,
      value: "tracker.example",
      sourceId: "Advertising_Domain",
    }],
  }]);
  return new Map(reverse ? records.reverse() : records);
}

test("pins the three OneXray channel names and stable category codes", () => {
  assert.deepEqual(oneXrayGeoNames("current"), {
    domain: "AppleProxySiteCurrent",
    ip: "AppleProxyIPCurrent",
  });
  assert.deepEqual(oneXrayGeoNames("previous"), {
    domain: "AppleProxySitePrevious",
    ip: "AppleProxyIPPrevious",
  });
  assert.deepEqual(oneXrayGeoNames("edge"), {
    domain: "AppleProxySiteEdge",
    ip: "AppleProxyIPEdge",
  });
  assert.deepEqual(oneXrayGeoNames("edge"), oneXrayGeoNames("edge"));
  assert.equal(oneXrayGeoCode("DomesticCore"), "APP-DOMESTICCORE");
  assert.equal(oneXrayGeoCode("China-IP"), "APP-CHINA-IP");
  assert.throws(() => oneXrayGeoNames("stable"), /channel/u);
  assert.throws(() => oneXrayGeoCode(""), /source/u);

  for (const channel of ["current", "previous", "edge"]) {
    const names = oneXrayGeoNames(channel);
    assert.match(names.domain, /^AppleProxySite(?:Current|Previous|Edge)$/u);
    assert.match(names.ip, /^AppleProxyIP(?:Current|Previous|Edge)$/u);
  }
});

test("compiles every default source into deterministic domain and IP GeoData", () => {
  const first = renderXrayGeoData(fixtureSnapshot(), "edge");
  const second = renderXrayGeoData(fixtureSnapshot({ reverse: true }), "edge");

  assert.deepEqual(first.domain, second.domain);
  assert.deepEqual(first.ip, second.ip);
  assert.deepEqual(first.manifest, second.manifest);
  assert.equal(first.manifest.channel, "edge");
  assert.equal(first.manifest.schema, "apple-proxy-onexray-geodata-v1");
  assert.equal(first.manifest.domain.name, "AppleProxySiteEdge");
  assert.equal(first.manifest.ip.name, "AppleProxyIPEdge");
  assert.equal(first.manifest.domain.ruleCount, DEFAULT_RULE_SOURCE_IDS.length - 1);
  assert.equal(first.manifest.ip.ruleCount, 2);

  const domains = decodeXrayGeoData(first.domain, "domain");
  const ips = decodeXrayGeoData(first.ip, "ip");
  assert.equal(domains.categoryCount, DEFAULT_RULE_SOURCE_IDS.length);
  assert.equal(domains.ruleCount, first.manifest.domain.ruleCount);
  assert.equal(ips.categoryCount, DEFAULT_RULE_SOURCE_IDS.length);
  assert.equal(ips.ruleCount, first.manifest.ip.ruleCount);
  assert.deepEqual(ips.entries.find(({ code }) => code === oneXrayGeoCode("ChinaIP")), {
    code: "APP-CHINAIP",
    cidrs: [
      { ip: "203.0.113.0", prefix: 24 },
      { ip: "2001:db8:0:1::", prefix: 64 },
    ],
  });
  assert.equal(domains.entries.some(({ code }) => code === "APP-ADVERTISING"), false);
  assert.equal(domains.entries.some(({ code }) => code === "APP-ADVERTISING-DOMAIN"), false);
});

test("accepts compileLightweightRules output and rejects duplicate category codes", () => {
  const map = fixtureSnapshot();
  const compiled = { defaultRuleSets: map };
  const result = renderXrayGeoData(compiled, "current");
  assert.equal(result.manifest.channel, "current");

  const duplicate = new Map([
    ["foo", { id: "foo", entries: [] }],
    ["FOO", { id: "FOO", entries: [] }],
  ]);
  assert.throws(() => renderXrayGeoData(duplicate, "current"), /duplicate.*code|code.*duplicate/iu);
});

test("rejects malformed CIDR prefixes and corrupt GeoData bytes", () => {
  const malformed = fixtureSnapshot();
  malformed.get("ChinaIP").entries[0].value = "203.0.113.0/33";
  assert.throws(() => renderXrayGeoData(malformed, "edge"), /CIDR|prefix/u);

  const result = renderXrayGeoData(fixtureSnapshot(), "edge");
  assert.throws(() => decodeXrayGeoData(result.domain.subarray(0, result.domain.length - 1), "domain"), /decode|schema|invalid/u);
  assert.throws(() => decodeXrayGeoData(result.domain, "unknown"), /type/u);
  assert.throws(() => renderXrayGeoData({
    defaultRuleSets: fixtureSnapshot(),
    expectedHashes: { domain: "0".repeat(64) },
  }, "edge"), /hash mismatch/u);
});

test("derives deterministic credential-free input provenance", () => {
  const firstSnapshot = fixtureSnapshot();
  firstSnapshot.provenance = {
    sourceCommit: "a".repeat(40),
    releaseId: "edge-001",
    upstreamUrl: "https://example.invalid/private?token=SECRET_SENTINEL",
    token: "SECRET_SENTINEL",
  };
  const secondSnapshot = fixtureSnapshot({ reverse: true });
  secondSnapshot.provenance = {
    token: "SECRET_SENTINEL",
    releaseId: "edge-001",
    sourceCommit: "a".repeat(40),
    upstreamUrl: "https://example.invalid/private?token=SECRET_SENTINEL",
  };

  const first = renderXrayGeoData(firstSnapshot, "edge");
  const second = renderXrayGeoData(secondSnapshot, "edge");
  assert.deepEqual(first.manifest.provenance, second.manifest.provenance);
  assert.equal(first.manifest.provenance.sourceCommit, "a".repeat(40));
  assert.equal(first.manifest.provenance.releaseId, "edge-001");
  assert.equal("upstreamUrl" in first.manifest.provenance, false);
  assert.equal("token" in first.manifest.provenance, false);
  assert.match(first.manifest.provenance.inputSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(first.manifest.inputHashes, second.manifest.inputHashes);
  assert.equal(Object.keys(first.manifest.inputHashes).length, DEFAULT_RULE_SOURCE_IDS.length);
  assert.equal(first.manifest.sources.every(({ inputSha256 }) => /^[a-f0-9]{64}$/u.test(inputSha256)), true);

  const invalidHash = fixtureSnapshot();
  invalidHash.get("GitHub").sourceSha256 = "A".repeat(64);
  assert.throws(() => renderXrayGeoData(invalidHash, "edge"), /source hash/u);
});
