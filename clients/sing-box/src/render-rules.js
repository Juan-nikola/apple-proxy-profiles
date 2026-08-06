import { RULE_CLIENT_CATALOG } from "../../../shared/rules/client-catalog.js";

export const RULE_DOWNLOAD_HTTP_CLIENT = "🧭 规则下载 HTTP";

const LOCAL_RULES = Object.freeze([
  { ip_is_private: true, action: "route", outbound: "DIRECT" },
  { domain_suffix: ["local", "lan", "home.arpa"], action: "route", outbound: "DIRECT" },
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
    http_client: RULE_DOWNLOAD_HTTP_CLIENT,
    update_interval: "24h",
  }));
}

export function renderSingBoxRouteRules({ ruleBaseUrl, ruleSetFormat = "source" }) {
  const rules = [...LOCAL_RULES];
  for (const source of RULE_CLIENT_CATALOG) {
    rules.push({ rule_set: [`rule-${source.id}`], ...routeAction(source.policy) });
  }
  return { ruleSets: renderSingBoxRuleSets({ ruleBaseUrl, ruleSetFormat }), rules, final: "🚀 节点选择" };
}
