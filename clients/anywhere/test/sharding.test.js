import assert from "node:assert/strict";
import test from "node:test";

import { ANYWHERE_LIGHTWEIGHT_MIGRATION, shardRuleSet, validateShardMigration } from "../src/shard-rules.js";

function entries(count) {
  return Array.from({ length: count }, (_, index) => ({
    kind: "domainSuffix",
    value: `${String(index).padStart(6, "0")}.example`,
    sourceId: "large",
  }));
}

test("shards only after stable sorting and never crosses 95000 entries", () => {
  const shards = shardRuleSet({
    id: "large",
    name: "Large",
    routing: 0,
    entries: entries(100_001).reverse(),
  });
  assert.deepEqual(shards.map(({ id }) => id), ["large-001", "large-002"]);
  assert.deepEqual(shards.map(({ name }) => name), ["Large (1/2)", "Large (2/2)"]);
  assert.deepEqual(shards.map(({ entries: items }) => items.length), [95_000, 5_001]);
  assert.equal(shards[0].entries[0].value, "000000.example");
  assert.equal(shards[1].entries.at(-1).value, "100000.example");
});

test("uses one three-digit shard id at and below the boundary", () => {
  for (const count of [1, 95_000]) {
    const shards = shardRuleSet({ id: "one", name: "One", routing: 1, entries: entries(count) });
    assert.equal(shards.length, 1);
    assert.equal(shards[0].id, "one-001");
    assert.equal(shards[0].name, "One");
  }
});

test("fails closed for empty required sets and unsafe limits", () => {
  assert.throws(() => shardRuleSet({ id: "required", name: "Required", entries: [] }), /no entries/u);
  assert.deepEqual(shardRuleSet({ id: "optional", name: "Optional", required: false, entries: [] }), []);
  assert.throws(() => shardRuleSet({ id: "x", name: "X", entries: entries(1) }, 100_001), /limit/u);
});

test("accepts only the explicit schema-v2 legacy shard migration", () => {
  assert.doesNotThrow(() => validateShardMigration({
    previousIds: ["Stable", "Advertising", "Advertising_Domain", "ChinaMax_Domain", "Game"],
    currentIds: ["Stable", "DomesticCore", "DomesticGame", "OverseasGame"],
    migration: ANYWHERE_LIGHTWEIGHT_MIGRATION,
  }));
  assert.throws(() => validateShardMigration({
    previousIds: ["Stable", "Accident", "Advertising", "Advertising_Domain", "ChinaMax_Domain", "Game"],
    currentIds: ["Stable", "DomesticCore", "DomesticGame", "OverseasGame"],
    migration: ANYWHERE_LIGHTWEIGHT_MIGRATION,
  }), /Accident/u);
  assert.throws(() => validateShardMigration({
    previousIds: ["Stable", "Advertising", "Advertising_Domain", "ChinaMax_Domain", "Game"],
    currentIds: ["StableRenamed", "DomesticCore", "DomesticGame", "OverseasGame"],
    migration: ANYWHERE_LIGHTWEIGHT_MIGRATION,
  }), /Stable/u);
});

test("allows the source-level topology to migrate into stable semantic business packages", () => {
  assert.doesNotThrow(() => validateShardMigration({
    previousIds: [
      "Hijacking", "BlockHttpDNS", "Privacy", "DomesticCore", "DomesticGame", "SteamCN",
      "BiliBili", "ByteDance", "XiaoHongShu", "Weibo", "OpenAI", "Claude", "Gemini", "Copilot",
      "GitHub", "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia", "Telegram", "Facebook",
      "Instagram", "Twitter", "TikTok", "Apple", "Microsoft", "Download", "PrivateTracker",
      "OverseasGame", "ChinaTLD", "ChinaIP",
    ],
    currentIds: [
      "Security", "Privacy", "DomesticCore", "DomesticPlatform", "AI", "GitHub", "YouTube",
      "OverseasMedia", "OverseasSocial", "Apple", "Microsoft", "Download", "OverseasGame", "ChinaIP",
    ],
    migration: ANYWHERE_LIGHTWEIGHT_MIGRATION,
  }));
});

test("compares migration contracts by canonical content rather than object insertion order", () => {
  const reordered = {
    optionalPacks: ANYWHERE_LIGHTWEIGHT_MIGRATION.optionalPacks,
    replacements: ANYWHERE_LIGHTWEIGHT_MIGRATION.replacements,
    removed: ANYWHERE_LIGHTWEIGHT_MIGRATION.removed,
    schemaVersion: ANYWHERE_LIGHTWEIGHT_MIGRATION.schemaVersion,
  };
  assert.doesNotThrow(() => validateShardMigration({
    previousIds: ["Stable"],
    currentIds: ["Stable"],
    migration: reordered,
  }));
});
