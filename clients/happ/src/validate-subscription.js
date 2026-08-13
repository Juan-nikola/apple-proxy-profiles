const OPAQUE_FIXED_CANDIDATE = /^happ-fixed\/[A-Za-z0-9_-]{43}\/candidate$/u;
const OPAQUE_FIXED_BALANCER = /^happ-fixed\/[A-Za-z0-9_-]{43}\/balancer$/u;

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`Happ subscription ${label} must be an array`);
  return value;
}

function uniqueTags(items, label) {
  const tags = new Set();
  for (const item of requireArray(items, label)) {
    if (!item || typeof item !== "object" || typeof item.tag !== "string" || item.tag.length === 0) throw new Error(`Happ ${label} tag is invalid`);
    if (tags.has(item.tag)) throw new Error(`Happ duplicate ${label} tag`);
    tags.add(item.tag);
  }
  return tags;
}

function validateReferences(config, outboundTags, inboundTags, balancerTags) {
  const knownInboundTags = new Set(inboundTags);
  if (typeof config.dns?.tag === "string") knownInboundTags.add(config.dns.tag);
  for (const rule of requireArray(config.routing?.rules, "routing rules")) {
    if (rule.outboundTag !== undefined && !outboundTags.has(rule.outboundTag)) throw new Error("Happ dangling route outbound reference");
    if (rule.balancerTag !== undefined && !balancerTags.has(rule.balancerTag)) throw new Error("Happ dangling route balancer reference");
    if (rule.inboundTag !== undefined) for (const tag of rule.inboundTag) if (!knownInboundTags.has(tag)) throw new Error("Happ dangling route inbound reference");
  }
}

function validateFailover(config, outboundTags) {
  const observatory = config.observatory;
  if (!observatory || !Array.isArray(observatory.subjectSelector)) throw new Error("Happ observatory is invalid");
  const observable = new Set(observatory.subjectSelector);
  for (const balancer of requireArray(config.routing?.balancers, "balancers")) {
    if (!Array.isArray(balancer.selector) || balancer.selector.length !== 1) throw new Error("Happ balancer selector cardinality is invalid");
    if (!outboundTags.has(balancer.selector[0])) throw new Error("Happ balancer selector is dangling");
    if (!outboundTags.has(balancer.fallbackTag)) throw new Error("Happ balancer fallback outbound is missing");
    if (!observable.has(balancer.selector[0])) throw new Error("Happ fixed candidate is absent from observatory");
  }
  for (const tag of outboundTags) if (tag.startsWith("happ-fixed/") && tag.endsWith("/candidate") && !observable.has(tag)) {
    throw new Error("Happ fixed candidate is absent from observatory");
  }
}

function validateConfig(config) {
  if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("Happ subscription config is invalid");
  const outboundTags = uniqueTags(config.outbounds, "outbound");
  const inboundTags = uniqueTags(config.inbounds, "inbound");
  const balancerTags = uniqueTags(config.routing?.balancers, "balancer");
  if (typeof config.remarks === "string") for (const tag of [...outboundTags, ...inboundTags, ...balancerTags]) {
    if (tag.includes(config.remarks)) throw new Error("Happ internal tag is not opaque");
  }
  for (const outbound of config.outbounds) {
    if (outbound.protocol === "snell") throw new Error("Happ Snell outbound is unsupported");
    if (outbound.tag.startsWith("happ-fixed/") && !OPAQUE_FIXED_CANDIDATE.test(outbound.tag)) {
      throw new Error("Happ internal tag is not opaque");
    }
  }
  for (const balancer of config.routing.balancers) {
    if (!OPAQUE_FIXED_BALANCER.test(balancer.tag)) throw new Error("Happ internal tag is not opaque");
  }
  validateReferences(config, outboundTags, inboundTags, balancerTags);
  validateFailover(config, outboundTags);
  const rules = requireArray(config.routing?.rules, "routing rules");
  if (rules.at(-1)?.ruleTag !== "最终兜底") throw new Error("Happ final rule must be last");
}

/** Verifies all Xray tag namespaces and every route/failover cross-reference. */
export function validateHappSubscription(configs) {
  if (!Array.isArray(configs) || configs.length === 0) throw new Error("Happ subscription configs must be a non-empty array");
  for (const config of configs) validateConfig(config);
  return true;
}
