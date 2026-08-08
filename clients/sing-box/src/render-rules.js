import { ruleClientCatalog } from "../../../shared/rules/lightweight-policy.js";
import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";

export const RULE_DOWNLOAD_HTTP_CLIENT = "🧭 规则下载 HTTP";

const LOCAL_RULES = Object.freeze([
  { ip_is_private: true, action: "route", outbound: "DIRECT" },
  { domain_suffix: ["local", "lan", "home.arpa"], action: "route", outbound: "DIRECT" },
]);
const SECURITY_IDS = new Set(["Hijacking", "BlockHttpDNS", "Privacy", "Advertising", "Advertising_Domain"]);
const DOMESTIC_IDS = Object.freeze(["DomesticCore", "DomesticGame", "SteamCN"]);
const OVERSEAS_GAME_ID = "OverseasGame";
const CHINA_IP_ID = "ChinaIP";
const CUSTOM_TARGETS = Object.freeze({ block: "REJECT", direct: "DIRECT", proxy: "🚀 节点选择", ai: "🤖 AI 专用" });
const CUSTOM_FIELDS = Object.freeze({
  DOMAIN: "domain",
  "DOMAIN-SUFFIX": "domain_suffix",
  "DOMAIN-KEYWORD": "domain_keyword",
  "IP-CIDR": "ip_cidr",
  "IP-CIDR6": "ip_cidr",
});

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

function optionalAdblockBase(defaultBase) {
  const optional = defaultBase.replace(/\/sing-box\/(?:rule-sets|rules)$/u, "/optional/adblock-full/sing-box");
  if (optional === defaultBase) throw new Error("sing-box adblock rule base URL must end in /sing-box/rule-sets");
  return optional;
}

function renderCustomRules() {
  const rendered = [];
  for (const [kind, entries] of Object.entries(CUSTOM_RULES)) {
    for (const entry of entries) {
      const [type, value, ...modifiers] = entry.split(",");
      const field = CUSTOM_FIELDS[type];
      if (!field || !value || modifiers.some((modifier) => modifier !== "no-resolve")) {
        throw new Error(`Invalid sing-box custom rule: ${entry}`);
      }
      rendered.push({ [field]: [value], ...routeAction(CUSTOM_TARGETS[kind]) });
    }
  }
  return rendered;
}

function taggedRule(source) {
  return { rule_set: [`rule-${source.id}`], ...routeAction(source.policy) };
}

export function renderSingBoxRuleSets({ ruleBaseUrl, profileMode = "light", adblockMode = "off" }) {
  const base = baseUrl(ruleBaseUrl);
  if (profileMode === "diagnostic") return [];
  if (profileMode !== "light") throw new Error("Unsupported sing-box profile mode");
  const sources = ruleClientCatalog({ adblockMode });
  const adblockBase = adblockMode === "full" ? optionalAdblockBase(base) : null;
  return sources.map((source) => ({
    type: "remote",
    tag: `rule-${source.id}`,
    format: "binary",
    url: `${source.id === "Advertising" || source.id === "Advertising_Domain" ? adblockBase : base}/${source.id}.srs`,
    http_client: RULE_DOWNLOAD_HTTP_CLIENT,
    update_interval: "24h",
  }));
}

export function renderSingBoxRouteRules({ ruleBaseUrl, profileMode = "light", adblockMode = "off" }) {
  const ruleSets = renderSingBoxRuleSets({ ruleBaseUrl, profileMode, adblockMode });
  const rules = [...LOCAL_RULES];
  if (profileMode === "light") {
    const catalog = ruleClientCatalog({ adblockMode });
    for (const source of catalog.filter(({ id }) => SECURITY_IDS.has(id))) rules.push(taggedRule(source));
  }
  rules.push(...renderCustomRules());
  if (profileMode === "diagnostic") return { ruleSets, rules, final: "🚀 节点选择" };
  const catalog = ruleClientCatalog({ adblockMode });
  const byId = new Map(catalog.map((source) => [source.id, source]));
  for (const id of DOMESTIC_IDS) rules.push(taggedRule(byId.get(id)));
  for (const source of catalog) {
    if (SECURITY_IDS.has(source.id) || DOMESTIC_IDS.includes(source.id) || [OVERSEAS_GAME_ID, CHINA_IP_ID].includes(source.id)) continue;
    rules.push(taggedRule(source));
  }
  rules.push(taggedRule(byId.get(OVERSEAS_GAME_ID)));
  rules.push({ action: "resolve", server: "dns-direct" });
  rules.push(taggedRule(byId.get(CHINA_IP_ID)));
  return { ruleSets, rules, final: "🚀 节点选择" };
}
