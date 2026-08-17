import {
  GROUP_KIND,
  SERVICE_GROUPS,
  STRATEGY,
  automaticHelperName,
  buildPolicyGroups,
} from "./catalog.js";
import {
  ALL_NODES_FILTER,
  CHAINED_NODES_FILTER,
  CONTINENTS,
  ENTRY_FILTER,
  GAME_FILTER,
  NON_CHAINED_FILTER,
  P2P_FILTER,
  continentFilter,
} from "./filters.js";
import { POLICY_TARGET } from "./intents.js";
import { OPTION_VALUES, SOURCE_KIND } from "../contracts.js";

function policySchema(kind, strategy, nodeFilters, { hidden, defaultChoice } = {}) {
  return Object.freeze({
    kind,
    strategy,
    nodeFilters: Object.freeze([...nodeFilters]),
    hidden,
    defaultChoice,
  });
}

const REQUIRED_POLICY_GROUP_NAMES = Object.freeze([
  "⚡ 全部自动",
  "🚀 节点选择",
  "🤖 AI 专用",
  ...SERVICE_GROUPS.map(([name]) => name),
  "🎮 游戏连接",
  "⬇️ 下载/P2P",
  "🧭 DNS 与规则下载",
  "☣️ 安全威胁",
  "🧱 常见广告",
  "🕵️ 严格跟踪",
]);

const POLICY_SCHEMA_ENTRIES = [
  ["⚡ 全部自动", policySchema(GROUP_KIND.helper, STRATEGY.autoTest, [NON_CHAINED_FILTER], { hidden: true })],
  ["🚀 节点选择", policySchema(GROUP_KIND.primary, STRATEGY.select, [null])],
  ...CONTINENTS.flatMap((continent) => {
    const filter = continentFilter(continent);
    return [
      [continent.name, policySchema(GROUP_KIND.continent, STRATEGY.select, [filter])],
      [automaticHelperName(continent), policySchema(GROUP_KIND.helper, STRATEGY.autoTest, [filter], { hidden: true })],
    ];
  }),
  ["🤖 AI 专用", policySchema(GROUP_KIND.ai, STRATEGY.select, [ALL_NODES_FILTER])],
  ...SERVICE_GROUPS.map(([name, defaults]) => [
    name,
    policySchema(GROUP_KIND.service, STRATEGY.select, [ALL_NODES_FILTER], {
      defaultChoice: defaults.defaultChoice,
    }),
  ]),
  ["🎮 游戏连接", policySchema(GROUP_KIND.special, STRATEGY.select, [GAME_FILTER, null])],
  ["⬇️ 下载/P2P", policySchema(GROUP_KIND.special, STRATEGY.select, [P2P_FILTER, null])],
  ["🧭 DNS 与规则下载", policySchema(GROUP_KIND.special, STRATEGY.select, [null])],
  ["☣️ 安全威胁", policySchema(GROUP_KIND.security, STRATEGY.select, [null])],
  ["🧱 常见广告", policySchema(GROUP_KIND.security, STRATEGY.select, [null])],
  ["🕵️ 严格跟踪", policySchema(GROUP_KIND.security, STRATEGY.select, [null])],
  ["⚡ 入口自动", policySchema(GROUP_KIND.chain, STRATEGY.autoTest, [ENTRY_FILTER], { hidden: true })],
  ["🎯 客户端落地", policySchema(GROUP_KIND.chain, STRATEGY.select, [CHAINED_NODES_FILTER])],
  ["🔗 入口节点", policySchema(GROUP_KIND.chain, STRATEGY.select, [ENTRY_FILTER])],
];

const CONTINENT_FAMILIES = Object.freeze(CONTINENTS.map((continent) => Object.freeze({
  key: continent.key,
  selector: continent.name,
  automatic: automaticHelperName(continent),
})));
const CHAIN_NAMES = Object.freeze(["⚡ 入口自动", "🎯 客户端落地", "🔗 入口节点"]);

function syntheticNode(index, continent, sourceKind = SOURCE_KIND.unknown, flag) {
  return {
    name: `schema-node-${index}`,
    _profile: {
      continent,
      flag,
      sourceKind,
      udp: false,
      p2p: false,
      entry: false,
      chained: false,
    },
  };
}

function inferredInventory(groups) {
  const names = new Set(groups.map((group) => group.name));
  const groupsByName = new Map(groups.map((group) => [group.name, group]));
  const presentContinents = CONTINENT_FAMILIES.filter((family) => names.has(family.selector));
  const game = groups.find((group) => group.name === "🎮 游戏连接");
  const p2p = groups.find((group) => group.name === "⬇️ 下载/P2P");
  const chainEnabled = CHAIN_NAMES.every((name) => names.has(name));
  const needsNonChainedNode = game?.nodeFilter === GAME_FILTER
    || p2p?.nodeFilter === P2P_FILTER
    || chainEnabled;
  if (presentContinents.length === 0 && needsNonChainedNode) return null;

  const nodes = [];
  for (const family of presentContinents) {
    if (groupsByName.get(family.selector)?.nodeFilter !== continentFilter(family)) return null;
    nodes.push(syntheticNode(nodes.length, family.key, SOURCE_KIND.unknown, "🌐"));
  }
  if (nodes.length > 0) {
    nodes[0]._profile.udp = game?.nodeFilter === GAME_FILTER;
    nodes[0]._profile.p2p = p2p?.nodeFilter === P2P_FILTER;
    nodes[0]._profile.entry = chainEnabled;
  }
  if (chainEnabled) {
    const chained = syntheticNode(nodes.length, presentContinents[0].key, SOURCE_KIND.landing);
    chained._profile.chained = true;
    nodes.push(chained);
  }
  return nodes;
}

function sameCanonicalSemantics(actual, expected) {
  if (actual.length !== expected.length) return false;
  for (let index = 0; index < expected.length; index += 1) {
    const actualGroup = actual[index];
    const expectedGroup = expected[index];
    if (
      actualGroup.name !== expectedGroup.name
      || actualGroup.defaultChoice !== expectedGroup.defaultChoice
      || actualGroup.candidates.length !== expectedGroup.candidates.length
    ) {
      return false;
    }
    for (let candidateIndex = 0; candidateIndex < expectedGroup.candidates.length; candidateIndex += 1) {
      if (actualGroup.candidates[candidateIndex] !== expectedGroup.candidates[candidateIndex]) return false;
    }
  }
  return true;
}

function matchesCanonicalSemantics(groups) {
  if (!Array.isArray(groups)) return false;
  const nodes = inferredInventory(groups);
  if (nodes === null) return false;
  const names = new Set(groups.map((group) => group.name));
  const clientChain = CHAIN_NAMES.every((name) => names.has(name)) ? "on" : "off";

  for (const autoGroupMode of ["full", "balanced", "minimal"]) {
    for (const blockMode of OPTION_VALUES.blockMode) {
      const expected = buildPolicyGroups({
        platform: "macos",
        autoGroupMode,
        blockMode,
        clientChain,
      }, nodes);
      if (sameCanonicalSemantics(groups, expected)) return true;
    }
  }
  return false;
}

/** Finite client-neutral policy schema used by platform adapters for fail-closed validation. */
export const POLICY_GROUP_SCHEMA = Object.freeze({
  groups: Object.freeze(Object.fromEntries(POLICY_SCHEMA_ENTRIES)),
  requiredNames: REQUIRED_POLICY_GROUP_NAMES,
  reservedNames: Object.freeze([POLICY_TARGET.primaryProxy, "DIRECT", "REJECT"]),
  continentFamilies: CONTINENT_FAMILIES,
  chainNames: CHAIN_NAMES,
  matchesCanonicalSemantics,
});
