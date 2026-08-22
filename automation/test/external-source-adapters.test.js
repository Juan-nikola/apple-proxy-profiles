import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { EXTERNAL_RULE_SOURCE_CATALOG } from "../../shared/rules/external-sources.js";
import { RULE_KIND, normalizeRuleEntry } from "../../shared/rules/model.js";
import { parseExternalRuleSource } from "../src/rule-sources/adapter-contract.js";

const v2fly = EXTERNAL_RULE_SOURCE_CATALOG.find(({ id }) => id === "v2fly-domain-list");
const loyalsoldier = EXTERNAL_RULE_SOURCE_CATALOG.find(({ id }) => id === "loyalsoldier-rules-dat");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const metadata = (source, text) => ({ source, text, sourceSha256: source.sha256, retrievedAt: source.retrievedAt });

test("parses v2fly YAML domains, normalizes values, and preserves categories/comments", async () => {
  const text = [
    "# TEST_ONLY_fixture",
    "TEST_ONLY_CATEGORY:",
    "  - domain:Example.COM.",
    "  - full:Exact.Example.COM.",
    "  - keyword:TEST_ONLY_TOKEN",
    "  - domain:Example.COM.",
  ].join("\n");
  const parsed = await parseExternalRuleSource(metadata(v2fly, text));
  assert.equal(parsed.sourceId, v2fly.id);
  assert.deepEqual(parsed.entries.map(({ kind, value, category }) => ({ kind, value, category })), [
    { kind: RULE_KIND.domainSuffix, value: "example.com", category: "TEST_ONLY_CATEGORY" },
    { kind: RULE_KIND.domain, value: "exact.example.com", category: "TEST_ONLY_CATEGORY" },
    { kind: RULE_KIND.domainKeyword, value: "test_only_token", category: "TEST_ONLY_CATEGORY" },
    { kind: RULE_KIND.domainSuffix, value: "example.com", category: "TEST_ONLY_CATEGORY" },
  ]);
  assert.equal(parsed.diagnostics.candidateCount, 4);
  assert.equal(parsed.diagnostics.parsedCount, 4);
  assert.equal(parsed.categories[0].id, "TEST_ONLY_CATEGORY");
});

test("parses Loyalsoldier text categories and compact IPv4/IPv6 CIDRs", async () => {
  const text = [
    "# TEST_ONLY_fixture",
    "TEST_ONLY_GEO|domain|Example.COM",
    "TEST_ONLY_GEO|domain:suffix|.Suffix.Example",
    "TEST_ONLY_GEO|domain:keyword|TEST_ONLY_KEY",
    "TEST_ONLY_IP|cidr|192.0.2.9/24",
    "TEST_ONLY_IP|cidr6|2001:db8::1/32",
    "TEST_ONLY_IP|cidr|192.0.2.0/24",
  ].join("\n");
  const parsed = await parseExternalRuleSource(metadata(loyalsoldier, text));
  assert.deepEqual(parsed.entries.map(({ kind, value, category }) => ({ kind, value, category })), [
    { kind: RULE_KIND.domain, value: "example.com", category: "TEST_ONLY_GEO" },
    { kind: RULE_KIND.domainSuffix, value: "suffix.example", category: "TEST_ONLY_GEO" },
    { kind: RULE_KIND.domainKeyword, value: "test_only_key", category: "TEST_ONLY_GEO" },
    { kind: RULE_KIND.ipv4Cidr, value: "192.0.2.0/24", category: "TEST_ONLY_IP" },
    { kind: RULE_KIND.ipv6Cidr, value: "2001:db8::/32", category: "TEST_ONLY_IP" },
    { kind: RULE_KIND.ipv4Cidr, value: "192.0.2.0/24", category: "TEST_ONLY_IP" },
  ]);
  assert.equal(parsed.diagnostics.parsedCount, 6);
  assert.equal(parsed.diagnostics.duplicates, 1);
});

test("reports unsupported records and rejects malformed or unpinned input", async () => {
  const text = "TEST_ONLY_GEO|regex|^example\\.invalid$\n";
  const parsed = await parseExternalRuleSource(metadata(loyalsoldier, text));
  assert.equal(parsed.entries.length, 0);
  assert.equal(parsed.diagnostics.unsupportedCount, 1);
  assert.equal(parsed.diagnostics.unsupportedByReason["unsupported-domain-regex"], 1);
  assert.throws(() => parseExternalRuleSource(metadata(loyalsoldier, "TEST_ONLY_GEO|domain\n")), /malformed/u);
  assert.throws(() => parseExternalRuleSource({ ...metadata(v2fly, "TEST_ONLY_GEO:\n  - domain:example.invalid"), sourceSha256: hash("wrong") }), /SHA-256/u);
});

test("adapter entries satisfy the canonical rule contract", async () => {
  const parsed = await parseExternalRuleSource(metadata(v2fly, "TEST_ONLY_GEO:\n  - domain:example.invalid"));
  for (const entry of parsed.entries) assert.doesNotThrow(() => normalizeRuleEntry({ ...entry, sourceId: parsed.sourceId }));
  assert.equal(parsed.provenance.commit, v2fly.commit);
  assert.equal(parsed.provenance.retrievedAt, v2fly.retrievedAt);
});
