import { buildPolicyGroups, effectiveAutoMode } from "../../../shared/policies/catalog.js";
export { effectiveAutoMode };

export function buildGroups(options, nodes, policyResolution = null) {
  const groups = buildPolicyGroups(options, nodes, policyResolution).map((group) => ({
    name: group.name,
    type: group.strategy === "auto-test" ? "url-test" : group.strategy,
    items: [...group.candidates],
    useSubscription: group.nodeFilter === null ? undefined : true,
    filter: group.nodeFilter ?? undefined,
    url: group.test?.url,
    interval: group.test?.interval,
    timeout: group.test?.timeout,
    tolerance: group.test?.tolerance,
    hidden: group.hidden,
    policySelectName: group.defaultChoice,
  }));
  return groups.map((group) => {
    if (group.name !== "🚀 节点选择") return group;
    return {
      ...group,
      items: ["PROXY", ...group.items],
      useSubscription: undefined,
      filter: undefined,
    };
  });
}
