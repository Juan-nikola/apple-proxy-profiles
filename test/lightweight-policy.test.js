import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_RULE_SOURCE_IDS,
  FULL_ADBLOCK_SOURCE_IDS,
  POLICY_TARGETS,
  ROUTING_PHASES,
  ROUTING_PRECEDENCE,
  RULE_BUDGETS,
  orderedRoutingPlan,
  ruleClientCatalog,
} from "../shared/rules/lightweight-policy.js";
import {
  DOMESTIC_CORE_DOMAIN_SUFFIXES,
  DOMESTIC_GAME_DOMAIN_SUFFIXES,
} from "../shared/rules/domestic-core.js";
import { OBSERVED_DOMESTIC_RECORDS } from "../shared/rules/observed-domestic.js";
import { RULE_CLIENT_CATALOG } from "../shared/rules/client-catalog.js";
import * as policyCatalog from "../shared/policies/catalog.js";
import * as policyFilters from "../shared/policies/filters.js";

const { GROUP_KIND, STRATEGY, buildPolicyGroups } = policyCatalog;

const PUBLIC_SUFFIXES = new Set(["com", "net", "cn", "com.cn"]);

test("defines the default lightweight rule-set boundary", () => {
  assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("Advertising"), false);
  assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("Advertising_Domain"), false);
  assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("ChinaMax_Domain"), false);
  assert.deepEqual(FULL_ADBLOCK_SOURCE_IDS, ["Advertising", "Advertising_Domain"]);
  assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("DomesticCore"), true);
  assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("DomesticGame"), true);
  assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("OverseasGame"), true);
  assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("ChinaIP"), true);
  assert.equal(new Set(DEFAULT_RULE_SOURCE_IDS).size, DEFAULT_RULE_SOURCE_IDS.length);
  assert.deepEqual(ROUTING_PRECEDENCE, [
    "local", "security", "custom", "domesticCore", "domesticGame",
    "explicitOverseas", "overseasGame", "chinaIp", "defaultProxy",
  ]);
});

test("keeps domestic core and games explicit, normalized, and bounded", () => {
  assert.equal(new Set(DOMESTIC_CORE_DOMAIN_SUFFIXES).size, DOMESTIC_CORE_DOMAIN_SUFFIXES.length);
  assert.equal(DOMESTIC_CORE_DOMAIN_SUFFIXES.length <= RULE_BUDGETS.domesticCoreEntries, true);
  assert.equal(new Set(DOMESTIC_GAME_DOMAIN_SUFFIXES).size, DOMESTIC_GAME_DOMAIN_SUFFIXES.length);
  for (const suffix of [...DOMESTIC_CORE_DOMAIN_SUFFIXES, ...DOMESTIC_GAME_DOMAIN_SUFFIXES]) {
    assert.equal(suffix, suffix.toLowerCase());
    assert.equal(suffix.includes("*"), false);
    assert.equal(PUBLIC_SUFFIXES.has(suffix), false);
    assert.match(suffix, /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/u);
  }
});

test("keeps observed domestic suffixes as complete, normalized provenance records", () => {
  assert.deepEqual(OBSERVED_DOMESTIC_RECORDS, [
    {
      suffix: "wmpvp.com",
      service: "WeChat mini-program media",
      observedAt: "2026-08-08",
      reason: "Domestic App media request was observed falling through to the proxy",
    },
    {
      suffix: "bytehwm.com",
      service: "ByteDance font and static CDN",
      observedAt: "2026-08-08",
      reason: "Domestic static asset request was observed falling through to the proxy",
    },
    {
      suffix: "rtbasia.com",
      service: "Observed domestic App dependency",
      observedAt: "2026-08-08",
      reason: "App dependency was observed using the proxy during domestic workflow testing",
    },
    {
      suffix: "sandbox.itunes.apple.com",
      service: "Apple sandbox purchase validation",
      observedAt: "2026-08-08",
      reason: "Sandbox validation request was observed using the proxy during domestic App testing",
    },
  ]);
  assert.equal(new Set(OBSERVED_DOMESTIC_RECORDS.map(({ suffix }) => suffix)).size,
    OBSERVED_DOMESTIC_RECORDS.length);
  for (const record of OBSERVED_DOMESTIC_RECORDS) {
    assert.deepEqual(Object.keys(record).sort(), ["observedAt", "reason", "service", "suffix"]);
    assert.match(record.observedAt, /^\d{4}-\d{2}-\d{2}$/u);
    assert.equal(new Date(`${record.observedAt}T00:00:00.000Z`).toISOString().slice(0, 10), record.observedAt);
    assert.equal(record.service.length > 0, true);
    assert.equal(record.reason.length > 0, true);
    assert.equal(record.suffix, record.suffix.toLowerCase());
    assert.equal(record.suffix, record.suffix.trim());
    assert.equal(record.suffix.startsWith("."), false);
    assert.equal(record.suffix.endsWith("."), false);
    assert.equal(PUBLIC_SUFFIXES.has(record.suffix), false);
    assert.match(record.suffix, /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/u);
  }
});

test("does not expose observed domestic provenance as a client rule source", () => {
  assert.equal(DEFAULT_RULE_SOURCE_IDS.includes("ObservedDomestic"), false);
  assert.equal(RULE_CLIENT_CATALOG.some(({ id }) => id === "ObservedDomestic"), false);
});

test("covers representative Chinese app, media, map, and game ecosystems", () => {
  const core = new Set(DOMESTIC_CORE_DOMAIN_SUFFIXES);
  const games = new Set(DOMESTIC_GAME_DOMAIN_SUFFIXES);
  for (const suffix of [
    "bilibili.com", "douyin.com", "byteimg.com", "xiaohongshu.com", "weibo.com",
    "qq.com", "wechat.com", "iqiyi.com", "youku.com", "mgtv.com", "baidu.com",
    "taobao.com", "alipay.com", "163.com", "amap.com", "wmpvp.com", "bytehwm.com",
    "rtbasia.com", "sandbox.itunes.apple.com", "douyucdn.cn", "douyu.com", "douyuscdn.com",
    "huya.com", "bilivideo.net", "hdslb.org", "iqiyipic.com", "ykimg.com", "gtimg.com",
  ]) {
    assert.equal(core.has(suffix), true, `${suffix} must remain in the domestic core`);
  }
  for (const suffix of [
    "leiting.com", "tencentgames.com", "neteasegames.com", "mihoyo.com",
    "biligame.com", "taptap.com",
  ]) {
    assert.equal(games.has(suffix), true, `${suffix} must remain in the domestic game set`);
  }
});

test("only exposes the full advertising pack when it is explicitly requested", () => {
  assert.deepEqual(RULE_CLIENT_CATALOG.map(({ id }) => id), DEFAULT_RULE_SOURCE_IDS);
  assert.deepEqual(ruleClientCatalog().map(({ id }) => id), DEFAULT_RULE_SOURCE_IDS);
  assert.deepEqual(ruleClientCatalog({ adblockMode: "full" }).slice(-2).map(({ id }) => id), FULL_ADBLOCK_SOURCE_IDS);
  for (const adblockMode of ["", "balanced", "on", null, 1]) {
    assert.throws(() => ruleClientCatalog({ adblockMode }), /adblockMode/u);
  }
});

test("defines one authoritative routing plan with a late domestic fallback", () => {
  const plan = orderedRoutingPlan();
  const byId = new Map(plan.map((source) => [source.id, source]));
  assert.deepEqual(ROUTING_PHASES, [
    "security",
    "earlyDomestic",
    "serviceIntent",
    "overseasGame",
    "lateDomestic",
    "resolvedChinaIp",
  ]);
  assert.deepEqual(
    plan.filter(({ phase }) => phase === "lateDomestic").map(({ id }) => id),
    ["ChinaTLD"],
  );
  assert.deepEqual(byId.get("ChinaTLD"), {
    id: "ChinaTLD",
    policy: "DIRECT",
    inputFormat: "RULE-SET",
    phase: "lateDomestic",
    dnsClass: "china",
  });
  assert.ok(plan.findIndex(({ id }) => id === "OverseasGame")
    < plan.findIndex(({ id }) => id === "ChinaTLD"));
  assert.ok(plan.findIndex(({ id }) => id === "ChinaTLD")
    < plan.findIndex(({ id }) => id === "ChinaIP"));
  assert.equal(new Set(plan.map(({ id }) => id)).size, plan.length);
});

test("assigns every client source one legal phase and DNS class", () => {
  const plan = orderedRoutingPlan({ adblockMode: "full" });
  const legalPhases = new Set(ROUTING_PHASES);
  const legalDnsClasses = new Set(["none", "china", "proxy"]);
  for (const source of plan) {
    assert.equal(legalPhases.has(source.phase), true, `${source.id} has an invalid phase`);
    assert.equal(legalDnsClasses.has(source.dnsClass), true, `${source.id} has an invalid DNS class`);
  }
  for (const id of FULL_ADBLOCK_SOURCE_IDS) {
    assert.equal(plan.find((source) => source.id === id).phase, "security");
  }
});

test("defines the shared policy targets and resource budgets", () => {
  assert.equal(POLICY_TARGETS.overseasGame, "🌍 海外游戏");
  assert.equal(RULE_BUDGETS.defaultEntries, 25_000);
  assert.equal(RULE_BUDGETS.defaultBytes, 5_000_000);
  assert.equal(RULE_BUDGETS.startupInlineEntries, 64);
  assert.equal(RULE_BUDGETS.singBoxRuleRssBytes, 50 * 1024 * 1024);
  assert.equal(RULE_BUDGETS.singBoxTotalRssBytes, 200 * 1024 * 1024);
});

test("keeps overseas games proxy-first and SteamCN direct-first", () => {
  const groups = buildPolicyGroups({
    platform: "macos",
    autoGroupMode: "minimal",
    clientChain: "off",
    blockMode: "off",
  }, []);
  const overseasGame = groups.find(({ name }) => name === POLICY_TARGETS.overseasGame);
  assert.equal(overseasGame.candidates[0], POLICY_TARGETS.defaultProxy);
  assert.equal(overseasGame.candidates.at(-1), POLICY_TARGETS.direct);
  assert.equal(RULE_CLIENT_CATALOG.find(({ id }) => id === "SteamCN").policy, POLICY_TARGETS.direct);
});

test("builds a deterministic root-to-continent graph without flag or protocol child groups", () => {
  const inventory = [
    ["🇺🇸 US · VLESS｜自建", "americas", "🇺🇸", "VLESS", false],
    ["🌐 Unknown · AnyTLS｜机场", "other", "🌐", "AnyTLS", false],
    ["🇩🇪 DE · Hysteria2｜机场", "europe", "🇩🇪", "Hysteria2", false],
    ["🇸🇬 SG · Trojan｜机场", "asiaPacific", "🇸🇬", "Trojan", false],
    ["🔗 🇰🇷 KR · SS｜落地", "asiaPacific", "🇰🇷", "SS", true],
    ["🇯🇵 JP · SS｜机场", "asiaPacific", "🇯🇵", "SS", false],
  ].map(([name, continent, flag, protocolLabel, chained]) => ({
    name,
    _profile: {
      continent,
      flag,
      protocolLabel,
      sourceKind: chained ? "landing" : "airport",
      udp: false,
      p2p: false,
      entry: false,
      chained,
    },
  }));
  const groups = buildPolicyGroups({
    platform: "macos",
    autoGroupMode: "full",
    clientChain: "off",
    blockMode: "off",
  }, inventory);
  const byName = new Map(groups.map((group) => [group.name, group]));

  assert.deepEqual(byName.get("🚀 节点选择").candidates, [
    "⚡ 全部自动",
    "🛟 全部故障转移",
    "🌏 亚太",
    "🌍 欧洲",
    "🌎 美洲",
    "🌐 其他/未分类",
  ]);
  assert.equal(byName.get("🚀 节点选择").nodeFilter, null);
  assert.deepEqual(
    groups.filter(({ kind }) => [GROUP_KIND.primary, GROUP_KIND.continent].includes(kind)).map(({ name }) => name),
    [
      "🚀 节点选择",
      "🌏 亚太",
      "🌍 欧洲",
      "🌎 美洲",
      "🌐 其他/未分类",
    ],
  );
  for (const continent of policyFilters.CONTINENTS) {
    const group = byName.get(continent.name);
    assert.deepEqual(
      { kind: group.kind, strategy: group.strategy, nodeFilter: group.nodeFilter },
      {
        kind: GROUP_KIND.continent,
        strategy: STRATEGY.select,
        nodeFilter: policyFilters.continentFilter(continent),
      },
      continent.name,
    );
    assert.deepEqual(group.candidates, ["⚡ 亚太自动", "🛟 亚太故障转移"].map((name) => (
      name.replace("亚太", continent.helperName)
    )), continent.name);
  }
  const nonChained = inventory.filter(({ _profile }) => !_profile.chained);
  for (const continent of policyFilters.CONTINENTS) {
    const filter = new RegExp(policyFilters.continentFilter(continent), "u");
    for (const node of nonChained) {
      assert.equal(
        filter.test(node.name),
        node._profile.continent === continent.key,
        `${node.name} should only match ${continent.name}`,
      );
    }
  }
  assert.equal(byName.has("🇰🇷 韩国"), false, "chained flags must not create groups");
  assert.equal(byName.has("🇯🇵 日本"), false, "country groups must not be created");
  assert.equal(byName.has("🌐 未分类"), false, "fallback flag groups must not be created");
  assert.deepEqual(byName.get("🤖 AI 专用").candidates, []);
  for (const name of ["🤖 AI 亚太", "🤖 AI 欧洲", "🤖 AI 美洲", "🤖 AI 其他/未分类"]) {
    assert.equal(byName.has(name), false, `${name} must not be created`);
  }
  assert.equal(groups.some(({ kind }) => kind === "protocol"), false);
  for (const protocolLabel of new Set(inventory.map(({ _profile }) => _profile.protocolLabel))) {
    assert.equal(byName.has(protocolLabel), false, protocolLabel);
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(name) {
    assert.equal(visiting.has(name), false, `cycle at ${name}`);
    if (visited.has(name)) return;
    visiting.add(name);
    for (const candidate of byName.get(name).candidates) {
      if (byName.has(candidate)) visit(candidate);
    }
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of byName.keys()) visit(name);
});

test("keeps non-catalog country flags inside their normalized continent without country groups", () => {
  const inventory = [
    ["🇽🇽 XX · SS｜机场", "🇽🇽", false],
    ["🇿🇦 ZA · SS｜机场", "🇿🇦", false],
    ["🔗 🇽🇦 XA · SS｜落地", "🇽🇦", true],
    ["🇽🇰 XK · SS｜机场", "🇽🇰", false],
  ].map(([name, flag, chained]) => ({
    name,
    _profile: {
      continent: "other",
      flag,
      protocolLabel: "SS",
      sourceKind: chained ? "landing" : "airport",
      udp: false,
      p2p: false,
      entry: false,
      chained,
    },
  }));
  const groups = buildPolicyGroups({
    platform: "macos",
    autoGroupMode: "minimal",
    clientChain: "off",
    blockMode: "off",
  }, inventory);
  const byName = new Map(groups.map((group) => [group.name, group]));

  assert.deepEqual(byName.get("🚀 节点选择").candidates, [
    "⚡ 全部自动",
    "🛟 全部故障转移",
    "🌐 其他/未分类",
  ]);
  const other = byName.get("🌐 其他/未分类");
  assert.equal(other.kind, GROUP_KIND.continent);
  assert.equal(other.strategy, STRATEGY.select);
  assert.deepEqual(other.candidates, ["⚡ 其他/未分类自动"]);
  const filter = new RegExp(other.nodeFilter, "u");
  for (const node of inventory.filter(({ _profile }) => !_profile.chained)) {
    assert.equal(filter.test(node.name), true, node.name);
  }
  for (const flag of ["🇿🇦", "🇽🇰", "🇽🇽"]) {
    assert.equal(byName.has(flag), false, `${flag} must not become a country group`);
  }
  assert.equal(byName.has("🇽🇦"), false, "chained non-catalog flags must not create groups");
  assert.equal(byName.has("🌐 未分类"), false, "fallback flag must only appear when present");
});

test("groups every non-chained node by its normalized continent without country groups", () => {
  for (const [flag, continent] of [
    ["🇯🇵", "asiaPacific"],
    ["🇩🇪", "europe"],
    ["🌐", "other"],
  ]) {
    const groups = buildPolicyGroups({
      platform: "macos",
      autoGroupMode: "minimal",
      clientChain: "off",
      blockMode: "off",
    }, [{
      name: `${flag} TEST_ONLY_WRONG_CONTINENT`,
      _profile: {
        continent,
        flag,
        protocolLabel: "SS",
        sourceKind: "airport",
        udp: false,
        p2p: false,
        entry: false,
        chained: false,
      },
    }]);
    const record = policyFilters.CONTINENTS.find((entry) => entry.key === continent);
    const continentGroup = groups.find((group) => group.name === record.name);
    assert.ok(continentGroup, `${flag}/${continent} must create its continent group`);
    assert.equal(continentGroup.nodeFilter, policyFilters.continentFilter(record));
    assert.equal(
      groups.some((group) => group.name === "🇯🇵 日本" || group.name === "🇽🇰" || group.kind === GROUP_KIND.flag),
      false,
    );
  }
});
