import assert from "node:assert/strict";
import test from "node:test";
import { RULE_KIND } from "../../shared/rules/model.js";
import { explainRoute, mergeRuleSources } from "../src/merge-rule-sources.js";
import { EXTERNAL_RULE_SOURCE_CATALOG } from "../../shared/rules/external-sources.js";

const entry = (value, sourceId, extra = {}) => ({ kind: RULE_KIND.domainSuffix, value, sourceId, ...extra });
const snapshot = (sourceId, entries, extra = {}) => { const source = EXTERNAL_RULE_SOURCE_CATALOG.find(({ id }) => id === sourceId); return { sourceId, entries, provenance: { sourceId, ...(source ?? {}), ...extra } }; };

test("user rules override explicit business rules", () => {
  const merged = mergeRuleSources({ snapshots: new Map([
    ["OpenAI", snapshot("OpenAI", [entry("example.com", "OpenAI")])],
  ]), userRules: [entry("example.com", "user", { action: "DIRECT" })] });
  assert.equal(explainRoute({ hostname: "www.example.com", merged }).action, "DIRECT");
});

test("security rules override a selected region overlay", () => {
  const merged = mergeRuleSources({ region: "ru", snapshots: new Map([
    ["russia-v2ray-rules", snapshot("russia-v2ray-rules", [entry("blocked.ru", "russia-v2ray-rules", { category: "local" })])],
    ["Hijacking", snapshot("Hijacking", [entry("blocked.ru", "Hijacking")])],
  ]) });
  assert.equal(explainRoute({ hostname: "blocked.ru", merged }).action, "REJECT");
});

test("duplicate cross-source entries retain both internal provenance records deterministically", () => {
  const merged = mergeRuleSources({ snapshots: new Map([
    ["OpenAI", snapshot("OpenAI", [entry("same.example", "OpenAI")], { commit: "a".repeat(40), sha256: "b".repeat(64) })],
    ["GitHub", snapshot("GitHub", [entry("same.example", "GitHub")], { commit: "c".repeat(40), sha256: "d".repeat(64) })],
  ]) });
  const decision = merged.decisions.find(({ matcher }) => matcher.value === "same.example");
  assert.deepEqual(decision.matchedSources, ["GitHub", "OpenAI"]);
  assert.deepEqual(decision.provenance.map(({ sourceId }) => sourceId).sort(), ["GitHub", "OpenAI"]);
});

test("ChinaTLD wins before ChinaIP fallback", () => {
  const merged = mergeRuleSources({ snapshots: new Map([
    ["ChinaTLD", snapshot("ChinaTLD", [entry("cn", "ChinaTLD")])],
    ["ChinaIP", { ...snapshot("ChinaIP", []), entries: [{ kind: RULE_KIND.ipv4Cidr, value: "1.0.1.0/24", sourceId: "ChinaIP", noResolve: true }] }],
  ]) });
  assert.equal(explainRoute({ hostname: "service.cn", ip: "1.0.1.1", merged }).matchedSources[0], "ChinaTLD");
  assert.equal(explainRoute({ hostname: "service.example", ip: "1.0.1.1", merged }).matchedSources[0], "ChinaIP");
});

test("rejects equal-priority conflicting user mappings", () => {
  assert.throws(() => mergeRuleSources({ userRules: [entry("conflict.example", "u1", { action: "DIRECT" }), entry("conflict.example", "u2", { action: "REJECT" })] }), /equal-priority/u);
});

test("uses parent and child specificity when both match", () => {
  const merged = mergeRuleSources({ userRules: [entry("example", "u1", { action: "DIRECT" }), entry("child.example", "u2", { action: "REJECT" })] });
  assert.equal(explainRoute({ hostname: "x.child.example", merged }).action, "REJECT");
});

test("matches IPv4 and IPv6 CIDR containment and preserves noResolve", () => {
  const merged = mergeRuleSources({ snapshots: new Map([
    ["ChinaIP", { sourceId: "ChinaIP", entries: [
      { kind: "ipv4Cidr", value: "1.0.1.0/24", sourceId: "ChinaIP" },
      { kind: "ipv4Cidr", value: "1.0.1.0/24", sourceId: "ChinaIP", noResolve: true },
      { kind: "ipv6Cidr", value: "2400:3200::/32", sourceId: "ChinaIP", noResolve: true },
    ] }],
  ]) });
  assert.equal(explainRoute({ hostname: "x.example", ip: "1.0.1.2", merged }).action, "DIRECT");
  assert.equal(explainRoute({ hostname: "x.example", ip: "2400:3200::1", merged }).action, "DIRECT");
  assert.equal(merged.decisions.find(({ matcher }) => matcher.kind === "ipv4Cidr").matcher.noResolve, true);
  assert.ok(merged.ruleSets instanceof Map);
});

test("rejects mismatched external provenance without leaking credentials", () => {
  const source = EXTERNAL_RULE_SOURCE_CATALOG[0];
  assert.throws(() => mergeRuleSources({ snapshots: new Map([[source.id, {
    sourceId: source.id,
    entries: [entry("secret.example", source.id)],
    provenance: { ...source, retrievalUrl: "https://user:password@example.invalid/private" },
  }]]) }), /provenance mismatch|unsafe provenance/u);
});

test("maps overlay security and domestic categories before overlay fallback", () => {
  const merged = mergeRuleSources({ region: "ru", snapshots: new Map([
    ["russia-v2ray-rules", snapshot("russia-v2ray-rules", [
      entry("blocked.ru", "russia-v2ray-rules", { category: "security" }),
      entry("local.ru", "russia-v2ray-rules", { category: "local" }),
      entry("generic.ru", "russia-v2ray-rules", { category: "unknown" }),
    ])],
  ]) });
  assert.equal(merged.decisions.find(({ matcher }) => matcher.value === "blocked.ru").action, "REJECT");
  assert.equal(merged.decisions.find(({ matcher }) => matcher.value === "local.ru").action, "DIRECT");
  assert.equal(merged.decisions.find(({ matcher }) => matcher.value === "generic.ru").priority, 600);
});

test("preserves source-ID actions for advertising, security, privacy, and business", () => {
  const ids = ["Advertising", "Advertising_Domain", "Hijacking", "BlockHttpDNS", "Privacy", "OpenAI"];
  const merged = mergeRuleSources({ adblockMode: "full", snapshots: new Map(ids.map((id) => [id, { sourceId: id, entries: [entry(`${id.toLowerCase()}.example`, id)] }])) });
  assert.equal(merged.decisions.find(({ matcher }) => matcher.sourceId === "Advertising").action, "REJECT");
  assert.equal(merged.decisions.find(({ matcher }) => matcher.sourceId === "Advertising_Domain").action, "REJECT");
  assert.equal(merged.decisions.find(({ matcher }) => matcher.sourceId === "Advertising_Domain").policyGroup, "Advertising");
  assert.equal(merged.decisions.find(({ matcher }) => matcher.sourceId === "Advertising_Domain").priority, 700);
  assert.equal(merged.decisions.find(({ matcher }) => matcher.sourceId === "Hijacking").action, "REJECT");
  assert.equal(merged.decisions.find(({ matcher }) => matcher.sourceId === "BlockHttpDNS").action, "REJECT");
  assert.equal(merged.decisions.find(({ matcher }) => matcher.sourceId === "BlockHttpDNS").policyGroup, "Security");
  assert.equal(merged.decisions.find(({ matcher }) => matcher.sourceId === "BlockHttpDNS").priority, 700);
  assert.equal(merged.decisions.find(({ matcher }) => matcher.sourceId === "Privacy").action, "DIRECT");
  assert.equal(merged.decisions.find(({ matcher }) => matcher.sourceId === "OpenAI").action, "PROXY");
});

test("deeply exposes only the documented merged output shape", () => {
  const source = EXTERNAL_RULE_SOURCE_CATALOG[0];
  const merged = mergeRuleSources({ region: "global", snapshots: new Map([[source.id, { sourceId: source.id, entries: [entry("shape.example", source.id)], provenance: source }]]) });
  for (const record of merged.ruleSets.values()) {
    for (const field of ["id", "entries", "policy", "phase", "dnsClass", "region", "sources"]) assert.ok(field in record);
  }
  for (const decision of merged.decisions) {
    for (const field of ["matcher", "action", "policy", "policyGroup", "priority", "reason", "matchedSources", "region", "provenance"]) assert.ok(field in decision);
    assert.equal(Object.keys(decision.provenance[0]).some((key) => /password|uuid|token|node|subscription|userinfo/iu.test(key)), false);
  }
  assert.ok("sourceCount" in merged.diagnostics && "matcherCount" in merged.diagnostics);
  assert.ok(Array.isArray(merged.provenance));
});

test("retains safe internal provenance through merge and deduplication", () => {
  const provenance = { sourceId: "OpenAI", license: "MIT", commit: "b".repeat(40), sha256: "c".repeat(64), repository: "https://github.com/example/project", branch: "main", releaseTag: "v1.0", committedAt: "2026-08-23T00:00:00Z" };
  const merged = mergeRuleSources({ snapshots: new Map([["OpenAI", { sourceId: "OpenAI", entries: [entry("retained.example", "OpenAI")], provenance }]]) });
  assert.deepEqual(merged.provenance[0], provenance);
  const decision = merged.decisions.find(({ matcher }) => matcher.value === "retained.example");
  assert.deepEqual(decision.provenance[0], provenance);
  assert.deepEqual(Object.keys(decision.provenance[0]).sort(), ["branch", "committedAt", "commit", "license", "releaseTag", "repository", "sha256", "sourceId"].sort());
  for (const license of ["https://private.example", "vmess://node", "MIT@private", "A".repeat(129)]) {
    assert.throws(() => mergeRuleSources({ snapshots: new Map([["OpenAI", { sourceId: "OpenAI", entries: [], provenance: { sourceId: "OpenAI", license } }]]) }), /invalid provenance license/u);
  }
});

test("retains exact pinned provenance metadata for every external source", () => {
  for (const source of EXTERNAL_RULE_SOURCE_CATALOG) {
    const merged = mergeRuleSources({ region: source.region, snapshots: new Map([[source.id, { sourceId: source.id, entries: [entry(`${source.id}.example`, source.id)], provenance: source }]]) });
    const provenance = merged.provenance[0];
    for (const field of ["commit", "releaseTag", "sha256", "retrievalUrl", "retrievedAt"]) assert.equal(provenance[field], source[field]);
    assert.equal(provenance.sourceId, source.id);
  }
});

test("retains audited license and structured diagnostics safely", () => {
  const source = EXTERNAL_RULE_SOURCE_CATALOG[0];
  const diagnostics = { candidateCount: 2, parsedCount: 2, unsupportedCount: 0, duplicates: 0, minEntries: 1, sourceSha256: source.sha256, unsupportedByReason: {} };
  const merged = mergeRuleSources({ region: "global", snapshots: new Map([[source.id, { sourceId: source.id, entries: [entry("audit.example", source.id)], provenance: { ...source, license: "MIT", diagnostics } }]]) });
  assert.equal(merged.provenance[0].license, "MIT");
  assert.deepEqual(merged.provenance[0].diagnostics, diagnostics);
  assert.deepEqual(merged.decisions[0].provenance[0].diagnostics, diagnostics);
  assert.throws(() => mergeRuleSources({ region: "global", snapshots: new Map([[source.id, { sourceId: source.id, entries: [], provenance: { ...source, license: "MIT\nleak" } }]]) }), /license/u);
  assert.throws(() => mergeRuleSources({ region: "global", snapshots: new Map([[source.id, { sourceId: source.id, entries: [], provenance: { ...source, diagnostics: { nodeUri: "vmess://secret" } } }]]) }), /diagnostics/u);
  assert.throws(() => mergeRuleSources({ region: "global", snapshots: new Map([[source.id, { sourceId: source.id, entries: [], provenance: { ...source, license: "GPL-3.0" } }]]) }), /license mismatch/u);
  assert.throws(() => mergeRuleSources({ region: "global", snapshots: new Map([[source.id, { sourceId: source.id, entries: [], license: "GPL-3.0", provenance: { ...source, license: source.license } }]]) }), /conflicting top-level and nested license/u);
  assert.throws(() => mergeRuleSources({ region: "global", snapshots: new Map([[source.id, { sourceId: source.id, entries: [], diagnostics: { candidateCount: 1 }, provenance: { ...source, diagnostics: { candidateCount: 2 } } }]]) }), /conflicting top-level and nested diagnostics/u);
});

test("rejects private internal provenance URLs and identity tampering", () => {
  assert.throws(() => mergeRuleSources({ snapshots: new Map([["OpenAI", { sourceId: "OpenAI", entries: [], provenance: { sourceId: "OpenAI", retrievalUrl: "https://user:pw@example.invalid/node" } }]]) }), /non-external provenance|URLs are not allowed/u);
  assert.throws(() => mergeRuleSources({ snapshots: new Map([["OpenAI", { sourceId: "OpenAI", entries: [], provenance: { sourceId: "Hijacking" } }]]) }), /identity mismatch/u);
  assert.throws(() => mergeRuleSources({ snapshots: new Map([["Hijacking", { sourceId: "OpenAI", entries: [] }]]) }), /identity mismatch/u);
  for (const field of ["retrievalUrl", "repository", "branch", "releaseTag", "commit", "sha256"]) {
    assert.throws(() => mergeRuleSources({ snapshots: new Map([["OpenAI", { sourceId: "OpenAI", entries: [], provenance: { sourceId: "OpenAI", [field]: "https://node.example/sub" } }]]) }), /non-external provenance|URLs|identity|invalid provenance/u);
  }
  for (const value of ["vmess://secret", "ss://secret", "https://user:pw@example.invalid/subscription"]) {
    assert.throws(() => mergeRuleSources({ snapshots: new Map([["OpenAI", { sourceId: "OpenAI", entries: [], provenance: { sourceId: "OpenAI", retrievalUrl: value } }]]) }), /non-external provenance|URLs/u);
  }
});

test("applies the complete precedence matrix through fallback", () => {
  const generic = EXTERNAL_RULE_SOURCE_CATALOG[0];
  const snap = (id, value, provenance) => ({ sourceId: id, entries: [entry(value, id)], provenance });
  const merged = mergeRuleSources({ region: "cn", snapshots: new Map([
    [generic.id, snap(generic.id, "generic.example", generic)],
    ["Hijacking", snap("Hijacking", "security.example")],
    ["OpenAI", snap("OpenAI", "business.example")],
    ["ChinaTLD", snap("ChinaTLD", "cn")],
    ["ChinaIP", { sourceId: "ChinaIP", entries: [{ kind: "ipv4Cidr", value: "1.0.1.0/24", sourceId: "ChinaIP" }] }],
  ]), userRules: [entry("business.example", "user", { action: "DIRECT" })] });
  assert.equal(explainRoute({ hostname: "business.example", merged }).action, "DIRECT");
  assert.equal(explainRoute({ hostname: "security.example", merged }).action, "REJECT");
  assert.equal(explainRoute({ hostname: "generic.example", merged }).action, "PROXY");
  assert.equal(explainRoute({ hostname: "x.cn", merged }).action, "DIRECT");
  assert.equal(explainRoute({ hostname: "x.example", ip: "1.0.1.2", merged }).action, "DIRECT");
  assert.equal(explainRoute({ hostname: "x.example", ip: "8.8.8.8", merged }).action, "PROXY");
});

test("returns complete deterministic shape and chooses the narrower overlapping CIDR", () => {
  const merged = mergeRuleSources({ snapshots: new Map([["ChinaIP", { sourceId: "ChinaIP", entries: [
    { kind: "ipv4Cidr", value: "1.0.0.0/16", sourceId: "ChinaIP" },
    { kind: "ipv4Cidr", value: "1.0.1.0/24", sourceId: "ChinaIP" },
  ] }]]) });
  assert.ok(merged.ruleSets instanceof Map);
  assert.ok(Array.isArray(merged.decisions));
  assert.ok(Array.isArray(merged.provenance));
  const route = explainRoute({ hostname: "overlap.example", ip: "1.0.1.2", merged });
  assert.equal(route.matcher.value, "1.0.1.0/24");
  assert.equal(typeof route.reason, "string");
});
