import assert from "node:assert/strict";
import test from "node:test";

import { parseSurgeRules } from "../src/parse-surge.js";
import { renderEgernRuleSource } from "../src/render-egern-rules.js";
import { DOMESTIC_FALLBACK_DOMAIN_SUFFIXES } from "../../shared/rules/domestic-fallback.js";

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

test("renders all eight Egern typed arrays in fixed order with closed accounting", () => {
  const text = [
    "DOMAIN,exact.example",
    "DOMAIN-SUFFIX,Suffix.Example",
    "DOMAIN-KEYWORD,Needle",
    "IP-CIDR,10.1.2.3/8,no-resolve",
    "IP-CIDR6,2001:db8::1/32,no-resolve",
    "IP-ASN,13335,no-resolve",
    "URL-REGEX,^https?://example\\.com/",
    "USER-AGENT,ExampleClient*",
    "PROCESS-NAME,Example Binary",
    "GEOIP,CN,no-resolve",
    "AND,((DOMAIN,one.example),(DOMAIN,two.example))",
    "OR,((DOMAIN,three.example),(DOMAIN,four.example))",
  ].join("\n");
  const parsed = parseSurgeRules(text, source);
  const result = renderEgernRuleSource({ source, parsed, fetched: { text }, upstream });

  const expectedTypeOrder = [
    "domain_set", "domain_suffix_set", "domain_keyword_set", "ip_cidr_set",
    "ip_cidr6_set", "asn_set", "url_regex_set", "user_agent_set",
  ];
  let lastIndex = -1;
  for (const type of expectedTypeOrder) {
    const index = result.content.indexOf(`${type}:`);
    assert.ok(index > lastIndex, `${type} must appear in fixed order`);
    lastIndex = index;
  }
  assert.match(result.content, /domain_set:\n  - "exact\.example"\n/u);
  assert.match(result.content, /domain_suffix_set:\n  - "suffix\.example"\n/u);
  assert.match(result.content, /ip_cidr_set:\n  - "10\.0\.0\.0\/8"\n/u);
  assert.match(result.content, /ip_cidr6_set:\n  - "2001:db8::\/32"\n/u);
  assert.equal(result.content.includes("Example Binary"), false);
  assert.equal(result.content.includes("geoip"), false);
  assert.deepEqual(result.counts, {
    input: 12,
    parsed: 12,
    output: 8,
    omitted: 4,
    emittedByType: {
      domain_set: 1,
      domain_suffix_set: 1,
      domain_keyword_set: 1,
      ip_cidr_set: 1,
      ip_cidr6_set: 1,
      asn_set: 1,
      url_regex_set: 1,
      user_agent_set: 1,
    },
    omittedByKind: { processName: 1, geoip: 1, logicalAnd: 1, logicalOr: 1 },
  });
  assert.match(result.content, /# Output entries: 8\n# Omitted entries: 4\n/u);
  assert.equal(result.content.endsWith("\n"), true);
  assert.equal(result.content.includes("\r"), false);
});

test("emits empty typed arrays and deterministic bytes", () => {
  const text = "PROCESS-NAME,Example\n";
  const parsed = parseSurgeRules(text, source);
  const input = { source, parsed, fetched: { text }, upstream };
  const first = renderEgernRuleSource(input);
  const second = renderEgernRuleSource(input);
  assert.equal(first.content, second.content);
  assert.match(first.content, /domain_set: \[\]\n/u);
  assert.match(first.content, /user_agent_set: \[\]\n$/u);
  assert.equal(first.counts.output, 0);
  assert.equal(first.counts.omitted, 1);
});

test("profile rules add a domestic safety net without changing upstream accounting", () => {
  const chinaSource = { ...source, id: "ChinaMax_Domain", inputFormat: "DOMAIN-SET" };
  const text = ".existing.example\n";
  const parsed = parseSurgeRules(text, chinaSource);
  const result = renderEgernRuleSource({
    source: chinaSource,
    parsed,
    fetched: { text },
    upstream,
  });
  assert.deepEqual(result.counts, {
    input: 1,
    parsed: 1,
    output: DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.length + 1,
    omitted: 0,
    emittedByType: {
      domain_set: 0,
      domain_suffix_set: DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.length + 1,
      domain_keyword_set: 0,
      ip_cidr_set: 0,
      ip_cidr6_set: 0,
      asn_set: 0,
      url_regex_set: 0,
      user_agent_set: 0,
    },
    omittedByKind: { processName: 0, geoip: 0, logicalAnd: 0, logicalOr: 0 },
    supplemental: DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.length,
  });
  for (const suffix of DOMESTIC_FALLBACK_DOMAIN_SUFFIXES) {
    assert.match(result.content, new RegExp(`  - "${suffix.replaceAll(".", "\\.")}"`, "u"), suffix);
  }
  assert.match(result.content, /  - "existing\.example"/u);
});
