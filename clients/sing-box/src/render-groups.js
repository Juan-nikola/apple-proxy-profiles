import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { NON_CHAINED_FILTER } from "../../../shared/policies/filters.js";

const RULE_DOWNLOAD_GROUP = "🧭 DNS 与规则下载";
const RULE_DOWNLOAD_FAILOVER_GROUP = "🧭 规则下载故障转移";

function targetName(value) {
  return value === POLICY_TARGET.primaryProxy ? "⚡ 全部自动" : value;
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

function duration(seconds) {
  return `${Number(seconds)}s`;
}

function renderRuleDownloadGroups(inventory, ruleProbeUrl) {
  const nodeCandidates = filterNodes(NON_CHAINED_FILTER, inventory);
  const failover = {
    type: "urltest",
    tag: RULE_DOWNLOAD_FAILOVER_GROUP,
    outbounds: [...nodeCandidates, "DIRECT"],
    url: ruleProbeUrl,
    interval: "30s",
    tolerance: 0,
    interrupt_exist_connections: true,
  };
  return [
    {
      type: "selector",
      tag: RULE_DOWNLOAD_GROUP,
      outbounds: [RULE_DOWNLOAD_FAILOVER_GROUP, "🚀 节点选择", "DIRECT"],
      default: RULE_DOWNLOAD_FAILOVER_GROUP,
      interrupt_exist_connections: true,
    },
    failover,
  ];
}

function renderGroup(group, inventory) {
  if (group.name === "🚀 节点选择") {
    // Keep the primary selector compact: only helpers and continent groups,
    // so GUI clients (SFA/SFM) show a short hierarchy instead of a flat
    // list of every node. Concrete nodes live inside the flag groups.
    const outbounds = [
      "⚡ 全部自动",
      "\u{1F6DF} 全部故障转移",
      ...group.candidates.map(targetName),
    ].filter((item, index, all) => all.indexOf(item) === index);
    return {
      type: "selector",
      tag: group.name,
      outbounds: outbounds.length > 0 ? outbounds : ["DIRECT"],
      interrupt_exist_connections: true,
    };
  }
  const candidates = [
    ...group.candidates.map(targetName),
    ...filterNodes(group.nodeFilter, inventory),
  ].filter((item, index, all) => all.indexOf(item) === index);
  const outbounds = candidates.length > 0 ? candidates : ["DIRECT"];
  if (group.strategy === "auto-test" || group.strategy === "fallback") {
    return {
      type: "urltest",
      tag: group.name,
      outbounds,
      url: "https://www.gstatic.com/generate_204",
      interval: duration(group.test?.interval ?? 600),
      tolerance: group.test?.tolerance ?? 100,
      interrupt_exist_connections: true,
    };
  }
  const outbound = {
    type: "selector",
    tag: group.name,
    outbounds,
    interrupt_exist_connections: true,
  };
  const defaultChoice = group.defaultChoice;
  if (defaultChoice !== undefined) outbound.default = targetName(defaultChoice);
  return outbound;
}

export function renderSingBoxGroups(options, nodes, { ruleProbeUrl = "https://www.gstatic.com/generate_204" } = {}) {
  const inventory = Array.isArray(nodes) ? nodes : [];
  const shared = buildPolicyGroups(options, inventory);
  const visible = [];
  const hidden = [];
  for (const group of shared) {
    if (group.name === RULE_DOWNLOAD_GROUP) {
      const [selector, failover] = renderRuleDownloadGroups(inventory, ruleProbeUrl);
      visible.push(selector);
      hidden.push(failover);
      continue;
    }
    const rendered = renderGroup(group, inventory);
    (group.hidden === true ? hidden : visible).push(rendered);
  }
  return [...visible, ...hidden];
}
