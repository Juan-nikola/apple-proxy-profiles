function duplicate(values, label) { const seen = new Set(); for (const value of values) { if (seen.has(value)) throw new Error(`Duplicate Happ ${label} tag`); seen.add(value); } }
export function validateHappSubscription(configs) {
  if (!Array.isArray(configs) || configs.length === 0) throw new Error("Happ subscription must be a non-empty array");
  for (const config of configs) {
    if (!config || typeof config !== "object") throw new Error("Happ config must be an object");
    const outbounds = Array.isArray(config.outbounds) ? config.outbounds : [];
    const inbounds = Array.isArray(config.inbounds) ? config.inbounds : [];
    duplicate(outbounds.map((item) => item.tag), "outbound");
    duplicate(inbounds.map((item) => item.tag), "inbound");
    duplicate((config.routing?.balancers ?? []).map((item) => item.tag), "balancer");
    const outboundTags = new Set(outbounds.map((item) => item.tag));
    const balancerTags = new Set((config.routing?.balancers ?? []).map((item) => item.tag));
    if (!outboundTags.has("happ-direct") || !outboundTags.has("happ-block")) throw new Error("Happ config missing safety outbounds");
    for (const rule of config.routing?.rules ?? []) {
      if (rule.outboundTag && !outboundTags.has(rule.outboundTag)) throw new Error(`Dangling Happ outbound reference '${rule.outboundTag}'`);
      if (rule.balancerTag && !balancerTags.has(rule.balancerTag)) throw new Error(`Dangling Happ balancer reference '${rule.balancerTag}'`);
    }
    for (const balancer of config.routing?.balancers ?? []) {
      if (!balancer.fallbackTag || !outboundTags.has(balancer.fallbackTag)) throw new Error("Happ balancer fallback is missing");
      const candidates = (balancer.selector ?? []).flatMap((selector) => outbounds.filter((outbound) => outbound.tag.startsWith(selector)));
      if (candidates.length !== 1) throw new Error("Happ balancer selector must match exactly one outbound");
      if (!(config.observatory?.subjectSelector ?? []).some((selector) => candidates[0].tag.startsWith(selector))) throw new Error("Happ fixed candidate is not observed");
    }
    if (outbounds.some((item) => item.protocol === "snell")) throw new Error("Happ config contains Snell");
    if (outbounds.some((item) => /TEST_ONLY_Node/u.test(item.tag))) throw new Error("Happ internal tag contains raw node name");
    const rules = config.routing?.rules ?? [];
    if (rules.length === 0 || rules.at(-1).network !== "tcp,udp") throw new Error("Happ final route must be last");
  }
  return true;
}
