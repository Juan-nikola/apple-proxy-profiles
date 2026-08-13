import assert from "node:assert/strict";
import test from "node:test";

import { validateCollectionName } from "../shared/substore/collection-name.js";

test("accepts every client collection slug and preserves its exact value", () => {
  for (const name of [
    "apple-proxy-egern",
    "apple-proxy-anywhere",
    "apple-proxy-shadowrocket",
    "apple-proxy-surge",
    "apple-proxy-singbox",
    "apple-proxy-onexray",
    "apple-proxy-sources",
  ]) {
    assert.equal(validateCollectionName(name), name);
  }
});

test("rejects unsafe collection names", () => {
  const overlong = `a${"b".repeat(128)}`;
  for (const name of [
    undefined,
    "",
    " ",
    "中文",
    "collection/name",
    "collection?name",
    "collection#name",
    " collection",
    "collection ",
    "collection\tname",
    "collection\nname",
    "collection\rname",
    "collection\u0000name",
    "__proto__",
    "constructor",
    "prototype",
    overlong,
  ]) {
    assert.throws(() => validateCollectionName(name), /collection name/i, JSON.stringify(name));
  }
});
