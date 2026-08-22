import assert from "node:assert/strict";
import test from "node:test";
import { mergeRuleSources } from "../automation/src/merge-rule-sources.js";

test("region selection excludes unrelated overlays", () => {
  const merged = mergeRuleSources({ region: "ru", snapshots: new Map([
    ["iran-v2ray-rules", { sourceId: "iran-v2ray-rules", entries: [{ kind: "domainSuffix", value: "ir.example", sourceId: "iran-v2ray-rules" }] }],
  ]) });
  assert.equal(merged.provenance.some(({ sourceId }) => sourceId === "iran-v2ray-rules"), false);
});
