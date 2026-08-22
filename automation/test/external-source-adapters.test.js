import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import protobuf from "protobufjs";
import { readFileSync } from "node:fs";

import { EXTERNAL_RULE_SOURCE_CATALOG } from "../../shared/rules/external-sources.js";
import { sourcesForRegion } from "../../shared/rules/region-profiles.js";
import { RULE_KIND, normalizeRuleEntry } from "../../shared/rules/model.js";
import { parseExternalRuleSource } from "../src/rule-sources/adapter-contract.js";

const proto = protobuf.parse(readFileSync(new URL("../proto/xray-geodata.proto", import.meta.url), "utf8")).root;
const GeoSiteList = proto.lookupType("appleproxy.xray.geodata.GeoSiteList");
const GeoIPList = proto.lookupType("appleproxy.xray.geodata.GeoIPList");

const v2fly = EXTERNAL_RULE_SOURCE_CATALOG.find(({ id }) => id === "v2fly-domain-list");
const loyalsoldier = EXTERNAL_RULE_SOURCE_CATALOG.find(({ id }) => id === "loyalsoldier-rules-dat");
const russia = EXTERNAL_RULE_SOURCE_CATALOG.find(({ id }) => id === "russia-v2ray-rules");
const iran = EXTERNAL_RULE_SOURCE_CATALOG.find(({ id }) => id === "iran-v2ray-rules");
const hash = (text) => createHash("sha256").update(text).digest("hex");
const metadata = (source, text) => ({ source, text, sourceSha256: source.sha256, retrievedAt: source.retrievedAt });

test("parses v2fly YAML domains, normalizes values, and preserves categories/comments", async () => {
  const text = [
    "# TEST_ONLY_fixture",
    "TEST_ONLY_CATEGORY:",
    "  - \"domain:Example.COM.\" # inline comment",
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
  assert.equal(parsed.diagnostics.parsedCount, 0);
  assert.equal(parsed.diagnostics.parsedCount + parsed.diagnostics.unsupportedCount, parsed.diagnostics.candidateCount);
  assert.equal(parsed.diagnostics.unsupportedByReason["unsupported-domain-regex"], 1);
  assert.throws(() => parseExternalRuleSource(metadata(loyalsoldier, "TEST_ONLY_GEO|domain\n")), /malformed/u);
  assert.throws(() => parseExternalRuleSource({ ...metadata(v2fly, "TEST_ONLY_GEO:\n  - domain:example.invalid"), sourceSha256: hash("wrong") }), /SHA-256/u);
});

test("decodes synthetic Xray GeoIP protobuf into canonical IPv4 and IPv6 entries", () => {
  const payload = GeoIPList.encode(GeoIPList.fromObject({ entry: [
    { countryCode: "TEST_ONLY_CN", cidr: [{ ip: Buffer.from([192, 0, 2, 9]), prefix: 24 }] },
    { countryCode: "TEST_ONLY_V6", cidr: [{ ip: Buffer.from("20010db8000000000000000000000001", "hex"), prefix: 32 }] },
  ] })).finish();
  const parsed = parseExternalRuleSource(metadata(loyalsoldier, Buffer.from(payload)));
  assert.deepEqual(parsed.entries.map(({ kind, value, category }) => ({ kind, value, category })), [
    { kind: RULE_KIND.ipv4Cidr, value: "192.0.2.0/24", category: "TEST_ONLY_CN" },
    { kind: RULE_KIND.ipv6Cidr, value: "2001:db8::/32", category: "TEST_ONLY_V6" },
  ]);
});

test("rejects forged source metadata even when its hash and timestamp look valid", () => {
  assert.throws(() => parseExternalRuleSource(metadata({ ...v2fly, repository: "https://example.invalid/repo" }, "TEST_ONLY_GEO:\n  - domain:example.invalid")), /catalog metadata mismatch/u);
});

test("adapter entries satisfy the canonical rule contract", async () => {
  const parsed = await parseExternalRuleSource(metadata(v2fly, "TEST_ONLY_GEO:\n  - domain:example.invalid"));
  for (const entry of parsed.entries) assert.doesNotThrow(() => normalizeRuleEntry({ ...entry, sourceId: parsed.sourceId }));
  assert.equal(parsed.provenance.commit, v2fly.commit);
  assert.equal(parsed.provenance.retrievedAt, v2fly.retrievedAt);
});

test("regional adapters preserve region and source-local category metadata", async () => {
  const payload = GeoSiteList.encode(GeoSiteList.fromObject({ entry: [
    { countryCode: "TEST_ONLY_RU_BLOCKED", domain: [{ type: "Full", value: "blocked.example.invalid" }, { type: "Full", value: "blocked.example.invalid" }] },
    { countryCode: "TEST_ONLY_RU_LOCAL", domain: [{ type: "RootDomain", value: "local.example.invalid" }] },
  ] })).finish();
  const parsed = parseExternalRuleSource(metadata(russia, payload));
  assert.deepEqual(parsed.entries.map(({ value, region, category, categoryId }) => ({ value, region, category, categoryId })), [
    { value: "blocked.example.invalid", region: "ru", category: "TEST_ONLY_RU_BLOCKED", categoryId: "TEST_ONLY_RU_BLOCKED" },
    { value: "blocked.example.invalid", region: "ru", category: "TEST_ONLY_RU_BLOCKED", categoryId: "TEST_ONLY_RU_BLOCKED" },
    { value: "local.example.invalid", region: "ru", category: "TEST_ONLY_RU_LOCAL", categoryId: "TEST_ONLY_RU_LOCAL" },
  ]);
  assert.deepEqual(parsed.categories.map(({ id, sourceId, region }) => ({ id, sourceId, region })), [
    { id: "TEST_ONLY_RU_BLOCKED", sourceId: russia.id, region: "ru" },
    { id: "TEST_ONLY_RU_LOCAL", sourceId: russia.id, region: "ru" },
  ]);
  const iranPayload = GeoSiteList.encode(GeoSiteList.fromObject({ entry: [
    { countryCode: "TEST_ONLY_IR_SECURITY", domain: [{ type: "Full", value: "security.example.invalid" }] },
    { countryCode: "TEST_ONLY_IR_LOCAL", domain: [{ type: "Full", value: "local.example.invalid" }] },
  ] })).finish();
  const iranParsed = parseExternalRuleSource(metadata(iran, iranPayload));
  assert.deepEqual(iranParsed.entries.map(({ region, categoryId }) => ({ region, categoryId })), [
    { region: "ir", categoryId: "TEST_ONLY_IR_SECURITY" },
    { region: "ir", categoryId: "TEST_ONLY_IR_LOCAL" },
  ]);
  assert.equal(sourcesForRegion("cn").includes(russia.id), false);
  assert.equal(sourcesForRegion("cn").includes(iran.id), false);
  assert.equal(sourcesForRegion("ru").includes(russia.id), true);
  assert.equal(sourcesForRegion("ru").includes(iran.id), false);
  assert.equal(sourcesForRegion("ir").includes(iran.id), true);
  assert.equal(sourcesForRegion("ir").includes(russia.id), false);

  const cnSnapshot = sourcesForRegion("cn").filter((id) => id === v2fly.id || id === russia.id || id === iran.id);
  const ruSnapshot = sourcesForRegion("ru").filter((id) => id === v2fly.id || id === russia.id || id === iran.id);
  const irSnapshot = sourcesForRegion("ir").filter((id) => id === v2fly.id || id === russia.id || id === iran.id);
  assert.deepEqual(cnSnapshot, [v2fly.id]);
  assert.deepEqual(ruSnapshot, [v2fly.id, russia.id]);
  assert.deepEqual(irSnapshot, [v2fly.id, iran.id]);

  const duplicateV2fly = await parseExternalRuleSource(metadata(v2fly, "TEST_ONLY_SHARED:\n  - full:shared.example.invalid\n"));
  const duplicateRussia = parseExternalRuleSource(metadata(russia, GeoSiteList.encode(GeoSiteList.fromObject({ entry: [
    { countryCode: "TEST_ONLY_SHARED", domain: [{ type: "Full", value: "shared.example.invalid" }] },
  ] })).finish()));
  assert.equal(duplicateV2fly.entries[0].value, duplicateRussia.entries[0].value);
  assert.equal(duplicateV2fly.entries[0].sourceId, v2fly.id);
  assert.equal(duplicateRussia.entries[0].sourceId, russia.id);
  assert.notEqual(duplicateV2fly.entries[0].sourceId, duplicateRussia.entries[0].sourceId);
});

test("regional adapters reject undocumented formats and oversized all-domain fixtures", () => {
  assert.throws(() => parseExternalRuleSource(metadata(russia, "TEST_ONLY_RU_BLOCKED|domain|blocked.example.invalid\n")), /unsupported format/u);
  const makePayload = (count, extra = []) => GeoSiteList.encode(GeoSiteList.fromObject({ entry: [
    { countryCode: "TEST_ONLY_ALL_DOMAIN", domain: [...Array.from({ length: count }, (_, index) => ({ type: "Full", value: `item-${index}.example.invalid` })), ...extra] },
  ] })).finish();
  assert.doesNotThrow(() => parseExternalRuleSource(metadata(iran, makePayload(100_000))));
  const payload = makePayload(100_000, [{ type: "Regex", value: "TEST_ONLY_unsupported" }]);
  assert.throws(() => parseExternalRuleSource(metadata(iran, payload)), /all-domain category exceeds entry budget/u);
});
