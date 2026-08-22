import assert from "node:assert/strict";
import test from "node:test";
import { parseV2BoxOptions } from "../src/options.js";

test("parses v2rayN defaults and platforms", () => {
  assert.equal(parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone" }).region, "cn");
  assert.equal(parseV2BoxOptions({ output: "nodes", type: "collection", name: "fixture", platform: "ipad" }).output, "nodes");
});
test("rejects invalid v2rayN options", () => {
  assert.throws(() => parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "windows" }), /platform/u);
  assert.throws(() => parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", unknown: 1 }), /Unknown/u);
  assert.throws(() => parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", policyOverrides: "eyJhaSI6ImJhZCJ9" }), /business policy/u);
});

test("accepts canonical business policy overrides", () => {
  const encoded = Buffer.from(JSON.stringify({ ai: "NODE:fixture", domesticCore: "DIRECT" })).toString("base64url");
  assert.equal(parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", policyOverrides: encoded }).policyOverrides, encoded);
});
