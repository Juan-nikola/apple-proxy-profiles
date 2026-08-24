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

function valueEntry(raw, category, sourceId, diagnostics) {
  const value = stripComment(raw).replace(/^['"]|['"]$/gu, "");
  const separator = value.indexOf(":");
  const marker = separator > 0 ? value.slice(0, separator).toLowerCase() : "domain";
  const rawContent = separator > 0 ? value.slice(separator + 1).trim() : value;
  const attributeIndex = rawContent.indexOf(":@");
  const content = (attributeIndex === -1 ? rawContent : rawContent.slice(0, attributeIndex)).trim();
  const kinds = { domain: RULE_KIND.domainSuffix, "domain-suffix": RULE_KIND.domainSuffix, full: RULE_KIND.domain, keyword: RULE_KIND.domainKeyword };
  if (!kinds[marker]) {
    diagnostics.unsupportedCount += 1;
    const reason = marker === "regexp" ? "unsupported-domain-regex" : `unsupported-domain-${marker}`;
    diagnostics.unsupportedByReason[reason] = (diagnostics.unsupportedByReason[reason] ?? 0) + 1;
    return null;
  }
  if (!content) throw new Error(`External source ${sourceId}: malformed domain record`);
  const entry = normalizeRuleEntry({ kind: kinds[marker], value: content, sourceId });
  return { ...entry, category, categoryId: category };
}

export function parseV2flyDomainList({ text, sourceId }) {
  const lines = text.toString().replace(/\r\n?/gu, "\n").split("\n");
  const entries = [];
  const categories = [];
  const diagnostics = { candidateCount: 0, parsedCount: 0, unsupportedCount: 0, unsupportedByReason: {}, comments: 0 };
  let category = null;
  let listsDocument = false;
  let comments = 0;
  for (const raw of lines) {
    const line = stripComment(raw);
    if (!line) continue;
    if (/^lists:\s*$/u.test(line)) {
      listsDocument = true;
      continue;
    }
    if (listsDocument) {
      const name = /^\s*-\s+name:\s*(.+)$/u.exec(line);
      if (name) {
        category = name[1].trim().replace(/^['"]|['"]$/gu, "");
        if (!category) throw new Error(`External source ${sourceId}: malformed category`);
        categories.push({ id: category, sourceId });
        continue;
      }
      if (/^\s*(?:length|rules):(?:\s|$)/u.test(line)) continue;
      const item = /^\s*-\s+(.+)$/u.exec(line);
      if (!item) throw new Error(`External source ${sourceId}: malformed category record`);
      if (!category) throw new Error(`External source ${sourceId}: malformed category record`);
      diagnostics.candidateCount += 1;
      const parsed = valueEntry(item[1], category, sourceId, diagnostics);
      if (parsed) {
        entries.push(parsed);
        diagnostics.parsedCount += 1;
      }
      continue;
    }
    if (line.startsWith("#")) { comments += 1; continue; }
    if (!raw.startsWith(" ") && !raw.startsWith("\t") && line.endsWith(":")) {
      category = line.slice(0, -1).trim().replace(/^['"]|['"]$/gu, "");
      if (!category) throw new Error(`External source ${sourceId}: malformed category`);
      categories.push({ id: category, sourceId });
      continue;
    }
    const item = line.replace(/^-\s*/u, "");
    if (!category || !item) throw new Error(`External source ${sourceId}: malformed category record`);
    diagnostics.candidateCount += 1;
    const parsed = valueEntry(item, category, sourceId, diagnostics);
    if (parsed) {
      entries.push(parsed);
      diagnostics.parsedCount += 1;
    }
  }
  diagnostics.comments = comments;
  return { entries, categories, diagnostics };
}
