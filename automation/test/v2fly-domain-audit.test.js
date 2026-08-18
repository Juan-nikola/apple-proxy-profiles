import assert from "node:assert/strict";
import test from "node:test";

import { buildV2flyDomainAudit, validateV2flyDomainAudit } from "../src/v2fly-domain-audit.js";

const snapshot = Object.freeze({
  source: Object.freeze({
    repository: "https://github.com/v2fly/domain-list-community",
    branch: "master",
    commit: "a".repeat(40),
    committedAt: "2026-08-17T00:00:00Z",
    license: "MIT",
  }),
  files: Object.freeze([{ path: "data/cn", bytes: 12, sha256: "b".repeat(64) }]),
  entries: Object.freeze([
    { kind: "domainSuffix", value: "example.cn", attributes: [] },
    { kind: "domain", value: "full.example.cn", attributes: [] },
    { kind: "domainKeyword", value: "china", attributes: ["@cn"] },
  ]),
  sha256: "c".repeat(64),
});

test("builds a report-only, hash-sampled v2fly comparison without domain leakage", () => {
  const report = buildV2flyDomainAudit({
    snapshot,
    generatedAt: "2026-08-18T03:23:00Z",
    blackmatrixCatalog: [
      { kind: "domainSuffix", value: "example.cn" },
      { kind: "domainSuffix", value: "blackmatrix.example" },
    ],
  });
  assert.equal(validateV2flyDomainAudit(report), true);
  assert.equal(report.reportOnly, true);
  assert.equal(report.autoMerge, false);
  assert.equal(report.productionSource, "blackmatrix7");
  assert.doesNotMatch(JSON.stringify(report), /example\.cn|full\.example|china/u);
});

test("rejects malformed or secret-shaped report data", () => {
  const report = buildV2flyDomainAudit({ snapshot, generatedAt: "2026-08-18T03:23:00Z", blackmatrixCatalog: [] });
  assert.throws(() => validateV2flyDomainAudit({ ...report, reportOnly: false }), /reportOnly/u);
  const secretShapedWarning = ["https://private.example/a?", "token=x"].join("");
  assert.throws(() => validateV2flyDomainAudit({ ...report, warnings: [secretShapedWarning] }), /unknown|secret|warning/u);
});
