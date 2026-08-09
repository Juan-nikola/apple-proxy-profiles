import { compactRuleCidrs } from "./compact-rule-cidrs.js";
import { normalizeRuleEntry, parseCanonicalCidr, RULE_KIND } from "../../shared/rules/model.js";

const DAY_MS = 24 * 60 * 60 * 1_000;
const CALIBRATION_MS = 14 * DAY_MS;
const SECONDARY_MAX_AGE_MS = 7 * DAY_MS;
const BASIS_POINTS = 10_000n;
const FAMILY_CONFIG = Object.freeze({
  ipv4: Object.freeze({ kind: RULE_KIND.ipv4Cidr, version: 4, width: 32 }),
  ipv6: Object.freeze({ kind: RULE_KIND.ipv6Cidr, version: 6, width: 128 }),
});
const REPORT_KEYS = Object.freeze([
  "schemaVersion",
  "generatedAt",
  "calibrationStartedAt",
  "calibrationEndsAt",
  "reportOnly",
  "primary",
  "secondary",
  "families",
  "warnings",
  "blockers",
]);
const SOURCE_KEYS = Object.freeze(["repository", "commit", "committedAt", "sha256"]);
const FAMILIES_KEYS = Object.freeze(["ipv4", "ipv6"]);
const FAMILY_KEYS = Object.freeze([
  "previousPrefixes",
  "currentPrefixes",
  "secondaryPrefixes",
  "previousAddresses",
  "currentAddresses",
  "secondaryAddresses",
  "shrinkBasisPoints",
  "divergenceBasisPoints",
]);
const FORBIDDEN_CIDRS = Object.freeze([
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "::/128",
  "::1/128",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
  "2001:db8::/32",
]);

function cidrEnd(cidr) {
  const width = cidr.version === 4 ? 32 : 128;
  return cidr.network + (1n << BigInt(width - cidr.prefix)) - 1n;
}

const FORBIDDEN = Object.freeze(FORBIDDEN_CIDRS.map((value) => {
  const version = value.includes(":") ? 6 : 4;
  const cidr = parseCanonicalCidr(value, version);
  return Object.freeze({ ...cidr, end: cidrEnd(cidr) });
}));

function timestamp(value, label) {
  const date = value instanceof Date ? value : new Date(value);
  const millis = date.getTime();
  if (!Number.isFinite(millis)) throw new TypeError(`${label} must be a valid timestamp`);
  return Object.freeze({ millis, iso: date.toISOString() });
}

function timestampString(value, label) {
  if (typeof value !== "string") throw new TypeError(`${label} must be a timestamp string`);
  return timestamp(value, label);
}

function assertClosedObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) throw new TypeError(`${label} contains unknown key: ${key}`);
  }
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${label} is missing key: ${key}`);
  }
}

function normalizeSource(value, label) {
  assertClosedObject(value, SOURCE_KEYS, label);
  if (typeof value.repository !== "string" || !value.repository.trim()
    || value.repository.trim() !== value.repository) {
    throw new TypeError(`${label} repository must be a non-empty trimmed string`);
  }
  if (typeof value.commit !== "string" || !/^[0-9a-f]{40}$/u.test(value.commit)) {
    throw new TypeError(`${label} commit must be a full lowercase SHA`);
  }
  timestampString(value.committedAt, `${label} committedAt`);
  if (typeof value.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(value.sha256)) {
    throw new TypeError(`${label} sha256 must be a lowercase SHA-256 digest`);
  }
  return Object.freeze({
    repository: value.repository,
    commit: value.commit,
    committedAt: value.committedAt,
    sha256: value.sha256,
  });
}

function assertAllowedCidr(cidr) {
  const end = cidrEnd(cidr);
  for (const forbidden of FORBIDDEN) {
    if (forbidden.version === cidr.version
      && cidr.network <= forbidden.end
      && forbidden.network <= end) {
      throw new TypeError(`Audit CIDR overlaps forbidden range: ${forbidden.value}`);
    }
  }
}

function parseFamilyText(text, family, sourceId) {
  const label = family === "ipv4" ? "IPv4" : "IPv6";
  const { kind, version } = FAMILY_CONFIG[family];
  if (typeof text !== "string") throw new TypeError(`${label} audit input must be text`);
  if (/(?:<!doctype\s+html|<html\b)/iu.test(text)) {
    throw new TypeError(`${label} audit input contains HTML`);
  }
  const values = text.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  if (values.length === 0) throw new TypeError(`${label} audit list is empty`);

  return values.map((value) => {
    if (!/^\S+\/\S+$/u.test(value)) throw new TypeError(`${label} audit line must contain only a CIDR`);
    const cidr = parseCanonicalCidr(value, version);
    assertAllowedCidr(cidr);
    return normalizeRuleEntry({ kind, value: cidr.value, noResolve: true, sourceId });
  });
}

export function parseAuditCidrs({ ipv4Text, ipv6Text, sourceId } = {}) {
  const ipv4 = parseFamilyText(ipv4Text, "ipv4", sourceId);
  const ipv6 = parseFamilyText(ipv6Text, "ipv6", sourceId);
  return Object.freeze([...ipv4, ...ipv6]);
}

function normalizeAuditEntries(entries, label) {
  if (!Array.isArray(entries)) throw new TypeError(`${label} must be an array`);
  return entries.map((entry) => {
    const normalized = normalizeRuleEntry(entry);
    if (normalized.kind !== RULE_KIND.ipv4Cidr && normalized.kind !== RULE_KIND.ipv6Cidr) {
      throw new TypeError(`${label} must contain only CIDR entries`);
    }
    const version = normalized.kind === RULE_KIND.ipv4Cidr ? 4 : 6;
    assertAllowedCidr(parseCanonicalCidr(normalized.value, version));
    return normalized;
  });
}

function coverage(entries, family) {
  const { kind, version, width } = FAMILY_CONFIG[family];
  const normalized = entries
    .filter((entry) => entry.kind === kind)
    .map((entry) => normalizeRuleEntry({
      kind,
      value: entry.value,
      noResolve: true,
      sourceId: `ChinaIP-audit-${family}`,
    }));
  const compacted = compactRuleCidrs(normalized).entries;
  let addresses = 0n;
  for (const entry of compacted) {
    const cidr = parseCanonicalCidr(entry.value, version);
    addresses += 1n << BigInt(width - cidr.prefix);
  }
  return Object.freeze({ prefixes: compacted.length, addresses });
}

function safeBasisPoints(numerator, denominator, label) {
  const value = numerator * BASIS_POINTS / denominator;
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${label} exceeds the safe integer range`);
  }
  return Number(value);
}

function shrinkBasisPoints(previous, current) {
  if (previous === 0n || current >= previous) return 0;
  return safeBasisPoints(previous - current, previous, "Primary shrink basis points");
}

function divergenceBasisPoints(current, secondary) {
  if (current === 0n) return secondary === 0n ? 0 : 10_000;
  const difference = current > secondary ? current - secondary : secondary - current;
  return safeBasisPoints(difference, current, "Secondary divergence basis points");
}

function familyReport(previous, current, secondary) {
  return Object.freeze({
    previousPrefixes: previous.prefixes,
    currentPrefixes: current.prefixes,
    secondaryPrefixes: secondary.prefixes,
    previousAddresses: previous.addresses.toString(),
    currentAddresses: current.addresses.toString(),
    secondaryAddresses: secondary.addresses.toString(),
    shrinkBasisPoints: shrinkBasisPoints(previous.addresses, current.addresses),
    divergenceBasisPoints: divergenceBasisPoints(current.addresses, secondary.addresses),
  });
}

function diagnosticsFor({ families, reportOnly, generatedAt, secondary }) {
  const warnings = new Set();
  const blockers = new Set();
  for (const family of FAMILIES_KEYS) {
    const metrics = families[family];
    if (metrics.shrinkBasisPoints > 2_000) {
      (reportOnly ? warnings : blockers).add(`${family}:primary-shrink`);
    }
    if (metrics.divergenceBasisPoints > 1_500) {
      (reportOnly ? warnings : blockers).add(`${family}:secondary-divergence`);
    } else if (metrics.divergenceBasisPoints > 500) {
      warnings.add(`${family}:secondary-divergence`);
    }
  }
  if (timestamp(generatedAt, "Report generatedAt").millis
    - timestamp(secondary.committedAt, "Secondary committedAt").millis > SECONDARY_MAX_AGE_MS) {
    blockers.add("secondary:comparison-stale");
  }
  return Object.freeze({
    warnings: Object.freeze([...warnings].sort()),
    blockers: Object.freeze([...blockers].sort()),
  });
}

export function buildChinaIpAudit({
  previousPrimaryEntries,
  currentPrimaryEntries,
  secondaryEntries,
  primary,
  secondary,
  now,
  calibrationStartedAt,
} = {}) {
  const generated = timestamp(now, "Audit now");
  const calibrationStart = calibrationStartedAt === undefined || calibrationStartedAt === null
    ? generated
    : timestamp(calibrationStartedAt, "Calibration start");
  if (calibrationStart.millis > generated.millis) {
    throw new TypeError("Calibration start cannot be later than audit generation");
  }
  const calibrationEndMillis = calibrationStart.millis + CALIBRATION_MS;
  const primarySource = normalizeSource(primary, "Primary source");
  const secondarySource = normalizeSource(secondary, "Secondary source");
  const previous = normalizeAuditEntries(previousPrimaryEntries, "Previous primary entries");
  const current = normalizeAuditEntries(currentPrimaryEntries, "Current primary entries");
  const comparison = normalizeAuditEntries(secondaryEntries, "Secondary entries");
  const families = Object.freeze(Object.fromEntries(FAMILIES_KEYS.map((family) => [family, familyReport(
    coverage(previous, family),
    coverage(current, family),
    coverage(comparison, family),
  )])));
  const reportOnly = generated.millis < calibrationEndMillis;
  const diagnostics = diagnosticsFor({
    families,
    reportOnly,
    generatedAt: generated.iso,
    secondary: secondarySource,
  });

  return Object.freeze({
    schemaVersion: 1,
    generatedAt: generated.iso,
    calibrationStartedAt: calibrationStart.iso,
    calibrationEndsAt: new Date(calibrationEndMillis).toISOString(),
    reportOnly,
    primary: primarySource,
    secondary: secondarySource,
    families,
    warnings: diagnostics.warnings,
    blockers: diagnostics.blockers,
  });
}

function validateNonNegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative integer`);
}

function validateDecimalString(value, label) {
  if (typeof value !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    throw new TypeError(`${label} must be a decimal string`);
  }
  return BigInt(value);
}

function validateDiagnosticList(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item)) {
    throw new TypeError(`${label} must be an array of diagnostic codes`);
  }
  const canonical = [...new Set(value)].sort();
  if (canonical.length !== value.length || canonical.some((item, index) => item !== value[index])) {
    throw new TypeError(`${label} must contain unique lexicographically sorted codes`);
  }
}

function validateFamily(value, family) {
  assertClosedObject(value, FAMILY_KEYS, `Report families.${family}`);
  for (const key of ["previousPrefixes", "currentPrefixes", "secondaryPrefixes"]) {
    validateNonNegativeInteger(value[key], `Report families.${family}.${key}`);
  }
  const previous = validateDecimalString(value.previousAddresses, `Report families.${family}.previousAddresses`);
  const current = validateDecimalString(value.currentAddresses, `Report families.${family}.currentAddresses`);
  const secondary = validateDecimalString(value.secondaryAddresses, `Report families.${family}.secondaryAddresses`);
  validateNonNegativeInteger(value.shrinkBasisPoints, `Report families.${family}.shrinkBasisPoints`);
  validateNonNegativeInteger(value.divergenceBasisPoints, `Report families.${family}.divergenceBasisPoints`);
  if (value.shrinkBasisPoints !== shrinkBasisPoints(previous, current)
    || value.divergenceBasisPoints !== divergenceBasisPoints(current, secondary)) {
    throw new TypeError(`Report families.${family} basis points are inconsistent with address coverage`);
  }
}

function validateReportSchema(report) {
  assertClosedObject(report, REPORT_KEYS, "Report");
  if (report.schemaVersion !== 1) throw new TypeError("Report schemaVersion must be 1");
  const generated = timestampString(report.generatedAt, "Report generatedAt");
  const calibrationStart = timestampString(report.calibrationStartedAt, "Report calibrationStartedAt");
  const calibrationEnd = timestampString(report.calibrationEndsAt, "Report calibrationEndsAt");
  if (calibrationEnd.millis !== calibrationStart.millis + CALIBRATION_MS) {
    throw new TypeError("Report calibration interval must be fourteen days");
  }
  if (calibrationStart.millis > generated.millis) {
    throw new TypeError("Report calibration cannot start after generation");
  }
  if (typeof report.reportOnly !== "boolean"
    || report.reportOnly !== (generated.millis < calibrationEnd.millis)) {
    throw new TypeError("Report reportOnly is inconsistent with calibration timestamps");
  }
  normalizeSource(report.primary, "Report primary");
  const secondary = normalizeSource(report.secondary, "Report secondary");
  assertClosedObject(report.families, FAMILIES_KEYS, "Report families");
  for (const family of FAMILIES_KEYS) validateFamily(report.families[family], family);
  validateDiagnosticList(report.warnings, "Report warnings");
  validateDiagnosticList(report.blockers, "Report blockers");
  const expected = diagnosticsFor({
    families: report.families,
    reportOnly: report.reportOnly,
    generatedAt: generated.iso,
    secondary,
  });
  if (JSON.stringify(report.warnings) !== JSON.stringify(expected.warnings)
    || JSON.stringify(report.blockers) !== JSON.stringify(expected.blockers)) {
    throw new TypeError("Report diagnostics are inconsistent with audit metrics");
  }
  return Object.freeze({ generated, calibrationEnd, secondary });
}

export function validateChinaIpAuditForPromotion(report, now) {
  const { calibrationEnd, secondary } = validateReportSchema(report);
  const validationTime = timestamp(now, "Promotion validation time");
  if (report.reportOnly || validationTime.millis < calibrationEnd.millis) {
    throw new Error("ChinaIP audit calibration is still report-only");
  }
  if (report.blockers.length > 0) throw new Error("ChinaIP audit has blockers");
  if (validationTime.millis - timestamp(secondary.committedAt, "Secondary committedAt").millis
    > SECONDARY_MAX_AGE_MS) {
    throw new Error("ChinaIP audit secondary comparison is stale");
  }
  return true;
}
