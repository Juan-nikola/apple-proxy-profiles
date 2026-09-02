import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildClientArtifacts } from "../automation/src/build-artifacts.js";
import { canonicalJson } from "../automation/src/render-anywhere-rules.js";
import { lightweightFixtureSnapshots } from "../automation/test/lightweight-fixture.js";
import { buildArtifacts, parseUpdateRulesArguments, verifyPublishedChannel, verifyTrackedPublications } from "../scripts/update-rules.mjs";

const upstream = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "d".repeat(40),
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

test("accepts only current build and check operations", () => {
  assert.deepEqual(parseUpdateRulesArguments([]), { operation: "build-current", channel: "current" });
  assert.deepEqual(parseUpdateRulesArguments(["--channel", "current"]), { operation: "build-current", channel: "current" });
  assert.deepEqual(parseUpdateRulesArguments(["--check", "--channel", "current"]), { operation: "check-current", channel: "current" });
  for (const args of [["--check"], ["--channel", "edge"], ["--seal-previous"], ["--promote-all"], ["--promote", "surge", "a".repeat(64)]]) {
    assert.throws(() => parseUpdateRulesArguments(args), /current|Invalid update-rules arguments/u);
  }
});

test("buildArtifacts produces current-only artifacts with all active clients", async () => {
  const result = await buildArtifacts({
    operation: "build-current",
    publicDirectory: join(tmpdir(), "unused-current-public"),
    channel: "current",
    upstreamOverride: upstream,
    includeStaticFiles: false,
    fetchSnapshotImpl: async () => lightweightFixtureSnapshots(),
  });
  assert.equal(result.diagnostics.defaultManifest.upstream.commit, upstream.commit);
  assert.equal(Object.keys(result.diagnostics.defaultManifest.clients).length, 9);
  assert.ok(result.defaults.has("manifest.json"));
  assert.ok(result.defaults.has("audit/dashboard.json"));
  assert.ok(result.optionalPacks.has("adblock-full"));
});

test("buildArtifacts rejects non-current channels", async () => {
  await assert.rejects(
    () => buildArtifacts({
      operation: "build-edge",
      publicDirectory: "/tmp/unused",
      channel: "edge",
      upstreamOverride: upstream,
      includeStaticFiles: false,
      fetchSnapshotImpl: async () => lightweightFixtureSnapshots(),
    }),
    /channel=current/u,
  );
});

test("verifyPublishedChannel only recognizes current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-verify-current-"));
  try {
    assert.equal(await verifyPublishedChannel({ publicDirectory: root, channel: "current" }), false);
    await assert.rejects(
      () => verifyPublishedChannel({ publicDirectory: root, channel: "edge" }),
      /unsupported/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("verifyTrackedPublications reproduces a current-only default and optional publication", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-verify-tracked-current-"));
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream, channel: "current" });
  try {
    const { mkdir, writeFile } = await import("node:fs/promises");
    for (const [path, content] of artifacts.defaults) {
      const destination = join(root, "current", path);
      await mkdir(join(destination, ".."), { recursive: true });
      await writeFile(destination, content);
    }
    for (const [path, content] of artifacts.optionalPacks.get("adblock-full")) {
      const destination = join(root, path);
      await mkdir(join(destination, ".."), { recursive: true });
      await writeFile(destination, content);
    }
    assert.equal(await verifyTrackedPublications({ publicDirectory: root, ...artifacts }), true);
    await writeFile(join(root, "current", "tampered.txt"), "tampered\\n");
    assert.equal(await verifyTrackedPublications({ publicDirectory: root, ...artifacts }), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
