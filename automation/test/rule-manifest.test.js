import assert from "node:assert/strict";
import test from "node:test";

import {
  artifactBuffer,
  artifactByteLength,
  artifactSha256,
} from "../src/artifact-content.js";
import { buildClientArtifacts, enforcePublicationBudgets } from "../src/build-artifacts.js";
import { RULE_BUDGETS } from "../../shared/rules/lightweight-policy.js";
import { lightweightFixtureSnapshots } from "./lightweight-fixture.js";

const upstream = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "d".repeat(40),
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

test("hashes and counts binary artifacts without UTF-8 conversion", () => {
  const binary = Buffer.from([0xd9, 0x9d, 0x73, 0x72]);
  assert.strictEqual(artifactBuffer(binary), binary);
  assert.equal(artifactByteLength(binary), 4);
  assert.equal(artifactSha256(binary), "77f766e651b67f55cdd6a23776e224e422e0c90b1ee45b9fdfeb544e7d74ff24");
});

test("isolates the full ad pack from every default manifest path", () => {
  const result = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const manifest = JSON.parse(result.defaults.get("manifest.json"));
  const defaultPaths = manifest.files.map(({ path }) => path);
  assert.equal(defaultPaths.some((path) => /Advertising|ChinaMax_Domain/u.test(path)), false);
  assert.equal(result.defaults.has("anywhere/import.html"), true);
  const anywhereManifest = JSON.parse(result.defaults.get("anywhere/rules/manifest.json"));
  assert.equal(anywhereManifest.schemaVersion, 2);
  const anywhereClientManifest = JSON.parse(result.defaults.get("anywhere/client-manifest.json"));
  assert.equal(anywhereClientManifest.files.some(({ path }) => path === "anywhere/import.html"), true);
  assert.equal(anywhereClientManifest.files.some(({ path }) => path.startsWith("optional/")), false);

  const pack = result.optionalPacks.get("adblock-full");
  const optionalManifest = JSON.parse(pack.get("optional/adblock-full/manifest.json"));
  assert.equal(optionalManifest.packId, "adblock-full");
  assert.equal(optionalManifest.generatedAt, upstream.committedAt);
  assert.ok(optionalManifest.entries > 0);
  assert.ok(optionalManifest.bytes > 0);
  assert.ok(optionalManifest.files.length > 0);
  assert.ok(optionalManifest.files.every(({ path, bytes, sha256 }) => (
    path.startsWith("optional/adblock-full/")
      && Number.isSafeInteger(bytes)
      && /^[0-9a-f]{64}$/u.test(sha256)
  )));
  assert.deepEqual(
    [...new Set(optionalManifest.files.map(({ path }) => path.split("/")[2]))].sort(),
    ["anywhere", "clash", "egern", "shadowrocket", "sing-box", "surge"],
  );
  assert.deepEqual(Object.keys(optionalManifest.clients).sort(), [
    "anywhere", "clash", "egern", "shadowrocket", "singbox", "surge",
  ]);
  const optionalPagePath = "optional/adblock-full/anywhere/import.html";
  assert.equal(pack.has(optionalPagePath), true);
  assert.match(pack.get(optionalPagePath), /REJECT[\s\S]*内存/u);
  const optionalAnywhereManifest = JSON.parse(pack.get("optional/adblock-full/anywhere/manifest.json"));
  assert.deepEqual(optionalAnywhereManifest.sources.map(({ id }) => id), ["Advertising", "Advertising_Domain"]);
  assert.equal(optionalAnywhereManifest.shards.every(({ url }) => (
    url.startsWith("https://juan-nikola.github.io/apple-proxy-profiles/optional/adblock-full/current/anywhere/")
  )), true);
  const optionalAnywhereClient = JSON.parse(pack.get("optional/adblock-full/anywhere/client-manifest.json"));
  assert.equal(optionalAnywhereClient.files.some(({ path }) => path === optionalPagePath), true);
  for (const [client, { manifestHash }] of Object.entries(optionalManifest.clients)) {
    const directory = client === "singbox" ? "sing-box" : client;
    assert.match(manifestHash, /^[0-9a-f]{64}$/u);
    assert.equal(pack.has(`optional/adblock-full/${directory}/client-manifest.json`), true);
  }
  assert.equal(manifest.files.some(({ path }) => path.startsWith("optional/")), false);
});

test("rejects forbidden legacy rule references inside default static content", () => {
  assert.throws(
    () => buildClientArtifacts({
      snapshot: lightweightFixtureSnapshots(),
      upstream,
      additionalFiles: new Map([[
        "surge/examples/legacy.conf",
        "RULE-SET,https://example.invalid/current/surge/rules/Advertising.list,REJECT\n",
      ]]),
    }),
    /Forbidden default rule reference.*surge\/examples\/legacy\.conf/u,
  );
});

test("retains third-party license notices that name optional rule inputs", () => {
  const notice = "The optional Advertising and Advertising_Domain inputs remain GPL-2.0-only.\n";
  const result = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    additionalFiles: new Map([["THIRD_PARTY_NOTICES.md", notice]]),
  });

  assert.equal(result.defaults.get("THIRD_PARTY_NOTICES.md"), notice);
});

test("rejects bare forbidden rule IDs and forbidden default filenames", () => {
  for (const additionalFiles of [
    new Map([["surge/examples/bare.conf", "RULE-SET,Advertising,REJECT\n"]]),
    new Map([["surge/rules/Advertising.list", "DOMAIN-SUFFIX,otherwise-safe.example\n"]]),
    new Map([["egern/rules/ChinaMax_Domain.yaml", "domain_suffix_set: []\n"]]),
  ]) {
    assert.throws(
      () => buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream, additionalFiles }),
      /Forbidden default rule (?:reference|path)/u,
    );
  }
});

test("rejects over-budget compilation before returning publication bytes", () => {
  const snapshots = lightweightFixtureSnapshots();
  const source = snapshots.get("OpenAI");
  const entries = Array.from({ length: RULE_BUDGETS.defaultEntries + 1 }, (_, index) => (
    `DOMAIN-SUFFIX,over-budget-${index}.example`
  )).join("\n");
  snapshots.set("OpenAI", {
    ...source,
    text: entries,
    entries: undefined,
    sourceBytes: Buffer.byteLength(entries),
  });
  assert.throws(
    () => buildClientArtifacts({ snapshot: snapshots, upstream }),
    new RegExp(`default entries actual \u005cd+ limit ${RULE_BUDGETS.defaultEntries}`),
  );
});

test("reports the DomesticCore limit and largest emitted files", () => {
  const files = new Map([["surge/rules/DomesticCore.list", "12345"]]);
  assert.throws(
    () => enforcePublicationBudgets({
      diagnostics: { domesticCoreEntries: RULE_BUDGETS.domesticCoreEntries + 1, defaultEntries: 1 },
      files,
    }),
    new RegExp(`DomesticCore entries actual ${RULE_BUDGETS.domesticCoreEntries + 1} limit ${RULE_BUDGETS.domesticCoreEntries}; client all; largest five surge\/rules\/DomesticCore\.list=5`),
  );
});

test("reports the client and largest files for referenced-byte overflow", () => {
  const files = new Map([["shadowrocket/rules/huge.list", Buffer.alloc(RULE_BUDGETS.defaultBytes + 1)]]);
  assert.throws(
    () => enforcePublicationBudgets({
      diagnostics: { domesticCoreEntries: 1, defaultEntries: 1 },
      files,
    }),
    new RegExp(`referenced default bytes actual ${RULE_BUDGETS.defaultBytes + 1} limit ${RULE_BUDGETS.defaultBytes}; client shadowrocket; largest five shadowrocket\/rules\/huge\.list=${RULE_BUDGETS.defaultBytes + 1}`),
  );
});
