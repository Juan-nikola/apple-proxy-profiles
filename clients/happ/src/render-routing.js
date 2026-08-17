import { createHash } from "node:crypto";

import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { HAPP_DIRECT_TAG, renderHappDnsRoutes } from "./render-dns.js";

export const HAPP_BLOCK_TAG = "happ-block";
export const HAPP_OBSERVATORY = Object.freeze({
  probeUrl: "https://www.google.com/generate_204",
  probeInterval: "10m",
  enableConcurrency: true,
});

const BUSINESS_KEY_BY_SOURCE_POLICY = Object.freeze({
  DIRECT: "🇨🇳 国内平台",
  "🤖 AI 专用": "🤖 AI 专用",
  "🐙 GitHub": "🐙 GitHub",
  "📺 YouTube": "📺 YouTube",
  "🎬 海外流媒体": "🎬 海外流媒体",
  "💬 海外社交": "💬 海外社交",
  "🇨🇳 国内平台": "🇨🇳 国内平台",
  "🍎 Apple": "🍎 Apple",
  "🪟 Microsoft": "🪟 Microsoft",
  "🌍 海外游戏": "🌍 海外游戏",
  "⬇️ 下载/P2P": "⬇️ 下载/P2P",
});
const CUSTOM_TARGET_KEYS = Object.freeze({
  block: null,
  direct: "🇨🇳 国内平台",
  proxy: "最终兜底",
  ai: "🤖 AI 专用",
});
const SECURITY_TARGETS = Object.freeze({
  off: Object.freeze({ threat: HAPP_DIRECT_TAG, privacy: HAPP_DIRECT_TAG }),
  security: Object.freeze({ threat: HAPP_BLOCK_TAG, privacy: HAPP_DIRECT_TAG }),
  balanced: Object.freeze({ threat: HAPP_BLOCK_TAG, privacy: HAPP_DIRECT_TAG }),
  strict: Object.freeze({ threat: HAPP_BLOCK_TAG, privacy: HAPP_BLOCK_TAG }),
});
const LOCAL_RULES = Object.freeze([
  Object.freeze({ domain: Object.freeze(["domain:local", "domain:home.arpa", "domain:lan"]), outboundTag: HAPP_DIRECT_TAG, ruleTag: "local-domains" }),
  Object.freeze({ ip: Object.freeze(["geoip:private"]), outboundTag: HAPP_DIRECT_TAG, ruleTag: "local-private" }),
]);
const CUSTOM_FIELDS = Object.freeze({
  DOMAIN: ["domain", "full:"],
  "DOMAIN-SUFFIX": ["domain", "domain:"],
  "DOMAIN-KEYWORD": ["domain", "keyword:"],
  "IP-CIDR": ["ip", ""],
  "IP-CIDR6": ["ip", ""],
});

function normalizedId(value, label) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error(`Happ ${label} must be a normalized identity ID`);
  }
  return value;
}

export function happFollowTag(nodeId) {
  return `happ-follow/${normalizedId(nodeId, "FOLLOW node")}`;
}

function fixedTagPrefix(nodeId) {
  const id = normalizedId(nodeId, "fixed node");
  const hash = createHash("sha256").update(`happ-fixed\u0000${id}`, "utf8").digest("base64url");
  return `happ-fixed/${hash}`;
}

function fixedTopology(nodeId, followNodeId) {
  if (nodeId === followNodeId) return null;
  const prefix = fixedTagPrefix(nodeId);
  return Object.freeze({
    candidateTag: `${prefix}/candidate`,
    balancerTag: `${prefix}/balancer`,
  });
}

function targetReference(target) {
  if (Object.hasOwn(target, "outboundTag")) return { outboundTag: target.outboundTag };
  return { balancerTag: target.balancerTag };
}

function requireResolution(resolution) {
  if (!resolution || typeof resolution !== "object" || Array.isArray(resolution)
    || !resolution.targets || typeof resolution.targets !== "object" || Array.isArray(resolution.targets)
    || !Array.isArray(resolution.fixedNodes)) {
    throw new TypeError("Happ policy resolution is invalid");
  }
  return resolution;
}

function policyTargets(resolution, followNodeId) {
  const followTag = happFollowTag(followNodeId);
  const topologyByNodeId = new Map();
  for (const nodeId of resolution.fixedNodes) {
    const topology = fixedTopology(normalizedId(nodeId, "fixed node"), followNodeId);
    if (topology) topologyByNodeId.set(nodeId, topology);
  }
  const targets = {};
  for (const [businessKey, resolutionTarget] of Object.entries(resolution.targets)) {
    if (!resolutionTarget || typeof resolutionTarget !== "object") {
      throw new Error("Happ policy target is invalid");
    }
    if (resolutionTarget.resolved === "DIRECT") {
      targets[businessKey] = Object.freeze({ outboundTag: HAPP_DIRECT_TAG });
    } else if (resolutionTarget.resolved === "FOLLOW") {
      targets[businessKey] = Object.freeze({ outboundTag: followTag });
    } else if (typeof resolutionTarget.nodeId === "string") {
      const topology = topologyByNodeId.get(resolutionTarget.nodeId);
      if (topology) targets[businessKey] = Object.freeze({ ...topology, dnsOutboundTag: topology.candidateTag });
      else if (resolutionTarget.nodeId === followNodeId) targets[businessKey] = Object.freeze({ outboundTag: followTag });
      else throw new Error("Happ fixed policy target is invalid");
    } else {
      throw new Error("Happ policy target is invalid");
    }
  }
  return { followTag, topologyByNodeId, targets: Object.freeze(targets) };
}

function securityTarget(source, options) {
  const mode = SECURITY_TARGETS[options.blockMode];
  if (!mode) throw new Error("Happ block mode is unsupported");
  return source.id === "Privacy" ? mode.privacy : mode.threat;
}

function sourceTarget(source, targets, options) {
  if (source.phase === "security") return { outboundTag: securityTarget(source, options) };
  const businessKey = BUSINESS_KEY_BY_SOURCE_POLICY[source.policy];
  if (!businessKey || !targets[businessKey]) throw new Error(`Happ rule source policy is unsupported: ${source.id}`);
  return targetReference(targets[businessKey]);
}

function sourceMatch(source) {
  const tag = `HAPP-${source.id.toUpperCase()}`;
  return source.id === "ChinaIP" ? { ip: [`geoip:${tag}`] } : { domain: [`geosite:${tag}`] };
}

function renderSourceRule(source, targets, options) {
  return { ...sourceMatch(source), ...sourceTarget(source, targets, options), ruleTag: source.id };
}

function renderCustomRules(targets) {
  const rules = [];
  for (const [kind, entries] of Object.entries(CUSTOM_RULES)) {
    const businessKey = CUSTOM_TARGET_KEYS[kind];
    const target = businessKey ? targetReference(targets[businessKey]) : { outboundTag: HAPP_BLOCK_TAG };
    for (const [index, entry] of entries.entries()) {
      const [type, value, ...modifiers] = entry.split(",");
      const field = CUSTOM_FIELDS[type];
      if (!field || !value || modifiers.length > 0) throw new Error(`Happ custom rule cannot be rendered: ${entry}`);
      const [key, prefix] = field;
      rules.push({ [key]: [`${prefix}${value}`], ...target, ruleTag: `custom-${kind}-${index}` });
    }
  }
  return rules;
}

function quicRules(plan, options) {
  if (options.quicMode === "allow") return [];
  if (options.quicMode === "all-block") {
    return [{ network: "udp", port: "443", outboundTag: HAPP_BLOCK_TAG, ruleTag: "quic-block-all" }];
  }
  if (options.quicMode !== "proxy-block") throw new Error("Happ QUIC mode is unsupported");
  return plan.filter(({ dnsClass }) => dnsClass === "proxy").map((source) => ({
    ...sourceMatch(source), network: "udp", port: "443", outboundTag: HAPP_BLOCK_TAG, ruleTag: `quic-block-${source.id.toUpperCase()}`,
  }));
}

function observatory(topologyByNodeId) {
  const subjectSelector = [...topologyByNodeId.values()].map(({ candidateTag }) => candidateTag).sort();
  return { subjectSelector, ...HAPP_OBSERVATORY };
}

function balancers(topologyByNodeId, followTag) {
  return [...topologyByNodeId.values()]
    .sort((left, right) => left.balancerTag.localeCompare(right.balancerTag, "en"))
    .map(({ candidateTag, balancerTag }) => ({
      tag: balancerTag,
      selector: [candidateTag],
      fallbackTag: followTag,
      strategy: { type: "leastPing" },
    }));
}

function dnsTarget(resolution, targets) {
  const key = "🧭 DNS 与规则下载";
  const target = targets[key];
  if (!target) throw new Error("Happ DNS policy target is missing");
  return {
    resolved: resolution.targets[key]?.resolved,
    outboundTag: target.dnsOutboundTag ?? target.outboundTag,
  };
}

/** Renders an Xray routing graph; Task 6 supplies outbounds with the returned opaque tags. */
export function renderHappRouting({ options, policyResolution, followNodeId }) {
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Happ routing options are invalid");
  const resolution = requireResolution(policyResolution);
  const { followTag, topologyByNodeId, targets } = policyTargets(resolution, normalizedId(followNodeId, "FOLLOW node"));
  const plan = orderedRoutingPlan({ adblockMode: options.adblockMode ?? "off" });
  const rules = [
    ...renderHappDnsRoutes({ ...options, dnsTarget: dnsTarget(resolution, targets) }),
    ...LOCAL_RULES.map((rule) => structuredClone(rule)),
    ...plan.filter(({ phase }) => phase === "security").map((source) => renderSourceRule(source, targets, options)),
    ...quicRules(plan, options),
    ...renderCustomRules(targets),
    ...plan.filter(({ phase }) => phase !== "security").map((source) => renderSourceRule(source, targets, options)),
    { network: "tcp,udp", ...targetReference(targets["最终兜底"]), ruleTag: "最终兜底" },
  ];
  return {
    routing: { domainStrategy: "IPIfNonMatch", rules, balancers: balancers(topologyByNodeId, followTag) },
    observatory: observatory(topologyByNodeId),
    policyTargets: targets,
  };
}
