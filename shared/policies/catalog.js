import { nodeMetadata } from "../contracts.js";
import {
  ALL_NODES_FILTER,
  CONTINENTS,
  ENTRY_FILTER,
  GAME_FILTER,
  NON_CHAINED_FILTER,
  P2P_FILTER,
  SOURCE_GROUPS,
  continentFilter,
} from "./filters.js";
import { platformPolicyPreset } from "./platform-presets.js";

const TEST_URL = "http://www.gstatic.com/generate_204";

export const STRATEGY = Object.freeze({
  select: "select",
  autoTest: "auto-test",
  fallback: "fallback",
});

export const GROUP_KIND = Object.freeze({
  helper: "helper",
  primary: "primary",
  continent: "continent",
  source: "source",
  ai: "ai",
  service: "service",
  special: "special",
  security: "security",
  chain: "chain",
});

const PROXY_THEN_DIRECT = Object.freeze(["🚀 节点选择", "DIRECT"]);
const PROXY_FIRST_SERVICE_DEFAULTS = Object.freeze({
  beforeCandidates: Object.freeze(["🚀 节点选择"]),
  afterCandidates: Object.freeze(["DIRECT"]),
  defaultChoice: "🚀 节点选择",
});
const DIRECT_FIRST_SERVICE_DEFAULTS = Object.freeze({
  beforeCandidates: Object.freeze(["DIRECT", "🚀 节点选择"]),
  afterCandidates: Object.freeze([]),
  defaultChoice: "DIRECT",
});
export const SERVICE_GROUPS = Object.freeze([
  Object.freeze(["🐙 GitHub", PROXY_FIRST_SERVICE_DEFAULTS]),
  Object.freeze(["📺 YouTube", PROXY_FIRST_SERVICE_DEFAULTS]),
  Object.freeze(["🎬 海外流媒体", PROXY_FIRST_SERVICE_DEFAULTS]),
  Object.freeze(["💬 海外社交", PROXY_FIRST_SERVICE_DEFAULTS]),
  Object.freeze(["🍎 Apple", DIRECT_FIRST_SERVICE_DEFAULTS]),
  Object.freeze(["🪟 Microsoft", DIRECT_FIRST_SERVICE_DEFAULTS]),
  Object.freeze(["🇨🇳 国内平台", DIRECT_FIRST_SERVICE_DEFAULTS]),
  Object.freeze(["🌍 海外游戏", PROXY_FIRST_SERVICE_DEFAULTS]),
]);

function policyGroup({
  kind,
  name,
  strategy = STRATEGY.select,
  candidates = [],
  nodeFilter = null,
  test = null,
  hidden,
  defaultChoice,
}) {
  return { kind, name, strategy, candidates, nodeFilter, test, hidden, defaultChoice };
}

function helper(kind, name, strategy, preset, nodeFilter, candidates = []) {
  return policyGroup({
    kind,
    name,
    strategy,
    candidates,
    nodeFilter,
    test: {
      url: TEST_URL,
      interval: preset.testInterval,
      timeout: preset.timeout,
      tolerance: preset.tolerance,
    },
    hidden: true,
  });
}

function subscriptionGroup(kind, name, nodeFilter, candidates = ["DIRECT"], options = {}) {
  return policyGroup({ kind, name, candidates, nodeFilter, ...options });
}

export function automaticHelperName(continent) {
  return `⚡ ${continent.helperName}自动`;
}

export function fallbackHelperName(continent) {
  return `\u{1F6DF} ${continent.helperName}故障转移`;
}

function continentHelperItems(continent, mode) {
  if (mode === "full") return [automaticHelperName(continent), fallbackHelperName(continent)];
  return [automaticHelperName(continent)];
}

function serviceChoiceItems(defaults, presentContinentNames) {
  return [
    ...defaults.beforeCandidates,
    "⚡ 全部自动",
    "\u{1F6DF} 全部故障转移",
    ...presentContinentNames,
    ...defaults.afterCandidates,
  ];
}

function securityGroups(blockMode) {
  const defaults = {
    off: ["DIRECT", "DIRECT", "DIRECT"],
    security: ["REJECT", "DIRECT", "DIRECT"],
    balanced: ["REJECT", "REJECT", "DIRECT"],
    strict: ["REJECT", "REJECT", "REJECT"],
  }[blockMode] ?? ["REJECT", "REJECT", "DIRECT"];
  return ["☣️ 安全威胁", "🧱 常见广告", "🕵️ 严格跟踪"].map((name, index) => {
    const primary = defaults[index];
    return policyGroup({
      kind: GROUP_KIND.security,
      name,
      candidates: [primary, primary === "REJECT" ? "DIRECT" : "REJECT"],
    });
  });
}

export function effectiveAutoMode(requested, nodeCount) {
  if (requested !== "auto") return requested;
  if (nodeCount <= 30) return "full";
  if (nodeCount <= 100) return "balanced";
  return "minimal";
}

export function buildPolicyGroups(options, nodes) {
  const normalizedNodes = Array.isArray(nodes) ? nodes : [];
  const preset = platformPolicyPreset(options.platform);
  const mode = effectiveAutoMode(options.autoGroupMode, normalizedNodes.length);
  const presentContinents = CONTINENTS.filter((continent) => (
    normalizedNodes.some((node) => nodeMetadata(node).continent === continent.key && !nodeMetadata(node).chained)
  ));
  const chainEligible = options.clientChain === "on"
    && normalizedNodes.some((node) => nodeMetadata(node).entry === true && !nodeMetadata(node).chained)
    && normalizedNodes.some((node) => nodeMetadata(node).chained === true);
  const groups = [
    helper(GROUP_KIND.helper, "⚡ 全部自动", STRATEGY.autoTest, preset, NON_CHAINED_FILTER),
    helper(GROUP_KIND.helper, "\u{1F6DF} 全部故障转移", STRATEGY.fallback, preset, NON_CHAINED_FILTER),
  ];

  if (chainEligible) {
    groups.push(helper(GROUP_KIND.chain, "⚡ 入口自动", STRATEGY.autoTest, preset, ENTRY_FILTER));
  }

  for (const continent of presentContinents) {
    groups.push(helper(
      GROUP_KIND.helper,
      automaticHelperName(continent),
      STRATEGY.autoTest,
      preset,
      continentFilter(continent),
    ));
    if (mode === "full") {
      groups.push(helper(
        GROUP_KIND.helper,
        fallbackHelperName(continent),
        STRATEGY.fallback,
        preset,
        continentFilter(continent),
      ));
    }
  }

  groups.push(policyGroup({
    kind: GROUP_KIND.primary,
    name: "🚀 节点选择",
    candidates: [
      "⚡ 全部自动",
      "\u{1F6DF} 全部故障转移",
      ...presentContinents.map((continent) => continent.name),
    ],
  }));
  for (const continent of presentContinents) {
    groups.push(policyGroup({
      kind: GROUP_KIND.continent,
      name: continent.name,
      candidates: continentHelperItems(continent, mode),
      nodeFilter: continentFilter(continent),
    }));
  }

  for (const source of SOURCE_GROUPS) {
    if (normalizedNodes.some((node) => nodeMetadata(node).sourceKind === source.kind && !nodeMetadata(node).chained)) {
      groups.push(subscriptionGroup(GROUP_KIND.source, source.name, source.filter));
    }
  }
  if (chainEligible) {
    groups.push(subscriptionGroup(GROUP_KIND.chain, "🎯 客户端落地", "^🔗 .+$"));
  }

  const aiContinentGroups = presentContinents.map((continent) => subscriptionGroup(
    GROUP_KIND.ai,
    `🤖 AI ${continent.helperName}`,
    continentFilter(continent),
    continentHelperItems(continent, mode),
    { hidden: true },
  ));
  groups.push(...aiContinentGroups);
  groups.push(subscriptionGroup(
    GROUP_KIND.ai,
    "🤖 AI 专用",
    ALL_NODES_FILTER,
    aiContinentGroups.map((group) => group.name),
  ));
  const presentContinentNames = presentContinents.map((continent) => continent.name);
  for (const [name, defaults] of SERVICE_GROUPS) {
    groups.push(subscriptionGroup(
      GROUP_KIND.service,
      name,
      ALL_NODES_FILTER,
      serviceChoiceItems(defaults, presentContinentNames),
      { defaultChoice: defaults.defaultChoice },
    ));
  }
  if (normalizedNodes.some((node) => nodeMetadata(node).udp === true && !nodeMetadata(node).chained)) {
    groups.push(subscriptionGroup(GROUP_KIND.special, "🎮 游戏连接", GAME_FILTER));
  } else {
    groups.push(policyGroup({ kind: GROUP_KIND.special, name: "🎮 游戏连接", candidates: ["DIRECT"] }));
  }
  if (normalizedNodes.some((node) => nodeMetadata(node).p2p === true && !nodeMetadata(node).chained)) {
    groups.push(subscriptionGroup(GROUP_KIND.special, "⬇️ 下载/P2P", P2P_FILTER));
  } else {
    groups.push(policyGroup({ kind: GROUP_KIND.special, name: "⬇️ 下载/P2P", candidates: ["DIRECT"] }));
  }
  groups.push(policyGroup({
    kind: GROUP_KIND.special,
    name: "🧭 DNS 与规则下载",
    candidates: [...PROXY_THEN_DIRECT],
  }));
  groups.push(...securityGroups(options.blockMode));
  if (chainEligible) {
    groups.push(subscriptionGroup(GROUP_KIND.chain, "🔗 入口节点", ENTRY_FILTER, ["⚡ 入口自动"]));
  }
  return groups;
}
