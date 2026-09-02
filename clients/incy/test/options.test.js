import assert from "node:assert/strict";
import test from "node:test";

import { INCY_PLATFORMS, parseIncyOptions } from "../src/options.js";

test("accepts all eight INCY platforms and applies stable defaults", () => {
  const options = parseIncyOptions({
    output: "config",
    type: "collection",
    name: "apple-proxy-incy",
    subscriptionName: "INCY",
    platform: "androidtv",
  });

  assert.equal(options.dnsMode, "stable");
  assert.equal(options.ipv6Mode, "ipv4-only");
  assert.deepEqual(INCY_PLATFORMS, ["iphone", "ipad", "appletv", "android", "androidtv", "macos", "windows", "linux"]);
});

test("rejects unknown keys, non-collection output, and unsupported platforms", () => {
  assert.throws(() => parseIncyOptions({ output: "nodes", type: "collection", name: "x", subscriptionName: "x", platform: "iphone" }), /output/);
  assert.throws(() => parseIncyOptions({ output: "config", type: "collection", name: "x", subscriptionName: "x", platform: "tvOS" }), /platform/);
  assert.throws(() => parseIncyOptions({ output: "config", type: "collection", name: "x", subscriptionName: "x", platform: "iphone", surprise: true }), /Unknown INCY option/);
});

test("rejects unsupported policy overrides", () => {
  const base = {
    output: "config",
    type: "collection",
    name: "x",
    subscriptionName: "x",
    platform: "iphone",
  };

  assert.throws(() => parseIncyOptions({ ...base, policyOverrides: "" }), /Unknown INCY option|policyOverrides.*unsupported/iu);
});
