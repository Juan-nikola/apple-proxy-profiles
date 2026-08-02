import { buildPolicyGroups, effectiveAutoMode } from "../../../shared/policies/catalog.js";
import { POLICY_TARGET } from "../../../shared/policies/intents.js";

export { effectiveAutoMode };

function shadowrocketPolicyTarget(candidate) {
  return candidate === POLICY_TARGET.primaryProxy ? "PROXY" : candidate;
}

export function buildGroups(options, nodes) {
  return buildPolicyGroups(options, nodes).map((group) => ({
    name: group.name,
    type: group.strategy === "auto-test" ? "url-test" : group.strategy,
    items: group.candidates.map(shadowrocketPolicyTarget),
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
