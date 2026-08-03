import assert from "node:assert/strict";
import test from "node:test";

import { shardRuleSet } from "../src/shard-rules.js";

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
