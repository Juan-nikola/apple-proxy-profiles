import assert from "node:assert/strict";
import test from "node:test";

import { DOMESTIC_FALLBACK_DOMAIN_SUFFIXES } from "../shared/rules/domestic-fallback.js";
import { DOMESTIC_CORE_DOMAIN_SUFFIXES } from "../shared/rules/domestic-core.js";

test("keeps domestic fallback as a backwards-compatible domestic-core alias", () => {
  assert.strictEqual(DOMESTIC_FALLBACK_DOMAIN_SUFFIXES, DOMESTIC_CORE_DOMAIN_SUFFIXES);
  assert.equal(new Set(DOMESTIC_FALLBACK_DOMAIN_SUFFIXES).size, DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.length);
  assert.equal(DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.includes("cn"), false);
});
