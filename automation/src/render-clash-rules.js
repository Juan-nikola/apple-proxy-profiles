import { RULE_KIND } from "../../shared/rules/model.js";
import { DOMESTIC_FALLBACK_DOMAIN_SUFFIXES } from "../../shared/rules/domestic-fallback.js";
import { renderYaml } from "../../shared/serialization/render-yaml.js";
import { renderRuleProvenance } from "./render-shadowrocket-rules.js";

const TYPE_BY_KIND = Object.freeze({
  [RULE_KIND.domain]: "DOMAIN",
  [RULE_KIND.domainSuffix]: "DOMAIN-SUFFIX",
  [RULE_KIND.domainKeyword]: "DOMAIN-KEYWORD",
  [RULE_KIND.ipv4Cidr]: "IP-CIDR",
  [RULE_KIND.ipv6Cidr]: "IP-CIDR6",
});
const OMITTED = new Set([RULE_KIND.processName, RULE_KIND.geoip, RULE_KIND.logicalAnd, RULE_KIND.logicalOr]);

export function renderClashRuleSource({ source, parsed, fetched, upstream }) {
  renderRuleProvenance({ source, upstream, outputCount: parsed?.diagnostics?.parsedCount ?? 0 });
  if (!parsed || !Array.isArray(parsed.entries) || !parsed.diagnostics || !fetched || typeof fetched.text !== "string") {
    throw new TypeError("Clash rule source input is malformed");
  }
  const payload = [];
  const omittedByKind = {};
  for (const entry of parsed.entries) {
    const type = TYPE_BY_KIND[entry.kind];
    if (type) {
      payload.push(type + "," + entry.value + ((entry.kind === RULE_KIND.ipv4Cidr || entry.kind === RULE_KIND.ipv6Cidr) ? ",no-resolve" : ""));
    } else if (OMITTED.has(entry.kind)) {
      omittedByKind[entry.kind] = (omittedByKind[entry.kind] ?? 0) + 1;
    } else {
      throw new Error("Rule source " + source.id + ": unsupported Clash rule kind " + entry.kind);
    }
  }
  if (source.id === "ChinaMax_Domain") payload.push(...DOMESTIC_FALLBACK_DOMAIN_SUFFIXES.map((value) => "DOMAIN-SUFFIX," + value));
  const header = renderRuleProvenance({ source, upstream, outputCount: payload.length, omittedCount: Object.values(omittedByKind).reduce((sum, value) => sum + value, 0) });
  return Object.freeze({
    content: header.join("\n") + "\n" + renderYaml({ payload }),
    counts: Object.freeze({ input: parsed.diagnostics.candidateCount, parsed: parsed.diagnostics.parsedCount, output: payload.length, omitted: Object.values(omittedByKind).reduce((sum, value) => sum + value, 0), omittedByKind: Object.freeze(omittedByKind) }),
  });
}

