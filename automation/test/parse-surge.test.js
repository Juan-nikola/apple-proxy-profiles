import assert from "node:assert/strict";
import test from "node:test";

import { parseSurgeRules } from "../src/parse-surge.js";

function source(inputFormat = "RULE-SET", minEntries = 1) {
  return { id: "Fixture", inputFormat, minEntries };
}

test("accounts for every supported, unsupported, comment, blank, and modifier line", () => {
  const parsed = parseSurgeRules([
    "# comment",
    "",
    "DOMAIN-SUFFIX,Example.COM",
    "DOMAIN-KEYWORD,OpenAI",
    "IP-CIDR,192.0.2.9/24,no-resolve",
    "IP-CIDR6,2001:db8::1/32,no-resolve",
    "DOMAIN,only.example",
    "URL-REGEX,^https?://example\\.com/(a,b)$",
    "USER-AGENT,Example,*",
    "PROCESS-NAME,Example",
    "IP-ASN,64500,no-resolve",
    "AND,((DOMAIN,example.com),(PROTOCOL,UDP))",
    "OR,((DOMAIN,a.example),(DOMAIN,b.example))",
  ].join("\n"), source());
  assert.deepEqual(parsed.entries.slice(0, 4).map(({ kind, value, noResolve }) => ({ kind, value, noResolve })), [
    { kind: "domainSuffix", value: "example.com", noResolve: false },
    { kind: "domainKeyword", value: "openai", noResolve: false },
    { kind: "ipv4Cidr", value: "192.0.2.0/24", noResolve: true },
    { kind: "ipv6Cidr", value: "2001:db8::/32", noResolve: true },
  ]);
  assert.deepEqual(parsed.diagnostics, {
    physicalLines: 13,
    comments: 1,
    blank: 1,
    candidateCount: 11,
    parsedCount: 11,
    convertibleCount: 4,
    unsupportedCount: 7,
    unsupportedByReason: {
      "unsupported-exact-domain": 1,
      "unsupported-url-regex": 1,
      "unsupported-user-agent": 1,
      "unsupported-process-name": 1,
      "unsupported-ip-asn": 1,
      "unsupported-and": 1,
      "unsupported-or": 1,
    },
    ignoredModifiers: { noResolve: 3 },
  });
});

test("maps leading-dot DOMAIN-SET entries to suffixes and preserves bare exact intent", () => {
  const parsed = parseSurgeRules(".Example.COM\nonly.example\n", source("DOMAIN-SET", 2));
  assert.deepEqual(parsed.entries.map(({ kind, value }) => ({ kind, value })), [
    { kind: "domainSuffix", value: "example.com" },
    { kind: "domain", value: "only.example" },
  ]);
  assert.equal(parsed.diagnostics.convertibleCount, 1);
  assert.equal(parsed.diagnostics.blank, 1);
  assert.deepEqual(parsed.diagnostics.unsupportedByReason, { "unsupported-exact-domain": 1 });
});

test("throws count-only errors for unknown types, malformed known rules, and low counts", () => {
  assert.throws(() => parseSurgeRules("FUTURE-TYPE,secret.example\n", source()),
    /^Error: Rule source Fixture: unexpected type at line 1$/u);
  assert.throws(() => parseSurgeRules("IP-CIDR,not-an-ip,no-resolve\n", source()),
    /^Error: Rule source Fixture: malformed line 1$/u);
  assert.throws(() => parseSurgeRules("DOMAIN-SUFFIX,example.com\n", source("RULE-SET", 2)),
    /entry count below minimum/u);
});
