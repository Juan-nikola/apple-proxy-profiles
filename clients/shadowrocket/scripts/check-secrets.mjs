import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { resolve } from "node:path";

const execFileAsync = promisify(execFile);
const patterns = Object.freeze([
  /(?:ss|ssr|vmess|vless|trojan|hysteria2?|tuic):\/\/[^\s"'`]+/i,
  /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/,
  /\b(?:password|psk|private[_ -]?key|token|api[_ -]?key|secret)\b\s*[:=]\s*["']?[^\s,"'}\]]{16,}/i,
  /\buuid\b\s*[:=]\s*(?:["']|<)?[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /https?:\/\/[^\s"']+[?&](?:token|subscription|subscribe|sub|auth|key|password)=[^\s&"']+/i,
]);

const approvedSyntheticPlaceholders = /\b(?:TEST_ONLY[A-Z0-9_]*|DIFFERENT_TEST_VALUE|00000000-0000-4000-8000-000000000001)\b/g;

export function sanitizeSyntheticPlaceholders(line) {
  return line.replace(approvedSyntheticPlaceholders, "");
}

export function containsSecret(line) {
  const sanitized = sanitizeSyntheticPlaceholders(line);
  return patterns.some((pattern) => pattern.test(sanitized));
}

export async function scanFiles(files) {
  const findings = [];
  for (const file of files) {
    const contents = await readFile(file);
    const text = contents.toString("utf8");
    if (text.includes("\0")) continue;
    if (text.split(/\r?\n/).some(containsSecret)) findings.push(file);
  }
  return findings;
}

async function main() {
  const { stdout } = await execFileAsync("git", ["ls-files", "-co", "--exclude-standard"]);
  const files = stdout.split("\n").filter((file) => file && file !== "package-lock.json");
  const findings = await scanFiles(files);

  if (findings.length > 0) {
    for (const file of findings) console.error(`SECRET ${file}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${files.length} files scanned; no secrets found`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
