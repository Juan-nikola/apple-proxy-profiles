import assert from "node:assert/strict";
import test from "node:test";

import { assertChannelClosure, findChannelClosureViolations } from "../shared/release/channel-closure.js";

test("accepts current publication paths and rejects unsupported channels", () => {
  const files = new Map([["current/surge/scripts/profile.js", "https://juan-nikola.github.io/apple-proxy-profiles/current/surge/rules/A.list"]]);
  assert.deepEqual(findChannelClosureViolations({ files, channel: "current", rootPrefix: "current" }), []);
  assert.throws(() => assertChannelClosure({ files, channel: "edge", rootPrefix: "edge" }), /unsupported expected channel/u);
});

test("accepts current-only references and generator defaults", () => {
  const files = new Map([
    ["current/surge/rules/A.list", "DOMAIN-SUFFIX,example.com"],
    ["current/surge/scripts/profile.js", "const channel = 'current'; const url = '/current/surge/rules/A.list';"],
  ]);
  assert.doesNotThrow(() => assertChannelClosure({ files, channel: "current", rootPrefix: "current" }));
});

test("ignores channel defaults in native generators while enforcing hosted URLs", () => {
  const files = new Map([
    ["current/surge/scripts/surge-profile-generator.js", "const DEFAULTS = { channel: 'current' };"],
    ["current/anywhere/scripts/anywhere-strategy-generator.js", "const DEFAULTS = { channel: 'current' };"],
  ]);
  assert.deepEqual(findChannelClosureViolations({ files, channel: "current", rootPrefix: "current" }), []);
});
