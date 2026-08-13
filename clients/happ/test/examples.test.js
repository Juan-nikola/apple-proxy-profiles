import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateHappSubscription } from "../src/validate-subscription.js";

for (const platform of ["macos", "iphone", "ipad", "android", "windows", "linux"]) {
  test(`Happ ${platform} example is a sanitized valid JSON subscription`, async () => {
    const content = await readFile(new URL(`../examples/happ-${platform}.json`, import.meta.url), "utf8");
    const configs = JSON.parse(content);
    assert.equal(validateHappSubscription(configs), true);
    assert.equal(content.endsWith("\n"), true);
    assert.match(content, /example\.invalid/u);
    assert.match(content, /TEST_ONLY_/u);
    assert.doesNotMatch(content, /198\.51\.100\.|192\.0\.2\./u);
  });
}

test("Happ routing audit example is a sanitized private audit object", async () => {
  const content = await readFile(new URL("../examples/happ-routing-audit.json", import.meta.url), "utf8");
  const audit = JSON.parse(content);
  assert.equal(audit.schemaVersion, 1);
  assert.equal(typeof audit.counts.eligibleNodes, "number");
  assert.doesNotMatch(content, /example\.invalid|TEST_ONLY_/u);
});
