import assert from "node:assert/strict";
import test from "node:test";

import { validateSurgeProfile } from "../src/validate-profile.js";

function profile(groups, rules = ["GEOIP,CN,DIRECT", "FINAL,A"]) {
  return [
    "[General]",
    "loglevel = notify",
    "",
    "[Proxy]",
    "A = ss,example.invalid,443,encrypt-method=aes-256-gcm,password=TEST_ONLY_PASSWORD",
    "",
    "[Proxy Group]",
    ...groups,
    "",
    "[Rule]",
    ...rules,
    "",
  ].join("\n");
}

test("rejects dangling policy references", () => {
  const result = validateSurgeProfile(profile(["A = select,Missing"]));
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /missing group or proxy reference/iu);
});

test("rejects policy group cycles", () => {
  const result = validateSurgeProfile(profile(["A = select,B", "B = select,A"]));
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /group cycle/iu);
});

test("requires FINAL to be the last rule", () => {
  const result = validateSurgeProfile(profile(["A = select,DIRECT"], ["FINAL,A", "GEOIP,CN,DIRECT"]));
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /rules after FINAL/iu);
});

test("validates remote policy pool references", () => {
  const valid = validateSurgeProfile(profile([
    "📦 远程节点池 = select,policy-path=https://substore.example.invalid/surge-nodes,update-interval=21600,hidden=1",
    "🚀 节点选择 = select,include-other-group=📦 远程节点池,policy-regex-filter=^(?!🔗 ).+$",
  ], ["FINAL,A"]));
  assert.deepEqual(valid, { valid: true, errors: [] });

  const missing = validateSurgeProfile(profile([
    "🚀 节点选择 = select,include-other-group=Missing,policy-regex-filter=^(?!🔗 ).+$",
  ], ["FINAL,A"]));
  assert.equal(missing.valid, false);
  assert.match(missing.errors.join("\n"), /missing group or proxy reference/iu);
});

test("validates comma-separated remote policy pool references", () => {
  const valid = validateSurgeProfile(profile([
    "PoolA = select,policy-path=https://a.example.invalid/nodes,hidden=1",
    "PoolB = select,policy-path=https://b.example.invalid/nodes,hidden=1",
    "A = select,include-other-group=PoolA\\,PoolB,policy-regex-filter=^.+$",
  ]));
  assert.deepEqual(valid, { valid: true, errors: [] });

  const missing = validateSurgeProfile(profile([
    "PoolA = select,policy-path=https://a.example.invalid/nodes,hidden=1",
    "A = select,include-other-group=PoolA\\,PoolB,policy-regex-filter=^.+$",
  ]));
  assert.equal(missing.valid, false);
  assert.match(missing.errors.join("\n"), /missing group or proxy reference/iu);
});
