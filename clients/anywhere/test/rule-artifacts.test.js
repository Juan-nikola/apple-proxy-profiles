import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { canonicalJson } from "../../../automation/src/render-anywhere-rules.js";

const rulesDirectory = new URL("../examples/rules/", import.meta.url);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function parseLikeAnywhere(content) {
  let name = "";
  let routing = 0;
  const rules = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const equal = line.indexOf("=");
    if (equal !== -1) {
      const key = line.slice(0, equal).trim().toLowerCase();
      const value = line.slice(equal + 1).trim();
      if (key === "name") name = value;
      if (key === "routing") routing = Number(value);
      continue;
    }
    const comma = line.indexOf(",");
    if (comma === -1) continue;
    const type = Number(line.slice(0, comma).trim());
    const value = line.slice(comma + 1).trim();
    if (Number.isInteger(type) && type >= 0 && type <= 3 && value) rules.push({ type, value });
  }
  return { name, routing, rules };
}

test("pins the complete 32-source baseline and compiled topology", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", rulesDirectory), "utf8"));
  assert.deepEqual(manifest.totals, {
    sourceCount: 32,
    logicalRuleSetCount: 31,
    sourceBytes: 7447854,
    physicalLineCount: 394086,
    commentCount: 311,
    blankCount: 32,
    candidateCount: 393743,
    parsedCount: 393743,
    convertibleCount: 376477,
    unsupportedCount: 17266,
    duplicateCount: 809,
    shadowedCount: 403,
    unresolvedCount: 0,
    outputCount: 375265,
    shardCount: 34,
    convertibleByKind: {
      domainSuffix: 360908,
      ipv4Cidr: 10980,
      ipv6Cidr: 4219,
      domainKeyword: 370,
    },
    unsupportedByReason: {
      "unsupported-exact-domain": 17002,
      "unsupported-url-regex": 16,
      "unsupported-and": 1,
      "unsupported-user-agent": 176,
      "unsupported-process-name": 60,
      "unsupported-ip-asn": 10,
      "unsupported-or": 1,
    },
    ignoredModifiers: { noResolve: 15209 },
  });
  assert.equal(manifest.upstream.commit, "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc");
  assert.equal(manifest.generatedAt, manifest.upstream.committedAt);
  assert.equal(manifest.sources.length, 32);
  assert.equal(manifest.logicalRuleSets.length, 31);
  assert.deepEqual(manifest.logicalRuleSets.find(({ id }) => id === "Advertising").sourceIds,
    ["Advertising", "Advertising_Domain"]);
  const privacy = manifest.sources.find(({ id }) => id === "Privacy");
  assert.equal(privacy.counts.convertible, 20);
  assert.equal(privacy.counts.output, 0);
  assert.deepEqual(privacy.shardIds, []);
});

test("round-trips every shard with the pinned Swift-equivalent parser", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", rulesDirectory), "utf8"));
  const expectedFiles = new Set(["manifest.json"]);
  let total = 0;
  for (const shard of manifest.shards) {
    const filename = shard.path.slice("anywhere/rules/".length);
    expectedFiles.add(filename);
    assert.match(filename, /^[A-Za-z0-9_-]+\.arrs$/u);
    assert.match(shard.url, /^https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles\/current\/anywhere\/rules\/[A-Za-z0-9_-]+\.arrs$/u);
    const content = await readFile(new URL(filename, rulesDirectory), "utf8");
    assert.equal(content.includes("\r"), false);
    assert.equal(content.endsWith("\n"), true);
    assert.equal(sha256(content), shard.sha256);
    const parsed = parseLikeAnywhere(content);
    assert.equal(parsed.name, shard.name);
    assert.equal(parsed.routing, manifest.sources.find(({ id }) => id === shard.sourceId).routing);
    assert.equal(parsed.rules.length, shard.entryCount);
    assert.ok(parsed.rules.length > 0 && parsed.rules.length <= 95_000);
    assert.equal(parsed.rules.every(({ value }) => !value.includes(",") && !value.includes("no-resolve")), true);
    total += parsed.rules.length;
  }
  assert.equal(total, manifest.totals.outputCount);
  assert.deepEqual(new Set(await readdir(rulesDirectory)), expectedFiles);
});

test("closes manifest and Advertising component hashes without wall-clock input", async () => {
  const content = await readFile(new URL("manifest.json", rulesDirectory), "utf8");
  const manifest = JSON.parse(content);
  const { manifestSha256, ...withoutHash } = manifest;
  assert.equal(sha256(canonicalJson(withoutHash)), manifestSha256);
  const advertising = manifest.sources.filter(({ familyId }) => familyId === "Advertising");
  assert.deepEqual(advertising.map(({ id }) => id), ["Advertising", "Advertising_Domain"]);
  assert.deepEqual(advertising.flatMap(({ shardIds }) => shardIds), [
    "Advertising-001",
    "Advertising_Domain-001",
    "Advertising_Domain-002",
    "Advertising_Domain-003",
  ]);
  assert.equal(new Set(advertising.map(({ sourceSha256 }) => sourceSha256)).size, 2);
  assert.equal(content.includes("2026-08-03"), false);
  assert.equal(content.includes(".amrs"), false);
});
