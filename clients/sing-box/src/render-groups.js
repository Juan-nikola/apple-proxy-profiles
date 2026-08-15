import { automaticHelperName, buildPolicyGroups, fallbackHelperName } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { CONTINENTS } from "../../../shared/policies/filters.js";

const RULE_DOWNLOAD_GROUP = "🧭 DNS 与规则下载";
const GLOBAL_AUTO_GROUP = "⚡ 全部自动";
const GLOBAL_FALLBACK_GROUP = "\u{1F6DF} 全部故障转移";

const CONTINENT_HELPER_NAMES = new Map(
  CONTINENTS.flatMap((continent) => [
    [automaticHelperName(continent), GLOBAL_AUTO_GROUP],
    [fallbackHelperName(continent), GLOBAL_FALLBACK_GROUP],
  ]),
);

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

function renderGroup(group, inventory) {
  if (group.name === "🚀 节点选择") {
    // Keep the primary selector compact: only helpers and continent groups,
    // so GUI clients (SFA/SFM) show a short hierarchy instead of a flat
    // list of every node. Concrete nodes live inside the continent groups.
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
  const globalDelegate = CONTINENT_HELPER_NAMES.get(group.name);
  if (globalDelegate !== undefined) {
    const delegateOutbounds = [globalDelegate, ...outbounds];
    return {
      type: "selector",
      tag: group.name,
      outbounds: delegateOutbounds.filter((item, index, all) => all.indexOf(item) === index),
      default: globalDelegate,
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
      tolerance: group.test?.tolerance ?? 100,
      idle_timeout: "30m",
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

export function renderSingBoxGroups(options, nodes) {
  const inventory = Array.isArray(nodes) ? nodes : [];
  const shared = buildPolicyGroups(options, inventory);
  const visible = [];
  const hidden = [];
  for (const group of shared) {
    if (group.name === RULE_DOWNLOAD_GROUP) {
      visible.push({
        type: "selector",
        tag: RULE_DOWNLOAD_GROUP,
        outbounds: ["🚀 节点选择", "DIRECT"],
        default: "🚀 节点选择",
        interrupt_exist_connections: true,
      });
      continue;
    }
    const rendered = renderGroup(group, inventory);
    (group.hidden === true ? hidden : visible).push(rendered);
  }
  return [...visible, ...hidden];
}
