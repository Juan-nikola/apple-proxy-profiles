import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { policyForRuleSource } from "../../../shared/rules/lightweight-policy.js";
import { unifiedPolicyTargetByKey } from "../../../shared/policies/unified-policy.js";
import { renderHappOutbound } from "./render-node.js";
import { renderHappDnsRoutes } from "./render-dns.js";
import { createHappTagPlan, nodeIdFor } from "./tag-plan.js";
import { HAPP_GEOSITE_ALIASES } from "../../../shared/happ-geodata-contract.js";

function businessTargetForSource(sourceId) {
  if (sourceId === "__final__") return "final";
  if (["DomesticCore", "DomesticGame", "SteamCN", "BiliBili", "ByteDance", "XiaoHongShu", "Weibo", "ChinaTLD", "ChinaIP"].includes(sourceId)) return "domesticPlatform";
  return unifiedPolicyTargetByKey(policyForRuleSource(sourceId))?.id ?? "final";
}
function targetFor(id, resolution, followTag, fixedById) {
  const targetId = businessTargetForSource(id);
  const record = resolution?.targets?.[targetId];
  if (!record || record.resolved === "FOLLOW") return { outboundTag: followTag };
  if (record.resolved === "DIRECT") return { outboundTag: "happ-direct" };
  const fixed = fixedById.get(record.nodeId);
  // Xray requires balancerTag for a routing rule that targets a balancer.
  // outboundTag would make the generated config fail at runtime because a
  // balancer is not an outbound entry.
  return fixed ? { balancerTag: fixed.balancerTag } : { outboundTag: followTag };
}

export function renderHappRouting(context = {}) {
  const resolution = context.policyResolution ?? { targets: {} };
  const options = context.options ?? {};
  const fixedRecords = Array.isArray(context.fixedNodes) ? context.fixedNodes : (resolution.fixedNodes ?? []);
  const nodes = Array.isArray(context.nodes) ? context.nodes : [];
  const fixedTagNodes = fixedRecords.map((fixed) => {
    if (!fixed?.node || !fixed.nodeId || nodeIdFor(fixed.node) === fixed.nodeId) return fixed?.node;
    return { ...fixed.node, _profile: { ...(fixed.node._profile ?? {}), id: fixed.nodeId } };
  }).filter(Boolean);
  const tagPlan = context.tagPlan ?? createHappTagPlan([
    ...nodes,
    ...fixedTagNodes,
  ]);
  const followTag = context.followNodeId && tagPlan.has(context.followNodeId)
    ? tagPlan.follow(context.followNodeId)
    : context.followTag ?? "happ-follow/current";
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
    const fixedNodeId = fixed.nodeId ?? nodeIdFor(node);
    const candidateTag = tagPlan.fixedCandidate(fixedNodeId);
    const balancerTag = tagPlan.fixedBalancer(fixedNodeId);
    fixedById.set(fixedNodeId, { candidateTag, balancerTag });
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
      // Xray's network matcher only accepts tcp/udp. QUIC is UDP/443 at the
      // routing layer; using network=quic is silently ignored by the core.
      rules.push({ type: "field", network: "udp", port: 443, outboundTag: options.quicMode === "all-block" ? "happ-block" : "happ-direct" });
      quicRuleInserted = true;
    }
    const isIp = item.id === "ChinaIP";
    const source = isIp
      ? "geoip:CN"
      : "geosite:" + (HAPP_GEOSITE_ALIASES[item.id] ?? item.id.toUpperCase());
    const target = item.policy === "REJECT"
      ? { outboundTag: options.blockMode === "off" ? "happ-direct" : "happ-block" }
      : targetFor(item.id, resolution, followTag, fixedById);
    rules.push({ type: "field", ...(isIp ? { ip: [source] } : { domain: [source] }), ...target });
  }
  if (!quicRuleInserted && (options.quicMode === "proxy-block" || options.quicMode === "all-block")) rules.push({ type: "field", network: "udp", port: 443, outboundTag: options.quicMode === "all-block" ? "happ-block" : "happ-direct" });
  const dnsTarget = resolution?.targets?.dnsAndRules;
  const dnsFixed = dnsTarget?.nodeId ? fixedById.get(dnsTarget.nodeId) : null;
  const globalDnsOutbound = dnsTarget?.resolved === "DIRECT" ? "happ-direct" : followTag;
  // DNS server hints are deliberately appended after concrete business rules.
  // Xray stops at the first matching rule; placing the grouped proxy DNS rule
  // before OpenAI/GitHub/etc. would force those targets back to FOLLOW and
  // make NODE~/NODE: policy selections appear to be ignored.
  rules.push(...renderHappDnsRoutes({
    followTag,
    globalOutboundTag: globalDnsOutbound,
    globalBalancerTag: dnsFixed?.balancerTag,
    platform: options.platform,
  }));
  const finalTarget = targetFor("__final__", resolution, followTag, fixedById);
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
