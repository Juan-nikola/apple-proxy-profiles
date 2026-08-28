import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildClientArtifacts } from "../src/build-artifacts.js";
import { artifactSha256 } from "../src/artifact-content.js";
import { buildSite, publishCurrentRelease, snapshotMatches, validateClientPublication } from "../src/build-site.js";
import { canonicalJson } from "../src/render-anywhere-rules.js";
import { lightweightFixtureSnapshots } from "./lightweight-fixture.js";

function buildFixtureArtifacts() {
  return buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    channel: "current",
    additionalFiles: new Map([
      ["v2box/scripts/substore-node-generator.js", "native v2box generator\\n"],
      ["clash/scripts/clash-profile-generator.js", "native clash generator\\n"],
    ]),
  });
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function listTopLevel(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .map((entry) => entry.name)
    .sort();
}

test("publishes one current-only snapshot and optional packs through atomic staging", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-current-only-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildFixtureArtifacts();
  try {
    await mkdir(join(publicDirectory, "edge"), { recursive: true });
    await mkdir(join(publicDirectory, "previous"), { recursive: true });
    await mkdir(join(publicDirectory, "versions/" + "a".repeat(64)), { recursive: true });
    await writeFile(join(publicDirectory, "edge/stale.txt"), "stale\\n");
    await writeFile(join(publicDirectory, "current-old.txt"), "stale\\n");

    const result = await publishCurrentRelease({
      publicDirectory,
      defaults: artifacts.defaults,
      optionalPacks: artifacts.optionalPacks,
      manifest: artifacts.diagnostics.defaultManifest,
    });

    assert.equal(result.versionCount, 0);
    assert.equal(await snapshotMatches(join(publicDirectory, "current"), artifacts.defaults), true);
    assert.equal(await exists(join(publicDirectory, "optional/adblock-full/current/manifest.json")), true);
    assert.equal(await exists(join(publicDirectory, "edge")), false);
    assert.equal(await exists(join(publicDirectory, "previous")), false);
    assert.equal(await exists(join(publicDirectory, "versions")), false);
    assert.deepEqual(await listTopLevel(root), ["public"]);
    assert.deepEqual(await listTopLevel(publicDirectory), [".nojekyll", "current", "index.html", "manifest.json", "optional"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("repeating a current-only publication is idempotent", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-current-only-idempotent-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildFixtureArtifacts();
  try {
    const args = {
      publicDirectory,
      defaults: artifacts.defaults,
      optionalPacks: artifacts.optionalPacks,
      manifest: artifacts.diagnostics.defaultManifest,
    };
    const first = await publishCurrentRelease(args);
    const before = await readFile(join(publicDirectory, "current/manifest.json"));
    const second = await publishCurrentRelease(args);
    const after = await readFile(join(publicDirectory, "current/manifest.json"));
    assert.equal(first.manifestHash, second.manifestHash);
    assert.deepEqual(after, before);
    assert.equal(second.versionCount, 0);
    assert.equal(await exists(join(publicDirectory, "edge")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects non-current publication channels", async () => {
  const artifacts = buildFixtureArtifacts();
  await assert.rejects(
    () => publishCurrentRelease({
      publicDirectory: "/tmp/unused",
      defaults: artifacts.defaults,
      optionalPacks: artifacts.optionalPacks,
      manifest: artifacts.diagnostics.defaultManifest,
      channel: "edge",
    }),
    /channel=current/u,
  );
});

test("rejects frontier files instead of creating legacy publication roots", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-current-only-frontier-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildFixtureArtifacts();
  try {
    await assert.rejects(
      () => buildSite({
        publicDirectory,
        files: artifacts.defaults,
        manifest: artifacts.diagnostics.defaultManifest,
        frontierFiles: new Map([["edge/client.js", "legacy\\n"]]),
      }),
      /Frontier publication is no longer supported/u,
    );
    assert.equal(await exists(publicDirectory), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("keeps binary bytes in a current-only publication", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-current-only-binary-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildFixtureArtifacts();
  const binary = artifacts.defaults.get("geodata/cn/AppleProxySiteCurrent.dat");
  try {
    await buildSite({
      publicDirectory,
      files: artifacts.defaults,
      manifest: artifacts.diagnostics.defaultManifest,
      optionalPacks: artifacts.optionalPacks,
      currentOnly: true,
    });
    assert.deepEqual(await readFile(join(publicDirectory, "current/geodata/cn/AppleProxySiteCurrent.dat")), binary);
    assert.equal(await snapshotMatches(join(publicDirectory, "current"), artifacts.defaults), true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("validates a current-scoped client publication and rejects cross-channel URLs", () => {
  const artifacts = buildFixtureArtifacts();
  const currentFiles = new Map(artifacts.defaults);
  const client = "surge";
  const directory = "surge";
  assert.doesNotThrow(() => validateClientPublication({
    files: currentFiles,
    client,
    directory,
    channel: "current",
  }));
  const path = "surge/scripts/surge-profile-generator.js";
  const tampered = new Map(currentFiles);
  tampered.set(path, String(tampered.get(path)).replaceAll("/current/", "/edge/"));
  assert.throws(
    () => validateClientPublication({ files: tampered, client, directory, channel: "current" }),
    /bytes changed|file set is not closed|channel|current|edge/u,
  );
});
