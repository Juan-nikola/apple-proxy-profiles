import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateSingBoxConfig } from "../src/validate-config.js";

for (const platform of ["macos", "iphone", "ipad", "android"]) {
  test(`sing-box ${platform} example is JSON-valid and sanitized`, async () => {
    const content = await readFile(new URL(`../examples/sing-box-${platform}.json`, import.meta.url), "utf8");
    const config = JSON.parse(content);
    assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
    assert.match(content, /example\.invalid/u);
    assert.doesNotMatch(content, /198\.51\.100\.10|TEST_ONLY_PASSWORD/u);
  });

  test(`sing-box ${platform} diagnostic example has zero remote rule sets`, async () => {
    const content = await readFile(new URL(`../examples/sing-box-${platform}-diagnostic.json`, import.meta.url), "utf8");
    const config = JSON.parse(content);
    assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
    assert.deepEqual(config.route.rule_set, []);
    assert.equal(config.dns.rules.some((rule) => Array.isArray(rule.rule_set)), false);
    assert.match(content, /example\.invalid/u);
    assert.doesNotMatch(content, /198\.51\.100\.10|TEST_ONLY_PASSWORD/u);
  });
}
