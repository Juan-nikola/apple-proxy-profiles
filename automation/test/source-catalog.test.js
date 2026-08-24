import assert from "node:assert/strict";
import test from "node:test";

import { RULE_SOURCE_CATALOG } from "../../shared/rules/catalog.js";
import { ROUTING_PHASES } from "../../shared/rules/lightweight-policy.js";
import {
  BLACKMATRIX7_BASELINE,
  DEFAULT_PUBLISH_SOURCE_CATALOG,
  FETCH_SOURCE_CATALOG,
  LOGICAL_RULE_SETS,
  PUBLISH_SOURCE_CATALOG,
  catalogSha256,
  pinnedRawUrl,
} from "../src/source-catalog.js";
import { EXTERNAL_RULE_SOURCE_CATALOG, validateSourceCatalog } from "../src/source-catalog.js";

const EXPECTED_INPUT_IDS = [
  "Hijacking", "BlockHttpDNS", "Advertising", "Advertising_Domain", "Privacy",
  "BiliBili", "ByteDance", "XiaoHongShu", "Weibo", "OpenAI", "Claude", "Gemini",
  "Copilot", "GitHub", "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
  "Telegram", "Facebook", "Instagram", "Twitter", "TikTok", "Apple", "Microsoft",
  "SteamCN", "ChinaMax_Domain", "Game", "Download", "PrivateTracker", "ChinaMax",
  "ChinaIPs",
];

test("keeps all 33 pinned inputs separate from the 32 lightweight publication outputs", () => {
  assert.deepEqual(FETCH_SOURCE_CATALOG.map(({ id }) => id), EXPECTED_INPUT_IDS);
  assert.equal(PUBLISH_SOURCE_CATALOG, FETCH_SOURCE_CATALOG);
  assert.deepEqual(DEFAULT_PUBLISH_SOURCE_CATALOG.map(({ id }) => id), RULE_SOURCE_CATALOG.map(({ id }) => id));
  assert.equal(PUBLISH_SOURCE_CATALOG.length, 33);
  assert.equal(DEFAULT_PUBLISH_SOURCE_CATALOG.length, 32);
  assert.equal(LOGICAL_RULE_SETS.length, 32);
  assert.equal(new Set(PUBLISH_SOURCE_CATALOG.map(({ canonicalPath }) => canonicalPath)).size, 33);
  assert.equal(LOGICAL_RULE_SETS.some(({ id }) => id === "Advertising"), false);
  assert.equal(LOGICAL_RULE_SETS.some(({ id }) => id === "ChinaMax_Domain"), false);
  assert.equal(DEFAULT_PUBLISH_SOURCE_CATALOG.find(({ id }) => id === "DomesticCore").routing, 1);
  assert.equal(DEFAULT_PUBLISH_SOURCE_CATALOG.find(({ id }) => id === "DomesticGame").routing, 1);
  assert.equal(DEFAULT_PUBLISH_SOURCE_CATALOG.find(({ id }) => id === "ChinaIP").routing, 1);
});

test("marks compiler-only and optional inputs without removing their pinned fetch URLs", () => {
  const advertising = FETCH_SOURCE_CATALOG.filter(({ familyId }) => familyId === "Advertising");
  assert.deepEqual(advertising.map(({ id, componentId, canonicalPath, routing, optionalPack }) => ({
    id, componentId, canonicalPath, routing, optionalPack,
  })), [
    {
      id: "Advertising",
      componentId: "rules",
      canonicalPath: "rule/Surge/Advertising/Advertising.list",
      routing: 2,
      optionalPack: "adblock-full",
    },
    {
      id: "Advertising_Domain",
      componentId: "domains",
      canonicalPath: "rule/Surge/Advertising/Advertising_Domain.list",
      routing: 2,
      optionalPack: "adblock-full",
    },
  ]);
  assert.deepEqual(FETCH_SOURCE_CATALOG.filter(({ inputOnly }) => inputOnly).map(({ id }) => id), [
    "ChinaMax_Domain", "Game", "ChinaMax", "ChinaIPs",
  ]);
  assert.equal(FETCH_SOURCE_CATALOG.find(({ id }) => id === "ChinaMax").auditOnly, true);
  assert.equal(FETCH_SOURCE_CATALOG.find(({ id }) => id === "ChinaIPs").auditOnly, undefined);
});

test("uses explicit traversal-free Surge paths and deterministic routing", () => {
  const legalDnsClasses = new Set(["china", "none", "proxy"]);
  for (const source of PUBLISH_SOURCE_CATALOG) {
    assert.match(source.canonicalPath, /^rule\/Surge\/[A-Za-z0-9_]+\/[A-Za-z0-9_]+\.list$/u);
    assert.equal(source.canonicalPath.includes(".."), false);
    assert.ok([0, 1, 2].includes(source.routing));
    assert.equal(source.priority, source.order * 10);
  }
  for (const source of DEFAULT_PUBLISH_SOURCE_CATALOG) {
    assert.match(source.canonicalPath, /^compiled\/Surge\/[A-Za-z0-9_]+\/[A-Za-z0-9_]+\.list$/u);
    assert.equal(source.canonicalPath.includes(".."), false);
    assert.ok(ROUTING_PHASES.includes(source.phase), `${source.id} has a legal routing phase`);
    assert.ok(legalDnsClasses.has(source.dnsClass), `${source.id} has a legal DNS class`);
  }
  assert.equal(PUBLISH_SOURCE_CATALOG.some(({ id }) => id === "AdvertisingLite"), false);
  assert.equal(PUBLISH_SOURCE_CATALOG.findIndex(({ id }) => id === "ChinaMax_Domain")
    < PUBLISH_SOURCE_CATALOG.findIndex(({ id }) => id === "ChinaMax"), true);
  const chinaTld = DEFAULT_PUBLISH_SOURCE_CATALOG.find(({ id }) => id === "ChinaTLD");
  assert.deepEqual({
    phase: chinaTld.phase,
    dnsClass: chinaTld.dnsClass,
    routing: chinaTld.routing,
  }, {
    phase: "lateDomestic",
    dnsClass: "china",
    routing: 1,
  });
});

test("pins immutable provenance and raw URLs", () => {
  assert.deepEqual(BLACKMATRIX7_BASELINE, {
    repository: "https://github.com/blackmatrix7/ios_rule_script",
    owner: "blackmatrix7",
    name: "ios_rule_script",
    branch: "master",
    commit: "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc",
    committedAt: "2026-08-01T19:07:21Z",
    license: "GPL-2.0-only",
  });
  assert.equal(pinnedRawUrl(FETCH_SOURCE_CATALOG[0]),
    "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/dab47069a30c4ae70f7f5f4c919d639d9aaf79dc/rule/Surge/Hijacking/Hijacking.list");
  assert.match(catalogSha256(), /^[0-9a-f]{64}$/u);
  const chinaIps = FETCH_SOURCE_CATALOG.find(({ id }) => id === "ChinaIPs");
  assert.equal(pinnedRawUrl(chinaIps),
    "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/dab47069a30c4ae70f7f5f4c919d639d9aaf79dc/rule/Surge/ChinaIPs/ChinaIPs.list");
});

test("pins documented release assets with verified digests", () => {
  const expected = [
    ["v2fly-domain-list", "20260819144818", "dlc.dat_plain.yml", "d74dc15311117fe983180bf3245e083633d14bb148ea5cd9db79b1d15a8533c2"],
    ["loyalsoldier-rules-dat", "202608212217", "geosite.dat", "b392a98a323777deab59d8208e856df09cf96f3a76d2869eb7a8e5289bc5d9f4"],
    ["russia-v2ray-rules", "202608221547", "geosite.dat", "76fdbe01687a6cc7683b50c38ceea84941458e8371d215918daf555665a537cd"],
    ["iran-v2ray-rules", "202608220502", "geosite.dat", "5ff22eb6bc59573253dce2655498db4ed8096380787f15f5d9268756a4940532"],
  ];
  assert.deepEqual(EXTERNAL_RULE_SOURCE_CATALOG.map(({ id, releaseTag, sourcePath, sha256 }) => [id, releaseTag, sourcePath, sha256]), expected);
  assert.doesNotThrow(() => validateSourceCatalog());
  const broken = EXTERNAL_RULE_SOURCE_CATALOG.map((source, index) => index === 0 ? { ...source, sha256: "short" } : source);
  assert.throws(() => validateSourceCatalog(broken), /SHA-256/u);
  assert.throws(() => validateSourceCatalog([]), /must not be empty/u);
});
