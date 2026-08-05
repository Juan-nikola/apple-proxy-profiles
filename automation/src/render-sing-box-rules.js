import { RULE_KIND } from "../../shared/rules/model.js";
import { canonicalJson } from "./render-anywhere-rules.js";

export const SING_BOX_RULE_SET_VERSION = 5;

const TYPE_BY_KIND = Object.freeze({
  [RULE_KIND.domain]: "domain",
  [RULE_KIND.domainSuffix]: "domain_suffix",
  [RULE_KIND.domainKeyword]: "domain_keyword",
  [RULE_KIND.ipv4Cidr]: "ip_cidr",
  [RULE_KIND.ipv6Cidr]: "ip_cidr6",
});

export function renderSingBoxRuleSource({ source, parsed, fetched, upstream }) {
  if (!source || typeof source.id !== "string") throw new TypeError("sing-box rule source is required");
  if (!parsed || !Array.isArray(parsed.entries) || !parsed.diagnostics) throw new TypeError("Parsed Surge rules are required");
  if (!fetched || typeof fetched.text !== "string") throw new TypeError("Fetched Surge source is required");
  if (!upstream || typeof upstream.commit !== "string") throw new TypeError("Rule provenance is required");

  const rules = [];
  const omittedByKind = {};
  const emittedByKind = {};
  for (const entry of parsed.entries) {
    const type = TYPE_BY_KIND[entry.kind];
    if (!type) {
      omittedByKind[entry.kind] = (omittedByKind[entry.kind] ?? 0) + 1;
      continue;
    }
    rules.push({ [type]: [entry.value] });
    emittedByKind[entry.kind] = (emittedByKind[entry.kind] ?? 0) + 1;
  }
  const counts = Object.freeze({
    input: parsed.diagnostics.candidateCount,
    parsed: parsed.diagnostics.parsedCount,
    output: rules.length,
    omitted: parsed.entries.length - rules.length,
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
