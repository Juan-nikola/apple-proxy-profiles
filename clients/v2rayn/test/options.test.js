import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseV2rayNOptions } from "../src/options.js";

test("parses v2rayN defaults and platforms", () => {
  assert.equal(parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "windows" }).region, "cn");
  assert.equal(parseV2rayNOptions({ output: "nodes", type: "collection", name: "fixture", platform: "macos" }).output, "nodes");
});

test("allows platform-free v2rayN node tasks while requiring config platforms", () => {
  const options = parseV2rayNOptions({ output: "nodes", type: "collection", name: "fixture" });
  assert.equal(options.platform, undefined);
  assert.throws(() => parseV2rayNOptions({ output: "config", type: "collection", name: "fixture" }), /platform/u);
});
test("rejects invalid v2rayN options", () => {
  assert.throws(() => parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "linux" }), /platform/u);
  assert.throws(() => parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "windows", unknown: 1 }), /Unknown/u);
  assert.throws(() => parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "windows", policyOverrides: "eyJhaSI6ImJhZCJ9" }), /business policy/u);
});

test("accepts canonical business policy overrides", () => {
  const encoded = Buffer.from(JSON.stringify({ ai: "NODE:fixture", domesticCore: "DIRECT" })).toString("base64url");
  assert.equal(parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "windows", policyOverrides: encoded }).policyOverrides, encoded);
});

test("bundled v2rayN generators do not carry raw branch rule URLs", async () => {
  for (const filename of ["substore-node-generator.js", "substore-config-generator.js"]) {
    const content = await readFile(new URL(`../dist/${filename}`, import.meta.url), "utf8");
    assert.doesNotMatch(content, /raw\.githubusercontent\.com\/blackmatrix7\/ios_rule_script\/(?:master|main)\//u, filename);
  }
});
