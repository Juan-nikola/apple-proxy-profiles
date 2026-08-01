import { CONTINENT, SOURCE_KIND } from "./contracts.js";
import { CONTINENT_FLAGS } from "./country-regions.js";
import { platformPreset } from "./options.js";

const TEST_URL = "http://www.gstatic.com/generate_204";
const ALL_NODES_FILTER = "^.+$";
const NON_CHAINED_FILTER = "^(?!🔗 ).+$";
const ENTRY_FILTER = "^(?!.*\\[已有链\\])\\S+ \\[(?:机场|自建|Realm)\\] .+$";
const P2P_FILTER = "^\\S+ \\[(?:自建|Realm|链式代理)\\] .+$";
const GAME_FILTER = "^(?!🔗 )\\S+ .+ \\[UDP\\]$";

const CONTINENTS = Object.freeze([
  {
    key: CONTINENT.asiaPacific,
    name: "🌏 亚太",
    helperName: "亚太",
    flags: CONTINENT_FLAGS[CONTINENT.asiaPacific],
  },
  {
    key: CONTINENT.europe,
    name: "🌍 欧洲",
    helperName: "欧洲",
    flags: CONTINENT_FLAGS[CONTINENT.europe],
  },
  {
    key: CONTINENT.americas,
    name: "🌎 美洲",
    helperName: "美洲",
    flags: CONTINENT_FLAGS[CONTINENT.americas],
  },
  { key: CONTINENT.other, name: "🌐 其他/未分类", helperName: "其他/未分类", flags: [] },
]);

const SOURCE_GROUPS = Object.freeze([
  { kind: SOURCE_KIND.selfHosted, name: "🏠 自建节点", filter: "^\\S+ \\[自建\\] .+$" },
  { kind: SOURCE_KIND.airport, name: "🏢 机场节点", filter: "^\\S+ \\[机场\\] .+$" },
  { kind: SOURCE_KIND.realm, name: "↪️ Realm 转发", filter: "^\\S+ \\[Realm\\] .+$" },
  { kind: SOURCE_KIND.serverChain, name: "⛓️ 链式代理", filter: "^\\S+ \\[链式代理\\] .+$" },
]);

const PROXY_THEN_DIRECT = Object.freeze(["🚀 节点选择", "DIRECT"]);
const DIRECT_THEN_PROXY = Object.freeze(["DIRECT", "🚀 节点选择"]);
const SERVICE_GROUPS = Object.freeze([
  ["🐙 GitHub", PROXY_THEN_DIRECT],
  ["📺 YouTube", PROXY_THEN_DIRECT],
  ["🎬 Netflix", PROXY_THEN_DIRECT],
  ["🏰 Disney+", PROXY_THEN_DIRECT],
  ["🎵 Spotify", PROXY_THEN_DIRECT],
  ["🌍 国际媒体", PROXY_THEN_DIRECT],
  ["✈️ Telegram", PROXY_THEN_DIRECT],
  ["💬 海外社交", PROXY_THEN_DIRECT],
  ["🎶 TikTok", PROXY_THEN_DIRECT],
  ["🍎 Apple", DIRECT_THEN_PROXY],
  ["🪟 Microsoft", DIRECT_THEN_PROXY],
  ["📺 哔哩哔哩", DIRECT_THEN_PROXY],
  ["🎵 抖音", DIRECT_THEN_PROXY],
  ["📕 小红书", DIRECT_THEN_PROXY],
  ["🧣 微博", DIRECT_THEN_PROXY],
  ["🕹️ 游戏平台", PROXY_THEN_DIRECT],
]);

function continentFilter(continent) {
  if (continent.key === CONTINENT.other) {
    const knownFlags = CONTINENTS.flatMap((record) => record.flags).join("|");
    return `^(?!(?:🔗|${knownFlags}))\\S+ .+$`;
  }
  return `^(?:${continent.flags.join("|")}) .+$`;
}

function helper(name, type, preset, filter, items = []) {
  return {
    name,
    type,
    items,
    useSubscription: true,
    filter,
    url: TEST_URL,
    interval: preset.testInterval,
    timeout: preset.timeout,
    tolerance: preset.tolerance,
    hidden: true,
  };
}

function subscriptionGroup(name, filter, items = ["DIRECT"]) {
  return { name, type: "select", items, useSubscription: true, filter };
}

function automaticHelperName(continent) {
  return `⚡ ${continent.helperName}自动`;
}

function fallbackHelperName(continent) {
  return `🛟 ${continent.helperName}故障转移`;
}

function continentHelperItems(continent, mode) {
  if (mode === "full") return [automaticHelperName(continent), fallbackHelperName(continent)];
  if (mode === "balanced") return [automaticHelperName(continent)];
  return [];
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
    return { name, type: "select", items: [primary, primary === "REJECT" ? "DIRECT" : "REJECT"] };
  });
}

export function effectiveAutoMode(requested, nodeCount) {
  if (requested !== "auto") return requested;
  if (nodeCount <= 30) return "full";
  if (nodeCount <= 100) return "balanced";
  return "minimal";
}

export function buildGroups(options, nodes) {
  const normalizedNodes = Array.isArray(nodes) ? nodes : [];
  const preset = platformPreset(options.platform);
  const mode = effectiveAutoMode(options.autoGroupMode, normalizedNodes.length);
  const presentContinents = CONTINENTS.filter((continent) => (
    normalizedNodes.some((node) => node?._sr?.continent === continent.key && !node?._sr?.chained)
  ));
  const chainEligible = options.clientChain === "on"
    && normalizedNodes.some((node) => node?._sr?.entry === true && !node?._sr?.chained)
    && normalizedNodes.some((node) => node?._sr?.chained === true);
  const groups = [
    helper("⚡ 全部自动", "url-test", preset, NON_CHAINED_FILTER),
    helper("🛟 全部故障转移", "fallback", preset, NON_CHAINED_FILTER),
  ];

  if (chainEligible) groups.push(helper("⚡ 入口自动", "url-test", preset, ENTRY_FILTER));

  if (mode !== "minimal") {
    for (const continent of presentContinents) {
      groups.push(helper(automaticHelperName(continent), "url-test", preset, continentFilter(continent)));
      if (mode === "full") groups.push(helper(fallbackHelperName(continent), "fallback", preset, continentFilter(continent)));
    }
  }

  groups.push(subscriptionGroup(
    "🚀 节点选择",
    ALL_NODES_FILTER,
    ["⚡ 全部自动", "🛟 全部故障转移", ...presentContinents.map((continent) => continent.name)],
  ));
  for (const continent of presentContinents) {
    groups.push(subscriptionGroup(continent.name, continentFilter(continent), continentHelperItems(continent, mode)));
  }

  for (const source of SOURCE_GROUPS) {
    if (normalizedNodes.some((node) => node?._sr?.sourceKind === source.kind && !node?._sr?.chained)) {
      groups.push(subscriptionGroup(source.name, source.filter));
    }
  }
  if (chainEligible) {
    groups.push(subscriptionGroup("🎯 客户端落地", "^🔗 .+$"));
  }

  const aiContinentGroups = presentContinents.map((continent) => ({
    ...subscriptionGroup(`🤖 AI ${continent.helperName}`, continentFilter(continent), continentHelperItems(continent, mode)),
    hidden: true,
  }));
  groups.push(...aiContinentGroups);
  groups.push(subscriptionGroup("🤖 AI 专用", ALL_NODES_FILTER, aiContinentGroups.map((group) => group.name)));
  for (const [name, items] of SERVICE_GROUPS) groups.push(subscriptionGroup(name, ALL_NODES_FILTER, items));
  if (normalizedNodes.some((node) => node?._sr?.udp === true && !node?._sr?.chained)) {
    groups.push(subscriptionGroup("🎮 游戏连接", GAME_FILTER));
  } else {
    groups.push({ name: "🎮 游戏连接", type: "select", items: ["DIRECT"] });
  }
  if (normalizedNodes.some((node) => node?._sr?.p2p === true && !node?._sr?.chained)) {
    groups.push(subscriptionGroup("⬇️ 下载/P2P", P2P_FILTER));
  } else {
    groups.push({ name: "⬇️ 下载/P2P", type: "select", items: ["DIRECT"] });
  }
  groups.push({ name: "🧭 DNS 与规则下载", type: "select", items: [...PROXY_THEN_DIRECT] });
  groups.push(...securityGroups(options.blockMode));
  if (chainEligible) {
    groups.push(subscriptionGroup("🔗 入口节点", ENTRY_FILTER, ["⚡ 入口自动"]));
  }
  return groups;
}

