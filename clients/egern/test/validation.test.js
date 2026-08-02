import assert from "node:assert/strict";
import test from "node:test";

import { renderEgernProfile } from "../src/render-profile.js";
import {
  assertValidEgernProfile,
  validateEgernProfile,
} from "../src/validate-profile.js";
import { allCompatibleNodes } from "./fixtures/nodes.js";

const PRIVATE_URL = "https://example.invalid/private/egern-nodes?key=TEST_ONLY_VALIDATION_QUERY";

function validProfile() {
  return renderEgernProfile({
    output: "config",
    type: "collection",
    name: "egern-validation",
    nodeSubscriptionUrl: PRIVATE_URL,
    platform: "iphone",
  }, allCompatibleNodes);
}

function assertInvalid(profile, pattern = /./u, forbidden = []) {
  const first = validateEgernProfile(profile);
  const second = validateEgernProfile(profile);
  assert.equal(first.valid, false);
  assert.deepEqual(first, second);
  assert.ok(first.errors.length > 0);
  assert.match(first.errors.join("; "), pattern);
  for (const value of [PRIVATE_URL, "TEST_ONLY_VALIDATION_QUERY", ...forbidden]) {
    assert.equal(first.errors.join("; ").includes(value), false, value);
  }
}

test("validates the actual deterministic YAML string", () => {
  const profile = validProfile();
  assert.equal(typeof profile, "string");
  assert.deepEqual(validateEgernProfile(profile), { valid: true, errors: [] });
  assertInvalid(null, /string/i);
  assertInvalid({ profile }, /string/i);
});

test("generated-profile assertion uses one fixed non-reflective error", () => {
  const secret = "TEST_ONLY_INVALID_GENERATED_PROFILE_SECRET";
  assert.throws(
    () => assertValidEgernProfile(`password: "${secret}"\n`),
    (error) => {
      assert.equal(error.message, "Generated Egern profile failed validation");
      assert.equal(error.message.includes(secret), false);
      return true;
    },
  );
});

test("rejects missing, extra, duplicate, forbidden, and credential root keys", () => {
  const profile = validProfile();
  assertInvalid(profile.replace(/^ipv6:.*\n/mu, ""), /root|ipv6|required/i);
  assertInvalid(`${profile}unexpected: true\n`, /root|field/i);
  assertInvalid(`${profile}ipv6: false\n`, /duplicate|YAML/i);
  assertInvalid(`${profile}proxies: []\n`, /proxies|forbidden|root/i);
  assertInvalid(`${profile}mitm: {}\n`, /mitm|forbidden|root/i);
  assertInvalid(`${profile}password: "TEST_ONLY_VALIDATION_SECRET"\n`, /credential|forbidden|root|field/i, [
    "TEST_ONLY_VALIDATION_SECRET",
  ]);
  assertInvalid(`${profile}private_key: "TEST_ONLY_VALIDATION_KEY"\n`, /credential|forbidden|root|field/i, [
    "TEST_ONLY_VALIDATION_KEY",
  ]);
});

test("rejects malformed YAML and every anchor, alias, tag, and merge form", () => {
  const profile = validProfile();
  for (const suffix of [
    "bad: &anchor {}\n",
    "bad: *anchor\n",
    "bad: !custom {}\n",
    "<<: {}\n",
    "  unexpected_indent: true\n",
    "bad: [unterminated\n",
  ]) assertInvalid(`${profile}${suffix}`, /YAML|root|unsupported|malformed|merge/i);

  for (const raw of ["\u0080", "\u009f", "\u2028", "\u2029"]) {
    assertInvalid(`${profile}bad: "raw${raw}character"\n`, /YAML|malformed|unsupported/i);
  }
  assertInvalid(profile.replace('"system"', '"\\u0073ystem"'), /YAML|canonical/i);
});

test("rejects group record swaps, duplicates, dangling policies, and private URL drift", () => {
  const profile = validProfile();
  const helperA = [
    "  - auto_test:",
    "      name: \"⚡ 全部自动\"",
  ].join("\n");
  const helperB = [
    "  - fallback:",
    "      name: \"🛟 全部故障转移\"",
  ].join("\n");
  assertInvalid(profile.replace(helperA, "TEST_ONLY_HELPER_A").replace(helperB, helperA).replace("TEST_ONLY_HELPER_A", helperB), /group|order|schema/i);
  assertInvalid(profile.replace('name: "🛟 全部故障转移"', 'name: "⚡ 全部自动"'), /group|duplicate|schema/i);
  assertInvalid(profile.replace('policy: "🚀 节点选择"', 'policy: "TEST_ONLY_MISSING_POLICY"'), /rule|policy|group|schema/i, [
    "TEST_ONLY_MISSING_POLICY",
  ]);

  const privateDrift = "https://example.invalid/private/TEST_ONLY_VALIDATION_QUERY";
  assertInvalid(profile.replace(PRIVATE_URL, privateDrift), /group|URL|subscription/i, [privateDrift]);
  assertInvalid(profile.replace("interval: 1800", "interval: 601"), /group|platform|schema/i);
});

test("rejects unknown, swapped, duplicate, non-terminal, and URL-mutated rules", () => {
  const profile = validProfile();
  assertInvalid(profile.replace("  - domain_suffix:", "  - unknown_rule:"), /rule/i);

  const geo = [
    "  - geoip:",
    "      match: \"CN\"",
    "      policy: \"DIRECT\"",
    "      no_resolve: true",
  ].join("\n");
  const final = [
    "  - default:",
    "      policy: \"🚀 节点选择\"",
  ].join("\n");
  assertInvalid(profile.replace(geo, "TEST_ONLY_GEO_RULE").replace(final, geo).replace("TEST_ONLY_GEO_RULE", final), /rule|terminal|order/i);
  assertInvalid(profile.replace(final, `${final}\n${final}`), /rule|default|duplicate/i);

  const alternate = "https://example.invalid/current/egern/rules/Advertising.yaml";
  assertInvalid(profile.replace(/https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles\/current\/egern\/rules\/Advertising\.yaml/u, alternate), /rule|URL|catalog/i, [alternate]);
  const credentialed = `https://${["us", "er"].join("")}@juan-nikola.github.io/apple-proxy-profiles/current/egern/rules/Game.yaml`;
  assertInvalid(profile.replace("https://juan-nikola.github.io/apple-proxy-profiles/current/egern/rules/Game.yaml", credentialed), /rule|URL|catalog/i, [credentialed]);
});

test("rejects DNS drift and inline proxy-bearing content", () => {
  const profile = validProfile();
  assertInvalid(profile.replace("ChinaMax_Domain.yaml", "TEST_ONLY_WRONG_DNS_RULE.yaml"), /DNS|rule|URL/i, [
    "TEST_ONLY_WRONG_DNS_RULE",
  ]);
  assertInvalid(profile.replace('  proxy_nameservers:\n    - "system"', '  proxy_nameservers:\n    - "https://example.invalid/TEST_ONLY_VALIDATION_QUERY"'), /DNS/i);
  assertInvalid(`${profile}server: "private-node.example.invalid"\nport: 443\npassword: "TEST_ONLY_INLINE_PASSWORD"\n`, /root|credential|forbidden/i, [
    "private-node.example.invalid",
    "TEST_ONLY_INLINE_PASSWORD",
  ]);
});
