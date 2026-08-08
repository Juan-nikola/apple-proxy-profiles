import { RULE_SOURCE_CATALOG } from "./catalog.js";
import { ruleClientCatalog as lightweightRuleClientCatalog } from "./lightweight-policy.js";

export const DEFAULT_RULE_CLIENT_CATALOG = Object.freeze(RULE_SOURCE_CATALOG.map(({ id, policy, inputFormat }) => (
  Object.freeze({ id, policy, inputFormat })
)));

export const RULE_CLIENT_CATALOG = DEFAULT_RULE_CLIENT_CATALOG;

export function ruleClientCatalog(options = {}) {
  const selected = lightweightRuleClientCatalog(options);
  const entries = new Map(DEFAULT_RULE_CLIENT_CATALOG.map((entry) => [entry.id, entry]));
  return Object.freeze(selected.map((source) => entries.get(source.id) ?? source));
}
