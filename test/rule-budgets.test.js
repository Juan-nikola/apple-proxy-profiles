import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildClientArtifacts } from "../automation/src/build-artifacts.js";
import { artifactSha256 } from "../automation/src/artifact-content.js";
import { lightweightFixtureSnapshots } from "../automation/test/lightweight-fixture.js";
import { compileRules } from "../clients/sing-box/scripts/compile-rules.mjs";
import {
  DEFAULT_RULE_SOURCE_IDS,
  MOBILE_RULE_SOURCE_IDS,
  RULE_BUDGETS,
} from "../shared/rules/lightweight-policy.js";

const root = new URL("../", import.meta.url);
const forbidden = /\b(?:Advertising|Advertising_Domain|ChinaMax_Domain)\b/u;
const forbiddenFullDomainUrl = /https?:\/\/[^\s"'<>]*(?:ChinaMax_Domain|ChinaMax)(?:[./?#]|$)/iu;
const migrationMetadata = new Set([
  "anywhere/import.html",
  "anywhere/rules/manifest.json",
]);
const optionalAwareGenerators = new Set([
  "onexray/scripts/onexray-node-generator.js",
  "onexray/scripts/substore-node-generator.js",
  "onexray/scripts/onexray-profile-generator.js",
  "onexray/scripts/substore-profile-generator.js",
  "onexray/scripts/onexray-routing-audit.js",
  "onexray/scripts/substore-routing-audit.js",
  "happ/scripts/happ-config-generator.js",
  "happ/scripts/substore-config-generator.js",
  "happ/scripts/happ-routing-audit.js",
  "happ/scripts/substore-routing-audit.js",
]);
const upstream = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "d".repeat(40),
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

function fixtureArtifacts() {
  return buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
}

async function fixtureCore() {
  const directory = await mkdtemp(join(tmpdir(), "lightweight-srs-core-"));
  const executable = join(directory, "sing-box");
  const script = [
    "#!/bin/sh",
    "out=''",
    "while [ $# -gt 0 ]; do if [ \"$1\" = \"--output\" ]; then shift; out=$1; fi; shift; done",
    "printf 'SRS\\0021234567890123' > \"$out\"",
    "",
  ].join("\n");
  await writeFile(executable, script, { mode: 0o755 });
  await chmod(executable, 0o755);
  return executable;
}

test("emitted default manifests stay inside all entry and byte budgets", () => {
  const artifacts = fixtureArtifacts();
  const { defaultManifest } = artifacts.diagnostics;
  assert.ok(defaultManifest.diagnostics.domesticCoreEntries <= RULE_BUDGETS.domesticCoreEntries);
  assert.ok(defaultManifest.diagnostics.defaultEntries <= RULE_BUDGETS.defaultEntries);
  assert.deepEqual(artifacts.diagnostics.defaultRuleIds, DEFAULT_RULE_SOURCE_IDS);

  const report = {};
  for (const client of ["shadowrocket", "surge", "egern", "singbox", "anywhere"]) {
    const bytes = defaultManifest.clients[client].referencedDefaultBytes;
    assert.ok(bytes > 0 && bytes <= RULE_BUDGETS.defaultBytes, `${client}: ${bytes}`);
    report[client] = { entries: defaultManifest.diagnostics.defaultEntries, bytes };
  }
  for (const record of defaultManifest.files) {
    assert.match(record.sha256, /^(?!0{64})[0-9a-f]{64}$/u, record.path);
    assert.equal(artifactSha256(artifacts.defaults.get(record.path)), record.sha256, record.path);
  }
  console.log(`lightweight budgets ${JSON.stringify(report)}`);
});

test("the pinned real Anywhere snapshot remains within the shared entry budget", async () => {
  const manifest = JSON.parse(await readFile(new URL("clients/anywhere/examples/rules/manifest.json", root), "utf8"));
  assert.ok(manifest.totals.outputCount > 0 && manifest.totals.outputCount <= RULE_BUDGETS.defaultEntries);
  const domesticCore = manifest.sources.find(({ id }) => id === "DomesticCore");
  assert.ok(domesticCore.counts.output > 0 && domesticCore.counts.output <= RULE_BUDGETS.domesticCoreEntries);
});

test("default artifacts contain no load-bearing legacy giant rule IDs or URLs", () => {
  const { defaults } = fixtureArtifacts();
  for (const [path, content] of defaults) {
    assert.doesNotMatch(path, forbidden, path);
    if (!migrationMetadata.has(path)) {
      const pattern = optionalAwareGenerators.has(path)
        ? /\bChinaMax_Domain\b/u
        : forbidden;
      assert.doesNotMatch(Buffer.from(content).toString("utf8"), pattern, path);
      assert.doesNotMatch(Buffer.from(content).toString("utf8"), forbiddenFullDomainUrl, path);
    }
  }
});

test("all default client profiles leave the optional advertising pack unreachable", async () => {
  const textProfiles = [
    ...["macos", "iphone", "ipad"].map((platform) => `clients/shadowrocket/examples/shadowrocket-${platform}.conf`),
    ...["macos", "iphone", "ipad"].map((platform) => `clients/surge/examples/surge-${platform}.conf`),
    ...["macos", "iphone", "ipad"].map((platform) => `clients/egern/examples/egern-${platform}.yaml`),
  ];
  for (const path of textProfiles) {
    const content = await readFile(new URL(path, root), "utf8");
    assert.doesNotMatch(content, forbidden, path);
    assert.doesNotMatch(content, /\/optional\/adblock-full\//u, path);
  }

  for (const platform of ["macos", "iphone", "ipad", "android"]) {
    const path = `clients/sing-box/examples/sing-box-${platform}.json`;
    const singbox = JSON.parse(await readFile(new URL(path, root), "utf8"));
    const expectedRuleIds = ["iphone", "ipad"].includes(platform)
      ? MOBILE_RULE_SOURCE_IDS
      : DEFAULT_RULE_SOURCE_IDS;
    for (const provider of singbox.route.rule_set) {
      assert.equal(provider.type, "remote", path);
      assert.equal(provider.format, "binary", path);
      assert.match(provider.url, /^https:\/\/[^\s]+\.srs$/u, path);
      assert.doesNotMatch(provider.url, /\.json(?:$|[?#])/u, path);
      assert.doesNotMatch(provider.url, forbidden, path);
      assert.doesNotMatch(provider.url, /\/optional\/adblock-full\//u, path);
    }
    assert.deepEqual(
      singbox.route.rule_set.map(({ tag }) => tag.slice("rule-".length)),
      expectedRuleIds,
      path,
    );
    assert.equal(singbox.route.rule_set.some((provider) => provider.format === "source"), false, path);
    const inline = singbox.route.rules.filter((rule) => !Object.hasOwn(rule, "rule_set"));
    assert.ok(inline.length <= RULE_BUDGETS.startupInlineEntries, `${path}: ${inline.length} inline rules`);
  }

  const anywherePage = await readFile(new URL("clients/anywhere/examples/import.html", root), "utf8");
  assert.doesNotMatch(anywherePage, /href="[^"]*optional\/adblock-full/iu);
  const anywhereManifest = JSON.parse(await readFile(new URL("clients/anywhere/examples/rules/manifest.json", root), "utf8"));
  assert.equal(anywhereManifest.shards.some(({ url }) => /optional|Advertising|ChinaMax_Domain/u.test(url)), false);
});

test("the sing-box binary manifest closes over every referenced non-empty SRS with a nonzero hash", async () => {
  const artifacts = fixtureArtifacts();
  const directory = await mkdtemp(join(tmpdir(), "lightweight-srs-"));
  const sourceDirectory = join(directory, "source");
  const outputDirectory = join(directory, "output");
  await mkdir(sourceDirectory, { recursive: true });
  for (const id of DEFAULT_RULE_SOURCE_IDS) {
    await writeFile(join(sourceDirectory, `${id}.json`), artifacts.defaults.get(`sing-box/rules/${id}.json`));
  }
  const result = await compileRules({
    corePath: await fixtureCore(),
    sourceDirectory,
    outputDirectory,
  });
  assert.deepEqual(result.files.map(({ path }) => path).sort(), DEFAULT_RULE_SOURCE_IDS.map((id) => `${id}.srs`).sort());
  for (const record of result.files) {
    assert.ok(record.bytes >= 17, record.path);
    assert.match(record.sha256, /^(?!0{64})[0-9a-f]{64}$/u, record.path);
    const content = await readFile(join(outputDirectory, record.path));
    assert.equal(content.length, record.bytes, record.path);
    assert.equal(artifactSha256(content), record.sha256, record.path);
  }
});
