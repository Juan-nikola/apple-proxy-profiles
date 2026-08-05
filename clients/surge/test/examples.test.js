import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateSurgeProfile } from "../src/validate-profile.js";

for (const platform of ["macos", "iphone", "ipad"]) {
  test(`Surge ${platform} example is structurally valid and sanitized`, async () => {
    const content = await readFile(new URL(`../examples/surge-${platform}.conf`, import.meta.url), "utf8");
    assert.deepEqual(validateSurgeProfile(content), { valid: true, errors: [] });
    assert.match(content, /example\.invalid/u);
    assert.doesNotMatch(content, /198\.51\.100\.10|TEST_ONLY_PASSWORD/u);
  });
}
