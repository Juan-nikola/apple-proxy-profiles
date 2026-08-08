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

test("accepts the rule-download fallback transport before the CN fallback", () => {
  const result = validateSurgeProfile(profile(
    ["A = select,DIRECT"],
    ["DOMAIN,example.invalid,A", "GEOIP,CN,DIRECT", "FINAL,A"],
  ));
  assert.deepEqual(result, { valid: true, errors: [] });
});

test("accepts dns-failed only on the last FINAL rule", () => {
  const result = validateSurgeProfile(profile(
    ["A = select,DIRECT"],
    ["GEOIP,CN,DIRECT", "FINAL,A,dns-failed"],
  ));
  assert.deepEqual(result, { valid: true, errors: [] });
});
