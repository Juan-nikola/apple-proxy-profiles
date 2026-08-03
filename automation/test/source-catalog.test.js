import assert from "node:assert/strict";
import test from "node:test";

import { RULE_SOURCE_CATALOG } from "../../shared/rules/catalog.js";
import {
  BLACKMATRIX7_BASELINE,
  LOGICAL_RULE_SETS,
  PUBLISH_SOURCE_CATALOG,
  catalogSha256,
  pinnedRawUrl,
} from "../src/source-catalog.js";

const EXPECTED_IDS = [
  "Hijacking", "BlockHttpDNS", "Advertising", "Advertising_Domain", "Privacy",
  "BiliBili", "ByteDance", "XiaoHongShu", "Weibo", "OpenAI", "Claude", "Gemini",
  "Copilot", "GitHub", "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
  "Telegram", "Facebook", "Instagram", "Twitter", "TikTok", "Apple", "Microsoft",
  "SteamCN", "ChinaMax_Domain", "Game", "Download", "PrivateTracker", "ChinaMax",
];

test("pins all 32 Surge inputs and all 31 logical families", () => {
  assert.deepEqual(PUBLISH_SOURCE_CATALOG.map(({ id }) => id), EXPECTED_IDS);
  assert.deepEqual(RULE_SOURCE_CATALOG.map(({ id }) => id), EXPECTED_IDS);
  assert.equal(PUBLISH_SOURCE_CATALOG.length, 32);
  assert.equal(LOGICAL_RULE_SETS.length, 31);
  assert.equal(new Set(PUBLISH_SOURCE_CATALOG.map(({ canonicalPath }) => canonicalPath)).size, 32);
  assert.deepEqual(LOGICAL_RULE_SETS.find(({ id }) => id === "Advertising"), {
    id: "Advertising",
    sourceIds: ["Advertising", "Advertising_Domain"],
    required: true,
  });
});

test("keeps Advertising rules and domain-set inputs independently auditable", () => {
  const advertising = PUBLISH_SOURCE_CATALOG.filter(({ familyId }) => familyId === "Advertising");
  assert.deepEqual(advertising.map(({ id, componentId, canonicalPath, routing }) => ({
    id, componentId, canonicalPath, routing,
  })), [
    {
      id: "Advertising",
      componentId: "rules",
      canonicalPath: "rule/Surge/Advertising/Advertising.list",
      routing: 2,
    },
    {
      id: "Advertising_Domain",
      componentId: "domains",
      canonicalPath: "rule/Surge/Advertising/Advertising_Domain.list",
      routing: 2,
    },
  ]);
});

test("uses explicit traversal-free Surge paths and deterministic routing", () => {
  for (const source of PUBLISH_SOURCE_CATALOG) {
    assert.match(source.canonicalPath, /^rule\/Surge\/[A-Za-z0-9_]+\/[A-Za-z0-9_]+\.list$/u);
    assert.equal(source.canonicalPath.includes(".."), false);
    assert.ok([0, 1, 2].includes(source.routing));
    assert.equal(source.priority, source.order * 10);
  }
  assert.equal(PUBLISH_SOURCE_CATALOG.some(({ id }) => id === "AdvertisingLite"), false);
  assert.equal(PUBLISH_SOURCE_CATALOG.findIndex(({ id }) => id === "ChinaMax_Domain")
    < PUBLISH_SOURCE_CATALOG.findIndex(({ id }) => id === "ChinaMax"), true);
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
  assert.equal(pinnedRawUrl(PUBLISH_SOURCE_CATALOG[0]),
    "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/dab47069a30c4ae70f7f5f4c919d639d9aaf79dc/rule/Surge/Hijacking/Hijacking.list");
  assert.match(catalogSha256(), /^[0-9a-f]{64}$/u);
});
