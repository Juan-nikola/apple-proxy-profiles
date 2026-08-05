import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = [
  "../dist/sing-box-config-generator.js",
  "../dist/substore-config-generator.js",
];

test("sing-box bundles expose the Sub-Store operator and remain public-URL closed", async () => {
  for (const file of files) {
    const content = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(content, /async function operator\(/u, file);
    assert.match(content, /sing-box\/rules/u, file);
    assert.doesNotMatch(content, /raw\.githubusercontent\.com\/blackmatrix7/iu, file);
    assert.doesNotMatch(content, /private-node\.example|password=secret/iu, file);
  }
});
