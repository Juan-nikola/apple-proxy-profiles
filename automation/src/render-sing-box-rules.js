import { RULE_KIND } from "../../shared/rules/model.js";
import { canonicalJson } from "./render-anywhere-rules.js";

export const SING_BOX_RULE_SET_VERSION = 5;

const TYPE_BY_KIND = Object.freeze({
  [RULE_KIND.domain]: "domain",
  [RULE_KIND.domainSuffix]: "domain_suffix",
  [RULE_KIND.domainKeyword]: "domain_keyword",
  [RULE_KIND.ipv4Cidr]: "ip_cidr",
  [RULE_KIND.ipv6Cidr]: "ip_cidr",
});

export function renderSingBoxRuleSource({ source, parsed, fetched, upstream }) {
  if (!source || typeof source.id !== "string") throw new TypeError("sing-box rule source is required");
  if (!parsed || !Array.isArray(parsed.entries) || !parsed.diagnostics) throw new TypeError("Parsed Surge rules are required");
  if (!fetched || typeof fetched.text !== "string") throw new TypeError("Fetched Surge source is required");
  if (!upstream || typeof upstream.commit !== "string") throw new TypeError("Rule provenance is required");

  const valuesByType = new Map();
  const omittedByKind = {};
  const emittedByKind = {};
  for (const entry of parsed.entries) {
    const type = TYPE_BY_KIND[entry.kind];
    if (!type) {
      omittedByKind[entry.kind] = (omittedByKind[entry.kind] ?? 0) + 1;
      continue;
    }
    const values = valuesByType.get(type) ?? [];
    values.push(entry.value);
    valuesByType.set(type, values);
    emittedByKind[entry.kind] = (emittedByKind[entry.kind] ?? 0) + 1;
  }
  // Entries sharing a matcher type are one OR expression. Grouping them
  // avoids one runtime rule object per domain or CIDR on iOS.
  const rules = [...new Set(Object.values(TYPE_BY_KIND))]
    .filter((type) => valuesByType.has(type))
    .map((type) => ({ [type]: valuesByType.get(type) }));
  const outputEntries = [...valuesByType.values()].reduce((total, values) => total + values.length, 0);
  const counts = Object.freeze({
    input: parsed.diagnostics.candidateCount,
    parsed: parsed.diagnostics.parsedCount,
    output: outputEntries,
    runtimeRules: rules.length,
    omitted: parsed.entries.length - outputEntries,
    emittedByKind: Object.freeze(emittedByKind),
    omittedByKind: Object.freeze(omittedByKind),
    sourceSha256: fetched.sourceSha256,
    upstreamCommit: upstream.commit,
  });
  return Object.freeze({
    content: canonicalJson({ version: SING_BOX_RULE_SET_VERSION, rules }),
    counts,
  });
}
