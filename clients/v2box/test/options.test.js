import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseV2BoxOptions } from "../src/options.js";

test("parses V2Box defaults and mobile platforms", () => {
  assert.equal(parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone" }).region, "cn");
  assert.equal(parseV2BoxOptions({ output: "nodes", type: "collection", name: "fixture", platform: "ipad" }).output, "nodes");
});

test("allows platform-free V2Box node tasks while requiring config platforms", () => {
  const options = parseV2BoxOptions({ output: "nodes", type: "collection", name: "fixture" });
  assert.equal(options.platform, undefined);
  assert.throws(() => parseV2BoxOptions({ output: "config", type: "collection", name: "fixture" }), /platform/u);
});
test("rejects invalid V2Box options", () => {
  assert.throws(() => parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "windows" }), /platform/u);
  assert.throws(() => parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", unknown: 1 }), /Unknown/u);
  assert.throws(() => parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", policyOverrides: "eyJhaSI6ImJhZCJ9" }), /business policy/u);
});

test("accepts canonical business policy overrides", () => {
  const encoded = Buffer.from(JSON.stringify({ ai: "NODE:fixture", domesticCore: "DIRECT" })).toString("base64url");
  assert.equal(parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", policyOverrides: encoded }).policyOverrides, encoded);
});

test("bundled V2Box generators do not carry raw branch rule URLs", async () => {
  for (const filename of ["substore-node-generator.js", "substore-config-generator.js"]) {
    const content = await readFile(new URL(`../dist/${filename}`, import.meta.url), "utf8");
    assert.doesNotMatch(content, /raw\.githubusercontent\.com\/blackmatrix7\/ios_rule_script\/(?:master|main)\//u, filename);
  }
});
