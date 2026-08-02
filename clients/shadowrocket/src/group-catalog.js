import { buildPolicyGroups, effectiveAutoMode } from "../../../shared/policies/catalog.js";

export { effectiveAutoMode };

export function buildGroups(options, nodes) {
  return buildPolicyGroups(options, nodes).map((group) => ({
    name: group.name,
    type: group.strategy === "auto-test" ? "url-test" : group.strategy,
    items: group.candidates,
    useSubscription: group.nodeFilter === null ? undefined : true,
    filter: group.nodeFilter ?? undefined,
    url: group.test?.url,
    interval: group.test?.interval,
    timeout: group.test?.timeout,
    tolerance: group.test?.tolerance,
    hidden: group.hidden,
    policySelectName: group.defaultChoice,
  }));
}
