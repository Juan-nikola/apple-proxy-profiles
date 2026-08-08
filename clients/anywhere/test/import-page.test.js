import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildImportBatches, buildImportDeepLink, renderImportPage } from "../src/build-import-page.js";

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
  const html = renderImportPage(batches, {
    upstream: { commit: "d".repeat(40) },
    generatedAt: "2026-08-01T19:07:21Z",
    manifestSha256: "a".repeat(64),
    totals: { sourceCount: 4, shardCount: 4, outputCount: 4 },
    shards: input.map((url) => ({ url })),
    schemaVersion: 2,
    removed: ["Advertising", "Advertising_Domain", "ChinaMax_Domain", "Game"],
    replacements: {
      ChinaMax_Domain: ["DomesticCore"],
      Game: ["DomesticGame", "OverseasGame"],
    },
    optionalPacks: { "adblock-full": "../../optional/adblock-full/manifest.json" },
  });
  assert.match(html, /<!doctype html>/u);
  assert.match(html, /Default 不是可靠的“停用”开关/u);
  assert.match(html, /Privacy/u);
  assert.match(html, /HTTPS 解密\/MITM/u);
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
      { id: "Advertising", routing: 2 },
      { id: "Advertising_Domain", routing: 2 },
    ],
    shards: input.map((url, index) => ({
      sourceId: index === 0 ? "Advertising" : "Advertising_Domain",
      url,
    })),
  };
  const html = renderImportPage(buildImportBatches(input), manifest, { mode: "adblock-full" });
  assert.match(html, /REJECT/u);
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
  assert.equal((actual.match(/class="button"/gu) ?? []).length, 4);
  assert.equal((actual.match(/<li><a href="https:/gu) ?? []).length, manifest.totals.shardCount);
  assert.match(actual, new RegExp(`href="${escapedTotalLink.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "u"));
  assert.deepEqual(new URL(totalLink).searchParams.getAll("link"), manifest.shards.map(({ url }) => url));
  assert.equal(manifest.schemaVersion, 2);
  assert.deepEqual(manifest.removed, ["Advertising", "Advertising_Domain", "ChinaMax_Domain", "Game"]);
  assert.deepEqual(manifest.replacements, {
    ChinaMax_Domain: ["DomesticCore"],
    Game: ["DomesticGame", "OverseasGame"],
  });
});

test("rendering rejects omitted shards and attacker-controlled deep links", () => {
  const input = urls(2);
  const manifest = {
    upstream: { commit: "d".repeat(40) },
    generatedAt: "2026-08-01T19:07:21Z",
    manifestSha256: "a".repeat(64),
    totals: { sourceCount: 2, shardCount: 2, outputCount: 2 },
    shards: input.map((url) => ({ url })),
  };
  const batches = buildImportBatches(input);
  assert.throws(() => renderImportPage([{ ...batches[0], urls: [input[0]] }], manifest), /close over/u);
  assert.throws(() => renderImportPage([{ ...batches[0], deepLink: "javascript:alert(1)" }], manifest), /deep link/u);
});
