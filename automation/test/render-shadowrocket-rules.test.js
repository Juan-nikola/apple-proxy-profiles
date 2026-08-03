import assert from "node:assert/strict";
import test from "node:test";

import { parseSurgeRules } from "../src/parse-surge.js";
import { renderShadowrocketRuleSource } from "../src/render-shadowrocket-rules.js";

const source = Object.freeze({
  id: "Fixture",
  canonicalPath: "rule/Surge/Fixture/Fixture.list",
  inputFormat: "RULE-SET",
  minEntries: 1,
});
const upstream = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  commit: "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc",
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

test("retains pinned Surge syntax and ordering while normalizing newlines", () => {
  const text = "# upstream comment\r\nDOMAIN-SUFFIX,Example.COM\r\nIP-CIDR,10.1.2.3/8,no-resolve";
  const parsed = parseSurgeRules(text, source);
  const fetched = { text };
  const result = renderShadowrocketRuleSource({ source, parsed, fetched, upstream });

  assert.match(result.content, /^# Upstream: https:\/\/github\.com\/blackmatrix7\/ios_rule_script\n/u);
  assert.match(result.content, /# License: GPL-2\.0-only\n/u);
  assert.match(result.content, /# Output entries: 2\n# Omitted entries: 0\n/u);
  assert.ok(result.content.endsWith(
    "# upstream comment\nDOMAIN-SUFFIX,Example.COM\nIP-CIDR,10.1.2.3/8,no-resolve\n",
  ));
  assert.equal(result.content.includes("\r"), false);
  assert.deepEqual(result.counts, { input: 2, parsed: 2, output: 2, omitted: 0 });
});

test("is byte-identical for identical input and enforces GPL provenance", () => {
  const text = "DOMAIN,exact.example\n";
  const parsed = parseSurgeRules(text, source);
  const input = { source, parsed, fetched: { text }, upstream };
  assert.equal(
    renderShadowrocketRuleSource(input).content,
    renderShadowrocketRuleSource(input).content,
  );
  assert.throws(
    () => renderShadowrocketRuleSource({
      ...input,
      upstream: { ...upstream, license: "MIT" },
    }),
    /GPL-2\.0-only/u,
  );
});
