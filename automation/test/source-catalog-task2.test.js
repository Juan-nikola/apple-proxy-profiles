import assert from "node:assert/strict";
import test from "node:test";

import { EXTERNAL_RULE_SOURCE_CATALOG, validateSourceCatalog } from "../src/source-catalog.js";

test("validates duplicate IDs, pins, regions, and source paths", () => {
  assert.equal(validateSourceCatalog(EXTERNAL_RULE_SOURCE_CATALOG).length, 16);
  const mutate = (index, changes) => EXTERNAL_RULE_SOURCE_CATALOG.map((source, i) => i === index ? { ...source, ...changes } : source);
  assert.throws(() => validateSourceCatalog(mutate(1, { id: EXTERNAL_RULE_SOURCE_CATALOG[0].id })), /Duplicate/u);
  assert.throws(() => validateSourceCatalog(mutate(0, { commit: "main" })), /full commit/u);
  assert.throws(() => validateSourceCatalog(mutate(0, { region: "xx" })), /invalid region/u);
  assert.throws(() => validateSourceCatalog(mutate(0, { sourcePath: "../private.dat" })), /unsafe source path/u);
});

test("returns an immutable copy and keeps the legacy catalog separate", () => {
  const selected = validateSourceCatalog();
  assert.notEqual(selected, EXTERNAL_RULE_SOURCE_CATALOG);
  assert.throws(() => selected.push({}), TypeError);
});

test("pins the Loyalsoldier Clash release and keeps Google audit-only", () => {
  const sources = EXTERNAL_RULE_SOURCE_CATALOG.filter(({ repository }) => repository.endsWith("/Loyalsoldier/clash-rules"));
  assert.equal(sources.length, 12);
  for (const source of sources) {
    assert.equal(source.commit, "6f188ab71421eb1dc5094f8877cd467b256c1a95");
    assert.equal(source.tree, "48f825328014eef805065de40be0a25bec604075");
    assert.match(source.blob, /^[0-9a-f]{40}$/u);
    assert.equal(source.releaseTag, "202608252255");
  }
  const google = sources.find(({ id }) => id.endsWith("google"));
  assert.equal(google.auditOnly, true);
});
