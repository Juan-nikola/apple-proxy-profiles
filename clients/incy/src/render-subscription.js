import { defaultUnifiedPolicyResolution } from "../../../shared/policies/resolve-unified.js";
import { renderIncyOutbound } from "./render-node.js";
import { renderIncyInbounds } from "./render-platform.js";
import { renderIncyDns } from "./render-dns.js";
import { renderIncyBalancers, renderIncyRouting } from "./render-routing.js";
import { validateIncySubscription } from "./validate-subscription.js";

const DIRECT_TAG = "ap-incy-direct";
const BLOCK_TAG = "ap-incy-block";
const CHAIN_ENTRY_POLICY = "🔗 入口节点";
const CHAIN_ENTRY_PREFIX = "ap-incy-chain-entry/";

function ensurePlainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(label);
  }
}

function nodeIdFor(node) {
  const id = node?._profile?.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("INCY normalized node is missing a stable id");
  }
  return id;
}

function isGeneratedChain(node) {
  return node?.["underlying-proxy"] === CHAIN_ENTRY_POLICY && node?._profile?.chained === true;
}

function summarizePolicy(resolution) {
  const entries = Object.values(resolution?.targets ?? {})
    .map((target) => `${target.configured}→${target.resolved}`);
  const warnings = (resolution?.warnings ?? []).map((warning) => `警告:${warning.warningCode}`);
  const summary = [...entries, ...warnings].join("；");
  return summary.length > 0 ? `INCY 分流：${summary}` : "INCY 分流";
}

function buildFixedOutbounds(policyResolution) {
  const fixedNodes = Array.isArray(policyResolution?.fixedNodes) ? policyResolution.fixedNodes : [];
  return fixedNodes.map((fixed) => {
    if (!fixed || typeof fixed !== "object" || !fixed.node || typeof fixed.node !== "object") {
      throw new Error("INCY fixed policy target is invalid");
    }
    const fixedNodeId = typeof fixed.nodeId === "string" && fixed.nodeId.length > 0
      ? fixed.nodeId
      : nodeIdFor(fixed.node);
    const tag = `ap-incy-fixed/${fixedNodeId}`;
    const outbound = renderIncyOutbound(fixed.node, { tag });
    return {
      ...outbound,
      nodeId: fixedNodeId,
      resolved: fixed.name ?? fixed.node.name,
    };
  });
}

function stripOutboundMetadata(outbound) {
  const { nodeId, resolved, ...rest } = outbound;
  return rest;
}

function buildConfig(node, options, policyResolution, allNodes) {
  const followTag = `ap-incy-follow/${nodeIdFor(node)}`;
  const dnsTag = `ap-incy-dns/${nodeIdFor(node)}`;
  const fixedOutbounds = buildFixedOutbounds(policyResolution);
  const chainEntries = isGeneratedChain(node)
    ? allNodes.filter((candidate) => candidate?._profile?.entry === true && candidate?._profile?.chained !== true)
    : [];
  if (isGeneratedChain(node) && chainEntries.length !== 1) {
    throw new Error("INCY generated chains require exactly one entry node");
  }
  const chainEntry = chainEntries[0] ?? null;
  const fixedChainEntry = chainEntry
    ? fixedOutbounds.find((outbound) => outbound.nodeId === nodeIdFor(chainEntry))
    : null;
  const chainEntryTag = fixedChainEntry?.tag ?? (chainEntry ? `${CHAIN_ENTRY_PREFIX}${nodeIdFor(chainEntry)}` : null);
  if (isGeneratedChain(node) && !chainEntryTag) {
    throw new Error("INCY generated chain is missing an entry outbound");
  }
  const followOutbound = renderIncyOutbound(node, { tag: followTag });
  const renderedFollow = chainEntryTag
    ? Object.freeze({ ...followOutbound, proxySettings: { tag: chainEntryTag } })
    : followOutbound;
  const chainEntryOutbound = chainEntry && !fixedChainEntry
    ? renderIncyOutbound(chainEntry, { tag: chainEntryTag })
    : null;
  const route = renderIncyRouting({
    options,
    policyResolution,
    fixedOutbounds,
    followTag,
    directTag: DIRECT_TAG,
    blockTag: BLOCK_TAG,
  });
  const { balancers, observatory } = renderIncyBalancers(policyResolution, fixedOutbounds, followTag, {
    platform: options.platform,
    autoGroupMode: options.autoGroupMode,
  });

  return {
    remarks: node.name,
    log: { loglevel: "info" },
    inbounds: renderIncyInbounds(options.platform),
    outbounds: [
      renderedFollow,
      ...(chainEntryOutbound ? [chainEntryOutbound] : []),
      ...fixedOutbounds.map(stripOutboundMetadata),
      { tag: DIRECT_TAG, protocol: "freedom", settings: {} },
      { tag: BLOCK_TAG, protocol: "blackhole", settings: {} },
    ],
    dns: renderIncyDns(options, { followTag, directTag: DIRECT_TAG, dnsRulesTag: dnsTag }),
    routing: { ...route, balancers },
    observatory,
    meta: {
      platform: options.platform,
      schemaVersion: 2,
      serverDescription: summarizePolicy(policyResolution),
    },
  };
}

export function renderIncySubscription({ nodes = [], options, policyResolution } = {}) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error("INCY subscription cannot be empty");
  }
  ensurePlainObject(options, "INCY options are required");
  const resolution = policyResolution ?? defaultUnifiedPolicyResolution();
  const configs = nodes.map((node) => buildConfig(node, options, resolution, nodes));
  validateIncySubscription(configs);
  return configs;
}
