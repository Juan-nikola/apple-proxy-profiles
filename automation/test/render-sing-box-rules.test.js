import assert from "node:assert/strict";
import test from "node:test";

import { parseSurgeRules } from "../src/parse-surge.js";
import { renderSingBoxRuleSource } from "../src/render-sing-box-rules.js";

const source = {
  id: "Fixture",
  familyId: "Fixture",
  componentId: "rules",
  order: 1,
  priority: 10,
  canonicalPath: "rule/Surge/Fixture/Fixture.list",
  inputFormat: "RULE-SET",
  policy: "DIRECT",
  routing: 1,
  intendedTarget: "direct",
  minEntries: 1,
};
const upstream = {
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "a".repeat(40),
  committedAt: "2026-08-05T00:00:00Z",
  license: "GPL-2.0-only",
};

test("renders deterministic sing-box source rule-set JSON without unsupported entries", () => {
  const text = "DOMAIN-SUFFIX,example.com\nIP-CIDR,192.0.2.0/24,no-resolve\nGEOIP,CN\n";
  const parsed = parseSurgeRules(text, source);
  const result = renderSingBoxRuleSource({
    source,
    parsed,
    fetched: { text, sourceBytes: Buffer.byteLength(text), sourceSha256: "b".repeat(64) },
    upstream,
  });
  assert.equal(result.counts.input, 3);
  assert.equal(result.counts.output, 2);
  assert.equal(result.counts.omitted, 1);
  assert.deepEqual(JSON.parse(result.content), {
    version: 5,
    rules: [
      { domain_suffix: ["example.com"] },
      { ip_cidr: ["192.0.2.0/24"] },
    ],
  });
  assert.equal(result.content, renderSingBoxRuleSource({
    source,
    parsed,
    fetched: { text, sourceBytes: Buffer.byteLength(text), sourceSha256: "b".repeat(64) },
    upstream,
  }).content);
});
