import assert from "node:assert/strict";
import test from "node:test";

import { compileAnywhereRuleSets } from "../src/compile-priority.js";

function set(id, priority, policy, entries) {
  return { id, name: id, priority, policy, routing: 0, entries };
}

function rule(kind, value, sourceId) {
  return { kind, value, sourceId };
}

test("removes exact duplicates and lower rules wholly covered by higher suffixes", () => {
  const result = compileAnywhereRuleSets([
    set("high", 10, "REJECT", [rule("domainSuffix", "example.com", "high")]),
    set("low", 20, "DIRECT", [
      rule("domainSuffix", "example.com", "low"),
      rule("domainSuffix", "api.example.com", "low"),
      rule("domainSuffix", "ample.com", "low"),
    ]),
  ]);
  assert.deepEqual(result.ruleSets[0].entries.map(({ value }) => value), ["example.com"]);
  assert.deepEqual(result.ruleSets[1].entries.map(({ value }) => value), ["ample.com"]);
  assert.deepEqual(result.diagnostics.duplicates, { low: 1 });
  assert.deepEqual(result.diagnostics.shadowed, { low: 1 });
});

test("keeps a lower broad suffix when Anywhere specificity preserves the high rule", () => {
  const result = compileAnywhereRuleSets([
    set("high", 10, "REJECT", [rule("domainSuffix", "api.example.com", "high")]),
    set("low", 20, "DIRECT", [rule("domainSuffix", "example.com", "low")]),
  ]);
  assert.deepEqual(result.ruleSets.map(({ entries }) => entries.length), [1, 1]);
});

test("canonicalizes CIDRs and applies IPv4 and IPv6 supernet containment", () => {
  const result = compileAnywhereRuleSets([
    set("high", 10, "REJECT", [
      rule("ipv4Cidr", "10.0.0.1/8", "high"),
      rule("ipv6Cidr", "2001:db8::1/32", "high"),
    ]),
    set("low", 20, "DIRECT", [
      rule("ipv4Cidr", "10.1.2.3/24", "low"),
      rule("ipv6Cidr", "2001:db8:1::1/48", "low"),
    ]),
  ]);
  assert.deepEqual(result.ruleSets[0].entries.map(({ value }) => value), ["10.0.0.0/8", "2001:db8::/32"]);
  assert.equal(result.ruleSets[1].entries.length, 0);
  assert.deepEqual(result.diagnostics.shadowed, { low: 2 });
});

test("removes lower suffixes and keywords wholly matched by a high keyword", () => {
  const result = compileAnywhereRuleSets([
    set("high", 10, "REJECT", [rule("domainKeyword", "ads", "high")]),
    set("low", 20, "DIRECT", [
      rule("domainSuffix", "ads.example.com", "low"),
      rule("domainKeyword", "adsdk", "low"),
      rule("domainSuffix", "example.com", "low"),
    ]),
  ]);
  assert.deepEqual(result.ruleSets[1].entries.map(({ value }) => value), ["example.com"]);
  assert.deepEqual(result.diagnostics.shadowed, { low: 2 });
});

test("omits exact domains and other unsupported kinds without exposing values", () => {
  const result = compileAnywhereRuleSets([
    set("one", 10, "DIRECT", [
      rule("domain", "only.example", "one"),
      rule("processName", "Private,Binary", "one"),
    ]),
  ]);
  assert.equal(result.ruleSets[0].entries.length, 0);
  assert.deepEqual(result.diagnostics.unsupported, {
    "unsupported-exact-domain": 1,
    "unsupported-process-name": 1,
  });
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /only\.example|Private|Binary/u);
});

test("rejects ambiguous priorities with a stable count-only error", () => {
  assert.throws(
    () => compileAnywhereRuleSets([
      set("one", 10, "DIRECT", []),
      set("two", 10, "REJECT", []),
    ]),
    /^Error: Anywhere rule precedence has 1 unresolved conflict\(s\)$/u,
  );
});
