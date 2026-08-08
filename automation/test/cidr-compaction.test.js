import assert from "node:assert/strict";
import test from "node:test";

import { compactRuleCidrs } from "../src/compact-rule-cidrs.js";
import { normalizeRuleEntry, RULE_KIND } from "../../shared/rules/model.js";

function entry(kind, value, noResolve = true) {
  return normalizeRuleEntry({ kind, value, noResolve, sourceId: "ChinaIP" });
}

test("removes contained CIDRs and merges only complete IPv4 sibling ranges", () => {
  const result = compactRuleCidrs([
    entry(RULE_KIND.domainSuffix, "example.cn", false),
    entry(RULE_KIND.ipv4Cidr, "10.0.0.0/8"),
    entry(RULE_KIND.ipv4Cidr, "10.1.0.0/16"),
    entry(RULE_KIND.ipv4Cidr, "192.0.2.0/25"),
    entry(RULE_KIND.ipv4Cidr, "192.0.2.128/25"),
    entry(RULE_KIND.ipv4Cidr, "192.0.3.0/25"),
  ]);

  assert.deepEqual(result.entries.map(({ kind, value, noResolve }) => ({ kind, value, noResolve })), [
    { kind: "domainSuffix", value: "example.cn", noResolve: false },
    { kind: "ipv4Cidr", value: "10.0.0.0/8", noResolve: true },
    { kind: "ipv4Cidr", value: "192.0.2.0/24", noResolve: true },
    { kind: "ipv4Cidr", value: "192.0.3.0/25", noResolve: true },
  ]);
  assert.deepEqual(result.diagnostics, { input: 6, output: 4, removed: 2 });
});

test("uses BigInt IPv6 siblings and never merges different no-resolve semantics", () => {
  const result = compactRuleCidrs([
    entry(RULE_KIND.ipv6Cidr, "2001:db8::/33"),
    entry(RULE_KIND.ipv6Cidr, "2001:db8:8000::/33"),
    entry(RULE_KIND.ipv6Cidr, "2001:db9::/48", false),
    entry(RULE_KIND.ipv6Cidr, "2001:db9:1::/48", true),
  ]);

  assert.deepEqual(result.entries.map(({ value, noResolve }) => ({ value, noResolve })), [
    { value: "2001:db8::/32", noResolve: true },
    { value: "2001:db9:1::/48", noResolve: true },
    { value: "2001:db9::/48", noResolve: false },
  ]);
  assert.deepEqual(result.diagnostics, { input: 4, output: 3, removed: 1 });
});

test("never merges sibling CIDRs that retain different source provenance", () => {
  const result = compactRuleCidrs([
    normalizeRuleEntry({ kind: RULE_KIND.ipv4Cidr, value: "192.0.2.0/25", noResolve: true, sourceId: "left" }),
    normalizeRuleEntry({ kind: RULE_KIND.ipv4Cidr, value: "192.0.2.128/25", noResolve: true, sourceId: "right" }),
  ]);

  assert.deepEqual(result.entries.map(({ value, sourceId }) => ({ value, sourceId })), [
    { value: "192.0.2.0/25", sourceId: "left" },
    { value: "192.0.2.128/25", sourceId: "right" },
  ]);
});
