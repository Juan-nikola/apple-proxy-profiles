import assert from "node:assert/strict";
import test from "node:test";

import { assertChannelClosure, findChannelClosureViolations } from "../shared/release/channel-closure.js";

test("finds cross-channel path, parameter, and encoded references", () => {
  const violations = findChannelClosureViolations({
    channel: "previous",
    files: new Map([
      ["surge/scripts/profile.js", "url='/previous/surge/rules/A.list'; channel='previous'"],
      ["surge/examples/bad.conf", "RULE-SET,https://site/current/surge/rules/A.list,DIRECT"],
      ["surge/examples/encoded.conf", "#channel%3Dedge"],
    ]),
  });
  assert.deepEqual(violations.map(({ path }) => path), [
    "surge/examples/bad.conf",
    "surge/examples/encoded.conf",
  ]);
  assert.equal(Object.isFrozen(violations), true);
});

test("accepts matching channel references and immutable self references", () => {
  const hash = "a".repeat(64);
  assert.deepEqual(findChannelClosureViolations({
    channel: "previous",
    files: new Map([
      ["previous/surge/rules/A.list", "https://site/previous/surge/rules/A.list?channel=previous"],
      [`versions/${hash}/surge/rules/A.list`, `https://site/versions/${hash}/surge/rules/A.list`],
    ]),
    rootPrefix: "versions/" + hash,
    immutableVersion: hash,
  }), []);
});

test("ignores native generator channel defaults inside published client trees", () => {
  const hash = "b".repeat(64);
  const generator = "const DEFAULTS = { channel: \"current\" };";
  assert.deepEqual(findChannelClosureViolations({
    channel: "edge",
    files: new Map([
      ["edge/clients/happ/" + hash + "/happ/scripts/happ-config-generator.js", generator],
      ["versions/" + hash + "/happ/scripts/happ-config-generator.js", generator],
    ]),
    rootPrefix: "edge",
  }), []);
});

test("ignores native generator channel defaults for v2rayN and V2Box", () => {
  const generator = "const DEFAULTS = { channel: \"edge\" };";
  assert.deepEqual(findChannelClosureViolations({
    channel: "current",
    files: new Map([
      ["v2rayn/scripts/substore-config-generator.js", generator],
      ["v2box/scripts/substore-config-generator.js", generator],
    ]),
  }), []);
});

test("throws a non-secret closure error", () => {
  assert.throws(() => assertChannelClosure({
    channel: "current",
    files: new Map([["x.txt", "https://site/edge/surge/rules/A.list?marker=TEST_ONLY_CHANNEL_MARKER"]]),
  }), (error) => /x\.txt|current|edge/iu.test(error.message) && !error.message.includes("TEST_ONLY_CHANNEL_MARKER"));
});
