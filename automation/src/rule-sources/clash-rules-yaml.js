import { isIP } from "node:net";

import { RULE_KIND, normalizeRuleEntry } from "../../../shared/rules/model.js";

function bump(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function unquoteScalar(raw, lineNumber) {
  const value = raw.trim();
  if (value.length < 1) throw new Error("Clash rules payload is malformed at line " + lineNumber);
  const quote = value[0];
  if (quote !== "'" && quote !== '"') {
    if (/[\r\n#]/u.test(value) || value.includes(": ")) {
      throw new Error("Clash rules payload is malformed at line " + lineNumber);
    }
    return value;
  }
  if ((quote !== "'" && quote !== '"') || value.at(-1) !== quote) {
    throw new Error("Clash rules payload is malformed at line " + lineNumber);
  }
  if (quote === "'" && value.slice(1, -1).includes("'")) {
    throw new Error("Clash rules payload is malformed at line " + lineNumber);
  }
  if (quote === '"') {
    try { return JSON.parse(value); } catch { throw new Error("Clash rules payload is malformed at line " + lineNumber); }
  }
  return value.slice(1, -1);
}

function parsePayloadLines(text) {
  if (typeof text !== "string" || !text.trim()) throw new TypeError("Clash rules payload text is required");
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  if (lines[0].trim() !== "payload:") throw new Error("Clash rules payload must start with payload");
  const values = [];
  for (const [index, raw] of lines.slice(1).entries()) {
    const lineNumber = index + 2;
    if (!raw.trim()) continue;
    if (!/^  -\s/u.test(raw)) throw new Error("Clash rules payload is malformed at line " + lineNumber);
    values.push(unquoteScalar(raw.replace(/^  -\s*/u, ""), lineNumber));
  }
  if (values.length === 0) throw new Error("Clash rules payload must contain at least one item");
  return values;
}

function parseRule(value, sourceId) {
  const [operator, ...parts] = value.split(",");
  const normalizedOperator = operator.trim().toUpperCase();
  const argument = parts.join(",").trim();
  if (parts.length === 0 || !argument) return null;
  const mapping = {
    DOMAIN: RULE_KIND.domain,
    "DOMAIN-SUFFIX": RULE_KIND.domainSuffix,
    "DOMAIN-KEYWORD": RULE_KIND.domainKeyword,
    "IP-CIDR": RULE_KIND.ipv4Cidr,
    "IP-CIDR6": RULE_KIND.ipv6Cidr,
    "PROCESS-NAME": RULE_KIND.processName,
  };
  const kind = mapping[normalizedOperator];
  if (!kind) return { unsupported: "unsupported-" + normalizedOperator.toLowerCase().replace(/[^a-z0-9]+/gu, "-") };
  const valuePart = argument.split(",", 1)[0];
  if (kind === RULE_KIND.ipv4Cidr && isIP(valuePart.split("/", 1)[0]) !== 4) {
    throw new Error("Clash rules payload contains an invalid IPv4 rule for " + sourceId);
  }
  if (kind === RULE_KIND.ipv6Cidr && isIP(valuePart.split("/", 1)[0]) !== 6) {
    throw new Error("Clash rules payload contains an invalid IPv6 rule for " + sourceId);
  }
  return normalizeRuleEntry({ kind, value: valuePart, noResolve: kind === RULE_KIND.ipv4Cidr || kind === RULE_KIND.ipv6Cidr, sourceId });
}

export function parseClashRulesYaml({ text, sourceId } = {}) {
  if (typeof sourceId !== "string" || !sourceId.trim()) throw new TypeError("Clash rules sourceId is required");
  const values = parsePayloadLines(text);
  const entries = [];
  const unsupportedByReason = {};
  let unsupportedCount = 0;
  for (const value of values) {
    const bare = value.trim();
    let parsed;
    const ipVersion = isIP(bare.split("/", 1)[0]);
    if (ipVersion === 4) parsed = normalizeRuleEntry({ kind: RULE_KIND.ipv4Cidr, value: bare, noResolve: true, sourceId });
    else if (ipVersion === 6) parsed = normalizeRuleEntry({ kind: RULE_KIND.ipv6Cidr, value: bare, noResolve: true, sourceId });
    else if (bare.startsWith("+.")) parsed = normalizeRuleEntry({ kind: RULE_KIND.domainSuffix, value: bare.slice(2), sourceId });
    else if (/^[A-Za-z0-9_.*-]+(?:\.[A-Za-z0-9_.*-]+)*$/u.test(bare)) parsed = normalizeRuleEntry({ kind: RULE_KIND.domainSuffix, value: bare, sourceId });
    else parsed = parseRule(bare, sourceId);
    if (parsed?.unsupported) {
      unsupportedCount += 1;
      bump(unsupportedByReason, parsed.unsupported);
    } else if (parsed) {
      entries.push(parsed);
    } else {
      unsupportedCount += 1;
      bump(unsupportedByReason, "malformed-rule");
    }
  }
  const seen = new Set();
  let duplicates = 0;
  for (const entry of entries) {
    const key = entry.kind + "\0" + entry.value;
    if (seen.has(key)) duplicates += 1;
    seen.add(key);
  }
  return Object.freeze({
    sourceId,
    entries: Object.freeze(entries),
    categories: Object.freeze([{ id: sourceId, sourceId }]),
    diagnostics: Object.freeze({ candidateCount: values.length, parsedCount: entries.length, unsupportedCount, unsupportedByReason: Object.freeze(unsupportedByReason), duplicates }),
  });
}
