import { createHash } from "node:crypto";

import { artifactSha256 } from "./artifact-content.js";
import { canonicalJson } from "./render-anywhere-rules.js";

const DOMAIN_KINDS = new Set(["domain", "domainSuffix", "domainKeyword", "regexp"]);
const REPORT_KEYS = Object.freeze([
  "schemaVersion",
  "generatedAt",
  "reportOnly",
  "autoMerge",
  "productionSource",
  "production",
  "comparison",
  "warnings",
  "blockers",
]);
const SOURCE_KEYS = Object.freeze(["repository", "branch", "commit", "committedAt", "sha256"]);
const SUMMARY_KEYS = Object.freeze([
  "repository",
  "branch",
  "commit",
  "committedAt",
  "sha256",
  "entryCount",
  "sampleHashes",
]);
const COMPARISON_KEYS = Object.freeze([
  ...SUMMARY_KEYS,
  "fileCount",
  "totalBytes",
  "intersectionCount",
  "productionOnlyCount",
  "comparisonOnlyCount",
  "intersectionSampleHashes",
  "productionOnlySampleHashes",
  "comparisonOnlySampleHashes",
  "include",
]);
const INCLUDE_KEYS = Object.freeze([
  "fileCount",
  "totalBytes",
  "maxDepth",
  "includeCount",
  "duplicateIncludeCount",
]);
const SHA256 = /^[0-9a-f]{64}$/u;
const SHA1 = /^[0-9a-f]{40}$/u;
const WARNING = /^[a-z][a-z0-9._:-]{0,80}$/u;

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function assertClosed(value, keys, label) {
  assertObject(value, label);
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${label} contains unknown key: ${key}`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${label} is missing key: ${key}`);
  }
}

function iso(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${label} must be an ISO timestamp`);
  }
  return value;
}

function nonNegative(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative integer`);
  return value;
}

function fullSha(value, label) {
  if (typeof value !== "string" || !SHA1.test(value)) throw new TypeError(`${label} must be a full SHA`);
  return value;
}

function digest(value, label) {
  if (typeof value !== "string" || !SHA256.test(value)) throw new TypeError(`${label} must be a SHA-256 digest`);
  return value;
}

function samples(value, label) {
  if (!Array.isArray(value) || value.length > 16 || value.some((item) => typeof item !== "string" || !SHA256.test(item))) {
    throw new TypeError(`${label} must contain at most sixteen SHA-256 samples`);
  }
  const sorted = [...new Set(value)].sort();
  if (sorted.length !== value.length || sorted.some((item, index) => item !== value[index])) {
    throw new TypeError(`${label} must be unique and sorted`);
  }
  return value;
}

function safeWarnings(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !WARNING.test(item))) {
    throw new TypeError(`${label} contains an unsafe warning code`);
  }
  const sorted = [...new Set(value)].sort();
  if (sorted.length !== value.length || sorted.some((item, index) => item !== value[index])) {
    throw new TypeError(`${label} must be unique and sorted`);
  }
  return value;
}

function normalizedEntry(entry, label) {
  assertObject(entry, label);
  if (!DOMAIN_KINDS.has(entry.kind) || typeof entry.value !== "string" || !entry.value.trim()) {
    throw new TypeError(`${label} is not a domain entry`);
  }
  const attributes = entry.attributes === undefined ? [] : entry.attributes;
  if (!Array.isArray(attributes) || attributes.some((item) => typeof item !== "string" || !/^@[!-~]+$/u.test(item))) {
    throw new TypeError(`${label} attributes are invalid`);
  }
  return Object.freeze({
    kind: entry.kind,
    value: entry.kind === "regexp" ? entry.value : entry.value.toLowerCase(),
    attributes: Object.freeze([...attributes]),
  });
}

function entryKey(entry) {
  return canonicalJson({ kind: entry.kind, value: entry.value, attributes: entry.attributes });
}

function keyDigest(key) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

function digestKeys(keys) {
  const ordered = [...keys].sort();
  return artifactSha256(`${ordered.join("\n")}\n`);
}

function sampleKeys(keys) {
  return Object.freeze([...keys].sort().slice(0, 16).map(keyDigest).sort());
}

function flattenCatalog(catalog) {
  if (Array.isArray(catalog)) return catalog;
  if (catalog instanceof Map) return [...catalog.values()].flatMap((value) => flattenCatalog(value));
  if (catalog && typeof catalog === "object" && Array.isArray(catalog.entries)) return catalog.entries;
  throw new TypeError("Blackmatrix catalog entries are required");
}

function canonicalEntries(value, label) {
  const unique = new Map();
  for (const [index, item] of flattenCatalog(value).entries()) {
    const entry = normalizedEntry(item, `${label}[${index}]`);
    unique.set(entryKey(entry), entry);
  }
  return [...unique.values()];
}

function sourceSummary({ source, entries, label, repository, branch, sha256 }) {
  assertObject(source, `${label} source`);
  const commit = fullSha(source.commit, `${label} source.commit`);
  const committedAt = iso(source.committedAt, `${label} source.committedAt`);
  const sourceDigest = digest(sha256 ?? source.sha256, `${label} source.sha256`);
  const keys = entries.map(entryKey);
  return Object.freeze({
    repository,
    branch,
    commit,
    committedAt,
    sha256: sourceDigest,
    entryCount: keys.length,
    sampleHashes: sampleKeys(keys),
  });
}

function productionSummary(catalog) {
  const entries = canonicalEntries(catalog, "Blackmatrix catalog");
  const keys = entries.map(entryKey);
  return Object.freeze({
    repository: "blackmatrix7",
    branch: "master",
    commit: "0000000000000000000000000000000000000000",
    committedAt: "1970-01-01T00:00:00.000Z",
    sha256: digestKeys(keys),
    entryCount: keys.length,
    sampleHashes: sampleKeys(keys),
  });
}

function normalizeProductionSummary(catalog, metadata = null) {
  const summary = productionSummary(catalog);
  if (!metadata) return summary;
  return Object.freeze({
    ...summary,
    repository: metadata.repository ?? summary.repository,
    branch: metadata.branch ?? summary.branch,
    commit: metadata.commit ?? summary.commit,
    committedAt: metadata.committedAt ?? summary.committedAt,
  });
}

function comparisonFor({ productionKeys, comparisonKeys, snapshot }) {
  const production = new Set(productionKeys);
  const comparison = new Set(comparisonKeys);
  const intersection = [...production].filter((key) => comparison.has(key));
  const productionOnly = [...production].filter((key) => !comparison.has(key));
  const comparisonOnly = [...comparison].filter((key) => !production.has(key));
  const files = Array.isArray(snapshot.files) ? snapshot.files : [];
  const totalBytes = files.reduce((sum, file) => sum + (Number.isSafeInteger(file.bytes) ? file.bytes : 0), 0);
  const includeCount = files.reduce((sum, file) => sum + (file.path === "data/cn" ? 0 : 1), 0);
  return Object.freeze({
    fileCount: files.length,
    totalBytes,
    intersectionCount: intersection.length,
    productionOnlyCount: productionOnly.length,
    comparisonOnlyCount: comparisonOnly.length,
    intersectionSampleHashes: sampleKeys(intersection),
    productionOnlySampleHashes: sampleKeys(productionOnly),
    comparisonOnlySampleHashes: sampleKeys(comparisonOnly),
    include: Object.freeze({
      fileCount: files.length,
      totalBytes,
      maxDepth: 0,
      includeCount,
      duplicateIncludeCount: 0,
    }),
  });
}

export function buildV2flyDomainAudit({ snapshot, blackmatrixCatalog, generatedAt, production = null } = {}) {
  assertObject(snapshot, "v2fly snapshot");
  const snapshotEntries = canonicalEntries(snapshot.entries, "v2fly snapshot entries");
  const productionEntries = canonicalEntries(blackmatrixCatalog, "Blackmatrix catalog");
  const productionKeys = productionEntries.map(entryKey);
  const comparisonKeys = snapshotEntries.map(entryKey);
  const productionSummaryValue = normalizeProductionSummary(productionEntries, production);
  const source = sourceSummary({
    source: {
      ...snapshot.source,
      committedAt: snapshot.source.committedAt ?? generatedAt,
    },
    entries: snapshotEntries,
    label: "v2fly",
    repository: snapshot.source.repository,
    branch: snapshot.source.branch,
    sha256: snapshot.sha256,
  });
  const comparison = Object.freeze({
    ...source,
    ...comparisonFor({ productionKeys, comparisonKeys, snapshot }),
  });
  const warnings = [];
  if (comparison.productionOnlyCount > 0 || comparison.comparisonOnlyCount > 0) warnings.push("v2fly:domain-drift");
  if (comparison.include.fileCount > 512 || comparison.include.totalBytes > 8 * 1024 * 1024) warnings.push("v2fly:closure-budget");
  const report = Object.freeze({
    schemaVersion: 1,
    generatedAt: iso(generatedAt, "v2fly audit generatedAt"),
    reportOnly: true,
    autoMerge: false,
    productionSource: "blackmatrix7",
    production: productionSummaryValue,
    comparison,
    warnings: Object.freeze([...new Set(warnings)].sort()),
    blockers: Object.freeze([]),
  });
  validateV2flyDomainAudit(report);
  return report;
}

function validateSummary(value, label) {
  assertClosed(value, SUMMARY_KEYS, label);
  if (typeof value.repository !== "string" || !value.repository || /[\r\n]/u.test(value.repository)) {
    throw new TypeError(`${label}.repository is invalid`);
  }
  if (typeof value.branch !== "string" || !value.branch || /[\r\n]/u.test(value.branch)) {
    throw new TypeError(`${label}.branch is invalid`);
  }
  fullSha(value.commit, `${label}.commit`);
  iso(value.committedAt, `${label}.committedAt`);
  digest(value.sha256, `${label}.sha256`);
  nonNegative(value.entryCount, `${label}.entryCount`);
  samples(value.sampleHashes, `${label}.sampleHashes`);
}

export function validateV2flyDomainAudit(report) {
  assertClosed(report, REPORT_KEYS, "v2fly audit report");
  if (report.schemaVersion !== 1) throw new TypeError("v2fly audit schemaVersion must be 1");
  iso(report.generatedAt, "v2fly audit generatedAt");
  if (report.reportOnly !== true) throw new TypeError("v2fly audit reportOnly must be true");
  if (report.autoMerge !== false) throw new TypeError("v2fly audit autoMerge must be false");
  if (report.productionSource !== "blackmatrix7") throw new TypeError("v2fly audit productionSource is invalid");
  validateSummary(report.production, "v2fly audit production");
  assertClosed(report.comparison, COMPARISON_KEYS, "v2fly audit comparison");
  validateSummary(
    Object.fromEntries(SUMMARY_KEYS.map((key) => [key, report.comparison[key]])),
    "v2fly audit comparison",
  );
  for (const key of ["fileCount", "totalBytes", "intersectionCount", "productionOnlyCount", "comparisonOnlyCount"]) {
    nonNegative(report.comparison[key], `v2fly audit comparison.${key}`);
  }
  for (const key of ["intersectionSampleHashes", "productionOnlySampleHashes", "comparisonOnlySampleHashes"]) {
    samples(report.comparison[key], `v2fly audit comparison.${key}`);
  }
  assertClosed(report.comparison.include, INCLUDE_KEYS, "v2fly audit comparison.include");
  for (const key of INCLUDE_KEYS) nonNegative(report.comparison.include[key], `v2fly audit comparison.include.${key}`);
  safeWarnings(report.warnings, "v2fly audit warnings");
  safeWarnings(report.blockers, "v2fly audit blockers");
  if (report.blockers.length > 0) throw new TypeError("v2fly audit blockers must remain empty");
  if (report.comparison.intersectionCount + report.comparison.productionOnlyCount !== report.production.entryCount
    || report.comparison.intersectionCount + report.comparison.comparisonOnlyCount !== report.comparison.entryCount) {
    throw new TypeError("v2fly audit comparison counts are inconsistent");
  }
  const productionBase = { ...report.production };
  const comparisonBase = { ...report.comparison };
  delete productionBase.sampleHashes;
  delete comparisonBase.sampleHashes;
  return true;
}
