import { CUSTOM_AI, CUSTOM_BLOCK, CUSTOM_DIRECT, CUSTOM_PROXY } from "./custom-rules.js";
import { ROUTING_PHASES, orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { isValidRuleLine } from "./rule-validator.js";

export const PUBLIC_RULE_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";

const LOCAL_RULES = Object.freeze([
  "DOMAIN-SUFFIX,local,DIRECT",
  "DOMAIN-SUFFIX,home.arpa,DIRECT",
  "DOMAIN-SUFFIX,lan,DIRECT",
  "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
  "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
  "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
  "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
  "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
  "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
  "IP-CIDR,224.0.0.0/4,DIRECT,no-resolve",
  "IP-CIDR6,::1/128,DIRECT,no-resolve",
  "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
  "IP-CIDR6,fe80::/10,DIRECT,no-resolve",
  "IP-CIDR6,ff00::/8,DIRECT,no-resolve",
]);

const CUSTOM_RULES = Object.freeze([
  Object.freeze(["CUSTOM_BLOCK", CUSTOM_BLOCK, "REJECT"]),
  Object.freeze(["CUSTOM_DIRECT", CUSTOM_DIRECT, "DIRECT"]),
  Object.freeze(["CUSTOM_PROXY", CUSTOM_PROXY, "🚀 节点选择"]),
  Object.freeze(["CUSTOM_AI", CUSTOM_AI, "🤖 AI 专用"]),
]);

const RULE_DOWNLOAD_POLICY = "🧭 DNS 与规则下载";

function isSafeCustomField(value) {
  return typeof value === "string"
    && value.length > 0
    && value.trim() === value
    && !/[\r\n,=]/.test(value);
}

export function validateCustomRules(customRules) {
  if (!Array.isArray(customRules)) throw new Error("Invalid custom rule configuration");
  const seen = new Set();
  for (const entry of customRules) {
    if (!Array.isArray(entry) || entry.length !== 3 || !isSafeCustomField(entry[0]) || !Array.isArray(entry[1]) || !isSafeCustomField(entry[2])) {
      throw new Error("Invalid custom rule configuration");
    }
    for (const rule of entry[1]) {
      if (typeof rule !== "string" || /[\r\n]/.test(rule) || rule.trim() !== rule) {
        throw new Error("Invalid custom rule");
      }
      if (rule.split(",").length !== 2 || !isValidRuleLine(rule)) {
        throw new Error("Invalid custom rule");
      }
      if (seen.has(rule)) throw new Error("Duplicate custom rule");
      seen.add(rule);
    }
  }
}

function safeBaseUrl(value) {
  if (typeof value !== "string" || !/^https:\/\/[^\s]+$/u.test(value) || /[\r\n,]/u.test(value)) {
    throw new Error("Shadowrocket rule base URL must be an HTTPS URL without commas");
  }
  const match = /^https:\/\/([^/]+)(\/[^?#]*)$/u.exec(value);
  if (!match) {
    throw new Error("Shadowrocket rule base URL is invalid");
  }
  const hostname = match[1];
  const labels = hostname.split(".");
  if (
    hostname.includes(":")
    || hostname.includes("@")
    || labels.some((label) => !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u.test(label))
  ) {
    throw new Error("Shadowrocket rule base URL must be a plain HTTPS publication URL");
  }
  const normalized = value.replace(/\/+$/u, "");
  if (!normalized.endsWith("/shadowrocket/rules")) {
    throw new Error("Shadowrocket rule base URL must end in /shadowrocket/rules");
  }
  return Object.freeze({ url: normalized, hostname });
}

function optionalAdblockBase(defaultBase) {
  const optional = defaultBase.replace(
    /\/shadowrocket\/rules$/u,
    "/optional/adblock-full/shadowrocket/rules",
  );
  if (optional === defaultBase) {
    throw new Error("Shadowrocket rule base URL must end in /shadowrocket/rules");
  }
  return optional;
}

function sourceUrl(source, base, optionalBase) {
  const selectedBase = source.id === "Advertising" || source.id === "Advertising_Domain"
    ? optionalBase
    : base;
  if (!selectedBase) throw new Error("Shadowrocket optional rule URL is unavailable");
  return `${selectedBase}/${source.id}.list`;
}

function renderRuleSet(source, base, optionalBase) {
  return `${source.inputFormat},${sourceUrl(source, base, optionalBase)},${source.policy},update-interval=86400`;
}

export function ruleBaseUrlForChannel(channel) {
  if (channel !== "edge" && channel !== "current") {
    throw new Error(`Unsupported Shadowrocket publication channel: ${channel}`);
  }
  return `${PUBLIC_RULE_ROOT}/${channel}/shadowrocket/rules`;
}

export function renderRules({ ruleBaseUrl, adblockMode = "off" } = {}) {
  validateCustomRules(CUSTOM_RULES);
  const base = safeBaseUrl(ruleBaseUrl);
  const plan = orderedRoutingPlan({ adblockMode });
  const optionalBase = adblockMode === "full" ? optionalAdblockBase(base.url) : null;
  const render = (source) => renderRuleSet(source, base.url, optionalBase);
  const lines = [
    ...LOCAL_RULES,
    "# Security rules",
    ...plan.filter(({ phase }) => phase === "security").map(render),
    "# Custom rules",
  ];

  for (const [name, rules, policy] of CUSTOM_RULES) {
    lines.push(`# ${name}`);
    lines.push(...rules.map((rule) => `${rule},${policy}`));
  }

  lines.push(
    "# Rule-download fallback transport",
    `DOMAIN,${base.hostname},${RULE_DOWNLOAD_POLICY}`,
  );

  for (const phase of ROUTING_PHASES.filter((value) => value !== "security")) {
    lines.push(...plan.filter((source) => source.phase === phase).map(render));
  }
  lines.push("GEOIP,CN,DIRECT", "FINAL,🚀 节点选择");
  return lines;
}
