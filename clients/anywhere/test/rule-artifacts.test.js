import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { canonicalJson } from "../../../automation/src/render-anywhere-rules.js";
import { ANYWHERE_LIGHTWEIGHT_MIGRATION } from "../src/shard-rules.js";

const rulesDirectory = new URL("../examples/rules/", import.meta.url);
const optionalDirectory = new URL("../examples/optional/adblock-full/anywhere/", import.meta.url);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function parseLikeAnywhere(content) {
  let name = "";
  let routing = 0;
  const rules = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    const equal = line.indexOf("=");
    if (equal !== -1) {
      const key = line.slice(0, equal).trim().toLowerCase();
      const value = line.slice(equal + 1).trim();
      if (key === "name") name = value;
      if (key === "routing") routing = Number(value);
      continue;
    }
    const comma = line.indexOf(",");
    if (comma === -1) continue;
    const type = Number(line.slice(0, comma).trim());
    const value = line.slice(comma + 1).trim();
    if (Number.isInteger(type) && type >= 0 && type <= 3 && value) rules.push({ type, value });
  }
  return { name, routing, rules };
}

test("pins the schema-v2 lightweight topology without legacy giant default shards", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", rulesDirectory), "utf8"));
  assert.equal(manifest.schemaVersion, 2);
  assert.deepEqual(manifest.removed, ANYWHERE_LIGHTWEIGHT_MIGRATION.removed);
  assert.deepEqual(manifest.replacements, ANYWHERE_LIGHTWEIGHT_MIGRATION.replacements);
  assert.deepEqual(manifest.optionalPacks, { "adblock-full": "../../optional/adblock-full/manifest.json" });
  assert.equal(manifest.upstream.commit, "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc");
  assert.equal(manifest.generatedAt, manifest.upstream.committedAt);
  const ids = manifest.sources.map(({ id }) => id);
  for (const id of [
    "Security", "Privacy", "DomesticCore", "DomesticPlatform", "AI", "GitHub", "YouTube",
    "OverseasMedia", "OverseasSocial", "Apple", "Microsoft", "Download", "OverseasGame", "ChinaIP",
  ]) assert.ok(ids.includes(id), id);
  for (const id of [
    "Hijacking", "BlockHttpDNS", "DomesticGame", "SteamCN", "BiliBili", "ByteDance", "XiaoHongShu",
    "Weibo", "OpenAI", "Claude", "Gemini", "Copilot", "Netflix", "Disney", "Spotify", "GlobalMedia",
    "Telegram", "Facebook", "Instagram", "Twitter", "TikTok", "PrivateTracker", "ChinaTLD",
    "Advertising", "Advertising_Domain", "ChinaMax_Domain", "Game", "ChinaMax",
  ]) {
    assert.equal(ids.includes(id), false, id);
  }
  assert.equal(manifest.sources.find(({ id }) => id === "DomesticCore").routing, 1);
  assert.equal(manifest.sources.find(({ id }) => id === "OverseasGame").routing, 0);
  assert.equal(manifest.sources.find(({ id }) => id === "ChinaIP").routing, 1);
  const domesticCore = manifest.sources.find(({ id }) => id === "DomesticCore");
  assert.ok(domesticCore.sourceIds.includes("ChinaTLD"), "ChinaTLD must be included in DomesticCore");
  assert.deepEqual({
    phase: domesticCore.phase,
    dnsClass: domesticCore.dnsClass,
    routing: domesticCore.routing,
  }, {
    phase: "earlyDomestic",
    dnsClass: "china",
    routing: 1,
  });
  assert.ok(manifest.sources.findIndex(({ id }) => id === "OverseasGame")
    < manifest.sources.findIndex(({ id }) => id === "ChinaIP"));
  assert.equal(domesticCore.shardIds.length, 1);
});

test("round-trips every shard with the pinned Swift-equivalent parser", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", rulesDirectory), "utf8"));
  const expectedFiles = new Set(["manifest.json"]);
  let total = 0;
  for (const shard of manifest.shards) {
    const filename = shard.path.slice("anywhere/rules/".length);
    expectedFiles.add(filename);
    assert.match(filename, /^[A-Za-z0-9_-]+\.arrs$/u);
    assert.match(shard.url, /^https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles\/current\/anywhere\/rules\/[A-Za-z0-9_-]+\.arrs$/u);
    const content = await readFile(new URL(filename, rulesDirectory), "utf8");
    assert.equal(content.includes("\r"), false);
    assert.equal(content.endsWith("\n"), true);
    assert.equal(sha256(content), shard.sha256);
    const parsed = parseLikeAnywhere(content);
    assert.equal(parsed.name, shard.name);
    assert.equal(parsed.routing, manifest.sources.find(({ id }) => id === shard.sourceId).routing);
    assert.equal(parsed.rules.length, shard.entryCount);
    assert.ok(parsed.rules.length > 0 && parsed.rules.length <= 95_000);
    assert.equal(parsed.rules.every(({ value }) => !value.includes(",") && !value.includes("no-resolve")), true);
    total += parsed.rules.length;
  }
  assert.equal(total, manifest.totals.outputCount);
  assert.deepEqual(new Set(await readdir(rulesDirectory)), expectedFiles);
});

test("closes the lightweight manifest without wall-clock input or legacy shard names", async () => {
  const content = await readFile(new URL("manifest.json", rulesDirectory), "utf8");
  const manifest = JSON.parse(content);
  const { manifestSha256, ...withoutHash } = manifest;
  assert.equal(sha256(canonicalJson(withoutHash)), manifestSha256);
  assert.equal(content.includes("2026-08-03"), false);
  assert.equal(content.includes(".amrs"), false);
  assert.equal(manifest.shards.some(({ sourceId }) => [
    "Advertising", "Advertising_Domain", "ChinaMax_Domain", "Game", "ChinaMax",
  ].includes(sourceId)), false);
});

test("tracks a closed optional full-adblock tree with only REJECT advertising shards", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", optionalDirectory), "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(manifest.sources.map(({ id, routing }) => ({ id, routing })), [
    { id: "Advertising", routing: 2 },
    { id: "Advertising_Domain", routing: 2 },
  ]);
  const expected = new Set(["manifest.json", "client-manifest.json", "import.html"]);
  for (const shard of manifest.shards) {
    const filename = shard.path.slice("optional/adblock-full/anywhere/".length);
    expected.add(filename);
    assert.match(shard.url, /^https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles\/optional\/adblock-full\/current\/anywhere\/[A-Za-z0-9_-]+\.arrs$/u);
    const content = await readFile(new URL(filename, optionalDirectory), "utf8");
    assert.equal(sha256(content), shard.sha256);
    assert.equal(parseLikeAnywhere(content).routing, 2);
  }
  const page = await readFile(new URL("import.html", optionalDirectory), "utf8");
  assert.match(page, /REJECT[\s\S]*内存/u);
  assert.equal(page.includes("DomesticCore"), false);
  assert.deepEqual(new Set(await readdir(optionalDirectory)), expected);
});
