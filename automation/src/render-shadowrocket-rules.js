function requiredSingleLine(value, label) {
  if (typeof value !== "string" || !value.trim() || value.trim() !== value || /[\r\n]/u.test(value)) {
    throw new TypeError(`${label} must be a non-empty single line`);
  }
  return value;
}

function validateInputs({ source, parsed, fetched, upstream }) {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new TypeError("Shadowrocket rule source is required");
  }
  requiredSingleLine(source.id, "Rule source ID");
  requiredSingleLine(source.canonicalPath, "Rule source path");
  if (!parsed || !Array.isArray(parsed.entries) || !parsed.diagnostics) {
    throw new TypeError("Parsed Surge rules are required");
  }
  if (!fetched || typeof fetched.text !== "string") {
    throw new TypeError("Fetched Surge source is required");
  }
  if (!upstream || typeof upstream !== "object" || Array.isArray(upstream)) {
    throw new TypeError("Rule provenance is required");
  }
  requiredSingleLine(upstream.repository, "Upstream repository");
  if (!/^[0-9a-f]{40}$/u.test(upstream.commit)) {
    throw new TypeError("Upstream commit must be a full SHA");
  }
  requiredSingleLine(upstream.committedAt, "Upstream commit time");
  requiredSingleLine(upstream.license, "Upstream license");
  if (!(upstream.license === "GPL-2.0-only" || upstream.license === "GPL-3.0")) {
    throw new TypeError("Upstream license must be GPL-2.0-only or GPL-3.0");
  }
  if (parsed.entries.length !== parsed.diagnostics.parsedCount) {
    throw new Error(`Rule source ${source.id}: parsed entry accounting mismatch`);
  }
  if (parsed.diagnostics.parsedCount !== parsed.diagnostics.candidateCount) {
    throw new Error(`Rule source ${source.id}: parsed candidate accounting mismatch`);
  }
}

export function renderRuleProvenance({ source, upstream, outputCount, omittedCount = 0 }) {
  return [
    `# Upstream: ${upstream.repository}`,
    `# Path: ${source.canonicalPath}`,
    `# Commit: ${upstream.commit}`,
    `# Committed at: ${upstream.committedAt}`,
    `# License: ${upstream.license}`,
    "# Changed by: Juan-nikola/apple-proxy-profiles",
    `# Output entries: ${outputCount}`,
    `# Omitted entries: ${omittedCount}`,
  ];
}

function normalizedSourceText(text) {
  const normalized = text.replace(/\r\n?/gu, "\n").replace(/\n+$/u, "");
  return normalized ? `${normalized}\n` : "";
}

/**
 * Publishes the pinned Surge input without rebuilding it from parsed entries.
 * This retains comments, rule ordering, spelling, and modifiers needed by
 * Shadowrocket while still normalizing transport newlines.
 */
export function renderShadowrocketRuleSource({ source, parsed, fetched, upstream }) {
  validateInputs({ source, parsed, fetched, upstream });
  const outputCount = parsed.diagnostics.candidateCount;
  const header = renderRuleProvenance({ source, upstream, outputCount });
  const body = normalizedSourceText(fetched.text);
  const content = `${header.join("\n")}\n${body}`;
  const counts = Object.freeze({
    input: parsed.diagnostics.candidateCount,
    parsed: parsed.diagnostics.parsedCount,
    output: outputCount,
    omitted: 0,
  });
  return Object.freeze({ content, counts });
}
