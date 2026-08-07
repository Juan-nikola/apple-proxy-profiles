import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { nodeMetadata } from "../../../shared/contracts.js";

export const REMOTE_POLICY_POOL_NAME = "📦 远程节点池";
export const REMOTE_POLICY_UPDATE_INTERVAL = 21600;

function escapeValue(value) {
  const text = String(value);
  if (/[\r\n]/u.test(text)) throw new Error("Surge group value contains a line break");
  return text.replaceAll("\\", "\\\\").replaceAll(",", "\\,");
}

function targetName(value) {
  return value === POLICY_TARGET.primaryProxy ? "⚡ 全部自动" : value;
}

function matches(filter, node) {
  if (filter === null) return false;
  try {
    return new RegExp(filter, "u").test(node.name);
  } catch {
    throw new Error("Invalid Surge policy filter");
  }
}

export function renderSurgeGroups(options, nodes) {
  const inventory = Array.isArray(nodes) ? nodes : [];
  const shared = buildPolicyGroups(options, inventory);
  const names = new Set(shared.map(({ name }) => name));
  const remoteMode = typeof options.proxyPolicyUrl === "string";
  const rendered = [];
  if (remoteMode) {
    rendered.push(`${escapeValue(REMOTE_POLICY_POOL_NAME)} = select,policy-path=${escapeValue(options.proxyPolicyUrl)},update-interval=${REMOTE_POLICY_UPDATE_INTERVAL},hidden=1`);
  }
  for (const group of shared) {
    const filteredNodes = remoteMode
      ? []
      : inventory.filter((node) => matches(group.nodeFilter, node)).map(({ name }) => name);
    const items = [...group.candidates.map(targetName), ...filteredNodes]
      .filter((item, index, all) => all.indexOf(item) === index);
    if (items.length === 0 && (!remoteMode || group.nodeFilter === null)) items.push("DIRECT");
    const fields = [group.strategy === "auto-test" ? "url-test" : group.strategy, ...items.map(escapeValue)];
    if (remoteMode && group.nodeFilter !== null) {
      fields.push(`include-other-group=${escapeValue(REMOTE_POLICY_POOL_NAME)}`);
      fields.push(`policy-regex-filter=${escapeValue(group.nodeFilter)}`);
    }
    if (group.test?.url !== undefined) fields.push(`url=${escapeValue(group.test.url)}`);
    if (group.test?.interval !== undefined) fields.push(`interval=${escapeValue(group.test.interval)}`);
    if (group.test?.timeout !== undefined) fields.push(`timeout=${escapeValue(group.test.timeout)}`);
    if (group.test?.tolerance !== undefined) fields.push(`tolerance=${escapeValue(group.test.tolerance)}`);
    if (group.defaultChoice !== undefined) fields.push(`policy-select-name=${escapeValue(group.defaultChoice)}`);
    if (group.hidden) fields.push("hidden=1");
    if (items.some((item) => item !== "DIRECT" && item !== "REJECT" && !names.has(item)
      && !inventory.some((node) => node.name === item))) {
      throw new Error("Surge group contains an unresolved policy reference");
    }
    rendered.push(`${escapeValue(group.name)} = ${fields.join(",")}`);
  }
  return rendered;
}
