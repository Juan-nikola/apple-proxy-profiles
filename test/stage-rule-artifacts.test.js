import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { buildClientArtifacts } from "../automation/src/build-artifacts.js";
import { artifactSha256 } from "../automation/src/artifact-content.js";
import { buildChinaIpAudit } from "../automation/src/china-ip-audit.js";
import { canonicalJson } from "../automation/src/render-anywhere-rules.js";
import { lightweightFixtureSnapshots } from "../automation/test/lightweight-fixture.js";
import {
  buildEdgeChinaIpAudit,
  loadCompiledSingBoxRules,
  loadCurrentChinaIpAudit,
  main as stageRuleArtifactsMain,
  readRuleStageManifest,
  stageSingBoxAuditArtifacts,
} from "../scripts/stage-rule-artifacts.mjs";
import { ruleClientCatalog } from "../shared/rules/lightweight-policy.js";

const upstream = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "e".repeat(40),
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

function chinaIpAuditBytes() {
  const entries = [
    { kind: "ipv4Cidr", value: "8.8.8.0/24", noResolve: true, sourceId: "ChinaIP" },
    { kind: "ipv6Cidr", value: "2001:4860::/32", noResolve: true, sourceId: "ChinaIP" },
  ];
  return Buffer.from(canonicalJson(buildChinaIpAudit({
    previousPrimaryEntries: entries,
    currentPrimaryEntries: entries,
    secondaryEntries: entries,
    primary: {
      repository: upstream.repository,
      commit: upstream.commit,
      committedAt: upstream.committedAt,
      sha256: "1".repeat(64),
    },
    secondary: {
      repository: "https://github.com/gaoyifan/china-operator-ip",
      commit: "b".repeat(40),
      committedAt: "2026-08-08T00:00:00Z",
      sha256: "2".repeat(64),
    },
    now: "2026-08-09T00:00:00Z",
    calibrationStartedAt: "2026-08-01T00:00:00Z",
  })));
}

test("stages only deterministic sing-box audit inputs with a closed manifest", async () => {
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const root = await mkdtemp(join(tmpdir(), "sing-box-stage-"));
  const chinaIpAudit = chinaIpAuditBytes();
  const result = await stageSingBoxAuditArtifacts({ artifacts, chinaIpAudit, outputRoot: root });
  assert.equal(result.schemaVersion, 2);
  assert.equal(result.upstream.commit, upstream.commit);
  assert.equal(result.files.length, ruleClientCatalog({ adblockMode: "off" }).length + 2);
  assert.deepEqual(result.files.map(({ path }) => path), [...result.files.map(({ path }) => path)].sort());
  for (const record of result.files) {
    assert.match(record.path, /^(?:optional\/adblock-full\/)?audit\/sing-box\/rules\/[A-Za-z0-9_]+\.json$/u);
    assert.equal((await readFile(join(root, record.path))).length, record.bytes);
    assert.match(record.sha256, /^[0-9a-f]{64}$/u);
  }
  assert.deepEqual(result.chinaIpAudit, {
    path: "audit/china-ip-drift.json",
    bytes: chinaIpAudit.length,
    sha256: artifactSha256(chinaIpAudit),
  });
  assert.deepEqual(await readFile(join(root, result.chinaIpAudit.path)), chinaIpAudit);
  assert.deepEqual(JSON.parse(await readFile(join(root, "stage-manifest.json"), "utf8")), result);
  assert.deepEqual(await readRuleStageManifest(root), result);
});

test("loads canonical current audit evidence offline and rejects changed bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "china-ip-current-audit-"));
  const publicDirectory = join(root, "public");
  const report = chinaIpAuditBytes();
  await mkdir(join(publicDirectory, "current/audit"), { recursive: true });
  await writeFile(join(publicDirectory, "current/audit/china-ip-drift.json"), report);

  const loaded = await loadCurrentChinaIpAudit({ publicDirectory });
  assert.deepEqual(loaded, report);

  await writeFile(
    join(publicDirectory, "current/audit/china-ip-drift.json"),
    Buffer.concat([report, Buffer.from(" \n")]),
  );
  await assert.rejects(
    () => loadCurrentChinaIpAudit({ publicDirectory }),
    /canonical/u,
  );
});

test("builds edge audit evidence from the pinned secondary and prior edge baseline", async () => {
  const root = await mkdtemp(join(tmpdir(), "china-ip-edge-audit-"));
  const publicDirectory = join(root, "public");
  const priorReport = chinaIpAuditBytes();
  await mkdir(join(publicDirectory, "edge/audit"), { recursive: true });
  await mkdir(join(publicDirectory, "edge/surge/rules"), { recursive: true });
  await writeFile(join(publicDirectory, "edge/audit/china-ip-drift.json"), priorReport);
  await writeFile(join(publicDirectory, "edge/surge/rules/ChinaIP.list"), [
    "IP-CIDR,8.8.8.0/23,no-resolve",
    "IP-CIDR6,2001:4860::/32,no-resolve",
    "",
  ].join("\n"));
  let resolved = 0;
  let fetched = 0;
  const bytes = await buildEdgeChinaIpAudit({
    publicDirectory,
    primary: {
      entries: [
        { kind: "ipv4Cidr", value: "8.8.8.0/24", noResolve: true, sourceId: "ChinaIP" },
        { kind: "ipv6Cidr", value: "2001:4860::/32", noResolve: true, sourceId: "ChinaIP" },
      ],
      source: {
        repository: upstream.repository,
        commit: upstream.commit,
        committedAt: upstream.committedAt,
        sha256: "1".repeat(64),
      },
    },
    now: "2026-08-10T00:00:00Z",
    resolveCommitImpl: async () => {
      resolved += 1;
      return { sha: "b".repeat(40), committedAt: "2026-08-09T00:00:00Z" };
    },
    fetchSnapshotImpl: async ({ commit }) => {
      fetched += 1;
      assert.equal(commit.sha, "b".repeat(40));
      return {
        source: {
          repository: "https://github.com/gaoyifan/china-operator-ip",
          branch: "ip-lists",
          commit: commit.sha,
          committedAt: commit.committedAt,
          license: "MIT",
          files: [],
        },
        entries: [
          { kind: "ipv4Cidr", value: "8.8.8.0/24", noResolve: true, sourceId: "ChinaIP-audit" },
          { kind: "ipv6Cidr", value: "2001:4860::/32", noResolve: true, sourceId: "ChinaIP-audit" },
        ],
        sha256: "2".repeat(64),
      };
    },
  });

  assert.equal(resolved, 1);
  assert.equal(fetched, 1);
  const report = JSON.parse(bytes);
  assert.equal(report.calibrationStartedAt, "2026-08-01T00:00:00.000Z");
  assert.equal(report.families.ipv4.previousAddresses, "512");
  assert.equal(report.families.ipv4.currentAddresses, "256");
  assert.equal(report.secondary.commit, "b".repeat(40));
  assert.deepEqual(bytes, Buffer.from(canonicalJson(report)));
});

test("real current stage reuses tracked audit and SRS bytes with zero network", async () => {
  const root = await mkdtemp(join(tmpdir(), "china-ip-current-stage-"));
  const publicDirectory = join(root, "public");
  const outputRoot = join(root, "stage");
  const report = chinaIpAuditBytes();
  await mkdir(join(publicDirectory, "current/audit"), { recursive: true });
  await writeFile(join(publicDirectory, "current/audit/china-ip-drift.json"), report);
  await writeFile(join(publicDirectory, "current/manifest.json"), JSON.stringify({ upstream }));
  const expected = [
    ...ruleClientCatalog({ adblockMode: "off" }).map(({ id }) => `sing-box/rule-sets/${id}.srs`),
    "optional/adblock-full/sing-box/Advertising.srs",
    "optional/adblock-full/sing-box/Advertising_Domain.srs",
  ].sort();
  for (const [index, path] of expected.entries()) {
    const source = path.startsWith("optional/")
      ? join(publicDirectory, "optional/adblock-full/current", path.slice("optional/adblock-full/".length))
      : join(publicDirectory, "current", path);
    await mkdir(dirname(source), { recursive: true });
    await writeFile(source, Buffer.concat([
      Buffer.from([0x53, 0x52, 0x53, 0x02]),
      Buffer.alloc(13, index + 1),
    ]));
  }
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => {
    networkCalls += 1;
    throw new Error("current staging must be offline");
  };
  let manifest;
  try {
    manifest = await stageRuleArtifactsMain(["--channel", "current"], {
      env: { PUBLIC_DIRECTORY: publicDirectory, SING_BOX_ARTIFACT_ROOT: outputRoot },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(networkCalls, 0);
  assert.deepEqual(manifest.files.map(({ path }) => path), expected);
  assert.deepEqual(await readFile(join(outputRoot, "audit/china-ip-drift.json")), report);
});

test("loads a closed set of non-empty official SRS outputs", async () => {
  const root = await mkdtemp(join(tmpdir(), "sing-box-compiled-"));
  const expected = [
    ...ruleClientCatalog({ adblockMode: "off" }).map(({ id }) => `sing-box/rule-sets/${id}.srs`),
    "optional/adblock-full/sing-box/Advertising.srs",
    "optional/adblock-full/sing-box/Advertising_Domain.srs",
  ].sort();
  for (const [index, path] of expected.entries()) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), Buffer.concat([Buffer.from([0x53, 0x52, 0x53, 0x02]), Buffer.alloc(13, index + 1)]));
  }
  const loaded = await loadCompiledSingBoxRules(root);
  assert.deepEqual([...loaded.keys()], expected);
  await writeFile(join(root, "sing-box/rule-sets/unexpected.srs"), Buffer.alloc(17));
  await assert.rejects(() => loadCompiledSingBoxRules(root), /unexpected/u);
});
