import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { RULE_CATALOG } from "../src/rule-catalog.js";
import { isValidRuleLine, isValidRuleTarget } from "../src/rule-validator.js";

export { isValidRuleLine };

export function isValidDomainSetLine(line) {
  if (typeof line !== "string" || !line || line.trim() !== line || /[\r\n,*/]/.test(line)) return false;
  const domain = line.startsWith(".") ? line.slice(1) : line;
  return isValidRuleTarget("DOMAIN-SUFFIX", domain);
}

const timeoutMs = 20_000;
const userAgent = "shadowrocket-profile-rule-check/1.0";
export async function checkRule(rule) {
  const response = await fetch(rule.url, {
    headers: { "user-agent": userAgent },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "text/plain") {
    throw new Error(`unexpected content-type: ${contentType || "(missing)"}`);
  }
  const entries = (await response.text()).replaceAll("\r\n", "\n").split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//"));
  if (entries.length < rule.minEntries) {
    throw new Error(`only ${entries.length} entries; requires at least ${rule.minEntries}`);
  }
  const validator = rule.type === "DOMAIN-SET" ? isValidDomainSetLine : isValidRuleLine;
  if (entries.some((line) => !validator(line))) throw new Error(`invalid Shadowrocket ${rule.type ?? "RULE-SET"} line`);
}

async function main() {
  const results = await Promise.allSettled(RULE_CATALOG.map(async (rule) => ({ rule, result: await checkRule(rule) })));
  const failures = results.flatMap((result, index) => result.status === "rejected"
    ? [`${RULE_CATALOG[index].id}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
    : []);

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${RULE_CATALOG.length} rule sets`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
