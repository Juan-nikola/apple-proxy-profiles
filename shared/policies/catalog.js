import { nodeMetadata } from "../contracts.js";
import {
  ALL_NODES_FILTER,
  CONTINENTS,
  ENTRY_FILTER,
  GAME_FILTER,
  NON_CHAINED_FILTER,
  P2P_FILTER,
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

export const LEAK_GROUP_NAME = "漏网之鱼";

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
  void mode;
  return [automaticHelperName(continent)];
}

function serviceChoiceItems(defaults, presentContinentNames) {
  return [
    ...defaults.beforeCandidates,
    "⚡ 全部自动",
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

export function applyUnifiedPolicyDefaults(groups, resolution) {
  if (!resolution || typeof resolution !== "object") return groups;
  const byLabel = new Map();
  const targetDefaults = {
    "🤖 AI 专用": resolution.targets?.ai,
    "🐙 GitHub": resolution.targets?.github,
    "📺 YouTube": resolution.targets?.youtube,
    "🎬 海外流媒体": resolution.targets?.overseasMedia,
    "💬 海外社交": resolution.targets?.globalSocial,
    "🍎 Apple": resolution.targets?.apple,
    "🪟 Microsoft": resolution.targets?.microsoft,
    "🇨🇳 国内平台": resolution.targets?.domesticPlatform,
    "🌍 海外游戏": resolution.targets?.overseasGame,
    "🎮 游戏连接": resolution.targets?.game,
    "⬇️ 下载/P2P": resolution.targets?.download,
    "🧭 DNS 与规则下载": resolution.targets?.dnsAndRules,
    [LEAK_GROUP_NAME]: resolution.targets?.final,
  };
  for (const [name, record] of Object.entries(targetDefaults)) {
    if (!record) continue;
    const value = record.resolved === "DIRECT" ? "DIRECT" : record.resolved === "FOLLOW" ? "🚀 节点选择" : record.resolved;
    byLabel.set(name, value);
  }
  return groups.map((group) => {
    const defaultChoice = byLabel.get(group.name);
    if (defaultChoice === undefined) return group;
    return { ...group, defaultChoice };
  });
}

export function buildPolicyGroups(options, nodes, policyResolution = null) {
  const normalizedNodes = Array.isArray(nodes) ? nodes : [];
  const preset = platformPolicyPreset(options.platform);
  const mode = effectiveAutoMode(options.autoGroupMode, normalizedNodes.length);
  const presentContinents = CONTINENTS.filter((continent) => (
    normalizedNodes.some((node) => nodeMetadata(node).continent === continent.key && !nodeMetadata(node).chained)
  ));
  const chainEligible = options.clientChain === "on"
    && normalizedNodes.some((node) => nodeMetadata(node).entry === true && !nodeMetadata(node).chained)
    && normalizedNodes.some((node) => nodeMetadata(node).chained === true);
  const helpers = [
    helper(GROUP_KIND.helper, "⚡ 全部自动", STRATEGY.autoTest, preset, NON_CHAINED_FILTER),
  ];

  if (chainEligible) {
    helpers.push(helper(GROUP_KIND.chain, "⚡ 入口自动", STRATEGY.autoTest, preset, ENTRY_FILTER));
  }

  for (const continent of presentContinents) {
    helpers.push(helper(
      GROUP_KIND.helper,
      automaticHelperName(continent),
      STRATEGY.autoTest,
      preset,
      continentFilter(continent),
    ));
  }

  const groups = [];
  groups.push(policyGroup({
    kind: GROUP_KIND.primary,
    name: "🚀 节点选择",
    candidates: [
      "⚡ 全部自动",
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

  if (chainEligible) {
    groups.push(subscriptionGroup(GROUP_KIND.chain, "🎯 客户端落地", "^🔗 .+$"));
  }

  groups.push(subscriptionGroup(
    GROUP_KIND.ai,
    "🤖 AI 专用",
    ALL_NODES_FILTER,
    [],
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
  groups.push(subscriptionGroup(
    GROUP_KIND.special,
    LEAK_GROUP_NAME,
    ALL_NODES_FILTER,
    ["🚀 节点选择", "DIRECT", "REJECT"],
  ));
  groups.push(...securityGroups(options.blockMode));
  if (chainEligible) {
    groups.push(subscriptionGroup(GROUP_KIND.chain, "🔗 入口节点", ENTRY_FILTER, ["⚡ 入口自动"]));
  }
  const result = [...groups, ...helpers];
  return applyUnifiedPolicyDefaults(result, policyResolution);
}
