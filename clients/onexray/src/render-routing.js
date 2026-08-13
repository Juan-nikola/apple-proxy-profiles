import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import { oneXrayGeoReference } from "./geodata-contract.js";

const RESERVED_RUNTIME_TAGS = new Set([
  "proxy", "chainProxy", "direct", "fragment", "block", "dnsOut", "tunIn", "pingIn",
]);
const BLOCK_MODES = new Set(["balanced", "security", "strict", "off"]);
const QUIC_MODES = new Set(["allow", "proxy-block", "all-block"]);

const DOMESTIC_SOURCES = new Set([
  "DomesticCore", "DomesticGame", "SteamCN",
  "ChinaTLD", "ChinaIP",
]);
const DOMESTIC_BUSINESS_SOURCES = new Set(["BiliBili", "ByteDance", "XiaoHongShu", "Weibo"]);
const SERVICE_INTENTS = Object.freeze({
  OpenAI: "ai",
  Claude: "ai",
  Gemini: "ai",
  Copilot: "ai",
  GitHub: "github",
  YouTube: "youtube",
  Netflix: "globalMedia",
  Disney: "globalMedia",
  Spotify: "globalMedia",
  GlobalMedia: "globalMedia",
  Telegram: "globalSocial",
  Facebook: "globalSocial",
  Instagram: "globalSocial",
  Twitter: "globalSocial",
  TikTok: "globalMedia",
  Apple: "apple",
  Microsoft: "microsoft",
  Download: "download",
  PrivateTracker: "download",
  OverseasGame: "overseasGame",
});
const SECURITY_CATEGORIES = Object.freeze({
  Hijacking: "threat",
  BlockHttpDNS: "threat",
  Advertising: "advertising",
  Advertising_Domain: "advertising",
  Privacy: "privacy",
});
const SECURITY_TARGETS = Object.freeze({
  off: Object.freeze({ threat: "direct", advertising: "direct", privacy: "direct" }),
  security: Object.freeze({ threat: "block", advertising: "direct", privacy: "direct" }),
  balanced: Object.freeze({ threat: "block", advertising: "block", privacy: "direct" }),
  strict: Object.freeze({ threat: "block", advertising: "block", privacy: "block" }),
});

const PING_RULE = Object.freeze({ type: "field", inboundTag: ["pingIn"], outboundTag: "proxy" });
// Keep the tiny local-network prelude inline. Referencing geosite/geoip here
// makes Xray load OneXray's full built-in GeoData files into the memory-limited
// Apple Packet Tunnel even though only these few private matchers are needed.
const LOCAL_DOMAIN_RULE = Object.freeze({
  type: "field",
  domain: ["full:localhost", "domain:local", "domain:lan", "domain:home.arpa"],
  outboundTag: "direct",
});
const LOCAL_IP_RULE = Object.freeze({
  type: "field",
  ip: [
    "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
    "172.16.0.0/12", "192.168.0.0/16", "224.0.0.0/4",
    "::1/128", "fc00::/7", "fe80::/10", "ff00::/8",
  ],
  outboundTag: "direct",
});

function requiredObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`OneXray ${label} must be an object`);
  }
  return value;
}

function requiredArray(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`OneXray ${label} must be an array`);
  return value;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function oneXrayPort(value) {
  if (value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (Number.isSafeInteger(value) && value >= 1 && value <= 65535) return String(value);
  throw new TypeError(`OneXray routing port must be a string or a port number: ${String(value)}`);
}

function cloneRule(rule) {
  return { ...rule, ...(rule.domain ? { domain: [...rule.domain] } : {}), ...(rule.ip ? { ip: [...rule.ip] } : {}), ...(rule.inboundTag ? { inboundTag: [...rule.inboundTag] } : {}) };
}

function validateDnsRules(dnsRules) {
  const rules = requiredArray(dnsRules, "DNS rules");
  const seen = new Set();
  let tunDnsCount = 0;
  for (const rule of rules) {
    requiredObject(rule, "DNS rule");
    if (rule.type !== "field") throw new TypeError("OneXray DNS rule must use field type");
    for (const key of ["domain", "ip", "inboundTag"]) {
      if (rule[key] !== undefined && (!Array.isArray(rule[key]) || rule[key].length === 0)) {
        throw new Error(`OneXray DNS rule ${key} payload must not be empty`);
      }
    }
    const key = stableStringify(rule);
    if (seen.has(key)) throw new Error("OneXray routing contains duplicate DNS prelude rule");
    seen.add(key);
    if (rule.inboundTag?.includes("tunIn") && rule.outboundTag === "dnsOut") tunDnsCount += 1;
  }
  if (tunDnsCount !== 1) throw new Error("OneXray routing requires exactly one TUN DNS hijack rule");
  return rules.map(cloneRule);
}

function validateOptions(options) {
  requiredObject(options, "routing options");
  if (!BLOCK_MODES.has(options.blockMode)) throw new TypeError("OneXray blockMode is unsupported");
  if (!QUIC_MODES.has(options.quicMode)) throw new TypeError("OneXray quicMode is unsupported");
  return options;
}

function fixedTags(resolution) {
  const tags = new Set(["proxy", "direct", "block"]);
  for (const fixed of requiredArray(resolution.fixedNodes ?? [], "fixed nodes")) {
    requiredObject(fixed, "fixed node");
    if (typeof fixed.tag !== "string" || fixed.tag.length === 0) throw new TypeError("OneXray fixed node tag is invalid");
    if (RESERVED_RUNTIME_TAGS.has(fixed.tag)) throw new Error(`OneXray fixed node uses a reserved outbound tag: ${fixed.tag}`);
    tags.add(fixed.tag);
  }
  if (resolution.finalOutbound !== null && resolution.finalOutbound !== undefined) {
    requiredObject(resolution.finalOutbound, "final outbound");
    if (typeof resolution.finalOutbound.tag !== "string" || resolution.finalOutbound.tag.length === 0) {
      throw new TypeError("OneXray final outbound tag is invalid");
    }
    if (RESERVED_RUNTIME_TAGS.has(resolution.finalOutbound.tag) && resolution.finalOutbound.tag !== "chainProxy") {
      throw new Error(`OneXray final outbound uses an invalid reserved tag: ${resolution.finalOutbound.tag}`);
    }
  }
  return tags;
}

function outboundTagForIntent(intent, resolution, tags = fixedTags(resolution)) {
  if (intent === "direct") return "direct";
  if (intent === "block") return "block";
  if (typeof intent !== "string" || !resolution.targets || !Object.hasOwn(resolution.targets, intent)) {
    throw new Error(`OneXray routing references unknown business intent: ${String(intent)}`);
  }
  const target = resolution.targets[intent];
  if (!target || typeof target.resolvedTag !== "string" || target.resolvedTag.length === 0) {
    throw new Error(`OneXray routing target is missing for business intent: ${intent}`);
  }
  if (!tags.has(target.resolvedTag)) {
    throw new Error(`OneXray routing target references a nonexistent outbound tag: ${target.resolvedTag}`);
  }
  return target.resolvedTag;
}

function sourceIntent(source, blockMode) {
  if (!source || typeof source.id !== "string") throw new TypeError("OneXray routing source is invalid");
  if (Object.hasOwn(SECURITY_CATEGORIES, source.id)) return SECURITY_TARGETS[blockMode][SECURITY_CATEGORIES[source.id]];
  if (DOMESTIC_BUSINESS_SOURCES.has(source.id)) return "domestic";
  if (DOMESTIC_SOURCES.has(source.id)) return "direct";
  if (Object.hasOwn(SERVICE_INTENTS, source.id)) return SERVICE_INTENTS[source.id];
  throw new Error(`OneXray routing source has unknown intent: ${source.id}`);
}

function sourceReference(channel, source) {
  const type = source.id === "ChinaIP" ? "ip" : "domain";
  return { type, value: oneXrayGeoReference(channel, type, source.id) };
}

function sourceRule(channel, source, outboundTag) {
  const reference = sourceReference(channel, source);
  return { type: "field", [reference.type]: [reference.value], outboundTag };
}

function customRuleField(entry) {
  if (typeof entry !== "string" || entry.length === 0) throw new TypeError("OneXray custom rule is invalid");
  const [kind, value, ...modifiers] = entry.split(",");
  if (!value || modifiers.some((modifier) => modifier !== "no-resolve")) throw new Error(`OneXray custom rule has an empty payload: ${entry}`);
  const fields = {
    DOMAIN: ["domain", `full:${value}`],
    "DOMAIN-SUFFIX": ["domain", `domain:${value}`],
    "DOMAIN-KEYWORD": ["domain", `keyword:${value}`],
    "IP-CIDR": ["ip", value],
    "IP-CIDR6": ["ip", value],
  };
  const field = fields[kind];
  if (!field) throw new Error(`OneXray custom rule has an unsupported kind: ${kind}`);
  return { type: "field", [field[0]]: [field[1]] };
}

function customRules(resolution, tags) {
  const rules = [];
  for (const [kind, entries] of Object.entries(CUSTOM_RULES)) {
    const intent = kind === "proxy" ? "final" : kind;
    const outboundTag = outboundTagForIntent(intent, resolution, tags);
    for (const entry of entries) {
      const rule = customRuleField(entry);
      rule.outboundTag = outboundTag;
      rules.push({ rule, proxyBound: outboundTag !== "direct" && outboundTag !== "block" });
    }
  }
  return rules;
}

function canCoalesce(left, right) {
  const leftKeys = Object.keys(left).filter((key) => key !== "domain" && key !== "ip");
  const rightKeys = Object.keys(right).filter((key) => key !== "domain" && key !== "ip");
  if (leftKeys.length !== rightKeys.length || leftKeys.some((key) => !rightKeys.includes(key))) return false;
  if (left.domain && right.domain) return leftKeys.every((key) => left[key] === right[key]);
  if (left.ip && right.ip) return leftKeys.every((key) => left[key] === right[key]);
  return false;
}

function appendRule(rules, rule) {
  const previous = rules.at(-1);
  if (previous && canCoalesce(previous, rule)) {
    const key = rule.domain ? "domain" : "ip";
    previous[key].push(...rule[key]);
    return;
  }
  rules.push(cloneRule(rule));
}

function quicRule(rule) {
  const matcher = rule.domain ? { domain: [...rule.domain] } : { ip: [...rule.ip] };
  return { type: "field", ...matcher, network: "udp", port: "443", outboundTag: "block" };
}

function addRouteRule(rules, rule, { quicMode, proxyBound }) {
  if (quicMode === "proxy-block" && proxyBound) rules.push(quicRule(rule));
  appendRule(rules, rule);
}

function validateRouteSemantics(rules) {
  for (const rule of rules) {
    if (rule.domain && rule.domain.length === 0) throw new Error("OneXray routing domain payload must not be empty");
    if (rule.ip && rule.ip.length === 0) throw new Error("OneXray routing IP payload must not be empty");
    if (rule.outboundTag === "" || rule.outboundTag === undefined) throw new Error("OneXray routing outbound target is empty");
  }
}

/**
 * Compiles the shared lightweight routing plan into Xray field rules. Runtime
 * TUN, platform, balancer, and observatory settings intentionally remain in
 * the native OneXray host; this module only emits deterministic match rules.
 */
export function renderOneXrayRouting({ options, resolution, dnsRules } = {}) {
  validateOptions(options);
  requiredObject(resolution, "policy resolution");
  if (!resolution.targets || typeof resolution.targets !== "object" || Array.isArray(resolution.targets)) {
    throw new TypeError("OneXray policy resolution targets must be an object");
  }
  const tags = fixedTags(resolution);
  const rules = validateDnsRules(dnsRules);
  rules.push(cloneRule(PING_RULE));
  rules.push(cloneRule(LOCAL_DOMAIN_RULE));
  rules.push(cloneRule(LOCAL_IP_RULE));

  if (options.quicMode === "all-block") rules.push({ type: "field", network: "udp", port: "443", outboundTag: "block" });

  const plan = orderedRoutingPlan();
  const renderSource = (source) => {
    const intent = sourceIntent(source, options.blockMode);
    const outboundTag = outboundTagForIntent(intent, resolution, tags);
    const rule = sourceRule(options.channel, source);
    rule.outboundTag = outboundTag;
    addRouteRule(rules, rule, {
      quicMode: options.quicMode,
      proxyBound: outboundTag !== "direct" && outboundTag !== "block" && source.phase !== "security",
    });
  };

  for (const source of plan.filter(({ phase }) => phase === "security")) renderSource(source);

  for (const { rule, proxyBound } of customRules(resolution, tags)) {
    addRouteRule(rules, rule, { quicMode: options.quicMode, proxyBound });
  }

  for (const source of plan.filter(({ phase }) => phase !== "security")) renderSource(source);

  const finalTag = outboundTagForIntent("final", resolution, tags);
  if (options.quicMode === "proxy-block" && finalTag !== "direct" && finalTag !== "block") {
    // This late catch-all protects traffic that reaches the proxy final rule,
    // while all explicit domestic rules above it retain their UDP allowance.
    rules.push({ type: "field", network: "udp", port: "443", outboundTag: "block" });
  }
  // Xray rejects a rule with no effective matcher field, so the final
  // catch-all must carry an explicit network scope instead of only
  // `outboundTag`. TUN traffic is always TCP or UDP.
  rules.push({ type: "field", network: "tcp,udp", outboundTag: finalTag });
  const normalizedRules = rules.map((rule) => (rule.port === undefined ? rule : { ...rule, port: oneXrayPort(rule.port) }));
  validateRouteSemantics(normalizedRules);
  return { domainStrategy: "IPIfNonMatch", rules: normalizedRules };
}

export { outboundTagForIntent };
