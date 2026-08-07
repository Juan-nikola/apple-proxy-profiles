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
    ["anywhere", "egern", "shadowrocket", "sing-box", "surge"],
  );
  assert.deepEqual(Object.keys(optionalManifest.clients).sort(), [
    "anywhere", "egern", "shadowrocket", "singbox", "surge",
  ]);
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
    /default entries actual \d+ limit 25000/u,
  );
});

test("reports the DomesticCore limit and largest emitted files", () => {
  const files = new Map([["surge/rules/DomesticCore.list", "12345"]]);
  assert.throws(
    () => enforcePublicationBudgets({
      diagnostics: { domesticCoreEntries: 2_001, defaultEntries: 2_001 },
      files,
    }),
    /DomesticCore entries actual 2001 limit 2000; client all; largest five surge\/rules\/DomesticCore\.list=5/u,
  );
});

test("reports the client and largest files for referenced-byte overflow", () => {
  const files = new Map([["shadowrocket/rules/huge.list", Buffer.alloc(RULE_BUDGETS.defaultBytes + 1)]]);
  assert.throws(
    () => enforcePublicationBudgets({
      diagnostics: { domesticCoreEntries: 1, defaultEntries: 1 },
      files,
    }),
    /referenced default bytes actual 5000001 limit 5000000; client shadowrocket; largest five shadowrocket\/rules\/huge\.list=5000001/u,
  );
});
