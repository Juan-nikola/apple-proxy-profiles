import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { businessTargetForSource } from "./policy-overrides.js";
import { renderHappOutbound } from "./render-node.js";
import { renderHappDnsRoutes } from "./render-dns.js";

function hash(value) { let h = 2166136261; for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(36); }
function targetFor(id, resolution, followTag, fixedById) {
  const targetId = businessTargetForSource(id);
  const record = resolution?.targets?.[targetId];
  if (!record || record.resolved === "FOLLOW") return { outboundTag: followTag };
  if (record.resolved === "DIRECT") return { outboundTag: "happ-direct" };
  const fixed = fixedById.get(record.nodeId);
  return fixed ? { balancerTag: fixed.balancerTag } : { outboundTag: followTag };
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
  const observatorySelectors = [];
  for (const fixed of fixedRecords) {
    if (fixed.nodeId && fixed.nodeId === context.followNodeId) continue;
    const node = nodes.find((candidate) => (candidate._profile?.id ?? "") === fixed.nodeId);
    if (!node) continue;
    const suffix = hash(fixed.nodeId);
    const candidateTag = `happ-fixed/${suffix}/candidate`;
    const balancerTag = `happ-fixed/${suffix}/balancer`;
    fixedById.set(fixed.nodeId, { candidateTag, balancerTag });
    outbounds.push((context.renderNode ?? renderHappOutbound)(node, candidateTag));
    balancers.push({ tag: balancerTag, selector: [candidateTag], strategy: { type: "leastPing" }, fallbackTag: followTag });
    observatorySelectors.push(candidateTag);
  }
  const rules = [
    { type: "field", ip: ["geoip:private"], outboundTag: "happ-direct" },
    { type: "field", domain: ["geosite:private"], outboundTag: "happ-direct" },
  ];
  let quicRuleInserted = false;
  for (const item of orderedRoutingPlan({ adblockMode: "off" })) {
    if (!quicRuleInserted && item.phase !== "security" && (options.quicMode === "proxy-block" || options.quicMode === "all-block")) {
      rules.push({ type: "field", network: "quic", outboundTag: options.quicMode === "all-block" ? "happ-block" : "happ-direct" });
      quicRuleInserted = true;
    }
    const isIp = item.id === "ChinaIP";
    const source = `${isIp ? "geoip" : "geosite"}:HAPP-${item.id.toUpperCase()}`;
    const target = item.policy === "REJECT"
      ? { outboundTag: options.blockMode === "off" ? "happ-direct" : "happ-block" }
      : targetFor(item.id, resolution, followTag, fixedById);
    rules.push({ type: "field", ...(isIp ? { ip: [source] } : { domain: [source] }), ...target });
  }
  if (!quicRuleInserted && (options.quicMode === "proxy-block" || options.quicMode === "all-block")) rules.push({ type: "field", network: "quic", outboundTag: options.quicMode === "all-block" ? "happ-block" : "happ-direct" });
  rules.splice(2, 0, ...renderHappDnsRoutes({ followTag }));
  const finalTarget = targetFor("__final__", resolution, followTag, fixedById);
  rules.push({ type: "field", network: "tcp,udp", ...finalTarget });
  const routing = { domainStrategy: "IPIfNonMatch", rules };
  return { routing, observatory: { subjectSelector: observatorySelectors, probeUrl: "https://www.gstatic.com/generate_204", probeInterval: "30s", enableConcurrency: true, timeout: 5000 }, policyTargets: Object.fromEntries([...fixedById].map(([id, value]) => [id, value.balancerTag])), fixedOutbounds: outbounds, balancers };
}
