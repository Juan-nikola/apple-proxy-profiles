import { RULE_SOURCE_DEFINITIONS } from "./catalog-data.js";

export const RULE_CLIENT_CATALOG = Object.freeze(RULE_SOURCE_DEFINITIONS.map(({ id, policy, inputFormat }) => (
  Object.freeze({ id, policy, inputFormat })
)));
