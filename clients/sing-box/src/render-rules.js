import { RULE_CLIENT_CATALOG } from "../../../shared/rules/client-catalog.js";

const LOCAL_RULES = Object.freeze([
  { ip_is_private: true, action: { action: "route", outbound: "DIRECT" } },
  { domain_suffix: ["local", "lan", "home.arpa"], action: { action: "route", outbound: "DIRECT" } },
]);

function baseUrl(value) {
  if (typeof value !== "string" || !/^https:\/\/[^\s]+$/u.test(value) || /[\r\n]/u.test(value)) {
    throw new Error("sing-box rule base URL must be an HTTPS URL");
  }
  return value.replace(/\/+$/u, "");
}

function routeAction(outbound) {
  if (outbound === "REJECT") return { action: "reject", method: "default" };
  return { action: "route", outbound };
}

export function renderSingBoxRuleSets({ ruleBaseUrl, ruleSetFormat = "source" }) {
  const base = baseUrl(ruleBaseUrl);
  if (!new Set(["source", "binary"]).has(ruleSetFormat)) throw new Error("Unsupported sing-box rule-set format");
  return RULE_CLIENT_CATALOG.map((source) => ({
    type: "remote",
    tag: `rule-${source.id}`,
    format: ruleSetFormat,
    url: `${base}/${source.id}.${ruleSetFormat === "binary" ? "srs" : "json"}`,
    download_detour: "🧭 DNS 与规则下载",
    update_interval: "24h",
  }));
}

export function renderSingBoxRouteRules({ ruleBaseUrl, ruleSetFormat = "source" }) {
  const rules = [...LOCAL_RULES];
  for (const source of RULE_CLIENT_CATALOG) {
    rules.push({ rule_set: [`rule-${source.id}`], ...routeAction(source.policy) });
  }
  rules.push({ geoip: ["cn"], ...routeAction("DIRECT") });
  return { ruleSets: renderSingBoxRuleSets({ ruleBaseUrl, ruleSetFormat }), rules, final: "🚀 节点选择" };
}
