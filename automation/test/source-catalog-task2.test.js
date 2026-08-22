import assert from "node:assert/strict";
import test from "node:test";

import { EXTERNAL_RULE_SOURCE_CATALOG, validateSourceCatalog } from "../src/source-catalog.js";

test("validates duplicate IDs, pins, regions, and source paths", () => {
  assert.equal(validateSourceCatalog(EXTERNAL_RULE_SOURCE_CATALOG).length, 4);
  const mutate = (index, changes) => EXTERNAL_RULE_SOURCE_CATALOG.map((source, i) => i === index ? { ...source, ...changes } : source);
  assert.throws(() => validateSourceCatalog(mutate(1, { id: EXTERNAL_RULE_SOURCE_CATALOG[0].id })), /Duplicate/u);
  assert.throws(() => validateSourceCatalog(mutate(0, { commit: "main" })), /full commit/u);
  assert.throws(() => validateSourceCatalog(mutate(0, { region: "xx" })), /invalid region/u);
  assert.throws(() => validateSourceCatalog(mutate(0, { sourcePath: "../private.dat" })), /unsafe source path/u);
  assert.throws(() => validateSourceCatalog(mutate(0, { retrievalUrl: undefined })), /retrieval URL/u);
  assert.throws(() => validateSourceCatalog(mutate(0, { retrievedAt: undefined })), /timestamp/u);
  assert.throws(() => validateSourceCatalog(mutate(0, { sha256: "short" })), /SHA-256/u);
  assert.throws(() => validateSourceCatalog([]), /must not be empty/u);
});

test("returns an immutable copy and keeps the legacy catalog separate", () => {
  const selected = validateSourceCatalog();
  assert.notEqual(selected, EXTERNAL_RULE_SOURCE_CATALOG);
  assert.throws(() => selected.push({}), TypeError);
});
