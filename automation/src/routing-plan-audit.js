import { isIP } from "node:net";

import { artifactSha256 } from "./artifact-content.js";
import { canonicalJson } from "./render-anywhere-rules.js";
import {
  POLICY_TARGETS,
  ROUTING_PHASES,
} from "../../shared/rules/lightweight-policy.js";
import { parseCanonicalCidr, RULE_KIND } from "../../shared/rules/model.js";

const FORBIDDEN_FIELDS = Object.freeze([
  "node",
  "urlquery",
  "password",
  "uuid",
  "subscription",
]);

export const CLIENT_EXPRESSIONS = Object.freeze({
  shadowrocket: "shared rule plan plus native GEOIP CN",
  surge: "shared rule plan plus native GEOIP CN and dns-failed final",
  egern: "shared rule plan plus native GEOIP CN",
  singbox: "explicit dns-direct resolve before ChinaIP",
  anywhere: "shared ARRS plan; local assignment must be verified",
});

function assertNoForbiddenFields(value, path = "audit") {
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.includes(key.toLowerCase())) {
      throw new Error(`${path}.${key}: forbidden field in routing audit`);
    }
    assertNoForbiddenFields(child, `${path}.${key}`);
  }
}

function requireNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim() || value.trim() !== value) {
    throw new TypeError(`${label} must be a non-empty trimmed string`);
  }
  return value;
}

function auditSourceCounts(plan, ruleSets) {
  const counts = new Map();
  for (const record of plan) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new TypeError("Routing plan entries must be objects");
    }
    const id = requireNonEmptyString(record.id, "Routing plan source id");
    const policy = requireNonEmptyString(record.policy, `Routing plan policy for ${id}`);
    const phase = requireNonEmptyString(record.phase, `Routing plan phase for ${id}`);
    const dnsClass = requireNonEmptyString(record.dnsClass, `Routing plan DNS class for ${id}`);
    if (!ROUTING_PHASES.includes(phase)) {
      throw new Error(`Routing plan source ${id} has unknown phase ${phase}`);
    }
    if (counts.has(id)) throw new Error(`Routing plan contains duplicate source ${id}`);
    const ruleSet = ruleSets.get(id);
    if (ruleSet === undefined || ruleSet === null || !Array.isArray(ruleSet.entries)) {
      throw new Error(`Routing plan source ${id} is missing its rule set`);
    }
    counts.set(id, {
      id,
      policy,
      phase,
      dnsClass,
      entries: ruleSet.entries.length,
    });
  }
  return counts;
}

/**
 * Builds the canonical v1 routing-plan audit consumed by operator tools.
 * The audit is deterministic: ordered phases, source metadata, entry counts,
 * and a SHA-256 over the canonical JSON of everything except the digest.
 */
export function buildRoutingPlanAudit({ plan, ruleSets }) {
  if (!Array.isArray(plan)) throw new TypeError("Routing plan must be an array");
  if (!(ruleSets instanceof Map)) throw new TypeError("Rule sets must be a Map");
  assertNoForbiddenFields({ plan, ruleSets }, "input");
  const counts = auditSourceCounts(plan, ruleSets);
  const phases = ROUTING_PHASES.map((phase) => Object.freeze({
    phase,
    sources: Object.freeze([...counts.values()]
      .filter((record) => record.phase === phase)
      .map((record) => Object.freeze({
        id: record.id,
        policy: record.policy,
        dnsClass: record.dnsClass,
        entries: record.entries,
      }))),
  }));
  const totals = Object.freeze({
    sources: counts.size,
    entries: [...counts.values()].reduce((sum, record) => sum + record.entries, 0),
  });
  const base = Object.freeze({ schemaVersion: 1, phases, totals });
  return Object.freeze({
    ...base,
    sha256: artifactSha256(canonicalJson(base)),
  });
}

/**
 * Validates an arbitrary routing-plan audit object without weakening the
 * canonical schema: exact phase order, source records, totals, digest, and
 * a closed field set that rejects node, URL query, password, UUID, and
 * subscription material.
 */
export function validateRoutingPlanAudit(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Routing plan audit must be an object");
  }
  assertNoForbiddenFields(value, "audit");
  if (value.schemaVersion !== 1) throw new Error("Routing plan audit schemaVersion must be 1");
  if (!Array.isArray(value.phases) || value.phases.length !== ROUTING_PHASES.length) {
    throw new Error("Routing plan audit phases are missing or out of order");
  }
  let totalSources = 0;
  let totalEntries = 0;
  for (const [index, phase] of value.phases.entries()) {
    if (!phase || typeof phase !== "object" || Array.isArray(phase)) {
      throw new Error("Routing plan audit phase must be an object");
    }
    if (phase.phase !== ROUTING_PHASES[index]) {
      throw new Error(`Routing plan audit phase order mismatch at ${index}`);
    }
    if (!Array.isArray(phase.sources)) throw new Error("Routing plan audit phase sources must be an array");
    const ids = new Set();
    for (const source of phase.sources) {
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        throw new Error("Routing plan audit source must be an object");
      }
      const id = requireNonEmptyString(source.id, "Routing plan audit source id");
      if (ids.has(id)) throw new Error(`Routing plan audit duplicate source ${id}`);
      ids.add(id);
      requireNonEmptyString(source.policy, `Routing plan audit policy for ${id}`);
      requireNonEmptyString(source.dnsClass, `Routing plan audit DNS class for ${id}`);
      if (!Number.isSafeInteger(source.entries) || source.entries < 0) {
        throw new Error(`Routing plan audit entry count for ${id} is invalid`);
      }
      totalSources += 1;
      totalEntries += source.entries;
    }
  }
  if (!value.totals || typeof value.totals !== "object" || Array.isArray(value.totals)) {
    throw new Error("Routing plan audit totals are missing");
  }
  if (value.totals.sources !== totalSources || value.totals.entries !== totalEntries) {
    throw new Error("Routing plan audit totals do not match phases");
  }
  if (typeof value.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(value.sha256)) {
    throw new Error("Routing plan audit sha256 is invalid");
  }
  const base = Object.freeze({
    schemaVersion: value.schemaVersion,
    phases: value.phases,
    totals: value.totals,
  });
  if (artifactSha256(canonicalJson(base)) !== value.sha256) {
    throw new Error("Routing plan audit sha256 does not match its content");
  }
  return true;
}

function normalizeDomain(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Domain must be a non-empty string");
  }
  let domain = value.trim().toLowerCase();
  if (domain.includes("://") || domain.includes("@") || /[\s/:?#[\]]/u.test(domain)) {
    throw new TypeError("Domain must be a bare hostname without URL or credentials");
  }
  if (domain.endsWith(".")) domain = domain.slice(0, -1);
  if (!domain || domain.includes("..") || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/u.test(domain)) {
    throw new TypeError("Domain is malformed");
  }
  return domain;
}

function ipNetworkValue(version, address) {
  const width = version === 4 ? 32 : 128;
  return parseCanonicalCidr(`${address}/${width}`, version).network;
}

function cidrContains(entry, ipVersion, ipValue) {
  const version = entry.kind === RULE_KIND.ipv4Cidr ? 4 : 6;
  if (version !== ipVersion) return false;
  let cidr;
  try {
    cidr = parseCanonicalCidr(entry.value, version);
  } catch {
    return false;
  }
  const width = version === 4 ? 32 : 128;
  const hostBits = BigInt(width - cidr.prefix);
  const upper = cidr.network + (1n << hostBits) - 1n;
  return ipValue >= cidr.network && ipValue <= upper;
}

function entryMatches(entry, domain, ipVersion, ipValue) {
  switch (entry.kind) {
    case RULE_KIND.domain:
      return entry.value === domain;
    case RULE_KIND.domainSuffix:
      return domain === entry.value || domain.endsWith(`.${entry.value}`);
    case RULE_KIND.domainKeyword:
      return domain.includes(entry.value);
    case RULE_KIND.ipv4Cidr:
    case RULE_KIND.ipv6Cidr:
      return ipValue !== null && cidrContains(entry, ipVersion, ipValue);
    default:
      return false;
  }
}

/**
 * Explains the deterministic shared routing decision for a domain and an
 * optional resolved IP. Uses only normalized domain matches and canonical
 * CIDR containment over the published rule plan; never performs DNS.
 */
export function explainRoute({ domain, ip, plan, ruleSets }) {
  const normalizedDomain = normalizeDomain(domain);
  let ipVersion = null;
  let ipValue = null;
  if (ip !== undefined && ip !== null) {
    ipVersion = isIP(ip);
    if (ipVersion !== 4 && ipVersion !== 6) throw new TypeError("IP must be a valid IPv4 or IPv6 address");
    ipValue = ipNetworkValue(ipVersion, ip);
  }
  if (!Array.isArray(plan)) throw new TypeError("Routing plan must be an array");
  if (!(ruleSets instanceof Map)) throw new TypeError("Rule sets must be a Map");
  for (const record of plan) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new TypeError("Routing plan entries must be objects");
    }
    const id = requireNonEmptyString(record.id, "Routing plan source id");
    const policy = requireNonEmptyString(record.policy, `Routing plan policy for ${id}`);
    const phase = requireNonEmptyString(record.phase, `Routing plan phase for ${id}`);
    const dnsClass = requireNonEmptyString(record.dnsClass, `Routing plan DNS class for ${id}`);
    const ruleSet = ruleSets.get(id);
    if (ruleSet === undefined || ruleSet === null || !Array.isArray(ruleSet.entries)) continue;
    for (const entry of ruleSet.entries) {
      if (!entry || typeof entry !== "object" || typeof entry.kind !== "string") continue;
      if (entryMatches(entry, normalizedDomain, ipVersion, ipValue)) {
        return Object.freeze({
          domain: normalizedDomain,
          ip: ip ?? null,
          matchedPhase: phase,
          matchedSource: id,
          dnsClass,
          expectedPolicy: policy,
          needsResolution: false,
          clientExpression: CLIENT_EXPRESSIONS,
        });
      }
    }
  }
  return Object.freeze({
    domain: normalizedDomain,
    ip: ip ?? null,
    matchedPhase: null,
    matchedSource: null,
    dnsClass: null,
    expectedPolicy: POLICY_TARGETS.defaultProxy,
    needsResolution: ipVersion === null,
    clientExpression: CLIENT_EXPRESSIONS,
  });
}
