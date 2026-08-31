import { CLIENT } from "../contracts.js";
import { resolveNodeReference } from "../nodes/node-reference.js";
import { parsePrivatePolicy, resolvePrivatePolicy } from "./private-policy.js";
import { UNIFIED_POLICY_TARGETS, defaultUnifiedPolicyTargets } from "./unified-policy.js";

const LEGACY_TO_UNIFIED = Object.freeze({
  ai: "ai", github: "github", youtube: "youtube",
  overseasMedia: "overseasMedia", globalMedia: "overseasMedia",
  globalSocial: "globalSocial", overseasGame: "overseasGame",
  domesticCore: "domesticPlatform", domesticPlatform: "domesticPlatform",
  domestic: "domesticPlatform", chinaIp: "domesticPlatform",
  apple: "apple", microsoft: "microsoft", download: "download",
  dnsAndRules: "dnsAndRules", final: "final", game: "game",
});

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function configuredTargets(policy, { channel, client }) {
  const defaults = defaultUnifiedPolicyTargets();
  if (!policy) return defaults;
  const parsed = typeof policy === "string" || policy instanceof Uint8Array
    ? parsePrivatePolicy(policy)
    : policy;
  const resolved = resolvePrivatePolicy({ policy: parsed, channel, client });
  if (parsed.schemaVersion === 2 || parsed.schemaVersion === 3) return { ...defaults, ...resolved.targets };
  const result = { ...defaults };
  for (const [legacyId, value] of Object.entries(resolved.targets ?? {})) {
    const id = LEGACY_TO_UNIFIED[legacyId];
    if (id) result[id] = value;
  }
  return result;
}

function record(configured) {
  if (configured === "DIRECT") return { configured, resolved: "DIRECT", status: "direct", warningCode: null, nodeId: null };
  if (configured === "FOLLOW") return { configured, resolved: "FOLLOW", status: "follow", warningCode: null, nodeId: null };
  return { configured, resolved: configured, status: "fixed", warningCode: null, nodeId: null };
}

function addLegacyAliases(targets) {
  targets.globalMedia = targets.overseasMedia;
  targets.domestic = targets.domesticPlatform;
  targets.domesticCore = targets.domesticPlatform;
  targets.chinaIp = targets.domesticPlatform;
  return targets;
}

export function defaultUnifiedPolicyResolution() {
  const values = defaultUnifiedPolicyTargets();
  return freeze({
    targets: addLegacyAliases(Object.fromEntries(Object.entries(values).map(([id, value]) => [id, record(value)]))),
    fixedNodes: [],
    warnings: [],
  });
}

export function resolveUnifiedPolicy({
  policy = null,
  channel = "current",
  client = CLIENT.surge,
  allNodes = [],
  eligibleNodes = allNodes,
} = {}) {
  const values = configuredTargets(policy, { channel, client });
  const targets = {};
  const fixedNodes = [];
  const fixedIds = new Set();
  for (const target of UNIFIED_POLICY_TARGETS) {
    const configured = values[target.id] ?? target.defaultTarget;
    const resolved = record(configured);
    if (/^NODE[:~]/iu.test(configured)) {
      const node = resolveNodeReference({ target: configured, allNodes, eligibleNodes, client });
      const nodeId = node?._profile?.id ?? `node-${fixedNodes.length}`;
      resolved.resolved = node.name;
      resolved.nodeId = nodeId;
      if (!fixedIds.has(nodeId)) {
        fixedIds.add(nodeId);
        fixedNodes.push({ nodeId, node, name: node.name });
      }
    }
    targets[target.id] = resolved;
  }
  addLegacyAliases(targets);
  return freeze({ targets, fixedNodes, warnings: [] });
}

export function policyGroupDefaults(resolution) {
  const defaults = {};
  for (const target of UNIFIED_POLICY_TARGETS) {
    const value = resolution?.targets?.[target.id]?.resolved;
    defaults[target.label] = value === "DIRECT" ? "DIRECT" : value === "FOLLOW" || !value ? "🚀 节点选择" : value;
  }
  return Object.freeze(defaults);
}
