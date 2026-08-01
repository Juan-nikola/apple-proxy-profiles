import { readFile } from "node:fs/promises";

const rules = Object.freeze([
  {
    id: "proxy-uri",
    pattern: /(?:ss|ssr|vmess|vless|trojan|hysteria2?|tuic):\/\/[^\s"'`]+/i,
  },
  {
    id: "private-key",
    pattern: /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/,
  },
  {
    id: "credential-assignment",
    pattern: /\b(?:password|psk|private[_ -]?key|token|api[_ -]?key|secret)\b\s*[:=]\s*["']?(?:<)?[^\s,"'}\]]{16,}/i,
  },
  {
    id: "uuid-assignment",
    pattern: /\buuid\b\s*[:=]\s*(?:["']|<)?[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  },
  {
    id: "secret-query",
    pattern: /https?:\/\/[^\s"']+[?&](?:token|subscription|subscribe|sub|auth|key|password)=[^\s&"']+/i,
  },
  {
    id: "credential-high-entropy",
    matches: containsHighEntropyCredential,
  },
]);

const approvedSyntheticPlaceholders = /\b(?:TEST_ONLY[A-Z0-9_]*|DIFFERENT_TEST_VALUE|00000000-0000-4000-8000-000000000001)\b/g;
const highEntropyCredential = /\b(?:token|password|psk|private[_ -]?key|uuid|auth)\b\s*[:=]\s*(?:["'<({\[]\s*)?([A-Za-z0-9+/_-]{32,}={0,2})(?=$|[\s,;"'})\]>])/i;

function containsHighEntropyCredential(text) {
  return highEntropyCredential.test(text);
}

export function sanitizeSyntheticPlaceholders(text) {
  return text.replace(approvedSyntheticPlaceholders, "");
}

export function scanText(name, text) {
  const sanitized = sanitizeSyntheticPlaceholders(text);
  const findings = [];

  for (const rule of rules) {
    if ((rule.matches ?? ((value) => rule.pattern.test(value)))(sanitized)) {
      findings.push({ file: name, ruleId: rule.id });
    }
  }

  return findings;
}

export function containsSecret(text) {
  return scanText("<text>", text).length > 0;
}

export async function scanFiles(files) {
  const findings = [];

  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (text.includes("\0")) continue;
    findings.push(...scanText(file, text));
  }

  return findings;
}
