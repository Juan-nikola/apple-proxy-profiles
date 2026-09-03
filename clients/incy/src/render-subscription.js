import { defaultUnifiedPolicyResolution } from "../../../shared/policies/resolve-unified.js";
import { renderIncyOutbound } from "./render-node.js";
import { renderIncyInbounds } from "./render-platform.js";
import { renderIncyDns } from "./render-dns.js";
import { renderIncyBalancers, renderIncyRouting } from "./render-routing.js";
import { validateIncySubscription } from "./validate-subscription.js";

const DIRECT_TAG = "ap-incy-direct";
const BLOCK_TAG = "ap-incy-block";
const AGGREGATE_FOLLOW_TAG = "balancer-ap-incy-follow";
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

function appendUniqueOutbound(outbounds, seen, outbound) {
  const existing = seen.get(outbound.tag);
  if (existing) {
    if (JSON.stringify(existing) !== JSON.stringify(outbound)) {
      throw new Error(`INCY aggregate contains conflicting outbound '${outbound.tag}'`);
    }
    return;
  }
  seen.set(outbound.tag, outbound);
  outbounds.push(outbound);
}

function buildAggregateConfig(configs, options, policyResolution) {
  const uniqueFollowTags = [...new Set(configs
    .flatMap((config) => config.outbounds)
    .filter(({ tag }) => tag.startsWith("ap-incy-follow/"))
    .map(({ tag }) => tag))];
  if (uniqueFollowTags.length === 0) throw new Error("INCY aggregate has no follow outbounds");

  const fixedOutbounds = buildFixedOutbounds(policyResolution);
  const outbounds = [];
  const seen = new Map();
  for (const config of configs) {
    for (const outbound of config.outbounds) {
      if (outbound.tag === DIRECT_TAG || outbound.tag === BLOCK_TAG || outbound.tag.startsWith("ap-incy-fixed/")) continue;
      appendUniqueOutbound(outbounds, seen, outbound);
    }
  }
  for (const outbound of fixedOutbounds) appendUniqueOutbound(outbounds, seen, stripOutboundMetadata(outbound));
  appendUniqueOutbound(outbounds, seen, { tag: DIRECT_TAG, protocol: "freedom", settings: {} });
  appendUniqueOutbound(outbounds, seen, { tag: BLOCK_TAG, protocol: "blackhole", settings: {} });

  const route = renderIncyRouting({
    options,
    policyResolution,
    fixedOutbounds,
    followTag: AGGREGATE_FOLLOW_TAG,
    directTag: DIRECT_TAG,
    blockTag: BLOCK_TAG,
    aggregateBalancerTag: AGGREGATE_FOLLOW_TAG,
  });
  const { balancers, observatory } = renderIncyBalancers(policyResolution, fixedOutbounds, uniqueFollowTags[0], {
    platform: options.platform,
    autoGroupMode: options.autoGroupMode,
    followSelectors: uniqueFollowTags,
    fallbackTag: uniqueFollowTags[0],
  });
  balancers.push({
    tag: AGGREGATE_FOLLOW_TAG,
    selector: uniqueFollowTags,
    strategy: { type: "leastPing" },
    fallbackTag: uniqueFollowTags[0],
  });

  return {
    remarks: `${options.subscriptionName} · INCY 自动选择`,
    log: { loglevel: "info" },
    inbounds: renderIncyInbounds(options.platform),
    outbounds,
    dns: renderIncyDns(options, {
      followTag: AGGREGATE_FOLLOW_TAG,
      directTag: DIRECT_TAG,
      dnsRulesTag: "ap-incy-dns/aggregate",
    }),
    routing: { ...route, balancers },
    observatory,
    meta: {
      platform: options.platform,
      schemaVersion: 2,
      serverDescription: `${summarizePolicy(policyResolution)}；${uniqueFollowTags.length} 个节点自动选择`,
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
  if (options.format === "single") {
    const aggregate = buildAggregateConfig(configs, options, resolution);
    validateIncySubscription(aggregate);
    return aggregate;
  }
  if (options.selectionMode === "both") {
    const aggregate = buildAggregateConfig(configs, options, resolution);
    validateIncySubscription(aggregate);
    return [aggregate, ...configs];
  }
  return configs;
}
