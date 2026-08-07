import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { SING_BOX_PUBLIC_STATIC_FILE_PATHS } from "../scripts/build.mjs";

const files = [
  "../dist/sing-box-config-generator.js",
  "../dist/substore-config-generator.js",
];

test("sing-box bundles expose the Sub-Store operator and remain public-URL closed", async () => {
  for (const file of files) {
    const content = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(content, /async function operator\(/u, file);
    assert.match(content, /sing-box\/rule-sets/u, file);
    assert.match(content, /profileMode/u, file);
    assert.match(content, /\.srs/u, file);
    assert.doesNotMatch(content, /ruleSetFormat = "source"/u, file);
    assert.doesNotMatch(content, /raw\.githubusercontent\.com\/blackmatrix7/iu, file);
    assert.doesNotMatch(content, /private-node\.example|password=secret/iu, file);
  }
});

test("sing-box public static map includes one-click diagnostic profiles", () => {
  for (const platform of ["macos", "iphone", "ipad", "android", "openwrt"]) {
    assert.equal(SING_BOX_PUBLIC_STATIC_FILE_PATHS.includes(`sing-box/examples/sing-box-${platform}-diagnostic.json`), true);
  }
});
