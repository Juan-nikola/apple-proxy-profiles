import { RULE_BUDGETS } from "../../../shared/rules/lightweight-policy.js";

function uniqueTags(records, errors, label) {
  const tags = new Set();
  for (const record of records ?? []) {
    if (!record || typeof record.tag !== "string" || !record.tag) errors.push(`${label} tag missing`);
    else if (tags.has(record.tag)) errors.push(`duplicate ${label} tag`);
    else tags.add(record.tag);
  }
  return tags;
}

function actionOutbound(rule) {
  if (rule?.action === "route" || rule?.action === "bypass") return rule.outbound;
  return undefined;
}

function validateDnsServerShape(server, errors) {
  if (server?.type !== "https") return;
  if (typeof server.server !== "string" || server.server.length === 0) {
    errors.push("HTTPS DNS server host missing");
  } else if (/^(?:https?|tls):\/\//iu.test(server.server) || /[/?#\s]/u.test(server.server)) {
    errors.push("HTTPS DNS server must be a host without scheme or path");
  }
  if (server.server_port !== undefined && (
    !Number.isInteger(server.server_port) || server.server_port < 1 || server.server_port > 65535
  )) {
    errors.push("HTTPS DNS server_port must be between 1 and 65535");
  }
  if (server.path !== undefined && (
    typeof server.path !== "string" || !server.path.startsWith("/") || /[\r\n]/u.test(server.path)
  )) {
    errors.push("HTTPS DNS path must start with '/'");
  }
}

export function validateSingBoxConfig(config) {
  const errors = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) return { valid: false, errors: ["config must be an object"] };
  const outbounds = config.outbounds;
  const outboundTags = uniqueTags(outbounds, errors, "outbound");
  const httpClientTags = uniqueTags(config.http_clients, errors, "HTTP client");
  const ruleSets = uniqueTags(config.route?.rule_set, errors, "rule-set");
  const dnsServers = uniqueTags(config.dns?.servers, errors, "DNS server");
  const inboundTags = uniqueTags(config.inbounds, errors, "inbound");
  const groupTags = new Set(outbounds?.filter((item) => ["selector", "urltest"].includes(item.type)).map((item) => item.tag));
  for (const client of config.http_clients ?? []) {
    if (client.detour !== undefined && !outboundTags.has(client.detour)) {
      errors.push("HTTP client references missing outbound tag");
    }
  }
  for (const outbound of outbounds ?? []) {
    for (const target of outbound.outbounds ?? []) if (!outboundTags.has(target)) errors.push("outbound references missing tag");
    if (outbound.default !== undefined && !outboundTags.has(outbound.default)) errors.push("selector default references missing tag");
  }
  const routeRules = config.route?.rules;
  if (!Array.isArray(routeRules)) errors.push("route rules missing");
  else if (routeRules.length > RULE_BUDGETS.startupInlineEntries) errors.push("route inline rule budget exceeded");
  for (const rule of routeRules ?? []) {
    if (Object.hasOwn(rule, "geoip")) errors.push("route contains removed geoip");
    if (Object.hasOwn(rule, "geosite")) errors.push("route contains removed geosite");
    for (const tag of rule.rule_set ?? []) if (!ruleSets.has(tag)) errors.push("route references missing rule-set tag");
    const target = actionOutbound(rule);
    if (target !== undefined && !outboundTags.has(target)) errors.push("route references missing outbound tag");
    if (rule.action === "hijack-dns" && !dnsServers.size) errors.push("DNS hijack requires DNS servers");
    if (rule.action === "resolve" && (typeof rule.server !== "string" || !dnsServers.has(rule.server))) {
      errors.push("route resolve references missing DNS server");
    }
    if (rule.action !== undefined && typeof rule.action !== "string") errors.push("route rule action must be a string");
  }
  const routeFinal = config.route?.final;
  if (typeof routeFinal !== "string" || !outboundTags.has(routeFinal)) errors.push("route final references missing outbound tag");
  const defaultHttpClient = config.route?.default_http_client;
  if (defaultHttpClient !== undefined && (typeof defaultHttpClient !== "string" || !httpClientTags.has(defaultHttpClient))) {
    errors.push("route default_http_client references missing HTTP client tag");
  }
  for (const ruleSet of config.route?.rule_set ?? []) {
    if (Object.hasOwn(ruleSet, "download_detour")) errors.push("rule-set contains deprecated download_detour");
    if (ruleSet.type === "remote" && (typeof ruleSet.http_client !== "string" || !httpClientTags.has(ruleSet.http_client))) {
      errors.push("remote rule-set references missing http_client tag");
    }
    if (ruleSet.type === "remote" && (ruleSet.format !== "binary" || typeof ruleSet.url !== "string" || !/^https:\/\/[^\s]+\.srs$/u.test(ruleSet.url))) {
      errors.push("remote rule-set must use binary format and an HTTPS .srs URL");
    }
  }
  const dnsFinal = config.dns?.final;
  if (typeof dnsFinal !== "string" || !dnsServers.has(dnsFinal)) errors.push("DNS final references missing server");
  let seenAnonymousEvaluate = false;
  const evaluateTags = new Set();
  for (const rule of config.dns?.rules ?? []) {
    for (const tag of rule.rule_set ?? []) if (!ruleSets.has(tag)) errors.push("DNS references missing rule-set tag");
    if (typeof rule.action !== "string") errors.push("DNS rule action must be a string");
    if ((rule.action === "route" || rule.action === "evaluate") && typeof rule.server !== "string") {
      errors.push("DNS rule action server missing");
    }
    if (rule.action === "respond" && !seenAnonymousEvaluate) {
      errors.push("DNS respond rule requires a preceding anonymous evaluate rule");
    }
    if (rule.match_response === true && !seenAnonymousEvaluate) {
      errors.push("DNS match_response rule requires a preceding anonymous evaluate rule");
    }
    if (typeof rule.match_response === "string" && !evaluateTags.has(rule.match_response)) {
      errors.push("DNS match_response references missing evaluate tag");
    }
    if (rule.server !== undefined && !dnsServers.has(rule.server)) errors.push("DNS rule references missing server");
    if (rule.detour !== undefined && !outboundTags.has(rule.detour)) errors.push("DNS rule references missing outbound");
    if (rule.action === "evaluate") {
      if (rule.tag === undefined) {
        seenAnonymousEvaluate = true;
      } else if (typeof rule.tag === "string") {
        evaluateTags.add(rule.tag);
      }
    }
  }
  for (const server of config.dns?.servers ?? []) {
    validateDnsServerShape(server, errors);
    if (server.detour !== undefined && !outboundTags.has(server.detour)) errors.push("DNS server references missing outbound");
    if (server.detour === server.tag || server.tag === dnsFinal && server.detour === "dns-proxy") errors.push("DNS server loop detected");
  }
  for (const inbound of config.inbounds ?? []) {
    if (inbound.type === "tun" && !inbound.auto_route) errors.push("TUN auto_route is required");
    if (inbound.type === "tun" && inbound.platform?.include_android_user && inbound.auto_redirect) errors.push("Android TUN cannot use auto_redirect");
  }
  if (Object.hasOwn(config.experimental?.cache_file ?? {}, "store_rdrc")) {
    errors.push("cache file contains deprecated store_rdrc");
  }
  if (!inboundTags.has("tun-in")) errors.push("tun-in inbound missing");
  if (!groupTags.has("🚀 节点选择")) errors.push("primary selector missing");
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
