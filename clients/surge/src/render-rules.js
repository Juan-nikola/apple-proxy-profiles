import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import { LEAK_GROUP_NAME } from "../../../shared/policies/catalog.js";
import { ROUTING_PHASES, orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { LOCAL_RULES } from "../../../shared/rules/local-rules.js";


const RULE_DOWNLOAD_POLICY = "🧭 DNS 与规则下载";

function safeBaseUrl(value) {
  if (typeof value !== "string" || !/^https:\/\/[^\s]+$/u.test(value) || /[\r\n,]/u.test(value)) {
    throw new Error("Surge rule base URL must be an HTTPS URL without commas");
  }
  return value.replace(/\/+$/u, "");
}

function optionalAdblockBase(defaultBase) {
  const optional = defaultBase.replace(/\/surge\/rules$/u, "/optional/adblock-full/surge/rules");
  if (optional === defaultBase) throw new Error("Surge adblock rule base URL must end in /surge/rules");
  return optional;
}

function sourceUrl(source, base, optionalBase) {
  const selectedBase = source.id === "Advertising" || source.id === "Advertising_Domain" ? optionalBase : base;
  if (!selectedBase) throw new Error("Surge optional rule URL is unavailable");
  return `${selectedBase}/${source.id}.list`;
}

function selectedSources(ruleBaseUrl, adblockMode) {
  const base = safeBaseUrl(ruleBaseUrl);
  const plan = orderedRoutingPlan({ adblockMode });
  const optionalBase = adblockMode === "full" ? optionalAdblockBase(base) : null;
  return { base, plan, optionalBase };
}

export function renderSurgeRules({ ruleBaseUrl, adblockMode = "off" }) {
  const { base, plan, optionalBase } = selectedSources(ruleBaseUrl, adblockMode);
  const render = (source) => (
    `${source.inputFormat},${sourceUrl(source, base, optionalBase)},${source.policy},update-interval=86400`
  );
  const lines = [
    ...LOCAL_RULES,
    "# Security rules",
    ...plan.filter(({ phase }) => phase === "security").map(render),
    "# Custom rules",
  ];
  const custom = [
    ["CUSTOM_BLOCK", CUSTOM_RULES.block, "REJECT"],
    ["CUSTOM_DIRECT", CUSTOM_RULES.direct, "DIRECT"],
    ["CUSTOM_PROXY", CUSTOM_RULES.proxy, "🚀 节点选择"],
    ["CUSTOM_AI", CUSTOM_RULES.ai, "🤖 AI 专用"],
  ];
  for (const [name, rules, policy] of custom) {
    lines.push(`# ${name}`, ...rules.map((rule) => `${rule},${policy}`));
  }
  const ruleHost = new URL(base).hostname;
  lines.push(
    "# Rule-download fallback transport",
    `DOMAIN,${ruleHost},${RULE_DOWNLOAD_POLICY}`,
  );
  for (const phase of ROUTING_PHASES.filter((value) => value !== "security")) {
    lines.push(...plan.filter((source) => source.phase === phase).map(render));
  }
  lines.push("GEOIP,CN,DIRECT", `FINAL,${LEAK_GROUP_NAME},dns-failed`);
  return lines;
}
