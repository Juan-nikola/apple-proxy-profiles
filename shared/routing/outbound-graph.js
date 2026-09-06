import { nodeMetadata } from "../contracts.js";

const GROUPS = Object.freeze(["ai", "github", "youtube", "overseasMedia", "globalSocial", "overseasGame", "domesticCore", "domesticPlatform", "apple", "microsoft", "download"]);

function tagFor(node, index) {
  const id = node?._profile?.id;
  if (typeof id !== "string" || id.length === 0) throw new Error("Outbound graph node is missing stable node ID");
  return `ap-node-${index.toString(36)}`;
}

export function buildOutboundGraph({ nodes = [], policyResolution = null, options = {} } = {}) {
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("Outbound graph requires a non-empty node inventory");
  const ids = new Set();
  const physicalNodes = nodes.map((node, index) => {
    const metadata = nodeMetadata(node);
    if (ids.has(metadata.id)) throw new Error(`Duplicate stable node ID: ${metadata.id}`);
    ids.add(metadata.id);
    return Object.freeze({ id: metadata.id, tag: tagFor(node, index), name: node.name, node });
  });
  const candidates = physicalNodes.map(({ tag }) => tag);
  const businessGroups = Object.fromEntries(GROUPS.map((id) => [id, Object.freeze({ id, tag: `业务:${id}`, candidates: Object.freeze([...candidates]), default: policyResolution?.targets?.[id]?.resolved ?? "FOLLOW" })]));
  const fixed = (policyResolution?.fixedNodes ?? []).map(({ nodeId }) => {
    const node = physicalNodes.find((item) => item.id === nodeId);
    if (!node) throw new Error(`Fixed policy node is unavailable: ${nodeId}`);
    return Object.freeze({ nodeId, tag: node.tag });
  });
  const selectors = Object.freeze(GROUPS.map((id) => ({ tag: `业务:${id}`, candidates: businessGroups[id].candidates, default: businessGroups[id].default })));
  const urlTests = Object.freeze(options.autoGroupMode === "minimal" ? [] : [{ tag: "🚀 自动选择", outbounds: candidates, url: "https://www.gstatic.com/generate_204", interval: "10m", tolerance: 50 }]);
  return Object.freeze({ physicalNodes: Object.freeze(physicalNodes), businessGroups: Object.freeze(businessGroups), selectors, urlTests, detours: Object.freeze([]), direct: Object.freeze({ tag: "DIRECT", type: "direct" }), reject: Object.freeze({ tag: "REJECT", type: "block" }), final: Object.freeze({ tag: "漏网之鱼", target: policyResolution?.targets?.final?.resolved ?? "FOLLOW" }), fixedNodes: Object.freeze(fixed) });
}
