import { RULE_KIND } from "../../shared/rules/model.js";
import { renderYaml } from "../../shared/serialization/render-yaml.js";
import { renderRuleProvenance } from "./render-shadowrocket-rules.js";

const TYPE_BY_KIND = Object.freeze({
  [RULE_KIND.domain]: "domain_set",
  [RULE_KIND.domainSuffix]: "domain_suffix_set",
  [RULE_KIND.domainKeyword]: "domain_keyword_set",
  [RULE_KIND.ipv4Cidr]: "ip_cidr_set",
  [RULE_KIND.ipv6Cidr]: "ip_cidr6_set",
  [RULE_KIND.ipAsn]: "asn_set",
  [RULE_KIND.urlRegex]: "url_regex_set",
  [RULE_KIND.userAgent]: "user_agent_set",
});

const OMITTED_KINDS = Object.freeze([
  RULE_KIND.processName,
  RULE_KIND.geoip,
  RULE_KIND.logicalAnd,
  RULE_KIND.logicalOr,
]);

const OMITTED_KIND_SET = new Set(OMITTED_KINDS);
const TYPE_NAMES = Object.freeze(Object.values(TYPE_BY_KIND));

function bump(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function validateInputs({ source, parsed, fetched, upstream }) {
  // The Shadowrocket renderer performs the shared provenance and accounting
  // checks without exposing its source-preserving content here.
  renderShadowrocketRuleSourceForValidation({ source, parsed, fetched, upstream });
}

function renderShadowrocketRuleSourceForValidation(input) {
  const { source, parsed, fetched, upstream } = input;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("Egern rule source is required");
  }
  if (!parsed || !Array.isArray(parsed.entries) || !parsed.diagnostics) {
    throw new TypeError("Parsed Surge rules are required");
  }
  if (!fetched || typeof fetched.text !== "string") {
    throw new TypeError("Fetched Surge source is required");
  }
  if (!upstream || typeof upstream !== "object" || Array.isArray(upstream)) {
    throw new TypeError("Rule provenance is required");
  }
  renderRuleProvenance({
    source,
    upstream,
    outputCount: parsed.diagnostics.parsedCount,
  });
  if (upstream.license !== "GPL-2.0-only" || !/^[0-9a-f]{40}$/u.test(upstream.commit)) {
    throw new TypeError("Invalid Egern rule provenance");
  }
  if (parsed.entries.length !== parsed.diagnostics.parsedCount
    || parsed.diagnostics.parsedCount !== parsed.diagnostics.candidateCount) {
    throw new Error(`Rule source ${source.id}: parsed entry accounting mismatch`);
  }
}

export function renderEgernRuleSource({ source, parsed, fetched, upstream }) {
  validateInputs({ source, parsed, fetched, upstream });
  const document = Object.fromEntries(TYPE_NAMES.map((type) => [type, []]));
  const emittedByType = Object.fromEntries(TYPE_NAMES.map((type) => [type, 0]));
  const omittedByKind = Object.fromEntries(OMITTED_KINDS.map((kind) => [kind, 0]));

  for (const entry of parsed.entries) {
    const type = TYPE_BY_KIND[entry.kind];
    if (type) {
      document[type].push(entry.value);
      emittedByType[type] += 1;
      continue;
    }
    if (OMITTED_KIND_SET.has(entry.kind)) {
      omittedByKind[entry.kind] += 1;
      continue;
    }
    throw new Error(`Rule source ${source.id}: unsupported Egern rule kind ${entry.kind}`);
  }

  const outputCount = Object.values(emittedByType).reduce((sum, count) => sum + count, 0);
  const omittedCount = Object.values(omittedByKind).reduce((sum, count) => sum + count, 0);
  if (outputCount + omittedCount !== parsed.diagnostics.parsedCount) {
    throw new Error(`Rule source ${source.id}: Egern output accounting mismatch`);
  }

  const header = renderRuleProvenance({ source, upstream, outputCount, omittedCount });
  const content = `${header.join("\n")}\n${renderYaml(document)}`;
  const counts = Object.freeze({
    input: parsed.diagnostics.candidateCount,
    parsed: parsed.diagnostics.parsedCount,
    output: outputCount,
    omitted: omittedCount,
    emittedByType: Object.freeze(emittedByType),
    omittedByKind: Object.freeze(omittedByKind),
  });
  return Object.freeze({ content, counts });
}
