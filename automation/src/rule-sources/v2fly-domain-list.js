import { RULE_KIND, normalizeRuleEntry } from "../../../shared/rules/model.js";

function bump(map, key) { map[key] = (map[key] ?? 0) + 1; }

function stripComment(value) {
  let quote = null;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if ((char === "'" || char === '"') && (!quote || quote === char)) quote = quote ? null : char;
    if (char === "#" && !quote && (i === 0 || /\s/u.test(value[i - 1]))) return value.slice(0, i).trim();
  }
  return value.trim();
}

function valueEntry(raw, category, sourceId) {
  const value = stripComment(raw).replace(/^['"]|['"]$/gu, "");
  const separator = value.indexOf(":");
  const marker = separator > 0 ? value.slice(0, separator).toLowerCase() : "domain";
  const content = separator > 0 ? value.slice(separator + 1).trim() : value;
  const kinds = { domain: RULE_KIND.domainSuffix, "domain-suffix": RULE_KIND.domainSuffix, full: RULE_KIND.domain, keyword: RULE_KIND.domainKeyword };
  if (!kinds[marker] || !content) throw new Error(`External source ${sourceId}: malformed domain record`);
  const entry = normalizeRuleEntry({ kind: kinds[marker], value: content, sourceId });
  return { ...entry, category, categoryId: category };
}

export function parseV2flyDomainList({ text, sourceId }) {
  const lines = text.toString().replace(/\r\n?/gu, "\n").split("\n");
  const entries = [];
  const categories = [];
  let category = null;
  let candidateCount = 0;
  let comments = 0;
  for (const raw of lines) {
    const line = stripComment(raw);
    if (!line) continue;
    if (line.startsWith("#")) { comments += 1; continue; }
    if (!raw.startsWith(" ") && !raw.startsWith("\t") && line.endsWith(":")) {
      category = line.slice(0, -1).trim().replace(/^['"]|['"]$/gu, "");
      if (!category) throw new Error(`External source ${sourceId}: malformed category`);
      categories.push({ id: category, sourceId });
      continue;
    }
    const item = line.replace(/^-\s*/u, "");
    if (!category || !item) throw new Error(`External source ${sourceId}: malformed category record`);
    candidateCount += 1;
    entries.push(valueEntry(item, category, sourceId));
  }
  return { entries, categories, diagnostics: { candidateCount, parsedCount: entries.length, unsupportedCount: 0, unsupportedByReason: {}, comments } };
}
