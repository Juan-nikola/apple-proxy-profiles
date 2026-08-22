import assert from "node:assert/strict";
import test from "node:test";
import { mergeRuleSources } from "../automation/src/merge-rule-sources.js";
import { sourcesForRegion } from "../shared/rules/region-profiles.js";
import { EXTERNAL_RULE_SOURCE_CATALOG } from "../shared/rules/external-sources.js";

test("region selection excludes unrelated overlays", () => {
  const source = EXTERNAL_RULE_SOURCE_CATALOG.find(({ id }) => id === "iran-v2ray-rules");
  const merged = mergeRuleSources({ region: "ru", snapshots: new Map([
    ["iran-v2ray-rules", { sourceId: "iran-v2ray-rules", entries: [{ kind: "domainSuffix", value: "ir.example", sourceId: "iran-v2ray-rules" }], provenance: source }],
  ]) });
  assert.equal(merged.provenance.some(({ sourceId }) => sourceId === "iran-v2ray-rules"), false);
});

test("region selection matrix includes only the intended overlay", () => {
  assert.equal(sourcesForRegion("cn").includes("russia-v2ray-rules"), false);
  assert.equal(sourcesForRegion("cn").includes("iran-v2ray-rules"), false);
  assert.equal(sourcesForRegion("global").includes("russia-v2ray-rules"), false);
  assert.equal(sourcesForRegion("global").includes("iran-v2ray-rules"), false);
  assert.equal(sourcesForRegion("ru").includes("russia-v2ray-rules"), true);
  assert.equal(sourcesForRegion("ru").includes("iran-v2ray-rules"), false);
  assert.equal(sourcesForRegion("ir").includes("iran-v2ray-rules"), true);
  assert.equal(sourcesForRegion("ir").includes("russia-v2ray-rules"), false);
});
