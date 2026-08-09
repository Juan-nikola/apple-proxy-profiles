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
import { buildPolicyGroups } from "../shared/policies/catalog.js";

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
