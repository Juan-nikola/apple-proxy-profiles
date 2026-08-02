import {
  GROUP_KIND,
  SERVICE_GROUPS,
  STRATEGY,
  automaticHelperName,
  fallbackHelperName,
} from "./catalog.js";
import {
  ALL_NODES_FILTER,
  CHAINED_NODES_FILTER,
  CONTINENTS,
  ENTRY_FILTER,
  GAME_FILTER,
  NON_CHAINED_FILTER,
  P2P_FILTER,
  SOURCE_GROUPS,
  continentFilter,
} from "./filters.js";
import { POLICY_TARGET } from "./intents.js";

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
  "🛟 全部故障转移",
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
  ["🛟 全部故障转移", policySchema(GROUP_KIND.helper, STRATEGY.fallback, [NON_CHAINED_FILTER], { hidden: true })],
  ["🚀 节点选择", policySchema(GROUP_KIND.primary, STRATEGY.select, [null])],
  ...CONTINENTS.flatMap((continent) => {
    const filter = continentFilter(continent);
    return [
      [continent.name, policySchema(GROUP_KIND.continent, STRATEGY.select, [filter])],
      [automaticHelperName(continent), policySchema(GROUP_KIND.helper, STRATEGY.autoTest, [filter], { hidden: true })],
      [fallbackHelperName(continent), policySchema(GROUP_KIND.helper, STRATEGY.fallback, [filter], { hidden: true })],
      [`🤖 AI ${continent.helperName}`, policySchema(GROUP_KIND.ai, STRATEGY.select, [filter], { hidden: true })],
    ];
  }),
  ...SOURCE_GROUPS.map((source) => [
    source.name,
    policySchema(GROUP_KIND.source, STRATEGY.select, [source.filter]),
  ]),
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

/** Finite client-neutral policy schema used by platform adapters for fail-closed validation. */
export const POLICY_GROUP_SCHEMA = Object.freeze({
  groups: Object.freeze(Object.fromEntries(POLICY_SCHEMA_ENTRIES)),
  requiredNames: REQUIRED_POLICY_GROUP_NAMES,
  reservedNames: Object.freeze([POLICY_TARGET.primaryProxy, "DIRECT", "REJECT"]),
  continentFamilies: Object.freeze(CONTINENTS.map((continent) => Object.freeze({
    selector: continent.name,
    automatic: automaticHelperName(continent),
    fallback: fallbackHelperName(continent),
    ai: `🤖 AI ${continent.helperName}`,
  }))),
  chainNames: Object.freeze(["⚡ 入口自动", "🎯 客户端落地", "🔗 入口节点"]),
});
