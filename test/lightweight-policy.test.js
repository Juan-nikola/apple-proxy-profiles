import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_RULE_SOURCE_IDS,
  FULL_ADBLOCK_SOURCE_IDS,
  POLICY_TARGETS,
  ROUTING_PRECEDENCE,
  RULE_BUDGETS,
  ruleClientCatalog,
} from "../shared/rules/lightweight-policy.js";
import {
  DOMESTIC_CORE_DOMAIN_SUFFIXES,
  DOMESTIC_GAME_DOMAIN_SUFFIXES,
} from "../shared/rules/domestic-core.js";
import { RULE_CLIENT_CATALOG } from "../shared/rules/client-catalog.js";

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

test("covers representative Chinese app, media, map, and game ecosystems", () => {
  const core = new Set(DOMESTIC_CORE_DOMAIN_SUFFIXES);
  const games = new Set(DOMESTIC_GAME_DOMAIN_SUFFIXES);
  for (const suffix of [
    "bilibili.com", "douyin.com", "byteimg.com", "xiaohongshu.com", "weibo.com",
    "qq.com", "wechat.com", "iqiyi.com", "youku.com", "mgtv.com", "baidu.com",
    "taobao.com", "alipay.com", "163.com", "amap.com",
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

test("defines the shared policy targets and resource budgets", () => {
  assert.equal(POLICY_TARGETS.overseasGame, "🌍 海外游戏");
  assert.equal(RULE_BUDGETS.defaultEntries, 25_000);
  assert.equal(RULE_BUDGETS.defaultBytes, 5_000_000);
  assert.equal(RULE_BUDGETS.startupInlineEntries, 64);
  assert.equal(RULE_BUDGETS.singBoxRuleRssBytes, 50 * 1024 * 1024);
  assert.equal(RULE_BUDGETS.singBoxTotalRssBytes, 200 * 1024 * 1024);
});
