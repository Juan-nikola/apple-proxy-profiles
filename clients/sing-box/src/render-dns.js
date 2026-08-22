import {
  mobileRuleClientCatalog,
  orderedRoutingPlan,
  usesMobileRuleBundles,
} from "../../../shared/rules/lightweight-policy.js";
import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";
import { PROXY_DNS_DOMAIN_SUFFIXES } from "../../../shared/rules/overseas-dns.js";
import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";

const DNS_DIRECT = "dns-direct";
const DNS_PROXY = "dns-proxy";
const LOCAL_DNS_SUFFIXES = Object.freeze(["local", "lan", "home.arpa"]);

const PROXY_DNS_SOURCE_IDS = Object.freeze(
  orderedRoutingPlan().filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => id),
);
const CHINA_DNS_SOURCE_IDS = Object.freeze(
  orderedRoutingPlan()
    .filter(({ id, dnsClass }) => dnsClass === "china" && id !== "ChinaIP")
    .map(({ id }) => id),
);
const MOBILE_PROXY_DNS_SOURCE_IDS = Object.freeze(
  mobileRuleClientCatalog().filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => id),
);
const MOBILE_CHINA_DNS_SOURCE_IDS = Object.freeze(
  mobileRuleClientCatalog().filter(({ dnsClass }) => dnsClass === "china").map(({ id }) => id),
);

function activeSourceIds(options, sourceIds, mobileSourceIds) {
  return usesMobileRuleBundles(options.platform) ? mobileSourceIds : sourceIds;
}

function customDnsRules() {
  const rules = [];
  const targetByKind = new Map([
    ["direct", DNS_DIRECT],
    ["proxy", DNS_PROXY],
    ["ai", DNS_PROXY],
  ]);

  for (const [kind, entries] of Object.entries(CUSTOM_RULES)) {
    const server = targetByKind.get(kind);
    if (!server) continue;
    for (const entry of entries) {
      const [type, value, ...modifiers] = entry.split(",");
      if (modifiers.some((modifier) => modifier !== "no-resolve")) {
        throw new Error(`Invalid sing-box custom DNS rule: ${entry}`);
      }
      if (type === "DOMAIN") rules.push({ domain: [value], action: "route", server });
      else if (type === "DOMAIN-SUFFIX") rules.push({ domain_suffix: [value], action: "route", server });
      else if (type === "DOMAIN-KEYWORD") rules.push({ domain_keyword: [value], action: "route", server });
      else if (!["IP-CIDR", "IP-CIDR6"].includes(type)) {
        throw new Error(`Invalid sing-box custom DNS rule: ${entry}`);
      }
    }
  }
  return rules;
}

function renderUnknownDnsRules(chinaIpRuleTag) {
  // The direct answer is preferred only when it contains a ChinaIP address.
  // Otherwise the proxy answer is returned. This avoids sending every unknown
  // domain through a polluted domestic resolver while keeping CN CDNs direct.
  return [
    { action: "evaluate", server: DNS_DIRECT, tag: "direct-answer" },
    {
      rule_set: [chinaIpRuleTag],
      match_response: "direct-answer",
      action: "respond",
    },
    { action: "evaluate", server: DNS_PROXY, tag: "proxy-answer" },
    {
      match_response: "proxy-answer",
      ip_accept_any: true,
      action: "respond",
    },
    { action: "route", server: DNS_PROXY },
  ];
}

function dnsRules(options) {
  const rules = [
    { domain_suffix: LOCAL_DNS_SUFFIXES, action: "route", server: DNS_DIRECT },
    { domain_suffix: PROXY_DNS_DOMAIN_SUFFIXES, action: "route", server: DNS_PROXY },
    ...customDnsRules(),
  ];

  if (options.profileMode !== "diagnostic") {
    for (const [sourceIds, mobileSourceIds, server] of [
      [PROXY_DNS_SOURCE_IDS, MOBILE_PROXY_DNS_SOURCE_IDS, DNS_PROXY],
      [CHINA_DNS_SOURCE_IDS, MOBILE_CHINA_DNS_SOURCE_IDS, DNS_DIRECT],
    ]) {
      const ruleSet = activeSourceIds(options, sourceIds, mobileSourceIds).map((id) => `rule-${id}`);
      if (ruleSet.length > 0) rules.push({ rule_set: ruleSet, action: "route", server });
    }
    rules.push(
      ...(options.dnsMode === "privacy"
        ? [{ action: "route", server: DNS_PROXY }]
        : renderUnknownDnsRules("rule-ChinaIP")),
    );
  } else {
    rules.push({ action: "route", server: DNS_PROXY });
  }
  return rules;
}

export function renderSingBoxDns(options) {
  const chinaDns = chinaDnsProvider(options.chinaDns);
  const chinaServer = options.chinaDns === "system"
    ? { type: "local", tag: DNS_DIRECT }
    : { type: "udp", tag: DNS_DIRECT, server: chinaDns.address };
  const globalDns = globalDnsProvider(options.globalDns);
  const proxyServer = {
    type: "https",
    tag: DNS_PROXY,
    server: globalDns.address,
    server_port: 443,
    path: "/dns-query",
    tls: { enabled: true, server_name: globalDns.serverName },
    // DNS proxying must never depend on a selector that contains DIRECT.
    ...(options.dnsMode === "speed" ? {} : { detour: "⚡ 全部自动" }),
  };
  return {
    servers: [chinaServer, proxyServer],
    rules: dnsRules(options),
    final: DNS_PROXY,
    strategy: options.ipv6Mode === "ipv4-only" ? "ipv4_only" : "prefer_ipv4",
    cache_capacity: 4096,
  };
}

export { DNS_DIRECT, DNS_PROXY };
