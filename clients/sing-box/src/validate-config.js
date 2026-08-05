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

export function validateSingBoxConfig(config) {
  const errors = [];
  if (!config || typeof config !== "object" || Array.isArray(config)) return { valid: false, errors: ["config must be an object"] };
  const outbounds = config.outbounds;
  const outboundTags = uniqueTags(outbounds, errors, "outbound");
  const ruleSets = uniqueTags(config.route?.rule_set, errors, "rule-set");
  const dnsServers = uniqueTags(config.dns?.servers, errors, "DNS server");
  const inboundTags = uniqueTags(config.inbounds, errors, "inbound");
  const groupTags = new Set(outbounds?.filter((item) => ["selector", "urltest"].includes(item.type)).map((item) => item.tag));
  for (const outbound of outbounds ?? []) {
    for (const target of outbound.outbounds ?? []) if (!outboundTags.has(target)) errors.push("outbound references missing tag");
    if (outbound.default !== undefined && !outboundTags.has(outbound.default)) errors.push("selector default references missing tag");
  }
  const routeRules = config.route?.rules;
  if (!Array.isArray(routeRules)) errors.push("route rules missing");
  for (const rule of routeRules ?? []) {
    for (const tag of rule.rule_set ?? []) if (!ruleSets.has(tag)) errors.push("route references missing rule-set tag");
    const target = actionOutbound(rule);
    if (target !== undefined && !outboundTags.has(target)) errors.push("route references missing outbound tag");
    if (rule.action === "hijack-dns" && !dnsServers.size) errors.push("DNS hijack requires DNS servers");
    if (rule.action !== undefined && typeof rule.action !== "string") errors.push("route rule action must be a string");
  }
  const routeFinal = config.route?.final;
  if (typeof routeFinal !== "string" || !outboundTags.has(routeFinal)) errors.push("route final references missing outbound tag");
  const dnsFinal = config.dns?.final;
  if (typeof dnsFinal !== "string" || !dnsServers.has(dnsFinal)) errors.push("DNS final references missing server");
  for (const rule of config.dns?.rules ?? []) {
    for (const tag of rule.rule_set ?? []) if (!ruleSets.has(tag)) errors.push("DNS references missing rule-set tag");
    if (typeof rule.action !== "string") errors.push("DNS rule action must be a string");
    if ((rule.action === "route" || rule.action === "evaluate") && typeof rule.server !== "string") {
      errors.push("DNS rule action server missing");
    }
    if (rule.server !== undefined && !dnsServers.has(rule.server)) errors.push("DNS rule references missing server");
    if (rule.detour !== undefined && !outboundTags.has(rule.detour)) errors.push("DNS rule references missing outbound");
  }
  for (const server of config.dns?.servers ?? []) {
    if (server.detour !== undefined && !outboundTags.has(server.detour)) errors.push("DNS server references missing outbound");
    if (server.detour === server.tag || server.tag === dnsFinal && server.detour === "dns-proxy") errors.push("DNS server loop detected");
  }
  for (const inbound of config.inbounds ?? []) {
    if (inbound.type === "tun" && !inbound.auto_route) errors.push("TUN auto_route is required");
    if (inbound.type === "tun" && inbound.platform?.include_android_user && inbound.auto_redirect) errors.push("Android TUN cannot use auto_redirect");
  }
  if (!inboundTags.has("tun-in")) errors.push("tun-in inbound missing");
  if (!groupTags.has("🚀 节点选择")) errors.push("primary selector missing");
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}
