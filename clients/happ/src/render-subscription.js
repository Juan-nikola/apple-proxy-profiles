import { resolvePolicyOverrides } from "./policy-overrides.js";
import { HAPP_DIRECT_TAG, renderHappDns } from "./render-dns.js";
import { renderHappOutbound } from "./render-node.js";
import { renderHappInbounds } from "./render-platform.js";
import { HAPP_BLOCK_TAG, happFollowTag, renderHappRouting } from "./render-routing.js";

function nodeId(node) {
  const id = node?._profile?.id;
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]+$/u.test(id)) throw new Error("Happ normalized node is missing a valid _profile.id");
  return id;
}

function requireNodes(nodes, label) {
  if (!Array.isArray(nodes)) throw new TypeError(`Happ ${label} must be an array`);
  return nodes;
}

function describePolicy(resolution, nodes) {
  const names = new Map(nodes.map((node) => [nodeId(node), node.name]));
  if (resolution.warnings.length > 0) {
    return resolution.warnings.map(({ businessKey, code }) => {
      const target = resolution.targets[businessKey].configured.slice("NODE:".length);
      const reason = code === "duplicate-node-fallback" ? "重复" : code === "incompatible-node-fallback" ? "不兼容" : "未找到";
      return `⚠️ ${businessKey}：${reason}固定节点「${target}」，已回退 FOLLOW`;
    }).join("；");
  }
  return Object.entries(resolution.targets).map(([businessKey, target]) => {
    const value = target.resolved.startsWith("NODE:") ? names.get(target.nodeId) : target.resolved;
    return `${businessKey}→${value}`;
  }).join("；");
}

function fixedOutbounds({ resolution, routing, nodes }) {
  const byId = new Map(nodes.map((node) => [nodeId(node), node]));
  const candidates = new Map();
  for (const [businessKey, target] of Object.entries(routing.policyTargets)) {
    const id = resolution.targets[businessKey]?.nodeId;
    if (id && target.candidateTag) candidates.set(id, target.candidateTag);
  }
  return [...candidates.entries()].map(([id, candidate]) => {
    const node = byId.get(id);
    if (!candidate || !node) throw new Error("Happ fixed node cannot be composed");
    return renderHappOutbound(node, candidate);
  });
}

function configForNode({ followNode, nodes, options, resolution }) {
  const routing = renderHappRouting({ options, policyResolution: resolution, followNodeId: nodeId(followNode) });
  return {
    remarks: followNode.name,
    log: { loglevel: "warning" },
    inbounds: renderHappInbounds(options.platform),
    outbounds: [
      renderHappOutbound(followNode, happFollowTag(nodeId(followNode))),
      ...fixedOutbounds({ resolution, routing, nodes }),
      { tag: HAPP_DIRECT_TAG, protocol: "freedom" },
      { tag: HAPP_BLOCK_TAG, protocol: "blackhole" },
    ],
    dns: renderHappDns(options),
    routing: routing.routing,
    observatory: routing.observatory,
    meta: { serverDescription: describePolicy(resolution, nodes) },
  };
}

/** Compose one self-contained Xray config for every already eligible normalized node. */
export function renderHappSubscription({ nodes, allNodes = nodes, options }) {
  const eligibleNodes = requireNodes(nodes, "eligible nodes");
  const sourceNodes = requireNodes(allNodes, "all nodes");
  if (eligibleNodes.length === 0) throw new Error("没有可用于 Happ 的节点");
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Happ subscription options are invalid");
  const resolution = resolvePolicyOverrides({ encoded: options.policyOverrides ?? "", allNodes: sourceNodes, eligibleNodes });
  return eligibleNodes.map((followNode) => configForNode({ followNode, nodes: eligibleNodes, options, resolution }));
}
