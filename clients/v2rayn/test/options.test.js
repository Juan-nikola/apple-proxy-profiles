import assert from "node:assert/strict";
import test from "node:test";
import { parseV2rayNOptions } from "../src/options.js";

test("parses v2rayN defaults and platforms", () => {
  assert.equal(parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "windows" }).region, "cn");
  assert.equal(parseV2rayNOptions({ output: "nodes", type: "collection", name: "fixture", platform: "macos" }).output, "nodes");
});
test("rejects invalid v2rayN options", () => {
  assert.throws(() => parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "linux" }), /platform/u);
  assert.throws(() => parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "windows", unknown: 1 }), /Unknown/u);
});
