import assert from "node:assert/strict";
import test from "node:test";

import { renderArrs } from "../src/render-arrs.js";

const provenance = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  sourceId: "Representative",
  commit: "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc",
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
  changedBy: "Juan-nikola/apple-proxy-profiles",
});

test("renders only the four audited Anywhere type IDs in stable order", () => {
  const content = renderArrs({
    name: "Representative",
    routing: 2,
    provenance,
    entries: [
      { kind: "domainKeyword", value: "OpenAI", sourceId: "Representative" },
      { kind: "ipv6Cidr", value: "2001:db8::1/32", sourceId: "Representative" },
      { kind: "domainSuffix", value: ".Example.COM.", sourceId: "Representative" },
      { kind: "ipv4Cidr", value: "192.0.2.9/24", sourceId: "Representative" },
    ],
  });
  assert.match(content, /^# Upstream: https:\/\/github\.com\/blackmatrix7\/ios_rule_script\n/u);
  assert.match(content, /name = Representative\nrouting = 2\n\n/u);
  assert.match(content, /0, 192\.0\.2\.0\/24\n1, 2001:db8::\/32\n2, example\.com\n3, openai\n$/u);
  assert.equal(content.includes("\r"), false);
  assert.equal(content.endsWith("\n"), true);
});

test("rejects unsupported rules and unsafe metadata instead of relying on silent app drops", () => {
  assert.throws(() => renderArrs({
    name: "Bad",
    routing: 0,
    provenance,
    entries: [{ kind: "domain", value: "only.example", sourceId: "Representative" }],
  }), /unsupported/u);
  assert.throws(() => renderArrs({
    name: "Bad\nName",
    routing: 0,
    provenance,
    entries: [],
  }), /name/u);
});

test("uses the immutable upstream time rather than the wall clock", () => {
  const content = renderArrs({ name: "Empty", routing: 1, entries: [], provenance });
  assert.match(content, /2026-08-01T19:07:21Z/u);
  assert.doesNotMatch(content, /2026-08-03/u);
});
