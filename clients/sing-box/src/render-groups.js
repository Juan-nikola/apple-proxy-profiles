import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { NON_CHAINED_FILTER } from "../../../shared/policies/filters.js";

const RULE_DOWNLOAD_GROUP = "🧭 DNS 与规则下载";
const RULE_DOWNLOAD_FAILOVER_GROUP = "🧭 规则下载故障转移";
const FALLBACK_TOLERANCE_MS = 65535;
const MOBILE_MEMORY_PLATFORMS = new Set(["iphone", "ipad"]);

function isMobileMemoryConstrained(options) {
  return MOBILE_MEMORY_PLATFORMS.has(options.platform);
}

function targetName(value, { compact = false } = {}) {
  if (value === POLICY_TARGET.primaryProxy) return "⚡ 全部自动";
  if (compact && value === "🛟 全部故障转移") return "⚡ 全部自动";
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

function duration(seconds) {
  return `${Number(seconds)}s`;
}

function renderRuleDownloadGroups(inventory, ruleProbeUrl, { compact = false } = {}) {
  if (compact) {
    return [{
      type: "selector",
      tag: RULE_DOWNLOAD_GROUP,
      outbounds: ["⚡ 全部自动", "DIRECT"],
      default: "⚡ 全部自动",
      interrupt_exist_connections: true,
    }];
  }
  const nodeCandidates = filterNodes(NON_CHAINED_FILTER, inventory);
  const failover = {
    type: "urltest",
    tag: RULE_DOWNLOAD_FAILOVER_GROUP,
    outbounds: [...nodeCandidates, "DIRECT"],
    url: ruleProbeUrl,
    interval: "30s",
    // sing-box has no ordered fallback outbound. A very large URLTest
    // tolerance preserves the first healthy candidate and only advances when
    // it fails, which is the closest native equivalent.
    tolerance: FALLBACK_TOLERANCE_MS,
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

function renderGroup(group, inventory, { compact = false } = {}) {
  if (group.name === "🚀 节点选择") {
    // Keep the primary selector compact: only helpers and continent groups,
    // so GUI clients (SFA/SFM) show a short hierarchy instead of a flat
    // list of every node. Concrete nodes live inside the continent groups.
    const outbounds = group.candidates
      .map((candidate) => targetName(candidate, { compact }))
      .filter((item, index, all) => all.indexOf(item) === index);
    return {
      type: "selector",
      tag: group.name,
      outbounds: outbounds.length > 0 ? outbounds : ["DIRECT"],
      default: outbounds[0] ?? "DIRECT",
      interrupt_exist_connections: true,
    };
  }
  const explicitCandidates = group.kind === "source"
    ? group.candidates.filter((candidate) => candidate !== "DIRECT")
    : group.candidates;
  const candidates = [
    ...(compact && group.kind === "continent" ? [] : explicitCandidates.map((candidate) => targetName(candidate, { compact }))),
    ...filterNodes(group.nodeFilter, inventory),
  ].filter((item, index, all) => all.indexOf(item) === index);
  const outbounds = candidates.length > 0 ? candidates : ["DIRECT"];
  if (compact && group.kind === "chain" && (group.strategy === "auto-test" || group.strategy === "fallback")) {
    return {
      type: "selector",
      tag: group.name,
      outbounds,
      default: outbounds[0],
      interrupt_exist_connections: true,
    };
  }
  if (group.strategy === "auto-test" || group.strategy === "fallback") {
    return {
      type: "urltest",
      tag: group.name,
      outbounds,
      url: "https://www.gstatic.com/generate_204",
      interval: duration(group.test?.interval ?? 600),
      tolerance: group.strategy === "fallback"
        ? FALLBACK_TOLERANCE_MS
        : group.test?.tolerance ?? 100,
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
  if (defaultChoice !== undefined) outbound.default = targetName(defaultChoice, { compact });
  return outbound;
}

export function renderSingBoxGroups(options, nodes, { ruleProbeUrl = "https://www.gstatic.com/generate_204" } = {}) {
  const inventory = Array.isArray(nodes) ? nodes : [];
  // iOS NetworkExtension has a much tighter memory ceiling than desktop and
  // routers. Keep one shared probe graph there; every additional URLTest
  // would open the same node connections again during startup.
  const compact = isMobileMemoryConstrained(options);
  const shared = buildPolicyGroups(options, inventory);
  const visible = [];
  const hidden = [];
  for (const group of shared) {
    if (group.name === RULE_DOWNLOAD_GROUP) {
      const renderedDownloadGroups = renderRuleDownloadGroups(inventory, ruleProbeUrl, { compact });
      visible.push(renderedDownloadGroups[0]);
      hidden.push(...renderedDownloadGroups.slice(1));
      continue;
    }
    if (compact && group.strategy === "fallback") continue;
    if (compact && group.kind === "helper" && group.name !== "⚡ 全部自动") continue;
    const rendered = renderGroup(group, inventory, { compact });
    (group.hidden === true ? hidden : visible).push(rendered);
  }
  return [...visible, ...hidden];
}
