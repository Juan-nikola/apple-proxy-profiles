import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";

const RULE_DOWNLOAD_GROUP = "🧭 DNS 与规则下载";
const RULE_DOWNLOAD_AUTO = "⚡ 全部自动";

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

export function renderSingBoxGroups(options, nodes) {
  const inventory = Array.isArray(nodes) ? nodes : [];
  const shared = buildPolicyGroups(options, inventory);
  return shared.map((group) => {
    const candidates = [
      ...group.candidates.map(targetName),
      ...filterNodes(group.nodeFilter, inventory),
    ].filter((item, index, all) => all.indexOf(item) === index);
    if (group.name === RULE_DOWNLOAD_GROUP && !candidates.includes(RULE_DOWNLOAD_AUTO)) {
      candidates.unshift(RULE_DOWNLOAD_AUTO);
    }
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
    const defaultChoice = group.name === RULE_DOWNLOAD_GROUP ? RULE_DOWNLOAD_AUTO : group.defaultChoice;
    if (defaultChoice !== undefined) outbound.default = targetName(defaultChoice);
    return outbound;
  });
}
