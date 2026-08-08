import { RULE_KIND, normalizeRuleEntry } from "../../../shared/rules/model.js";

export const ARRS_TYPE_ID = Object.freeze({
  [RULE_KIND.ipv4Cidr]: 0,
  [RULE_KIND.ipv6Cidr]: 1,
  [RULE_KIND.domainSuffix]: 2,
  [RULE_KIND.domainKeyword]: 3,
});

export const ARRS_ROUTING = Object.freeze({
  defaultProxy: 0,
  direct: 1,
  reject: 2,
});

function singleLine(value, label) {
  if (typeof value !== "string" || !value.trim() || value.trim() !== value || /[\r\n]/u.test(value)) {
    throw new TypeError(`${label} must be a non-empty single line`);
  }
  return value;
}

function routingId(value) {
  if (!Object.values(ARRS_ROUTING).includes(value)) throw new TypeError("Anywhere routing must be 0, 1, or 2");
  return value;
}

function provenanceLines(provenance) {
  if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
    throw new TypeError("Anywhere provenance must be an object");
  }
  const repository = singleLine(provenance.repository, "Upstream repository");
  const sourceId = singleLine(provenance.sourceId, "Upstream source ID");
  const commit = singleLine(provenance.commit, "Upstream commit");
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new TypeError("Upstream commit must be a full SHA");
  const committedAt = singleLine(provenance.committedAt, "Upstream commit time");
  if (Number.isNaN(Date.parse(committedAt))) throw new TypeError("Upstream commit time must be ISO-8601");
  const license = singleLine(provenance.license, "Upstream license");
  const changedBy = singleLine(provenance.changedBy, "Changed-by project");
  return [
    `# Upstream: ${repository}`,
    `# Source: ${sourceId}`,
    `# Commit: ${commit}`,
    `# Converted at upstream commit time: ${committedAt}`,
    `# License: ${license}`,
    `# Converted by: ${changedBy}`,
  ];
}

export function compareArrsEntries(left, right) {
  const leftType = ARRS_TYPE_ID[left.kind];
  const rightType = ARRS_TYPE_ID[right.kind];
  if (leftType !== rightType) return leftType - rightType;
  if (left.value < right.value) return -1;
  if (left.value > right.value) return 1;
  return 0;
}

export function renderArrs({ name, routing, entries, provenance }) {
  const safeName = singleLine(name, "Anywhere rule-set name");
  const safeRouting = routingId(routing);
  if (!Array.isArray(entries)) throw new TypeError("Anywhere entries must be an array");
  const normalized = entries.map((entry) => normalizeRuleEntry(entry));
  for (const entry of normalized) {
    if (!Object.hasOwn(ARRS_TYPE_ID, entry.kind)) {
      throw new TypeError("Anywhere renderer received an unsupported rule kind");
    }
  }
  normalized.sort(compareArrsEntries);
  const lines = [
    ...provenanceLines(provenance),
    `name = ${safeName}`,
    `routing = ${safeRouting}`,
    "",
    ...normalized.map((entry) => `${ARRS_TYPE_ID[entry.kind]}, ${entry.value}`),
  ];
  return `${lines.join("\n")}\n`;
}
