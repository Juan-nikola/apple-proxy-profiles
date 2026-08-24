import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { businessTargetForSource } from "./policy-overrides.js";
import { renderHappOutbound } from "./render-node.js";
import { renderHappDnsRoutes } from "./render-dns.js";
import { HAPP_GEOSITE_ALIASES } from "./geodata-contract.js";
import { buildHappDisplayTag } from "./tag-label.js";

function hash(value) { let h = 2166136261; for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(36); }
function targetFor(id, resolution, followTag, fixedById, followNodeId) {
  const targetId = businessTargetForSource(id);
  const record = resolution?.targets?.[targetId];
  if (!record || record.resolved === "FOLLOW") return { outboundTag: followTag };
  if (record.resolved === "DIRECT") return { outboundTag: "happ-direct" };
  if (record.nodeId === followNodeId) return { outboundTag: followTag };
  const fixed = fixedById.get(record.nodeId);
  if (!fixed) throw new Error("HAPP fixed policy node is unavailable");
  return { balancerTag: fixed.balancerTag };
}

export function renderHappRouting(context = {}) {
  const followTag = context.followTag ?? "happ-follow/current";
  const resolution = context.policyResolution ?? { targets: {} };
  const options = context.options ?? {};
  const fixedRecords = Array.isArray(context.fixedNodes) ? context.fixedNodes : (resolution.fixedNodes ?? []);
  const nodes = Array.isArray(context.nodes) ? context.nodes : [];
  const fixedById = new Map();
  const outbounds = [];
  const balancers = [];
  // Every JSON entry has one active follow outbound. Observe it so HAPP can
  // report a ping result even when no fixed-node policy creates a balancer.
  const observatorySelectors = [followTag];
  for (const fixed of fixedRecords) {
    if (fixed.nodeId && fixed.nodeId === context.followNodeId) continue;
    const node = fixed.node ?? nodes.find((candidate) => (candidate._profile?.id ?? "") === fixed.nodeId);
    if (!node) continue;
    const suffix = hash(fixed.nodeId);
    const displayName = fixed.name ?? node.name;
    const stableTagId = `${fixed.nodeId}-${suffix}`;
    const candidateTag = buildHappDisplayTag("happ-fixed", displayName, stableTagId, "candidate");
    const balancerTag = buildHappDisplayTag("happ-fixed", displayName, stableTagId, "balancer");
    fixedById.set(fixed.nodeId, { candidateTag, balancerTag });
    outbounds.push((context.renderNode ?? renderHappOutbound)(node, candidateTag));
    balancers.push({ tag: balancerTag, selector: [candidateTag], strategy: { type: "leastPing" }, fallbackTag: followTag });
    observatorySelectors.push(candidateTag);
  }
  const rules = [
    { type: "field", ip: ["geoip:PRIVATE"], outboundTag: "happ-direct" },
    { type: "field", domain: ["geosite:PRIVATE"], outboundTag: "happ-direct" },
  ];
  let quicRuleInserted = false;
  for (const item of orderedRoutingPlan({ adblockMode: "off" })) {
    if (!quicRuleInserted && item.phase !== "security" && (options.quicMode === "proxy-block" || options.quicMode === "all-block")) {
      rules.push({ type: "field", network: "quic", outboundTag: options.quicMode === "all-block" ? "happ-block" : "happ-direct" });
      quicRuleInserted = true;
    }
    const isIp = item.id === "ChinaIP";
    const source = isIp
      ? "geoip:CN"
      : "geosite:" + (HAPP_GEOSITE_ALIASES[item.id] ?? item.id.toUpperCase());
    const target = item.policy === "REJECT"
      ? { outboundTag: options.blockMode === "off" ? "happ-direct" : "happ-block" }
      : targetFor(item.id, resolution, followTag, fixedById, context.followNodeId);
    rules.push({ type: "field", ...(isIp ? { ip: [source] } : { domain: [source] }), ...target });
  }
  if (!quicRuleInserted && (options.quicMode === "proxy-block" || options.quicMode === "all-block")) rules.push({ type: "field", network: "quic", outboundTag: options.quicMode === "all-block" ? "happ-block" : "happ-direct" });
  const dnsTarget = resolution?.targets?.dnsAndRules;
  const dnsFixed = dnsTarget?.nodeId ? fixedById.get(dnsTarget.nodeId) : null;
  const globalDnsOutbound = dnsTarget?.resolved === "DIRECT" ? "happ-direct" : dnsFixed?.candidateTag ?? followTag;
  rules.splice(2, 0, ...renderHappDnsRoutes({ followTag, globalOutboundTag: globalDnsOutbound, platform: options.platform }));
  const finalTarget = targetFor("__final__", resolution, followTag, fixedById, context.followNodeId);
  rules.push({ type: "field", network: "tcp,udp", ...finalTarget });
  const routing = { domainStrategy: "IPIfNonMatch", rules };
  const policyTargets = {};
  for (const [targetId, record] of Object.entries(resolution.targets ?? {})) {
    if (record.resolved === "DIRECT") policyTargets[targetId] = "happ-direct";
    else if (record.resolved === "FOLLOW") policyTargets[targetId] = followTag;
    else if (fixedById.has(record.nodeId)) policyTargets[targetId] = fixedById.get(record.nodeId).balancerTag;
    else policyTargets[targetId] = followTag;
  }
  return { routing, observatory: { subjectSelector: observatorySelectors, probeUrl: "https://www.gstatic.com/generate_204", probeInterval: "30s", enableConcurrency: true, timeout: 5000 }, policyTargets, fixedOutbounds: outbounds, balancers };
}
