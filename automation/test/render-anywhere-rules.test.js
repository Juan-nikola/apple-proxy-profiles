import assert from "node:assert/strict";
import test from "node:test";

import { buildAnywhereRuleSnapshot } from "../src/render-anywhere-rules.js";
import { DOMESTIC_FALLBACK_DOMAIN_SUFFIXES } from "../../shared/rules/domestic-fallback.js";
import { ANYWHERE_LIGHTWEIGHT_MIGRATION } from "../../clients/anywhere/src/shard-rules.js";

const upstream = {
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc",
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
};

const catalog = [
  {
    id: "High", familyId: "High", componentId: "rules", order: 1, priority: 10,
    canonicalPath: "rule/Surge/High/High.list", inputFormat: "RULE-SET", policy: "REJECT",
    routing: 2, intendedTarget: "reject", minEntries: 1,
  },
  {
    id: "Low", familyId: "Low", componentId: "rules", order: 2, priority: 20,
    canonicalPath: "rule/Surge/Low/Low.list", inputFormat: "RULE-SET", policy: "DIRECT",
    routing: 1, intendedTarget: "direct", minEntries: 1,
  },
];

function input(text) {
  return { text, rawUrl: "https://raw.githubusercontent.com/example", sourceBytes: Buffer.byteLength(text), sourceSha256: "a".repeat(64) };
}

test("compiles across sources before sharding and closes manifest accounting", () => {
  const snapshot = new Map([
    ["High", input("DOMAIN-SUFFIX,example.com\n")],
    ["Low", input("DOMAIN-SUFFIX,api.example.com\nDOMAIN-KEYWORD,other\nDOMAIN,only.example\n")],
  ]);
  const result = buildAnywhereRuleSnapshot({
    snapshot,
    catalog,
    upstream,
    logicalRuleSets: catalog.map(({ id }) => ({ id, sourceIds: [id], required: true })),
  });
  assert.equal(result.manifest.totals.sourceCount, 2);
  assert.equal(result.manifest.totals.convertibleCount, 3);
  assert.equal(result.manifest.totals.unsupportedCount, 1);
  assert.equal(result.manifest.totals.shadowedCount, 1);
  assert.equal(result.manifest.totals.outputCount, 2);
  assert.equal(result.manifest.totals.shardCount, 2);
  assert.deepEqual(result.manifest.sources[1].counts, {
    candidate: 3, parsed: 3, convertible: 2, unsupported: 1,
    duplicates: 0, shadowed: 1, unresolved: 0, output: 1,
  });
  assert.equal(result.files.has("anywhere/rules/High-001.arrs"), true);
  assert.equal(result.files.has("anywhere/rules/Low-001.arrs"), true);
});

test("aggregates multiple upstream sources into one stable business package", () => {
  const snapshot = new Map([
    ["High", input("DOMAIN-SUFFIX,example.com\n")],
    ["Low", input("DOMAIN-SUFFIX,media.example\nDOMAIN-SUFFIX,api.example.com\n")],
  ]);
  const result = buildAnywhereRuleSnapshot({
    snapshot,
    catalog,
    upstream,
    logicalRuleSets: [{
      id: "OverseasMedia",
      sourceIds: ["High", "Low"],
      required: true,
      policy: "FOLLOW",
    }],
  });
  assert.equal(result.manifest.totals.logicalRuleSetCount, 1);
  assert.deepEqual(result.manifest.logicalRuleSets, [{
    id: "OverseasMedia",
    sourceIds: ["High", "Low"],
    required: true,
    policy: "FOLLOW",
  }]);
  assert.equal(result.manifest.sources.length, 1);
  assert.deepEqual(result.manifest.sources[0].sourceIds, ["High", "Low"]);
  assert.equal(result.manifest.sources[0].counts.inputSources, 2);
  assert.equal(result.manifest.sources[0].counts.output, 2);
  assert.equal(result.files.has("anywhere/rules/OverseasMedia-001.arrs"), true);
  assert.equal(result.files.has("anywhere/rules/High-001.arrs"), false);
});

test("produces byte-identical files and manifests for identical immutable inputs", () => {
  const snapshot = new Map([
    ["High", input("DOMAIN-SUFFIX,example.com\n")],
    ["Low", input("DOMAIN-KEYWORD,other\n")],
  ]);
  const options = {
    snapshot, catalog, upstream,
    logicalRuleSets: catalog.map(({ id }) => ({ id, sourceIds: [id], required: true })),
  };
  const first = buildAnywhereRuleSnapshot(options);
  const second = buildAnywhereRuleSnapshot(options);
  assert.deepEqual([...first.files], [...second.files]);
  assert.deepEqual(first.manifest, second.manifest);
});

test("publishes the exact schema-v2 lightweight migration contract", () => {
  const snapshot = new Map([
    ["High", input("DOMAIN-SUFFIX,example.com\n")],
    ["Low", input("DOMAIN-KEYWORD,other\n")],
  ]);
  const result = buildAnywhereRuleSnapshot({
    snapshot,
    catalog,
    upstream,
    logicalRuleSets: catalog.map(({ id }) => ({ id, sourceIds: [id], required: true })),
    migration: ANYWHERE_LIGHTWEIGHT_MIGRATION,
  });
  assert.equal(result.manifest.schemaVersion, 2);
  assert.deepEqual({
    schemaVersion: result.manifest.schemaVersion,
    removed: result.manifest.removed,
    replacements: result.manifest.replacements,
    optionalPacks: result.manifest.optionalPacks,
  }, ANYWHERE_LIGHTWEIGHT_MIGRATION);
});

test("adds the domestic safety net to the existing direct ChinaMax shard", () => {
  const chinaSource = {
    id: "ChinaMax_Domain", familyId: "ChinaMax_Domain", componentId: "domains", order: 1, priority: 10,
    canonicalPath: "rule/Surge/ChinaMax/ChinaMax_Domain.list", inputFormat: "DOMAIN-SET", policy: "DIRECT",
    routing: 1, intendedTarget: "direct", minEntries: 1,
  };
  const text = ".existing.example\n";
  const result = buildAnywhereRuleSnapshot({
    snapshot: new Map([["ChinaMax_Domain", input(text)]]),
    catalog: [chinaSource],
    upstream,
    logicalRuleSets: [{ id: "ChinaMax_Domain", sourceIds: ["ChinaMax_Domain"], required: true }],
  });
  const artifact = result.files.get("anywhere/rules/ChinaMax_Domain-001.arrs");
  assert.ok(artifact);
  for (const suffix of DOMESTIC_FALLBACK_DOMAIN_SUFFIXES) {
    assert.match(artifact, new RegExp(`^2, ${suffix.replaceAll(".", "\\.")}$`, "mu"), suffix);
  }
  assert.match(artifact, /^2, existing\.example$/mu);
  assert.equal(result.manifest.sources[0].counts.output, DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.length + 1);
});
