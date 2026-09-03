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
  assert.equal(options.format, "array");
  assert.equal(options.selectionMode, "manual");
  assert.deepEqual(INCY_PLATFORMS, ["iphone", "ipad", "appletv", "android", "androidtv", "macos", "windows", "linux"]);
});

test("accepts the automatic plus manual full-Xray array mode", () => {
  const options = parseIncyOptions({
    output: "config",
    type: "collection",
    name: "apple-proxy-incy",
    subscriptionName: "INCY",
    platform: "macos",
    format: "array",
    selectionMode: "both",
  });

  assert.equal(options.format, "array");
  assert.equal(options.selectionMode, "both");
});

test("accepts the official single full-Xray output format", () => {
  const options = parseIncyOptions({
    output: "config",
    type: "collection",
    name: "apple-proxy-incy",
    subscriptionName: "INCY",
    platform: "macos",
    format: "single",
  });

  assert.equal(options.format, "single");
});

test("rejects automatic plus manual mode without an array", () => {
  assert.throws(() => parseIncyOptions({
    output: "config",
    type: "collection",
    name: "apple-proxy-incy",
    subscriptionName: "INCY",
    platform: "macos",
    format: "single",
    selectionMode: "both",
  }), /selectionMode=both requires format=array/u);
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
