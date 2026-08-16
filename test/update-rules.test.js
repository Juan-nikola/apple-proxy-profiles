import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { buildClientArtifacts as buildClientArtifactsImpl } from "../automation/src/build-artifacts.js";
import { artifactSha256 } from "../automation/src/artifact-content.js";
import { buildChinaIpAudit } from "../automation/src/china-ip-audit.js";
import { canonicalJson } from "../automation/src/render-anywhere-rules.js";
import { publishEdgeRelease } from "../automation/src/build-site.js";
import { lightweightFixtureSnapshots } from "../automation/test/lightweight-fixture.js";
import { ruleClientCatalog } from "../shared/rules/lightweight-policy.js";
import {
  chinaIpAuditPrimary,
  parseUpdateRulesArguments,
  promoteClientRelease as promoteClientReleaseImpl,
  selectDefaultStaticFiles,
  verifyTrackedPublications,
} from "../scripts/update-rules.mjs";

const TEST_PROMOTION_NOW = "2026-08-10T01:00:00Z";

function promoteClientRelease(options) {
  return promoteClientReleaseImpl({ now: TEST_PROMOTION_NOW, ...options });
}

const upstream = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "d".repeat(40),
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

const nextUpstream = Object.freeze({
  ...upstream,
  commit: "e".repeat(40),
  committedAt: "2026-08-02T19:07:21Z",
});

function chinaIpAuditBytes({
  publicationUpstream = upstream,
  now = "2026-08-10T00:00:00Z",
  calibrationStartedAt = "2026-08-02T00:00:00Z",
  secondaryCommittedAt = "2026-08-09T00:00:00Z",
  divergent = false,
} = {}) {
  const primaryEntries = [
    { kind: "ipv4Cidr", value: "8.8.8.0/24", noResolve: true, sourceId: "ChinaIP" },
    { kind: "ipv6Cidr", value: "2001:4860::/32", noResolve: true, sourceId: "ChinaIP" },
  ];
  const secondaryEntries = divergent ? [
    { kind: "ipv4Cidr", value: "8.8.8.0/25", noResolve: true, sourceId: "ChinaIP-audit" },
    { kind: "ipv6Cidr", value: "2001:4860::/33", noResolve: true, sourceId: "ChinaIP-audit" },
  ] : primaryEntries;
  return Buffer.from(canonicalJson(buildChinaIpAudit({
    previousPrimaryEntries: primaryEntries,
    currentPrimaryEntries: primaryEntries,
    secondaryEntries,
    primary: {
      repository: publicationUpstream.repository,
      commit: publicationUpstream.commit,
      committedAt: publicationUpstream.committedAt,
      sha256: "1".repeat(64),
    },
    secondary: {
      repository: "https://github.com/gaoyifan/china-operator-ip",
      commit: "b".repeat(40),
      committedAt: secondaryCommittedAt,
      sha256: "2".repeat(64),
    },
    now,
    calibrationStartedAt,
  })));
}

function buildClientArtifacts(options) {
  return buildClientArtifactsImpl({
    ...options,
    chinaIpAudit: options.chinaIpAudit ?? chinaIpAuditBytes({ publicationUpstream: options.upstream }),
  });
}

function compiledSingBoxRules(marker) {
  const binaries = new Map();
  for (const { id } of ruleClientCatalog({ adblockMode: "off" })) {
    binaries.set(`sing-box/rule-sets/${id}.srs`, Buffer.from(`SRS\u0002${marker}-default-${id}`));
  }
  for (const { id } of ruleClientCatalog({ adblockMode: "full" })) {
    if (id === "Advertising" || id === "Advertising_Domain") {
      binaries.set(`optional/adblock-full/sing-box/${id}.srs`, Buffer.from(`SRS\u0002${marker}-optional-${id}`));
    }
  }
  return binaries;
}

async function writeFiles(directory, files) {
  for (const [path, content] of files) {
    const destination = join(directory, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}

async function initializeTrackedCurrent(publicDirectory, artifacts) {
  await writeFiles(join(publicDirectory, "current"), artifacts.defaults);
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  for (const client of ["singbox", "surge", "shadowrocket", "egern", "anywhere", "happ"]) {
    await promoteClientRelease({
      publicDirectory,
      client,
      manifestHash: artifacts.diagnostics.defaultManifest.clients[client].manifestHash,
    });
  }
}

test("accepts only explicit edge, current-check, and client promotion operations", () => {
  assert.deepEqual(parseUpdateRulesArguments(["--channel", "edge"]), { operation: "build-edge" });
  assert.deepEqual(parseUpdateRulesArguments(["--check", "--channel", "current"]), { operation: "check-current" });
  assert.deepEqual(parseUpdateRulesArguments(["--promote", "singbox", "a".repeat(64)]), {
    operation: "promote",
    client: "singbox",
    manifestHash: "a".repeat(64),
  });
  assert.deepEqual(parseUpdateRulesArguments(["--promote", "onexray", "a".repeat(64)]), {
    operation: "promote",
    client: "onexray",
    manifestHash: "a".repeat(64),
  });
  for (const args of [[], ["--check"], ["--channel", "current"], ["--promote", "unknown", "a".repeat(64)]]) {
    assert.throws(() => parseUpdateRulesArguments(args), /update-rules arguments/u);
  }
});

test("verifies OneXray only after explicit promotion and binds its current projection to rollout", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-onexray-rollout-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await initializeTrackedCurrent(publicDirectory, artifacts);
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
    onexray: artifacts.onexray,
  });
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), true);
  await promoteClientRelease({
    publicDirectory,
    client: "onexray",
    manifestHash: artifacts.diagnostics.onexrayManifest.manifestHash,
  });
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), true);
  const rollout = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  const currentOneXray = JSON.parse(await readFile(join(publicDirectory, "current/onexray/geodata/manifest.json"), "utf8"));
  assert.equal(rollout.onexray.current, currentOneXray.manifestHash);
  assert.notEqual(rollout.onexray.current, artifacts.diagnostics.onexrayManifest.manifestHash);
  const currentRoot = JSON.parse(await readFile(join(publicDirectory, "current/manifest.json"), "utf8"));
  const edgeRoot = JSON.parse(await readFile(join(publicDirectory, "edge/manifest.json"), "utf8"));
  assert.equal(currentRoot.onexray.channel, "current");
  assert.equal(currentRoot.onexray.manifestHash, currentOneXray.manifestHash);
  assert.equal(edgeRoot.onexray.channel, "edge");
  await writeFile(join(publicDirectory, "current/onexray/geodata/geoip.dat"), Buffer.from("tampered"));
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);
});

test("rejects a partial current OneXray tree even when its manifest is missing", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-onexray-partial-current-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await initializeTrackedCurrent(publicDirectory, artifacts);
  await mkdir(join(publicDirectory, "current/onexray/geodata"), { recursive: true });
  await writeFile(join(publicDirectory, "current/onexray/geodata/geoip.dat"), Buffer.from("partial"));
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);
});

test("derives audit-only primary provenance from the production ChinaIP snapshot", () => {
  const snapshot = lightweightFixtureSnapshots();
  const result = chinaIpAuditPrimary(snapshot, upstream);
  assert.strictEqual(result.entries, snapshot.get("ChinaIPs").entries);
  assert.deepEqual(result.source, {
    repository: upstream.repository,
    commit: upstream.commit,
    committedAt: upstream.committedAt,
    sha256: snapshot.get("ChinaIPs").sourceSha256,
  });
});

test("parses raw production ChinaIP snapshots for audit provenance", () => {
  const fixture = lightweightFixtureSnapshots();
  const raw = new Map([["ChinaIPs", {
    text: fixture.get("ChinaIPs").text,
    source: fixture.get("ChinaIPs").source,
    sourceSha256: fixture.get("ChinaIPs").sourceSha256,
  }]]);
  const result = chinaIpAuditPrimary(raw, upstream);
  assert.deepEqual(result.entries, fixture.get("ChinaIPs").entries);
  assert.deepEqual(result.source, {
    repository: upstream.repository,
    commit: upstream.commit,
    committedAt: upstream.committedAt,
    sha256: fixture.get("ChinaIPs").sourceSha256,
  });

  const missingDigest = new Map([["ChinaIPs", {
    text: fixture.get("ChinaIPs").text,
    source: fixture.get("ChinaIPs").source,
  }]]);
  assert.throws(() => chinaIpAuditPrimary(missingDigest, upstream), /invalid for audit/u);
});

test("keeps known legacy profiles outside defaults and rejects unexpected forbidden statics", () => {
  const selected = selectDefaultStaticFiles(new Map([
    ["LICENSE", "safe\n"],
    [
      "surge/scripts/surge-profile-generator.js",
      'const adblockMode = "off"; if (adblockMode === "full") return "Advertising_Domain";\n',
    ],
    ["surge/examples/surge-macos.conf", "RULE-SET,https://example.invalid/Advertising.list,REJECT\n"],
    ["sing-box/scripts/sing-box-config-generator.js", 'const id = "ChinaMax_Domain";\n'],
  ]));
  assert.deepEqual([...selected], [
    ["LICENSE", "safe\n"],
    [
      "surge/scripts/surge-profile-generator.js",
      'const adblockMode = "off"; if (adblockMode === "full") return "Advertising_Domain";\n',
    ],
  ]);
  assert.throws(
    () => selectDefaultStaticFiles(new Map([["unexpected.txt", 'const id = "Advertising";\n']])),
    /Forbidden default rule reference/u,
  );
  assert.throws(
    () => selectDefaultStaticFiles(new Map([[
      "unknown/examples/legacy.conf",
      "RULE-SET,Advertising,REJECT\n",
    ]])),
    /Forbidden default rule reference/u,
  );
});

test("verifies legacy current defaults and a separately tracked optional snapshot", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-trees-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await writeFiles(join(publicDirectory, "current"), artifacts.defaults);
  await writeFiles(publicDirectory, artifacts.optionalPacks.get("adblock-full"));

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), true);
  await writeFile(join(publicDirectory, "optional/adblock-full/surge/rules/Advertising.list"), "tampered\n");
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);

  const noOptionalRoot = await mkdtemp(join(tmpdir(), "apple-proxy-check-default-only-"));
  const noOptionalPublic = join(noOptionalRoot, "public");
  await writeFiles(join(noOptionalPublic, "current"), artifacts.defaults);
  assert.equal(await verifyTrackedPublications({ publicDirectory: noOptionalPublic, ...artifacts }), true);
});

test("verifies a closed schema-v1 current during the lightweight migration", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-legacy-current-"));
  const publicDirectory = join(root, "public");
  const currentDirectory = join(publicDirectory, "current");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const content = "legacy stable rule bytes\n";
  const baseManifest = {
    schemaVersion: 1,
    generatedAt: upstream.committedAt,
    upstream,
    catalogSha256: "a".repeat(64),
    clients: {},
    files: [{
      path: "legacy/rule.list",
      bytes: Buffer.byteLength(content),
      sha256: artifactSha256(content),
    }],
  };
  const manifest = { ...baseManifest, manifestHash: artifactSha256(canonicalJson(baseManifest)) };
  await writeFiles(currentDirectory, new Map([
    ["legacy/rule.list", content],
    ["manifest.json", canonicalJson(manifest)],
    ["frontier-manifest.json", "{}\n"],
    ["surge/macos/manifest.json", "{}\n"],
  ]));

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), true);
  await writeFile(join(currentDirectory, "legacy/rule.list"), "tampered\n");
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);
  await writeFile(join(currentDirectory, "legacy/rule.list"), content);
  await writeFile(join(currentDirectory, "unexpected.txt"), "extra\n");
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);
});

test("verifies a hybrid current from independently promoted clients", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-hybrid-"));
  const publicDirectory = join(root, "public");
  const baseline = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const candidateAudit = chinaIpAuditBytes({ publicationUpstream: nextUpstream, divergent: true });
  const candidate = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream: nextUpstream,
    chinaIpAudit: candidateAudit,
  });
  await initializeTrackedCurrent(publicDirectory, baseline);
  await publishEdgeRelease({
    publicDirectory,
    defaults: candidate.defaults,
    optionalPacks: candidate.optionalPacks,
    manifest: candidate.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: candidate.diagnostics.defaultManifest.clients.singbox.manifestHash,
  });
  const currentReproduction = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    chinaIpAudit: candidateAudit,
  });

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...currentReproduction }), true);
  const optionalDirectory = join(publicDirectory, "optional/adblock-full/current/sing-box");
  const deleted = `${optionalDirectory}.deleted`;
  await rename(optionalDirectory, deleted);
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...currentReproduction }), false);
});

test("verifies a hybrid current after promoting changed sing-box binaries", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-hybrid-srs-"));
  const publicDirectory = join(root, "public");
  const baselineBinaries = compiledSingBoxRules("baseline");
  const candidateBinaries = compiledSingBoxRules("candidate");
  const baseline = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    singBoxBinaries: baselineBinaries,
  });
  const candidateAudit = chinaIpAuditBytes({ publicationUpstream: nextUpstream });
  const candidate = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream: nextUpstream,
    singBoxBinaries: candidateBinaries,
    chinaIpAudit: candidateAudit,
  });
  await initializeTrackedCurrent(publicDirectory, baseline);
  await publishEdgeRelease({
    publicDirectory,
    defaults: candidate.defaults,
    optionalPacks: candidate.optionalPacks,
    manifest: candidate.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: candidate.diagnostics.defaultManifest.clients.singbox.manifestHash,
  });
  const currentReproduction = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    singBoxBinaries: candidateBinaries,
    chinaIpAudit: candidateAudit,
  });

  assert.notDeepEqual(
    baselineBinaries.get("sing-box/rule-sets/ChinaIP.srs"),
    candidateBinaries.get("sing-box/rule-sets/ChinaIP.srs"),
  );
  assert.deepEqual(
    await readFile(join(publicDirectory, "current/sing-box/rule-sets/ChinaIP.srs")),
    candidateBinaries.get("sing-box/rule-sets/ChinaIP.srs"),
  );
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...currentReproduction }), true);
});

test("rejects unknown root client metadata in a hybrid current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-hybrid-root-client-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await initializeTrackedCurrent(publicDirectory, artifacts);
  const manifestPath = join(publicDirectory, "current/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const { manifestHash: ignored, ...base } = manifest;
  base.clients.intruder = { manifestHash: "a".repeat(64), referencedDefaultBytes: 1 };
  await writeFile(manifestPath, canonicalJson({
    ...base,
    manifestHash: artifactSha256(canonicalJson(base)),
  }));

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);
});

test("rejects rollout optional selections that disagree with the current client manifest", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-selection-projection-"));
  const publicDirectory = join(root, "public");
  const baseline = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const candidate = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream: nextUpstream });
  await initializeTrackedCurrent(publicDirectory, baseline);
  await publishEdgeRelease({
    publicDirectory,
    defaults: candidate.defaults,
    optionalPacks: candidate.optionalPacks,
    manifest: candidate.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: candidate.diagnostics.defaultManifest.clients.singbox.manifestHash,
  });

  const rolloutPath = join(publicDirectory, "rollout.json");
  const rollout = JSON.parse(await readFile(rolloutPath, "utf8"));
  rollout.optionalPacks["adblock-full"].singbox = null;
  await writeFile(rolloutPath, `${JSON.stringify(rollout, null, 2)}\n`);
  await rename(
    join(publicDirectory, "optional/adblock-full/current/sing-box"),
    join(publicDirectory, "optional/adblock-full/deleted-sing-box"),
  );

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...baseline }), false);
});

test("rejects a manifest-selected optional pack when rollout clears that client selection", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-cleared-selection-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await initializeTrackedCurrent(publicDirectory, artifacts);

  const rolloutPath = join(publicDirectory, "rollout.json");
  const rollout = JSON.parse(await readFile(rolloutPath, "utf8"));
  rollout.clients.singbox = null;
  rollout.optionalPacks["adblock-full"].singbox = null;
  await writeFile(rolloutPath, `${JSON.stringify(rollout, null, 2)}\n`);
  await rename(
    join(publicDirectory, "optional/adblock-full/current/sing-box"),
    join(publicDirectory, "optional/adblock-full/deleted-sing-box"),
  );

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);
});

test("rejects optional rollout selections for unknown clients", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-unknown-optional-client-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await initializeTrackedCurrent(publicDirectory, artifacts);

  const rolloutPath = join(publicDirectory, "rollout.json");
  const rollout = JSON.parse(await readFile(rolloutPath, "utf8"));
  rollout.optionalPacks["adblock-full"].intruder = "a".repeat(64);
  await writeFile(rolloutPath, `${JSON.stringify(rollout, null, 2)}\n`);

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);
});

test("allows a tracked client slot to stay unpublished when rollout omits it", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-unpublished-client-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await initializeTrackedCurrent(publicDirectory, artifacts);
  await rm(join(publicDirectory, "current/happ"), { recursive: true, force: true });

  const rolloutPath = join(publicDirectory, "rollout.json");
  const rollout = JSON.parse(await readFile(rolloutPath, "utf8"));
  delete rollout.clients.happ;
  await writeFile(rolloutPath, `${JSON.stringify(rollout, null, 2)}\n`);

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), true);
});

test("rejects extra non-client files and unknown directories in a hybrid current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-hybrid-closure-"));
  const publicDirectory = join(root, "public");
  const baseline = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const candidate = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream: nextUpstream });
  await initializeTrackedCurrent(publicDirectory, baseline);
  await publishEdgeRelease({
    publicDirectory,
    defaults: candidate.defaults,
    optionalPacks: candidate.optionalPacks,
    manifest: candidate.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: candidate.diagnostics.defaultManifest.clients.singbox.manifestHash,
  });
  const currentReproduction = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    chinaIpAudit: candidate.defaults.get("audit/china-ip-drift.json"),
  });

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...currentReproduction }), true);

  const stray = join(publicDirectory, "current/stray.txt");
  await writeFile(stray, "not manifested\n");
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...currentReproduction }), false);
  await rm(stray);
  await writeFiles(join(publicDirectory, "current"), new Map([["unknown/nested.txt", "not manifested\n"]]));
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...currentReproduction }), false);
});

test("rejects an empty unknown directory in a hybrid current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-hybrid-empty-directory-"));
  const publicDirectory = join(root, "public");
  const baseline = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const candidate = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream: nextUpstream });
  await initializeTrackedCurrent(publicDirectory, baseline);
  await publishEdgeRelease({
    publicDirectory,
    defaults: candidate.defaults,
    optionalPacks: candidate.optionalPacks,
    manifest: candidate.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: candidate.diagnostics.defaultManifest.clients.singbox.manifestHash,
  });
  const currentReproduction = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    chinaIpAudit: candidate.defaults.get("audit/china-ip-drift.json"),
  });

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...currentReproduction }), true);
  await mkdir(join(publicDirectory, "current/unknown-empty"));
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...currentReproduction }), false);
});

test("rejects an unmanifested empty directory inside a current client tree", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-current-client-empty-directory-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await initializeTrackedCurrent(publicDirectory, artifacts);

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), true);
  await mkdir(join(publicDirectory, "current/sing-box/unknown-empty"));
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);
});

test("rejects an unmanifested empty directory inside a selected optional client tree", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-optional-client-empty-directory-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await initializeTrackedCurrent(publicDirectory, artifacts);

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), true);
  await mkdir(join(publicDirectory, "optional/adblock-full/current/sing-box/unknown-empty"));
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);
});

test("promotes exact tested client bytes without changing other clients", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  await mkdir(join(publicDirectory, "current/sing-box"), { recursive: true });
  await mkdir(join(publicDirectory, "current/surge"), { recursive: true });
  await mkdir(join(publicDirectory, "optional/adblock-full/current/sing-box"), { recursive: true });
  await writeFile(join(publicDirectory, "current/sing-box/old.txt"), "old\n");
  await writeFile(join(publicDirectory, "current/surge/keep.txt"), "keep\n");
  await writeFile(join(publicDirectory, "optional/adblock-full/current/sing-box/old.txt"), "old optional\n");

  await promoteClientRelease({ publicDirectory, client: "singbox", manifestHash: hash });

  assert.deepEqual(
    await readFile(join(publicDirectory, "current/sing-box/rules/ChinaIP.json")),
    Buffer.from(artifacts.defaults.get("sing-box/rules/ChinaIP.json")),
  );
  assert.equal(await readFile(join(publicDirectory, "previous/sing-box/old.txt"), "utf8"), "old\n");
  assert.equal(await readFile(join(publicDirectory, "current/surge/keep.txt"), "utf8"), "keep\n");
  assert.deepEqual(
    await readFile(join(publicDirectory, "optional/adblock-full/current/sing-box/rules/Advertising.json")),
    Buffer.from(artifacts.optionalPacks.get("adblock-full").get("optional/adblock-full/sing-box/rules/Advertising.json")),
  );
  assert.equal(
    await readFile(join(publicDirectory, "optional/adblock-full/previous/sing-box/old.txt"), "utf8"),
    "old optional\n",
  );
  const rollout = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  assert.equal(rollout.clients.singbox, hash);
  assert.equal(rollout.clients.surge, null);
  assert.equal(
    rollout.optionalPacks["adblock-full"].singbox,
    artifacts.diagnostics.optionalManifests["adblock-full"].clients.singbox.manifestHash,
  );
});

test("script promotion rejects ChinaIP blockers before touching current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-audit-blocker-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    chinaIpAudit: chinaIpAuditBytes({
      publicationUpstream: upstream,
      now: "2026-08-20T00:00:00Z",
      calibrationStartedAt: "2026-08-01T00:00:00Z",
      secondaryCommittedAt: "2026-08-20T00:00:00Z",
      divergent: true,
    }),
  });
  const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  await mkdir(join(publicDirectory, "current/sing-box"), { recursive: true });
  await writeFile(join(publicDirectory, "current/sing-box/old.txt"), "old\n");

  await assert.rejects(
    () => promoteClientRelease({
      publicDirectory,
      client: "singbox",
      manifestHash: hash,
      now: "2026-08-20T01:00:00Z",
    }),
    /ChinaIP audit has blockers/u,
  );
  assert.equal(await readFile(join(publicDirectory, "current/sing-box/old.txt"), "utf8"), "old\n");
});

test("promotes and rolls back optional bytes independently per client", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-optional-clients-"));
  const publicDirectory = join(root, "public");
  const first = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await publishEdgeRelease({
    publicDirectory,
    defaults: first.defaults,
    optionalPacks: first.optionalPacks,
    manifest: first.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "surge",
    manifestHash: first.diagnostics.defaultManifest.clients.surge.manifestHash,
  });
  const surgeBefore = await readFile(join(
    publicDirectory,
    "optional/adblock-full/current/surge/rules/Advertising.list",
  ));

  const second = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream: nextUpstream });
  await publishEdgeRelease({
    publicDirectory,
    defaults: second.defaults,
    optionalPacks: second.optionalPacks,
    manifest: second.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: second.diagnostics.defaultManifest.clients.singbox.manifestHash,
  });

  assert.deepEqual(await readFile(join(
    publicDirectory,
    "optional/adblock-full/current/surge/rules/Advertising.list",
  )), surgeBefore);
  const rollout = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  assert.equal(
    rollout.optionalPacks["adblock-full"].surge,
    first.diagnostics.optionalManifests["adblock-full"].clients.surge.manifestHash,
  );
  assert.equal(
    rollout.optionalPacks["adblock-full"].singbox,
    second.diagnostics.optionalManifests["adblock-full"].clients.singbox.manifestHash,
  );

  await publishEdgeRelease({
    publicDirectory,
    defaults: first.defaults,
    optionalPacks: first.optionalPacks,
    manifest: first.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: first.diagnostics.defaultManifest.clients.singbox.manifestHash,
  });
  const rollback = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  assert.equal(
    rollback.previousOptionalPacks["adblock-full"].singbox,
    second.diagnostics.optionalManifests["adblock-full"].clients.singbox.manifestHash,
  );
  assert.equal(
    rollback.optionalPacks["adblock-full"].surge,
    first.diagnostics.optionalManifests["adblock-full"].clients.surge.manifestHash,
  );
});

test("rejects a tampered immutable manifest before touching current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-extra-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  const immutable = join(publicDirectory, "edge/clients/singbox", hash);
  await mkdir(join(publicDirectory, "current/sing-box"), { recursive: true });
  const clientManifest = JSON.parse(await readFile(join(immutable, "client-manifest.json"), "utf8"));
  clientManifest.files = [];
  await writeFile(join(immutable, "client-manifest.json"), `${JSON.stringify(clientManifest)}\n`);
  await writeFile(join(publicDirectory, "current/sing-box/old.txt"), "old\n");

  await assert.rejects(
    () => promoteClientRelease({ publicDirectory, client: "singbox", manifestHash: hash }),
    /manifest hash/u,
  );
  assert.equal(await readFile(join(publicDirectory, "current/sing-box/old.txt"), "utf8"), "old\n");
});
