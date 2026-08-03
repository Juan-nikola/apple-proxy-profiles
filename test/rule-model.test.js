import assert from "node:assert/strict";
import test from "node:test";

import {
  RULE_KIND,
  normalizeRuleEntry,
  parseCanonicalCidr,
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
