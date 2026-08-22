import assert from "node:assert/strict";
import test from "node:test";

import { EXTERNAL_RULE_SOURCE_CATALOG } from "../shared/rules/external-sources.js";
import { REGION_PROFILES, parseRegion, sourcesForRegion } from "../shared/rules/region-profiles.js";

test("defines all pinned external sources with explicit adapter metadata", () => {
  assert.equal(EXTERNAL_RULE_SOURCE_CATALOG.length, 4);
  for (const source of EXTERNAL_RULE_SOURCE_CATALOG) {
    assert.match(source.commit, /^[0-9a-f]{40}$/u);
    assert.ok(source.license.length > 0);
    assert.ok(source.format.length > 0);
    assert.ok(source.adapter.length > 0);
    assert.ok(Number.isInteger(source.minEntries) && source.minEntries > 0);
    assert.match(source.sourcePath, /^(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+$/u);
    assert.match(source.retrievalUrl, /^https:\/\/githubusercontent\.com|^https:\/\/raw\.githubusercontent\.com/u);
    assert.match(source.retrievedAt, /^\d{4}-\d\d-\d\dT/u);
    assert.match(source.sha256, /^[0-9a-f]{64}$/u);
  }
});

test("parses the supported region set and defaults to cn", () => {
  assert.equal(parseRegion(), "cn");
  assert.deepEqual(Object.keys(REGION_PROFILES), ["cn", "global", "ru", "ir"]);
  for (const region of Object.keys(REGION_PROFILES)) assert.equal(parseRegion(region), region);
  assert.throws(() => parseRegion("us"), /Unsupported region/u);
});

test("selects only the opted-in regional overlay", () => {
  const cn = sourcesForRegion("cn", { adblockMode: "full" });
  const ru = sourcesForRegion("ru", { adblockMode: "full" });
  const ir = sourcesForRegion("ir", { adblockMode: "full" });
  assert.equal(new Set(cn).size, cn.length);
  assert.equal(cn.includes("russia-v2ray-rules"), false);
  assert.equal(cn.includes("iran-v2ray-rules"), false);
  assert.equal(ru.includes("russia-v2ray-rules"), true);
  assert.equal(ru.includes("iran-v2ray-rules"), false);
  assert.equal(ir.includes("iran-v2ray-rules"), true);
  assert.equal(ir.includes("russia-v2ray-rules"), false);
  assert.equal(sourcesForRegion("global").includes("ChinaTLD"), false);
  assert.equal(sourcesForRegion("global").includes("DomesticCore"), false);
  assert.throws(() => sourcesForRegion("cn", { adblockMode: "invalid" }), /adblockMode/u);
});
