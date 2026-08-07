import { buildPolicyGroups } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";
import { nodeMetadata } from "../../../shared/contracts.js";

export const REMOTE_POLICY_POOL_NAME = "📦 远程节点池";
export const PERSONAL_POLICY_POOL_NAME = "🧩 个人节点池";
export const POLICY_SOURCE_GROUP_NAME = "🛠 节点来源";
export const REMOTE_POLICY_UPDATE_INTERVAL = 21600;

function escapeValue(value) {
  const text = String(value);
  if (/[\r\n]/u.test(text)) throw new Error("Surge group value contains a line break");
  return text.replaceAll("\\", "\\\\").replaceAll(",", "\\,");
}

function targetName(value) {
  return value === POLICY_TARGET.primaryProxy ? "⚡ 全部自动" : value;
}

function remotePolicyPools(options) {
  return [
    { name: REMOTE_POLICY_POOL_NAME, url: options.proxyPolicyUrl },
    { name: PERSONAL_POLICY_POOL_NAME, url: options.personalPolicyUrl },
  ].filter(({ url }) => typeof url === "string");
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
  const remotePolicies = remotePolicyPools(options);
  const remoteMode = remotePolicies.length > 0;
  const hasPersonalPolicy = typeof options.personalPolicyUrl === "string";
  const rendered = [];
  for (const { name, url } of remotePolicies) {
    rendered.push(`${escapeValue(name)} = select,policy-path=${escapeValue(url)},update-interval=${REMOTE_POLICY_UPDATE_INTERVAL},hidden=1`);
  }
  if (hasPersonalPolicy) {
    names.add(POLICY_SOURCE_GROUP_NAME);
    rendered.push(`${escapeValue(POLICY_SOURCE_GROUP_NAME)} = select,${remotePolicies.map(({ name }) => escapeValue(name)).join(",")}`);
  }
  for (const group of shared) {
    const filteredNodes = remoteMode
      ? []
      : inventory.filter((node) => matches(group.nodeFilter, node)).map(({ name }) => name);
    const sourceChoice = hasPersonalPolicy && group.name === "🚀 节点选择" ? [POLICY_SOURCE_GROUP_NAME] : [];
    const items = [...group.candidates.map(targetName), ...sourceChoice, ...filteredNodes]
      .filter((item, index, all) => all.indexOf(item) === index);
    if (items.length === 0 && (!remoteMode || group.nodeFilter === null)) items.push("DIRECT");
    const fields = [group.strategy === "auto-test" ? "url-test" : group.strategy, ...items.map(escapeValue)];
    if (remoteMode && group.nodeFilter !== null) {
      fields.push(`include-other-group=${escapeValue(remotePolicies.map(({ name }) => name).join(","))}`);
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
