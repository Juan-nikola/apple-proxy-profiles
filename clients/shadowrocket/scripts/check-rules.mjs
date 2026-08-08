import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  FETCH_SOURCE_CATALOG,
  pinnedRawUrl,
} from "../../../automation/src/source-catalog.js";
import { isValidRuleLine, isValidRuleTarget } from "../src/rule-validator.js";

export { isValidRuleLine };

export function isValidDomainSetLine(line) {
  if (typeof line !== "string" || !line || line.trim() !== line || /[\r\n,*/]/.test(line)) return false;
  const domain = line.startsWith(".") ? line.slice(1) : line;
  return isValidRuleTarget("DOMAIN-SUFFIX", domain);
}

const timeoutMs = 20_000;
const userAgent = "shadowrocket-profile-rule-check/1.0";
export const RULE_CHECK_CATALOG = Object.freeze(FETCH_SOURCE_CATALOG.map((source) => Object.freeze({
  ...source,
  upstreamUrl: pinnedRawUrl(source),
})));

export async function checkRule(rule, { fetchImpl = globalThis.fetch } = {}) {
  if (!rule || typeof rule.upstreamUrl !== "string" || !rule.upstreamUrl.startsWith("https://")) {
    throw new Error("rule upstream URL is unavailable");
  }
  if (typeof fetchImpl !== "function") throw new Error("fetch is unavailable");
  const response = await fetchImpl(rule.upstreamUrl, {
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
  const validator = rule.inputFormat === "DOMAIN-SET" ? isValidDomainSetLine : isValidRuleLine;
  if (entries.some((line) => !validator(line))) {
    throw new Error(`invalid Shadowrocket ${rule.inputFormat ?? "RULE-SET"} line`);
  }
}

export async function checkCatalog(catalog = RULE_CHECK_CATALOG, options = {}) {
  if (!Array.isArray(catalog) || catalog.length === 0) throw new Error("Rule check catalog is empty");
  const results = await Promise.allSettled(catalog.map(async (rule) => ({
    rule,
    result: await checkRule(rule, options),
  })));
  const failures = results.flatMap((result, index) => result.status === "rejected"
    ? [`${catalog[index]?.id ?? "unknown"}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`]
    : []);
  return Object.freeze({ checked: catalog.length, failures: Object.freeze(failures) });
}

async function main() {
  const { checked, failures } = await checkCatalog();

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${checked} pinned compiler inputs`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
