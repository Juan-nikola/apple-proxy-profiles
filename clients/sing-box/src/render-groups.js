import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { NON_CHAINED_FILTER } from "../../../shared/policies/filters.js";

const RULE_DOWNLOAD_GROUP = "🧭 DNS 与规则下载";
const PRIMARY_GROUP = "🚀 节点选择";
const AUTO_GROUP = "⚡ 全部自动";
const FALLBACK_GROUP_PATTERN = /故障转移/u;
const MOBILE_MEMORY_PLATFORMS = new Set(["iphone", "ipad", "android"]);
const IOS_MEMORY_PLATFORMS = new Set(["iphone", "ipad"]);
const TEST_URL = "https://www.gstatic.com/generate_204";

function isMobileMemoryConstrained(options) {
  return MOBILE_MEMORY_PLATFORMS.has(options.platform);
}

function isIosMemoryConstrained(options) {
  return IOS_MEMORY_PLATFORMS.has(options.platform);
}

function isDisabledFallback(name) {
  return typeof name === "string" && FALLBACK_GROUP_PATTERN.test(name);
}

function targetName(value) {
  if (value === POLICY_TARGET.primaryProxy) return AUTO_GROUP;
  return value;
}

function filterNodes(filter, nodes) {
  if (filter === null) return [];
  let pattern;
  try {
    pattern = new RegExp(filter, "u");
  } catch {
    throw new Error("Invalid sing-box policy filter");
  }
  return nodes.filter((node) => pattern.test(node.name)).map((node) => node.name);
}

function candidateList(group, nodes, { compact = false, ios = false } = {}) {
  const candidates = [
    ...group.candidates
      .filter((candidate) => !isDisabledFallback(candidate))
      .map(targetName),
    ...filterNodes(group.nodeFilter, nodes),
  ];
  return candidates.filter((item, index, all) => all.indexOf(item) === index);
}

function renderDownloadGroup() {
  return {
    type: "selector",
    tag: RULE_DOWNLOAD_GROUP,
    outbounds: [AUTO_GROUP, "DIRECT"],
    default: AUTO_GROUP,
    interrupt_exist_connections: true,
  };
}

function renderGroup(group, nodes, { compact = false, ios = false } = {}) {
  if (group.name === RULE_DOWNLOAD_GROUP) return renderDownloadGroup();

  const candidates = candidateList(group, nodes, { compact, ios });
  if (group.kind === "ai" && candidates[0] !== AUTO_GROUP) candidates.unshift(AUTO_GROUP);
  const outbounds = candidates.length > 0 ? candidates : ["DIRECT"];

  if (group.name === PRIMARY_GROUP) {
    const primary = outbounds.filter((candidate) => candidate !== "DIRECT");
    return {
      type: "selector",
      tag: group.name,
      outbounds: primary.length > 0 ? primary : ["DIRECT"],
      default: primary[0] ?? "DIRECT",
      interrupt_exist_connections: true,
    };
  }

  if (group.strategy === "auto-test") {
    return {
      type: "urltest",
      tag: group.name,
      outbounds,
      url: TEST_URL,
      interval: `${Number(group.test?.interval ?? 600)}s`,
      tolerance: group.test?.tolerance ?? 100,
      interrupt_exist_connections: true,
    };
  }

  const selector = {
    type: "selector",
    tag: group.name,
    outbounds,
    interrupt_exist_connections: true,
  };
  if (group.defaultChoice !== undefined && !isDisabledFallback(group.defaultChoice)) {
    selector.default = targetName(group.defaultChoice);
  }
  return selector;
}

export function renderSingBoxGroups(options, nodes) {
  const inventory = Array.isArray(nodes) ? nodes : [];
  const compact = isMobileMemoryConstrained(options);
  const shared = buildPolicyGroups(options, inventory);
  const rendered = [];

  for (const group of shared) {
    if (group.strategy === "fallback") continue;
    rendered.push(renderGroup(group, inventory, { compact, ios: isIosMemoryConstrained(options) }));
  }

  return rendered;
}
