import {
  RULE_KIND,
  normalizeRuleEntry,
  parseCanonicalCidr,
} from "../../../shared/rules/model.js";

const SUPPORTED = new Set([
  RULE_KIND.domainSuffix,
  RULE_KIND.domainKeyword,
  RULE_KIND.ipv4Cidr,
  RULE_KIND.ipv6Cidr,
]);

function bump(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function unsupportedReason(kind) {
  if (kind === RULE_KIND.domain) return "unsupported-exact-domain";
  return `unsupported-${String(kind).replace(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)}`;
}

function cidrKey(cidr) {
  return `${cidr.prefix}:${cidr.network.toString(16)}`;
}

function ancestorCidr(candidate, prefix) {
  const width = candidate.version === 4 ? 32 : 128;
  const hostBits = BigInt(width - prefix);
  return {
    ...candidate,
    prefix,
    network: hostBits === 0n ? candidate.network : (candidate.network >> hostBits) << hostBits,
  };
}

function createCoverageIndex() {
  return {
    exact: new Set(),
    suffixes: new Set(),
    keywords: [],
    cidrs: { 4: new Set(), 6: new Set() },
  };
}

function findCoveringRelation(index, candidate) {
  if (index.exact.has(`${candidate.kind}\0${candidate.value}`)) return "duplicate";
  if (candidate.kind === RULE_KIND.domainSuffix) {
    const labels = candidate.value.split(".");
    for (let offset = 1; offset < labels.length; offset += 1) {
      if (index.suffixes.has(labels.slice(offset).join("."))) return "shadowed-suffix";
    }
    if (index.keywords.some((keyword) => candidate.value.includes(keyword))) {
      return "shadowed-by-keyword";
    }
  }
  if (candidate.kind === RULE_KIND.domainKeyword
    && index.keywords.some((keyword) => candidate.value.includes(keyword))) {
    return "shadowed-keyword";
  }
  if (candidate.cidr) {
    const family = index.cidrs[candidate.cidr.version];
    for (let prefix = candidate.cidr.prefix; prefix >= 0; prefix -= 1) {
      const ancestor = ancestorCidr(candidate.cidr, prefix);
      if (family.has(cidrKey(ancestor))) return "shadowed-cidr";
    }
  }
  return null;
}

function addToCoverageIndex(index, candidate) {
  index.exact.add(`${candidate.kind}\0${candidate.value}`);
  if (candidate.kind === RULE_KIND.domainSuffix) index.suffixes.add(candidate.value);
  if (candidate.kind === RULE_KIND.domainKeyword) index.keywords.push(candidate.value);
  if (candidate.cidr) index.cidrs[candidate.cidr.version].add(cidrKey(candidate.cidr));
}

function validateRuleSet(ruleSet, index) {
  if (!ruleSet || typeof ruleSet !== "object" || Array.isArray(ruleSet)) {
    throw new TypeError(`Anywhere rule set ${index} must be an object`);
  }
  if (typeof ruleSet.id !== "string" || !ruleSet.id.trim()) {
    throw new TypeError(`Anywhere rule set ${index} must have an id`);
  }
  if (typeof ruleSet.policy !== "string" || !ruleSet.policy.trim()) {
    throw new TypeError(`Anywhere rule set ${index} must have a policy`);
  }
  if (!Number.isSafeInteger(ruleSet.priority) || ruleSet.priority < 0) {
    throw new TypeError(`Anywhere rule set ${index} must have a non-negative integer priority`);
  }
  if (!Array.isArray(ruleSet.entries)) {
    throw new TypeError(`Anywhere rule set ${index} entries must be an array`);
  }
}

export function compileAnywhereRuleSets(ruleSets) {
  if (!Array.isArray(ruleSets)) throw new TypeError("Anywhere rule sets must be an array");
  const diagnostics = {
    duplicates: {},
    shadowed: {},
    unsupported: {},
    unresolved: {},
  };
  const coverage = createCoverageIndex();
  const compiled = [];
  let priorPriority = -1;

  for (const [index, ruleSet] of ruleSets.entries()) {
    validateRuleSet(ruleSet, index);
    if (ruleSet.priority <= priorPriority) {
      bump(diagnostics.unresolved, "non-unique-priority");
      continue;
    }
    priorPriority = ruleSet.priority;
    const entries = [];

    for (const rawEntry of ruleSet.entries) {
      if (!rawEntry || typeof rawEntry !== "object" || Array.isArray(rawEntry)) {
        throw new TypeError("Anywhere rule entry must be an object");
      }
      if (!SUPPORTED.has(rawEntry.kind)) {
        bump(diagnostics.unsupported, unsupportedReason(rawEntry.kind));
        continue;
      }
      const entry = normalizeRuleEntry({ ...rawEntry, sourceId: rawEntry.sourceId ?? ruleSet.id });
      const candidate = {
        ...entry,
        policy: ruleSet.policy,
        cidr: entry.kind === RULE_KIND.ipv4Cidr
          ? parseCanonicalCidr(entry.value, 4)
          : entry.kind === RULE_KIND.ipv6Cidr
            ? parseCanonicalCidr(entry.value, 6)
            : null,
      };
      const relation = findCoveringRelation(coverage, candidate);
      if (relation) {
        bump(
          relation === "duplicate" ? diagnostics.duplicates : diagnostics.shadowed,
          candidate.sourceId,
        );
        continue;
      }
      addToCoverageIndex(coverage, candidate);
      entries.push(entry);
    }
    compiled.push(Object.freeze({ ...ruleSet, entries: Object.freeze(entries) }));
  }

  const unresolvedCount = Object.values(diagnostics.unresolved).reduce((sum, count) => sum + count, 0);
  if (unresolvedCount > 0) {
    throw new Error(`Anywhere rule precedence has ${unresolvedCount} unresolved conflict(s)`);
  }
  return Object.freeze({
    ruleSets: Object.freeze(compiled),
    diagnostics: Object.freeze({
      duplicates: Object.freeze(diagnostics.duplicates),
      shadowed: Object.freeze(diagnostics.shadowed),
      unsupported: Object.freeze(diagnostics.unsupported),
      unresolved: Object.freeze(diagnostics.unresolved),
    }),
  });
}
