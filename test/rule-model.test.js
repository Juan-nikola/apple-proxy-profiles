import assert from "node:assert/strict";
import test from "node:test";

import {
  RULE_KIND,
  normalizeRuleEntry,
  parseCanonicalCidr,
  validateLightweightRuleCatalog,
} from "../shared/rules/model.js";

test("normalizes domains without widening exact-domain intent", () => {
  assert.deepEqual(normalizeRuleEntry({
    kind: RULE_KIND.domainSuffix,
    value: ".Example.COM.",
    sourceId: "x",
  }), {
    kind: "domainSuffix",
    value: "example.com",
    noResolve: false,
    sourceId: "x",
  });
  assert.equal(normalizeRuleEntry({
    kind: RULE_KIND.domain,
    value: "Exact.Example.",
    sourceId: "x",
  }).value, "exact.example");
  assert.equal(normalizeRuleEntry({
    kind: RULE_KIND.domainKeyword,
    value: "OpenAI",
    sourceId: "x",
  }).value, "openai");
});

test("canonicalizes bare hosts, host-bit CIDRs, and IPv6 text", () => {
  assert.equal(normalizeRuleEntry({
    kind: RULE_KIND.ipv4Cidr,
    value: "192.0.2.9",
    sourceId: "x",
  }).value, "192.0.2.9/32");
  assert.equal(parseCanonicalCidr("192.0.2.9/24", 4).value, "192.0.2.0/24");
  assert.equal(parseCanonicalCidr("2001:0DB8:0:0:1:0:0:1/64", 6).value, "2001:db8::/64");
  assert.equal(parseCanonicalCidr("2001:db8::1", 6).value, "2001:db8::1/128");
  assert.equal(parseCanonicalCidr("::ffff:113.248.172.245/128", 6).value, "::ffff:71f8:acf5/128");
});

test("rejects malformed and delimiter-bearing normalized values", () => {
  for (const entry of [
    { kind: RULE_KIND.domainSuffix, value: "", sourceId: "x" },
    { kind: RULE_KIND.domainSuffix, value: "a..example", sourceId: "x" },
    { kind: RULE_KIND.domainKeyword, value: "bad,value", sourceId: "x" },
    { kind: RULE_KIND.ipv4Cidr, value: "192.0.2.1/33", sourceId: "x" },
    { kind: RULE_KIND.ipv6Cidr, value: "192.0.2.1/24", sourceId: "x" },
    { kind: RULE_KIND.domain, value: "example.com", sourceId: " x " },
  ]) {
    assert.throws(() => normalizeRuleEntry(entry));
  }
});

test("validates the synthetic lightweight rule identifiers and pack boundaries", () => {
  assert.doesNotThrow(() => validateLightweightRuleCatalog({
    defaultSourceIds: ["DomesticCore", "DomesticGame", "OverseasGame", "ChinaTLD", "ChinaIP", "OpenAI"],
    optionalSourceIds: ["Advertising", "Advertising_Domain"],
  }));
  assert.throws(() => validateLightweightRuleCatalog({
    defaultSourceIds: ["DomesticCore", "DomesticCore"],
    optionalSourceIds: [],
  }), /duplicate/u);
  assert.throws(() => validateLightweightRuleCatalog({
    defaultSourceIds: ["DomesticFallback"],
    optionalSourceIds: [],
  }), /synthetic/u);
  assert.throws(() => validateLightweightRuleCatalog({
    defaultSourceIds: ["DomesticCore", "Advertising"],
    optionalSourceIds: ["Advertising"],
  }), /overlap/u);
  assert.throws(() => validateLightweightRuleCatalog({
    defaultSourceIds: ["Advertising"],
    optionalSourceIds: [],
  }), /default/u);
  assert.throws(() => validateLightweightRuleCatalog({
    defaultSourceIds: ["DomesticCore"],
    optionalSourceIds: ["Advertising", "Advertising"],
  }), /duplicate/u);
});
