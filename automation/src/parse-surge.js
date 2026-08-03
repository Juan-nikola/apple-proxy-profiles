import { RULE_KIND, normalizeRuleEntry } from "../../shared/rules/model.js";

const TYPE_KIND = Object.freeze({
  DOMAIN: RULE_KIND.domain,
  "DOMAIN-SUFFIX": RULE_KIND.domainSuffix,
  "DOMAIN-KEYWORD": RULE_KIND.domainKeyword,
  "IP-CIDR": RULE_KIND.ipv4Cidr,
  "IP-CIDR6": RULE_KIND.ipv6Cidr,
  GEOIP: RULE_KIND.geoip,
  "IP-ASN": RULE_KIND.ipAsn,
  "URL-REGEX": RULE_KIND.urlRegex,
  "USER-AGENT": RULE_KIND.userAgent,
  "PROCESS-NAME": RULE_KIND.processName,
  AND: RULE_KIND.logicalAnd,
  OR: RULE_KIND.logicalOr,
});

const CONVERTIBLE = new Set([
  RULE_KIND.domainSuffix,
  RULE_KIND.domainKeyword,
  RULE_KIND.ipv4Cidr,
  RULE_KIND.ipv6Cidr,
]);

function bump(map, key) {
  map[key] = (map[key] ?? 0) + 1;
}

function unsupportedReason(kind) {
  const names = {
    [RULE_KIND.domain]: "unsupported-exact-domain",
    [RULE_KIND.geoip]: "unsupported-geoip",
    [RULE_KIND.ipAsn]: "unsupported-ip-asn",
    [RULE_KIND.urlRegex]: "unsupported-url-regex",
    [RULE_KIND.userAgent]: "unsupported-user-agent",
    [RULE_KIND.processName]: "unsupported-process-name",
    [RULE_KIND.logicalAnd]: "unsupported-and",
    [RULE_KIND.logicalOr]: "unsupported-or",
  };
  return names[kind] ?? "unsupported-kind";
}

function parseDomainSetLine(line, source, lineNumber) {
  if (line.includes(",")) throw new Error(`Rule source ${source.id}: malformed line ${lineNumber}`);
  const kind = line.startsWith(".") ? RULE_KIND.domainSuffix : RULE_KIND.domain;
  if (kind === RULE_KIND.domain) return { kind, value: line, noResolve: false, sourceId: source.id };
  try {
    return normalizeRuleEntry({ kind, value: line, sourceId: source.id });
  } catch {
    throw new Error(`Rule source ${source.id}: malformed line ${lineNumber}`);
  }
}

function parseRuleSetLine(line, source, lineNumber, diagnostics) {
  const comma = line.indexOf(",");
  if (comma < 1) throw new Error(`Rule source ${source.id}: malformed line ${lineNumber}`);
  const type = line.slice(0, comma).trim().toUpperCase();
  const kind = TYPE_KIND[type];
  if (!kind) throw new Error(`Rule source ${source.id}: unexpected type at line ${lineNumber}`);
  let value = line.slice(comma + 1).trim();
  if (!value) throw new Error(`Rule source ${source.id}: malformed line ${lineNumber}`);
  let noResolve = false;
  if (kind === RULE_KIND.ipv4Cidr
    || kind === RULE_KIND.ipv6Cidr
    || kind === RULE_KIND.ipAsn
    || kind === RULE_KIND.geoip) {
    const parts = value.split(",").map((part) => part.trim());
    value = parts.shift();
    for (const modifier of parts) {
      if (modifier.toLowerCase() !== "no-resolve") {
        throw new Error(`Rule source ${source.id}: unexpected modifier at line ${lineNumber}`);
      }
      if (!noResolve) diagnostics.ignoredModifiers.noResolve += 1;
      noResolve = true;
    }
  } else if (CONVERTIBLE.has(kind) && value.includes(",")) {
    throw new Error(`Rule source ${source.id}: malformed line ${lineNumber}`);
  }
  const entry = { kind, value, noResolve, sourceId: source.id };
  if (!CONVERTIBLE.has(kind)) return entry;
  try {
    return normalizeRuleEntry(entry);
  } catch {
    throw new Error(`Rule source ${source.id}: malformed line ${lineNumber}`);
  }
}

export function parseSurgeRules(text, source) {
  if (typeof text !== "string") throw new TypeError("Surge source text must be a string");
  if (!source || typeof source.id !== "string" || !["RULE-SET", "DOMAIN-SET"].includes(source.inputFormat)) {
    throw new TypeError("Surge source descriptor is invalid");
  }
  const lines = text.replace(/\r\n?/gu, "\n").split("\n");
  const diagnostics = {
    physicalLines: lines.length,
    comments: 0,
    blank: 0,
    candidateCount: 0,
    parsedCount: 0,
    convertibleCount: 0,
    unsupportedCount: 0,
    unsupportedByReason: {},
    ignoredModifiers: { noResolve: 0 },
  };
  const entries = [];
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line) {
      diagnostics.blank += 1;
      continue;
    }
    if (line.startsWith("#") || line.startsWith("//")) {
      diagnostics.comments += 1;
      continue;
    }
    diagnostics.candidateCount += 1;
    const entry = source.inputFormat === "DOMAIN-SET"
      ? parseDomainSetLine(line, source, index + 1)
      : parseRuleSetLine(line, source, index + 1, diagnostics);
    diagnostics.parsedCount += 1;
    if (CONVERTIBLE.has(entry.kind)) {
      diagnostics.convertibleCount += 1;
    } else {
      diagnostics.unsupportedCount += 1;
      bump(diagnostics.unsupportedByReason, unsupportedReason(entry.kind));
    }
    entries.push(entry);
  }
  if (diagnostics.candidateCount < source.minEntries) {
    throw new Error(`Rule source ${source.id}: entry count below minimum`);
  }
  if (diagnostics.parsedCount !== diagnostics.convertibleCount + diagnostics.unsupportedCount) {
    throw new Error(`Rule source ${source.id}: accounting mismatch`);
  }
  return Object.freeze({ entries: Object.freeze(entries), diagnostics: Object.freeze({
    ...diagnostics,
    unsupportedByReason: Object.freeze(diagnostics.unsupportedByReason),
    ignoredModifiers: Object.freeze(diagnostics.ignoredModifiers),
  }) });
}
