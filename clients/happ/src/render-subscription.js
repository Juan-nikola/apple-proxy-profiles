import { renderHappOutbound } from "./render-node.js";
import { renderHappInbounds } from "./render-platform.js";
import { renderHappDns } from "./render-dns.js";
import { renderHappRouting } from "./render-routing.js";
import { defaultUnifiedPolicyResolution } from "../../../shared/policies/resolve-unified.js";

function idFor(node) { return node?._profile?.id ?? `h-${Math.abs([...JSON.stringify(node)].reduce((h, c) => ((h * 31) ^ c.charCodeAt(0)) | 0, 17))}`; }
function summary(resolution) {
  const entries = Object.values(resolution?.targets ?? {}).map((target) => `${target.configured}→${target.resolved}`).join("；");
  const warnings = (resolution?.warnings ?? []).map((warning) => `警告:${warning.warningCode}`).join("，");
  return `Happ 分流：${entries}${warnings ? `；${warnings}` : ""}`;
}

export function renderHappSubscription({ nodes = [], allNodes = nodes, options, policyResolution } = {}) {
  if (!options || typeof options !== "object") throw new TypeError("Happ options are required");
  const eligible = Array.isArray(nodes) ? nodes : [];
  if (eligible.length === 0) throw new Error("没有可用的 Happ 兼容节点，拒绝生成空订阅");
  const resolution = policyResolution ?? defaultUnifiedPolicyResolution();
  const configs = [];
  for (const followNode of eligible) {
    const followId = idFor(followNode);
    const followTag = `happ-follow/${followId}`;
    const route = renderHappRouting({
      nodes: eligible, policyResolution: resolution, fixedNodes: resolution.fixedNodes, followTag, followNodeId: followId, options,
      renderNode: renderHappOutbound,
    });
    const followOutbound = renderHappOutbound(followNode, followTag);
    const outbounds = [followOutbound, ...route.fixedOutbounds, { tag: "happ-direct", protocol: "freedom", settings: {} }, { tag: "happ-block", protocol: "blackhole", settings: {} }];
    configs.push({
      remarks: followNode.name,
      log: { loglevel: "warning" },
      inbounds: renderHappInbounds(options.platform),
      outbounds,
      observatory: route.observatory,
      dns: renderHappDns(options),
      routing: { ...route.routing, balancers: route.balancers },
      meta: { serverDescription: summary(resolution), platform: options.platform, schemaVersion: 2 },
    });
  }
  return configs;
}
