import { chinaDnsProvider, globalDnsProvider } from "../../../shared/dns/providers.js";
import { orderedRoutingPlan, policyForRuleSource } from "../../../shared/rules/lightweight-policy.js";
import { HAPP_GEOSITE_ALIASES, HAPP_GEOIP_ALIASES } from "../../../shared/happ-geodata-contract.js";
import { unifiedPolicyTargetByKey } from "../../../shared/policies/unified-policy.js";
import { defaultUnifiedPolicyResolution } from "../../../shared/policies/resolve-unified.js";
import { platformPolicyPreset } from "../../../shared/policies/platform-presets.js";

const PRIVATE_DOMAINS = Object.freeze(["localhost", "localhost.localdomain", "local", "localdomain", "lan", "home.arpa", "geosite:PRIVATE"]);
const PRIVATE_IPS = Object.freeze(["geoip:PRIVATE"]);
const DEFAULT_OPTIONS = Object.freeze({
  chinaDns: "alidns",
  globalDns: "cloudflare",
  adblockMode: "off",
  quicMode: "proxy-block",
  autoGroupMode: "auto",
});

function asMap(value) {
  if (value instanceof Map) return value;
  if (!value || typeof value !== "object") return new Map();
  return new Map(Object.entries(value));
}

function routeTargetKey(record) {
  return record?.nodeId ?? record?.resolved ?? record?.configured ?? null;
}

export function routeTargetForPolicy(record, tags = {}) {
  const resolved = record?.resolved ?? record?.configured;
  if (resolved === "FOLLOW" || resolved === undefined || resolved === null) return tags.followTag;
  if (resolved === "DIRECT") return tags.directTag;
  if (resolved === "REJECT") return tags.blockTag;

  const balancerTags = asMap(tags.balancerTags);
  const balancerTag = balancerTags.get(routeTargetKey(record));
  if (balancerTag) return balancerTag;

  if (record?.status === "fixed" || /^NODE[:~]/iu.test(record?.configured ?? "")) {
    throw new Error("INCY policy target balancer tag is missing");
  }
  return tags.followTag;
}

function targetIdForSource(sourceId) {
  if (sourceId === "__final__") return "final";
  if (policyForRuleSource(sourceId) === "DIRECT") return "domesticPlatform";
  return unifiedPolicyTargetByKey(policyForRuleSource(sourceId))?.id ?? "final";
}

function buildDnsDirectRules(options) {
  const rules = [];
  const value = { ...DEFAULT_OPTIONS, ...options };
  const providers = [
    chinaDnsProvider(value.chinaDns),
    ...(value.dnsMode === "privacy" ? [] : [globalDnsProvider(value.globalDns)]),
  ];
  const domains = new Set();
  const ips = new Set();
  for (const provider of providers) {
    if (provider.doh === "system") continue;
    try {
      const url = new URL(provider.doh);
      if (url.hostname) domains.add(url.hostname);
    } catch {
      // The provider catalogue is trusted, but we still fail closed if it drifts.
      throw new Error("INCY DNS provider has an invalid DoH endpoint");
    }
    if (typeof provider.serverName === "string" && provider.serverName.length > 0) domains.add(provider.serverName);
    if (typeof provider.address === "string" && provider.address !== "local") ips.add(provider.address);
  }
  if (domains.size > 0 || ips.size > 0) {
    rules.push({
      type: "field",
      ...(domains.size > 0 ? { domain: [...domains] } : {}),
      ...(ips.size > 0 ? { ip: [...ips] } : {}),
      outboundTag: options.directTag,
    });
  }
  return rules;
}

function fixedPolicyNodes(policyResolution, fixedOutbounds) {
  const fixed = Array.isArray(policyResolution?.fixedNodes) ? policyResolution.fixedNodes : [];
  const outboundByKey = new Map();
  for (const outbound of Array.isArray(fixedOutbounds) ? fixedOutbounds : []) {
    if (!outbound || typeof outbound !== "object") continue;
    const key = outbound.nodeId ?? outbound.resolved ?? outbound.name ?? null;
    const candidateTag = outbound.tag ?? outbound.outboundTag ?? null;
    if (key && candidateTag) outboundByKey.set(key, candidateTag);
    if (typeof outbound.nodeId === "string" && candidateTag) outboundByKey.set(outbound.nodeId, candidateTag);
    if (typeof outbound.resolved === "string" && candidateTag) outboundByKey.set(outbound.resolved, candidateTag);
  }
  return { fixed, outboundByKey };
}

function derivedBalancerTags(fixedOutbounds) {
  const tags = new Map();
  for (const outbound of Array.isArray(fixedOutbounds) ? fixedOutbounds : []) {
    if (!outbound || typeof outbound !== "object") continue;
    const candidateTag = outbound.tag ?? outbound.outboundTag ?? null;
    if (!candidateTag) continue;
    const balancerTag = candidateTag.startsWith("balancer-") ? candidateTag : `balancer-${candidateTag}`;
    for (const key of [outbound.nodeId, outbound.resolved, outbound.name]) {
      if (typeof key === "string" && key.length > 0) tags.set(key, balancerTag);
    }
  }
  return tags;
}

export function renderIncyBalancers(policyResolution, fixedOutbounds, followTag, options = {}) {
  const preset = platformPolicyPreset(options.platform ?? "iphone");
  const { fixed, outboundByKey } = fixedPolicyNodes(policyResolution, fixedOutbounds);
  const balancers = [];
  const subjectSelector = [followTag];

  for (const entry of fixed) {
    const candidateTag = outboundByKey.get(entry.nodeId) ?? outboundByKey.get(entry.name);
    if (!candidateTag) {
      throw new Error("INCY fixed policy target has no matching outbound");
    }
    const balancerTag = `balancer-${candidateTag}`;
    balancers.push({
      tag: balancerTag,
      selector: [candidateTag],
      strategy: { type: "leastPing" },
      fallbackTag: followTag,
    });
    subjectSelector.push(candidateTag);
  }

  const subjectCount = subjectSelector.length;
  const requestedMode = options.autoGroupMode ?? "auto";
  const effectiveMode = requestedMode === "auto"
    ? subjectCount <= 30 ? "full" : subjectCount <= 100 ? "balanced" : "minimal"
    : requestedMode;
  if (!["full", "balanced", "minimal"].includes(effectiveMode)) {
    throw new Error(`INCY autoGroupMode is unsupported: ${requestedMode}`);
  }
  const scale = { full: 1, balanced: 2, minimal: 4 }[effectiveMode];
  const observatoryPreset = {
    testInterval: preset.testInterval * scale,
    timeout: preset.timeout,
    tolerance: preset.tolerance * scale,
  };

  return {
    balancers,
    observatory: {
      subjectSelector,
      probeUrl: "https://www.gstatic.com/generate_204",
      ...observatoryPreset,
    },
  };
}

function policyRuleForSource(sourceId, resolution, tags) {
  const targetId = targetIdForSource(sourceId);
  const record = resolution?.targets?.[targetId];
  if (!record) return { outboundTag: tags.followTag };
  return { outboundTag: routeTargetForPolicy(record, tags) };
}

const BLOCKED_SECURITY_SOURCES = new Set(["Hijacking", "BlockHttpDNS", "Advertising", "Advertising_Domain"]);

function ruleForItem(item, resolution, tags, options) {
  const isChinaIp = item.id === "ChinaIP";
  const isChinaTld = item.id === "ChinaTLD";
  const source = isChinaIp
    ? `geoip:${HAPP_GEOIP_ALIASES[item.id] ?? "CN"}`
    : `geosite:${HAPP_GEOSITE_ALIASES[item.id] ?? item.id.toUpperCase()}`;
  const target = BLOCKED_SECURITY_SOURCES.has(item.id)
    ? { outboundTag: options.blockMode === "off" ? tags.directTag : tags.blockTag }
    : item.id === "Privacy"
      ? { outboundTag: tags.directTag }
      : item.policy === "REJECT"
        ? { outboundTag: tags.blockTag }
    : policyRuleForSource(item.id, resolution, tags);
  return {
    type: "field",
    ...(isChinaIp ? { ip: [source] } : { domain: [source] }),
    ...target,
  };
}

function dnsProtectionRule(options) {
  return buildDnsDirectRules(options);
}

export function renderIncyRouting({
  options = {},
  policyResolution = null,
  fixedOutbounds = [],
  followTag,
  directTag,
  blockTag,
  balancerTags = null,
} = {}) {
  const resolution = policyResolution ?? defaultUnifiedPolicyResolution();
  const value = { ...DEFAULT_OPTIONS, ...options };
  if (!["allow", "proxy-block", "all-block"].includes(value.quicMode)) {
    throw new Error(`INCY quicMode is unsupported: ${value.quicMode}`);
  }
  const tags = {
    followTag,
    directTag,
    blockTag,
    balancerTags: balancerTags ?? derivedBalancerTags(fixedOutbounds),
  };
  const rules = [
    {
      type: "field",
      domain: [...PRIVATE_DOMAINS],
      ip: [...PRIVATE_IPS],
      outboundTag: directTag,
    },
  ];

  let chinaIpRule = null;
  let quicRuleInserted = false;
  for (const item of orderedRoutingPlan({ adblockMode: value.adblockMode })) {
    if (!quicRuleInserted && item.phase !== "security" && value.quicMode !== "allow") {
      rules.push({
        type: "field",
        network: "udp",
        port: 443,
        outboundTag: value.quicMode === "all-block" ? blockTag : directTag,
      });
      quicRuleInserted = true;
    }
    const rule = ruleForItem(item, resolution, tags, value);
    if (item.id === "ChinaIP") {
      chinaIpRule = rule;
      continue;
    }
    rules.push(rule);
    if (item.id === "ChinaTLD") {
      rules.push(...dnsProtectionRule({ ...value, directTag }));
    }
  }

  if (chinaIpRule) rules.push(chinaIpRule);
  if (!quicRuleInserted && value.quicMode !== "allow") {
    rules.push({
      type: "field",
      network: "udp",
      port: 443,
      outboundTag: value.quicMode === "all-block" ? blockTag : directTag,
    });
  }
  rules.push({ type: "field", network: "tcp,udp", outboundTag: followTag });

  return {
    domainStrategy: "IPIfNonMatch",
    rules,
  };
}
