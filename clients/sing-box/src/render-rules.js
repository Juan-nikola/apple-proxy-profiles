import {
  mobileRuleClientCatalog,
  MOBILE_RULE_SOURCE_IDS,
  ROUTING_PHASES,
  orderedRoutingPlan,
  ruleClientCatalog,
  usesMobileRuleBundles,
} from "../../../shared/rules/lightweight-policy.js";
import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import { PROXY_DNS_DOMAIN_SUFFIXES } from "../../../shared/rules/overseas-dns.js";
import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";

export const RULE_DOWNLOAD_HTTP_CLIENT = "🧭 规则下载 HTTP";
export const RULE_DOWNLOAD_GROUP = "🧭 DNS 与规则下载";
const MOBILE_RULE_SOURCE_ID_SET = new Set(MOBILE_RULE_SOURCE_IDS);

function activeRuleCatalog(platform, adblockMode) {
  const catalog = ruleClientCatalog({ adblockMode });
  return usesMobileRuleBundles(platform)
    ? mobileRuleClientCatalog().filter(({ id }) => MOBILE_RULE_SOURCE_ID_SET.has(id))
    : catalog;
}

function activeRoutingPlan(platform, adblockMode) {
  const activeIds = new Set(activeRuleCatalog(platform, adblockMode).map(({ id }) => id));
  if (usesMobileRuleBundles(platform)) return mobileRuleClientCatalog();
  return orderedRoutingPlan({ adblockMode }).filter(({ id }) => activeIds.has(id));
}

const LOCAL_RULES = Object.freeze([
  { ip_is_private: true, action: "route", outbound: "DIRECT" },
  { domain_suffix: ["local", "lan", "home.arpa"], action: "route", outbound: "DIRECT" },
]);
const QUIC_BLOCK_RULE = Object.freeze({ network: "udp", port: 443, action: "reject", method: "drop" });
const OVERSEAS_DNS_FALLBACK_RULE = Object.freeze({
  domain_suffix: PROXY_DNS_DOMAIN_SUFFIXES,
  action: "route",
  outbound: "🚀 节点选择",
});
const CUSTOM_TARGETS = Object.freeze({
  block: "REJECT",
  direct: "DIRECT",
  proxy: "🚀 节点选择",
  ai: "🤖 AI 专用",
});
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

function route(outbound) {
  return { action: "route", outbound };
}

function reject() {
  return { action: "reject", method: "default" };
}

function dnsAddressCidr(address) {
  if (typeof address !== "string" || address === "local") return null;
  return address.includes(":") ? `${address}/128` : `${address}/32`;
}

function renderDnsBootstrapRules({ chinaDns = "alidns", globalDns = "cloudflare", dnsMode = "stable" } = {}) {
  const addresses = [chinaDnsProvider(chinaDns).address];
  if (dnsMode === "speed") addresses.push(globalDnsProvider(globalDns).address);
  return [...new Set(addresses.map(dnsAddressCidr).filter(Boolean))]
    .map((address) => ({ ip_cidr: [address], action: "route", outbound: "DIRECT" }));
}

function optionalAdblockBase(defaultBase) {
  const optional = defaultBase.replace(/\/sing-box\/rule-sets$/u, "/optional/adblock-full/sing-box");
  if (optional === defaultBase) throw new Error("sing-box adblock rule base URL must end in /sing-box/rule-sets");
  return optional;
}

function mobileRuleBase(defaultBase) {
  if (!defaultBase.endsWith("/rule-sets")) throw new Error("sing-box mobile rule base URL must end in /rule-sets");
  return `${defaultBase.slice(0, -"/rule-sets".length)}/mobile-rule-sets`;
}

function customRuleFields(entry) {
  const [type, value, ...modifiers] = entry.split(",");
  const field = CUSTOM_FIELDS[type];
  if (!field || !value || modifiers.some((modifier) => modifier !== "no-resolve")) {
    throw new Error(`Invalid sing-box custom rule: ${entry}`);
  }
  return { [field]: [value] };
}

function renderCustomRules(quicMode) {
  const grouped = new Map();
  for (const [kind, entries] of Object.entries(CUSTOM_RULES)) {
    for (const entry of entries) {
      const fields = customRuleFields(entry);
      const [field] = Object.keys(fields);
      const key = `${kind}:${field}`;
      const values = grouped.get(key) ?? { kind, field, values: [] };
      values.values.push(...fields[field]);
      grouped.set(key, values);
    }
  }
  const rendered = [];
  for (const { kind, field, values } of grouped.values()) {
    const fields = { [field]: [...new Set(values)] };
    if (quicMode === "proxy-block" && ["proxy", "ai"].includes(kind) && field !== "ip_cidr") {
      rendered.push({ ...fields, ...QUIC_BLOCK_RULE });
    }
    rendered.push({ ...fields, ...(kind === "block" ? reject() : route(CUSTOM_TARGETS[kind])) });
  }
  return rendered;
}

function taggedRule(source) {
  if (source.policy === "REJECT") return { rule_set: [`rule-${source.id}`], ...reject() };
  return { rule_set: [`rule-${source.id}`], ...route(source.policy) };
}

export function renderSingBoxRuleSets({ ruleBaseUrl, profileMode = "light", adblockMode = "off", platform }) {
  const base = baseUrl(ruleBaseUrl);
  if (profileMode === "diagnostic") return [];
  if (profileMode !== "light") throw new Error("Unsupported sing-box profile mode");
  const sources = activeRuleCatalog(platform, adblockMode);
  const sourceBase = usesMobileRuleBundles(platform) ? mobileRuleBase(base) : base;
  const adblockBase = adblockMode === "full" ? optionalAdblockBase(base) : null;
  return sources.map((source) => ({
    type: "remote",
    tag: `rule-${source.id}`,
    format: "binary",
    url: `${source.id === "Advertising" || source.id === "Advertising_Domain" ? adblockBase : sourceBase}/${source.id}.srs`,
    http_client: RULE_DOWNLOAD_HTTP_CLIENT,
    update_interval: "24h",
  }));
}

export function renderSingBoxRouteRules({
  ruleBaseUrl,
  profileMode = "light",
  adblockMode = "off",
  blockMode = "balanced",
  quicMode = "allow",
  platform,
  chinaDns = "alidns",
  globalDns = "cloudflare",
  dnsMode = "stable",
}) {
  if (!["allow", "proxy-block", "all-block"].includes(quicMode)) {
    throw new Error(`Unsupported sing-box quicMode: ${quicMode}`);
  }
  const ruleSets = renderSingBoxRuleSets({ ruleBaseUrl, profileMode, adblockMode, platform });
  const rules = [
    { inbound: "tun-in", action: "sniff" },
    { protocol: "dns", action: "hijack-dns" },
    ...LOCAL_RULES,
    ...renderDnsBootstrapRules({ chinaDns, globalDns, dnsMode }),
  ];

  if (quicMode === "all-block") rules.push({ ...QUIC_BLOCK_RULE });
  if (profileMode === "diagnostic") {
    rules.push(...renderCustomRules(quicMode));
    return { ruleSets, rules, final: "🚀 节点选择" };
  }

  const plan = activeRoutingPlan(platform, adblockMode);
  const securityIds = new Set({
    off: [],
    security: ["Hijacking", "BlockHttpDNS"],
    balanced: ["Hijacking", "BlockHttpDNS", "Privacy", "Advertising", "Advertising_Domain"],
    strict: ["Hijacking", "BlockHttpDNS", "Privacy", "Advertising", "Advertising_Domain"],
  }[blockMode] ?? []);
  if (usesMobileRuleBundles(platform)) {
    securityIds.clear();
    if (blockMode === "security") securityIds.add("Security");
    if (["balanced", "strict"].includes(blockMode)) {
      securityIds.add("Security");
      securityIds.add("Privacy");
    }
  }
  rules.push(...plan
    .filter(({ phase, id }) => phase === "security" && securityIds.has(id))
    .map(taggedRule));
  rules.push(...renderCustomRules(quicMode));

  if (quicMode === "proxy-block") {
    const proxyRuleSets = plan
      .filter(({ dnsClass }) => dnsClass === "proxy")
      .map(({ id }) => `rule-${id}`);
    if (proxyRuleSets.length > 0) rules.push({ network: "udp", port: 443, rule_set: proxyRuleSets, ...reject() });
  }

  for (const phase of ROUTING_PHASES.filter((value) => value !== "security" && value !== "resolvedChinaIp")) {
    for (const source of plan.filter((candidate) => candidate.phase === phase)) {
      rules.push(taggedRule(source));
    }
    if (phase === "serviceIntent") {
      if (quicMode === "proxy-block") rules.push({ ...OVERSEAS_DNS_FALLBACK_RULE, ...QUIC_BLOCK_RULE });
      rules.push({ ...OVERSEAS_DNS_FALLBACK_RULE });
      if (usesMobileRuleBundles(platform)) {
        rules.push({ domain_suffix: ["cn"], action: "route", outbound: "DIRECT" });
      }
    }
  }

  // Resolve only after domain rules. With no explicit DNS server, sing-box
  // evaluates the DNS rules above, including the ChinaIP response test.
  rules.push({ action: "resolve", strategy: "prefer_ipv4" });
  rules.push(...plan
    .filter(({ phase }) => phase === "resolvedChinaIp")
    .map(taggedRule));
  if (quicMode === "proxy-block") rules.push({ ...QUIC_BLOCK_RULE });
  return { ruleSets, rules, final: "🚀 节点选择" };
}
