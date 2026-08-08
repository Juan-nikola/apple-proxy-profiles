import { UPSTREAM_RULE_SOURCE_DEFINITIONS } from "./catalog-data.js";
import { DEFAULT_RULE_CLIENT_CATALOG } from "./lightweight-policy.js";

const RULE_ROOT = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Shadowrocket";

function rule(id, policy, minEntries, inputFormat = "RULE-SET", directory = id) {
  const sourcePath = `${directory}/${id}.list`;
  return Object.freeze({
    id,
    sourcePath,
    upstreamUrl: `${RULE_ROOT}/${sourcePath}`,
    policy,
    minEntries,
    inputFormat,
  });
}

export const UPSTREAM_RULE_SOURCE_CATALOG = Object.freeze(UPSTREAM_RULE_SOURCE_DEFINITIONS.map((source) => (
  rule(source.id, source.policy, source.minEntries, source.inputFormat, source.sourcePath.slice(0, source.sourcePath.lastIndexOf("/")))
)));

const UPSTREAM_BY_ID = new Map(UPSTREAM_RULE_SOURCE_CATALOG.map((source) => [source.id, source]));
const COMPILED_SOURCE_INPUTS = Object.freeze({
  DomesticCore: Object.freeze({ sourcePath: "DomesticCore/DomesticCore.list", minEntries: 1 }),
  DomesticGame: Object.freeze({ sourcePath: "DomesticGame/DomesticGame.list", minEntries: 1 }),
  OverseasGame: Object.freeze({ sourceId: "Game" }),
  ChinaIP: Object.freeze({ sourceId: "ChinaMax" }),
});

function compiledRule(source) {
  const mapping = COMPILED_SOURCE_INPUTS[source.id];
  const upstream = mapping?.sourceId ? UPSTREAM_BY_ID.get(mapping.sourceId) : UPSTREAM_BY_ID.get(source.id);
  if (upstream) {
    return Object.freeze({
      ...upstream,
      id: source.id,
      policy: source.policy,
      inputFormat: source.inputFormat,
    });
  }
  if (!mapping) throw new Error(`Missing compiled rule source mapping: ${source.id}`);
  return Object.freeze({
    id: source.id,
    sourcePath: mapping.sourcePath,
    policy: source.policy,
    minEntries: mapping.minEntries,
    inputFormat: source.inputFormat,
  });
}

/**
 * Client-compatible catalog for the lightweight default output. Its synthetic
 * records are compiled locally by the artifact pipeline, not fetched upstream.
 */
export const RULE_SOURCE_CATALOG = Object.freeze(DEFAULT_RULE_CLIENT_CATALOG.map(compiledRule));

export function orderedRuleAssignments() {
  return RULE_SOURCE_CATALOG.map(({ id, policy }) => Object.freeze({ sourceId: id, policy }));
}
