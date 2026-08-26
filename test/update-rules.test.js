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
import { MOBILE_RULE_SOURCE_IDS, ruleClientCatalog } from "../shared/rules/lightweight-policy.js";
import { activeClientIds } from "../shared/release/client-catalog.js";
import {
  buildArtifacts as buildArtifactsFromScript,
  chinaIpAuditPrimary,
  parseUpdateRulesArguments,
  promoteClientRelease as promoteClientReleaseImpl,
  selectDefaultStaticFiles,
  verifyTrackedPublications,
} from "../scripts/update-rules.mjs";

const TEST_PROMOTION_NOW = "2026-08-10T01:00:00Z";

function promoteClientRelease(options) {
  return promoteClientReleaseImpl({
    now: TEST_PROMOTION_NOW,
    ...options,
  });
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
    additionalFiles: options.additionalFiles ?? new Map([
      ["onexray/scripts/onexray-node-generator.js", "native onexray generator\n"],
      ["happ/scripts/happ-config-generator.js", "native happ generator\n"],
    ]),
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
  for (const id of MOBILE_RULE_SOURCE_IDS) {
    binaries.set(`sing-box/mobile-rule-sets/${id}.srs`, Buffer.from(`SRS\u0002${marker}-mobile-${id}`));
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
  for (const client of activeClientIds()) {
    await promoteClientRelease({
      publicDirectory,
      client,
      manifestHash: artifacts.diagnostics.defaultManifest.clients[client].manifestHash,
    });
  }
}

test("accepts only explicit edge, current-check, and client promotion operations", () => {
  assert.deepEqual(parseUpdateRulesArguments(["--channel", "edge"]), { operation: "build-edge", channel: "edge" });
  assert.deepEqual(parseUpdateRulesArguments(["--check", "--channel", "current"]), { operation: "check-current", channel: "current" });
  assert.deepEqual(parseUpdateRulesArguments(["--check", "--channel", "previous"]), { operation: "check-previous", channel: "previous" });
  assert.deepEqual(parseUpdateRulesArguments(["--seal-previous"]), { operation: "seal-previous" });
  assert.deepEqual(parseUpdateRulesArguments(["--promote-all"]), { operation: "promote-all" });
  assert.deepEqual(parseUpdateRulesArguments(["--promote", "singbox", "a".repeat(64)]), {
    operation: "promote",
    client: "singbox",
    manifestHash: "a".repeat(64),
  });
  for (const args of [[], ["--check"], ["--channel", "current"], ["--check", "--channel", "invalid"], ["--promote", "unknown", "a".repeat(64)]]) {
    assert.throws(() => parseUpdateRulesArguments(args), /update-rules arguments/u);
  }
});

test("publishes all ten active client manifests while keeping native scripts credential-free", async () => {
  const artifacts = await buildArtifactsFromScript({
    operation: "build-edge",
    publicDirectory: join(tmpdir(), "unused-public"),
    upstreamOverride: upstream,
    includeStaticFiles: true,
    fetchSnapshotImpl: async () => lightweightFixtureSnapshots(),
  });
  assert.deepEqual(Object.keys(artifacts.diagnostics.defaultManifest.clients).sort(), [
    "anywhere", "clash", "egern", "happ", "onexray", "shadowrocket", "singbox", "surge", "v2box", "v2rayn",
  ]);
  assert.deepEqual(artifacts.diagnostics.defaultManifest.clientStates, {
    anywhere: { state: "active", adapterSchema: "anywhere-v1", publicDirectory: "anywhere" },
    egern: { state: "active", adapterSchema: "egern-v1", publicDirectory: "egern" },
    shadowrocket: { state: "active", adapterSchema: "shadowrocket-v1", publicDirectory: "shadowrocket" },
    surge: { state: "active", adapterSchema: "surge-v1", publicDirectory: "surge" },
    singbox: { state: "active", adapterSchema: "singbox-v1", publicDirectory: "sing-box" },
    onexray: { state: "active", adapterSchema: "onexray-v1", publicDirectory: "onexray" },
    happ: { state: "active", adapterSchema: "happ-v4", publicDirectory: "happ" },
    v2rayn: { state: "active", adapterSchema: "v2rayn-v1", publicDirectory: "v2rayn" },
    v2box: { state: "active", adapterSchema: "v2box-v1", publicDirectory: "v2box" },
    clash: { state: "active", adapterSchema: "clash-v1", publicDirectory: "clash" },
  });
  assert.ok([...artifacts.defaults.keys()].some((path) => path === "onexray/scripts/onexray-node-generator.js"));
  assert.ok([...artifacts.defaults.keys()].some((path) => path === "happ/scripts/happ-config-generator.js"));
  assert.doesNotMatch(artifacts.defaults.get("onexray/scripts/onexray-node-generator.js").toString("utf8"), /TEST_ONLY_FIXTURE_UUID|192\.0\.2\.10/u);
});

test("build edge paces one production snapshot worker", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  try {
    globalThis.fetch = async () => { throw new Error("unexpected global fetch"); };
    await assert.rejects(
      buildArtifactsFromScript({
        operation: "build-edge",
        publicDirectory: join(tmpdir(), "unused-public"),
        upstreamOverride: upstream,
        includeStaticFiles: false,
        fetchSnapshotImpl: async (options) => {
          captured = options;
          throw new Error("capture snapshot options");
        },
      }),
      /capture snapshot options/u,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.equal(captured.commit, upstream.commit);
  assert.equal(captured.concurrency, 1);
  assert.equal(captured.requestIntervalMs, 250);
});

test("rewrites current static sing-box example links for edge artifacts", async () => {
  const artifacts = await buildArtifactsFromScript({
    operation: "build-edge",
    publicDirectory: join(tmpdir(), "unused-public"),
    channel: "edge",
    upstreamOverride: upstream,
    includeStaticFiles: true,
    fetchSnapshotImpl: async () => lightweightFixtureSnapshots(),
  });
  const example = artifacts.defaults.get("sing-box/examples/sing-box-android.json").toString("utf8");
  assert.doesNotMatch(example, /\/current\//u);
  assert.match(example, /\/edge\/sing-box\/mobile-rule-sets\//u);
  const macos = artifacts.defaults.get("sing-box/examples/sing-box-macos.json").toString("utf8");
  assert.match(macos, /\/edge\/sing-box\/rule-sets\//u);
  assert.doesNotMatch(macos, /\/edge\/sing-box\/mobile-rule-sets\//u);
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
  await writeFile(join(publicDirectory, "rollout.json"), `${JSON.stringify({
    schemaVersion: 2,
    clients: { singbox: null, surge: null, shadowrocket: null, egern: null, anywhere: null, happ: "a".repeat(64) },
    previous: { singbox: null, surge: null, shadowrocket: null, egern: null, anywhere: null, happ: "b".repeat(64) },
    optionalPacks: {
      "adblock-full": { singbox: null, surge: null, shadowrocket: null, egern: null, anywhere: null, happ: "c".repeat(64) },
    },
    previousOptionalPacks: {
      "adblock-full": { singbox: null, surge: null, shadowrocket: null, egern: null, anywhere: null, happ: "d".repeat(64) },
    },
    onexray: { current: "e".repeat(64) },
  }, null, 2)}\n`);

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
  assert.deepEqual(Object.keys(rollout.clients).sort(), ["anywhere", "clash", "egern", "happ", "onexray", "shadowrocket", "singbox", "surge", "v2box", "v2rayn"]);
  assert.deepEqual(Object.keys(rollout.previous).sort(), ["anywhere", "clash", "egern", "happ", "onexray", "shadowrocket", "singbox", "surge", "v2box", "v2rayn"]);
  assert.equal(Object.hasOwn(rollout.optionalPacks["adblock-full"], "happ"), false);
  assert.equal(rollout.clients.surge, null);
  const publishedSingboxManifest = JSON.parse(await readFile(
    join(publicDirectory, "current/sing-box/client-manifest.json"),
    "utf8",
  ));
  const publishedSingboxOptionalManifest = JSON.parse(await readFile(
    join(publicDirectory, "optional/adblock-full/current/sing-box/client-manifest.json"),
    "utf8",
  ));
  assert.equal(rollout.clients.singbox, publishedSingboxManifest.manifestHash);
  assert.equal(
    rollout.optionalPacks["adblock-full"].singbox,
    publishedSingboxOptionalManifest.manifestHash,
  );
});

test("accepts a current rollout with only the active clients already promoted", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-partial-current-rollout-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await initializeTrackedCurrent(publicDirectory, artifacts);

  await rm(join(publicDirectory, "current/happ"), { recursive: true, force: true });
  await rm(join(publicDirectory, "current/onexray"), { recursive: true, force: true });
  await rm(join(publicDirectory, "previous/happ"), { recursive: true, force: true });
  await rm(join(publicDirectory, "previous/onexray"), { recursive: true, force: true });
  const rolloutPath = join(publicDirectory, "rollout.json");
  const rollout = JSON.parse(await readFile(rolloutPath, "utf8"));
  delete rollout.clients.happ;
  delete rollout.clients.onexray;
  delete rollout.previous.happ;
  delete rollout.previous.onexray;
  await writeFile(rolloutPath, `${JSON.stringify(rollout, null, 2)}\n`);

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), true);
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
  const firstSurgeOptionalManifest = JSON.parse(await readFile(join(
    publicDirectory,
    "optional/adblock-full/current/surge/client-manifest.json",
  ), "utf8"));

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
  const secondSingboxOptionalManifest = JSON.parse(await readFile(join(
    publicDirectory,
    "optional/adblock-full/current/sing-box/client-manifest.json",
  ), "utf8"));

  assert.deepEqual(await readFile(join(
    publicDirectory,
    "optional/adblock-full/current/surge/rules/Advertising.list",
  )), surgeBefore);
  const rollout = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  assert.equal(
    rollout.optionalPacks["adblock-full"].surge,
    firstSurgeOptionalManifest.manifestHash,
  );
  assert.equal(
    rollout.optionalPacks["adblock-full"].singbox,
    secondSingboxOptionalManifest.manifestHash,
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
    secondSingboxOptionalManifest.manifestHash,
  );
  assert.equal(
    rollback.optionalPacks["adblock-full"].surge,
    firstSurgeOptionalManifest.manifestHash,
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
