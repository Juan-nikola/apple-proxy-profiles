import { RULE_SOURCE_DEFINITIONS } from "./catalog-data.js";

const RULE_ROOT = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket";

export const RULE_SOURCE_CATALOG = Object.freeze(RULE_SOURCE_DEFINITIONS.map((source) => Object.freeze({
  ...source,
  upstreamUrl: `${RULE_ROOT}/${source.sourcePath}`,
})));

export function orderedRuleAssignments() {
  return RULE_SOURCE_CATALOG.map(({ id, policy }) => Object.freeze({ sourceId: id, policy }));
}
