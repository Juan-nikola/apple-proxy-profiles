import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildImportBatches, buildImportDeepLink, renderImportPage } from "../src/build-import-page.js";
import { ANYWHERE_LIGHTWEIGHT_MIGRATION } from "../src/shard-rules.js";

function urls(count) {
  return Array.from({ length: count }, (_, index) => (
    `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/rules/Rule-${String(index + 1).padStart(3, "0")}.arrs`
  ));
}

test("builds unique bounded deep links with every nested HTTPS URL encoded once", () => {
  const input = urls(34);
  const link = buildImportDeepLink(input);
  const parsed = new URL(link);
  assert.equal(parsed.protocol, "anywhere:");
  assert.equal(parsed.host, "add-rule-set");
  assert.deepEqual(parsed.searchParams.getAll("link"), input);
  assert.equal(new Set(parsed.searchParams.getAll("link")).size, input.length);
  assert.ok(link.startsWith("anywhere://add-rule-set?link=https%3A%2F%2F"));
  assert.equal((link.match(/(?:[?&])link=/gu) ?? []).length, input.length);
  const batches = buildImportBatches(input);
  assert.ok(batches.length > 1);
  assert.deepEqual(batches.flatMap(({ urls: batchUrls }) => batchUrls), input);
  for (const batch of batches) {
    assert.ok(batch.deepLink.length <= 1_800);
    assert.match(batch.deepLink, /^anywhere:\/\/add-rule-set\?link=https%3A%2F%2F/u);
    assert.equal(batch.deepLink,
      `anywhere://add-rule-set?${batch.urls.map((url) => `link=${encodeURIComponent(url)}`).join("&")}`);
    const parsed = new URL(batch.deepLink);
    assert.deepEqual(parsed.searchParams.getAll("link"), batch.urls);
    assert.deepEqual([...new Set(parsed.searchParams.keys())], ["link"]);
  }
});

test("rejects insecure, credentialed, query-bearing, duplicate, and oversized links", () => {
  const good = urls(1)[0];
  for (const bad of [
    good.replace("https:", "http:"),
    good.replace("https://", `https://${["us", "er"].join("")}@`),
    `${good}?token=private`,
    `${good}#fragment`,
    good.replace(".arrs", ".amrs"),
  ]) {
    assert.throws(() => buildImportBatches([bad]));
  }
  assert.throws(() => buildImportDeepLink([good.replace("https:", "http:")]));
  assert.throws(() => buildImportDeepLink([`${good}?token=private`]));
  assert.throws(() => buildImportDeepLink([good.replace(".arrs", ".amrs")]));
  assert.throws(() => buildImportDeepLink([good, good]), /unique/u);
  assert.throws(() => buildImportDeepLink([]));
  assert.throws(() => buildImportBatches([good, good]), /unique/u);
  assert.throws(() => buildImportBatches([good], 100), /exceeds/u);
});

test("renders a static escaped no-script page with manual fallbacks", () => {
  const input = urls(4);
  const batches = buildImportBatches(input);
  const sources = [
    {
      id: "ChinaIP", order: 4, phase: "resolvedChinaIp", dnsClass: "none",
      intendedTarget: "direct", routing: 1, shardIds: ["Rule-004"],
    },
    {
      id: "OverseasGame", order: 2, phase: "overseasGame", dnsClass: "proxy",
      intendedTarget: "<Proxy & chain>", routing: 0, shardIds: ["Rule-002"],
    },
    {
      id: "ChinaTLD", order: 3, phase: "lateDomestic", dnsClass: "china",
      intendedTarget: "direct", routing: 1, shardIds: ["Rule-003"],
    },
    {
      id: "DomesticCore", order: 1, phase: "earlyDomestic", dnsClass: "china",
      intendedTarget: "direct", routing: 1, shardIds: ["Rule-001"],
    },
  ];
  const html = renderImportPage(batches, {
    upstream: { commit: "d".repeat(40) },
    generatedAt: "2026-08-01T19:07:21Z",
    manifestSha256: "a".repeat(64),
    totals: { sourceCount: 4, shardCount: 4, outputCount: 4 },
    shards: input.map((url, index) => ({
      id: `Rule-${String(index + 1).padStart(3, "0")}`,
      sourceId: ["DomesticCore", "OverseasGame", "ChinaTLD", "ChinaIP"][index],
      url,
    })),
    schemaVersion: 2,
    removed: ANYWHERE_LIGHTWEIGHT_MIGRATION.removed,
    replacements: ANYWHERE_LIGHTWEIGHT_MIGRATION.replacements,
    optionalPacks: ANYWHERE_LIGHTWEIGHT_MIGRATION.optionalPacks,
    sources,
  });
  assert.match(html, /<!doctype html>/u);
  assert.match(html, /Default 不是可靠的“停用”开关/u);
  assert.match(html, /Privacy/u);
  assert.match(html, /HTTPS 解密\/MITM/u);
  assert.match(html, /每个分片[\s\S]*同一[\s\S]*分配/u);
  assert.match(html, /ChinaTLD[\s\S]*lateDomestic[\s\S]*DIRECT[\s\S]*1 shard\(s\)/u);
  assert.match(html, /ChinaTLD \| lateDomestic \| DIRECT \| 1 shard\(s\)/u);
  assert.match(html, /&lt;Proxy &amp; chain&gt;/u);
  assert.equal(html.includes("<Proxy & chain>"), false);
  assert.ok(html.indexOf("DomesticCore") < html.indexOf("OverseasGame"));
  assert.ok(html.indexOf("OverseasGame") < html.indexOf("ChinaTLD"));
  assert.ok(html.indexOf("ChinaTLD") < html.indexOf("ChinaIP"));
  for (const { id } of sources) assert.ok(html.includes(id), id);
  assert.equal(html.includes("<script"), false);
  for (const id of ["Advertising", "Advertising_Domain", "ChinaMax_Domain", "Game"]) {
    assert.match(html, new RegExp(id, "u"));
  }
  assert.match(html, /删除或禁用/u);
  for (const url of input) assert.equal((html.match(new RegExp(url.replaceAll(".", "\\."), "gu")) ?? []).length, 2);
});

test("renders a separate full-adblock import page that only imports REJECT advertising shards", () => {
  const input = [
    "https://juan-nikola.github.io/apple-proxy-profiles/current/optional/adblock-full/anywhere/Advertising-001.arrs",
    "https://juan-nikola.github.io/apple-proxy-profiles/current/optional/adblock-full/anywhere/Advertising_Domain-001.arrs",
  ];
  const manifest = {
    upstream: { commit: "d".repeat(40) },
    generatedAt: "2026-08-01T19:07:21Z",
    manifestSha256: "a".repeat(64),
    totals: { sourceCount: 2, shardCount: 2, outputCount: 2 },
    sources: [
      {
        id: "Advertising", order: 1, phase: "security", dnsClass: "none",
        intendedTarget: "reject", routing: 2, shardIds: ["Advertising-001"],
      },
      {
        id: "Advertising_Domain", order: 2, phase: "security", dnsClass: "none",
        intendedTarget: "reject", routing: 2, shardIds: ["Advertising_Domain-001"],
      },
    ],
    shards: input.map((url, index) => ({
      id: index === 0 ? "Advertising-001" : "Advertising_Domain-001",
      sourceId: index === 0 ? "Advertising" : "Advertising_Domain",
      url,
    })),
  };
  const html = renderImportPage(buildImportBatches(input), manifest, { mode: "adblock-full" });
  assert.match(html, /REJECT/u);
  assert.match(html, /Advertising[\s\S]*security[\s\S]*REJECT[\s\S]*1 shard\(s\)/u);
  assert.match(html, /Advertising \| security \| REJECT \| 1 shard\(s\)/u);
  assert.match(html, /内存/u);
  assert.match(html, /显著|大幅|明显/u);
  assert.doesNotMatch(html, /DomesticCore|DomesticGame|OverseasGame|ChinaIP/u);
  assert.equal((html.match(/<li><a href="https:/gu) ?? []).length, 2);
  assert.equal(html.includes("<script"), false);
});

test("tracked lightweight import page closes over every schema-v2 manifest shard deterministically", async () => {
  const manifest = JSON.parse(await readFile(new URL("../examples/rules/manifest.json", import.meta.url), "utf8"));
  const batches = buildImportBatches(manifest.shards.map(({ url }) => url));
  const totalLink = buildImportDeepLink(manifest.shards.map(({ url }) => url));
  const escapedTotalLink = totalLink.replaceAll("&", "&amp;");
  const expected = renderImportPage(batches, manifest);
  const actual = await readFile(new URL("../examples/import.html", import.meta.url), "utf8");
  assert.equal(actual, expected);
  assert.equal(batches.flatMap(({ urls: batchUrls }) => batchUrls).length, manifest.totals.shardCount);
  assert.equal(batches.every(({ deepLink }) => deepLink.length <= 1_800), true);
  assert.match(actual, /全部导入/u);
  assert.equal(actual.includes("<script"), false);
  assert.doesNotMatch(actual, /<script\b|javascript:|vbscript:|\son\w+\s*=/iu);
  assert.equal((actual.match(/class="button"/gu) ?? []).length, batches.length + 1);
  assert.equal((actual.match(/<li><a href="https:/gu) ?? []).length, manifest.totals.shardCount);
  assert.match(actual, new RegExp(`href="${escapedTotalLink.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "u"));
  assert.deepEqual(new URL(totalLink).searchParams.getAll("link"), manifest.shards.map(({ url }) => url));
  assert.equal(manifest.schemaVersion, 2);
  assert.deepEqual(manifest.removed, ANYWHERE_LIGHTWEIGHT_MIGRATION.removed);
  assert.deepEqual(manifest.replacements, ANYWHERE_LIGHTWEIGHT_MIGRATION.replacements);
  assert.match(actual, /DomesticCore[\s\S]*earlyDomestic[\s\S]*DIRECT[\s\S]*1 shard\(s\)/u);
  assert.match(actual, /每个分片[\s\S]*同一[\s\S]*分配/u);
});

test("rejects invalid source assignment metadata instead of rendering untrusted rows", () => {
  const input = urls(1);
  const manifest = {
    upstream: { commit: "d".repeat(40) },
    generatedAt: "2026-08-01T19:07:21Z",
    manifestSha256: "a".repeat(64),
    totals: { sourceCount: 1, shardCount: 1, outputCount: 1 },
    sources: [{
      id: "ChinaTLD", order: 1, phase: "lateDomestic", dnsClass: "china",
      intendedTarget: "direct", routing: 1, shardIds: ["Rule-001"],
    }],
    shards: [{ id: "Rule-001", sourceId: "ChinaTLD", url: input[0] }],
  };
  const batches = buildImportBatches(input);
  for (const source of [
    { ...manifest.sources[0], phase: "unknown" },
    { ...manifest.sources[0], dnsClass: "system" },
    { ...manifest.sources[0], order: 0 },
    { ...manifest.sources[0], shardIds: "Rule-001" },
    { ...manifest.sources[0], id: undefined },
    { ...manifest.sources[0], shardIds: [undefined] },
  ]) {
    assert.throws(() => renderImportPage(batches, { ...manifest, sources: [source] }), /sources/u);
  }
});

test("rejects source assignments that do not close over manifest shard ownership", () => {
  const input = urls(1);
  const source = {
    id: "ChinaTLD", order: 1, phase: "lateDomestic", dnsClass: "china",
    intendedTarget: "direct", routing: 1, shardIds: ["Rule-001"],
  };
  const shard = { id: "Rule-001", sourceId: "ChinaTLD", url: input[0] };
  const manifest = {
    upstream: { commit: "d".repeat(40) },
    generatedAt: "2026-08-01T19:07:21Z",
    manifestSha256: "a".repeat(64),
    totals: { sourceCount: 1, shardCount: 1, outputCount: 1 },
    sources: [source],
    shards: [shard],
  };
  const batches = buildImportBatches(input);
  for (const { name, sources, shards } of [
    { name: "missing assignment", sources: [{ ...source, shardIds: [] }], shards: [shard] },
    {
      name: "extra assignment",
      sources: [{ ...source, shardIds: ["Rule-001", "Rule-002"] }],
      shards: [shard],
    },
    {
      name: "duplicate assignment",
      sources: [{ ...source, shardIds: ["Rule-001", "Rule-001"] }],
      shards: [shard],
    },
    { name: "wrong owner", sources: [source], shards: [{ ...shard, sourceId: "ChinaIP" }] },
    { name: "non-string emitted ID", sources: [source], shards: [{ ...shard, id: undefined }] },
  ]) {
    assert.throws(() => renderImportPage(batches, { ...manifest, sources, shards }), /sources/u, name);
  }
});

test("rendering rejects omitted shards and attacker-controlled deep links", () => {
  const input = urls(2);
  const manifest = {
    upstream: { commit: "d".repeat(40) },
    generatedAt: "2026-08-01T19:07:21Z",
    manifestSha256: "a".repeat(64),
    totals: { sourceCount: 2, shardCount: 2, outputCount: 2 },
    sources: [
      {
        id: "DomesticCore", order: 1, phase: "earlyDomestic", dnsClass: "china",
        intendedTarget: "direct", routing: 1, shardIds: ["Rule-001"],
      },
      {
        id: "ChinaIP", order: 2, phase: "resolvedChinaIp", dnsClass: "none",
        intendedTarget: "direct", routing: 1, shardIds: ["Rule-002"],
      },
    ],
    shards: input.map((url, index) => ({
      id: `Rule-${String(index + 1).padStart(3, "0")}`,
      sourceId: index === 0 ? "DomesticCore" : "ChinaIP",
      url,
    })),
  };
  const batches = buildImportBatches(input);
  assert.throws(() => renderImportPage([{ ...batches[0], urls: [input[0]] }], manifest), /close over/u);
  assert.throws(() => renderImportPage([{ ...batches[0], deepLink: "javascript:alert(1)" }], manifest), /deep link/u);
});
