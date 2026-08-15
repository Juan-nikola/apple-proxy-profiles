import {
  ROUTING_PHASES,
  orderedRoutingPlan,
  ruleClientCatalog,
} from "../../../shared/rules/lightweight-policy.js";
import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import { PROXY_DNS_DOMAIN_SUFFIXES } from "../../../shared/rules/overseas-dns.js";

export const RULE_DOWNLOAD_HTTP_CLIENT = "🧭 规则下载 HTTP";
export const RULE_DOWNLOAD_GROUP = "🧭 DNS 与规则下载";

const LOCAL_RULES = Object.freeze([
  { ip_is_private: true, action: "route", outbound: "DIRECT" },
  { domain_suffix: ["local", "lan", "home.arpa"], action: "route", outbound: "DIRECT" },
]);
const QUIC_BLOCK_RULE = Object.freeze({ network: "udp", port: 443, action: "reject" });
const OVERSEAS_DNS_FALLBACK_RULE = Object.freeze({
  domain_suffix: PROXY_DNS_DOMAIN_SUFFIXES,
  action: "route",
  outbound: "🚀 节点选择",
});
const OVERSEAS_DNS_QUIC_BLOCK_RULE = Object.freeze({
  ...QUIC_BLOCK_RULE,
  domain_suffix: PROXY_DNS_DOMAIN_SUFFIXES,
});
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

export function renderSingBoxRouteRules({
  ruleBaseUrl,
  profileMode = "light",
  adblockMode = "off",
  quicMode = "allow",
}) {
  if (!["allow", "proxy-block", "all-block"].includes(quicMode)) {
    throw new Error(`Unsupported sing-box quicMode: ${quicMode}`);
  }
  const ruleSets = renderSingBoxRuleSets({ ruleBaseUrl, profileMode, adblockMode });
  const rules = [
    { inbound: "tun-in", action: "sniff" },
    { protocol: "dns", action: "hijack-dns" },
    ...LOCAL_RULES,
  ];
  if (quicMode === "all-block") rules.push({ ...QUIC_BLOCK_RULE });
  if (profileMode === "light") {
    const plan = orderedRoutingPlan({ adblockMode });
    rules.push(...plan.filter(({ phase }) => phase === "security").map(taggedRule));
  }
  rules.push(...renderCustomRules());
  if (profileMode === "diagnostic") return { ruleSets, rules, final: "🚀 节点选择" };
  const plan = orderedRoutingPlan({ adblockMode });
  for (const phase of ROUTING_PHASES.filter((value) => (
    value !== "security" && value !== "resolvedChinaIp"
  ))) {
    for (const source of plan.filter((candidate) => candidate.phase === phase)) {
      if (quicMode === "proxy-block" && source.dnsClass === "proxy") {
        rules.push({ ...QUIC_BLOCK_RULE, rule_set: [`rule-${source.id}`] });
      }
      rules.push(taggedRule(source));
    }
    if (phase === "serviceIntent") {
      if (quicMode === "proxy-block") rules.push({ ...OVERSEAS_DNS_QUIC_BLOCK_RULE });
      rules.push({ ...OVERSEAS_DNS_FALLBACK_RULE });
    }
  }
  rules.push({ action: "resolve", server: "dns-direct" });
  rules.push(...plan
    .filter(({ phase }) => phase === "resolvedChinaIp")
    .map(taggedRule));
  if (quicMode === "proxy-block") rules.push({ ...QUIC_BLOCK_RULE });
  return { ruleSets, rules, final: "🚀 节点选择" };
}
