import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { buildClientArtifacts } from "../src/build-artifacts.js";
import { artifactSha256 } from "../src/artifact-content.js";
import { canonicalJson } from "../src/render-anywhere-rules.js";
import { refreshCurrentManifest } from "../src/refresh-current.js";
import { lightweightFixtureSnapshots } from "./lightweight-fixture.js";

async function writeFiles(directory, files) {
  for (const [path, content] of files) {
    const destination = join(directory, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}

test("refreshCurrentManifest repairs the current manifest from its actual tree", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-refresh-current-"));
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), channel: "current" });
  try {
    await writeFiles(join(root, "current"), artifacts.defaults);
    const stale = JSON.parse(await readFile(join(root, "current/manifest.json"), "utf8"));
    stale.files = stale.files.filter(({ path }) => path !== "LICENSE");
    const { manifestHash: ignored, ...base } = stale;
    await writeFile(join(root, "current/manifest.json"), canonicalJson({ ...base, manifestHash: artifactSha256(canonicalJson(base)) }));
    const refreshed = await refreshCurrentManifest({ publicDirectory: root });
    const onDisk = JSON.parse(await readFile(join(root, "current/manifest.json"), "utf8"));
    assert.equal(refreshed.manifestHash, onDisk.manifestHash);
    assert.equal(artifactSha256(canonicalJson({ ...onDisk, manifestHash: undefined })), onDisk.manifestHash);
    assert.equal(onDisk.upstream.commit, artifacts.diagnostics.defaultManifest.upstream.commit);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refreshCurrentManifest counts sing-box rule bytes without legacy channels", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-refresh-current-bytes-"));
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), channel: "current" });
  try {
    await writeFiles(join(root, "current"), artifacts.defaults);
    await writeFiles(join(root, "current"), [["sing-box/rules/fixture.json", Buffer.from("fixture")]]);
    const refreshed = await refreshCurrentManifest({ publicDirectory: root });
    assert.ok(refreshed.clients.singbox.referencedDefaultBytes > 0);
    await assert.rejects(() => readFile(join(root, "edge/manifest.json")), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refreshCurrentManifest counts INCY publication bytes without treating it as a text-rule client", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-refresh-current-incy-"));
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), channel: "current" });
  try {
    await writeFiles(join(root, "current"), artifacts.defaults);
    const refreshed = await refreshCurrentManifest({ publicDirectory: root });
    const incyManifest = JSON.parse(await readFile(join(root, "current/incy/client-manifest.json"), "utf8"));
    const expectedBytes = incyManifest.files.reduce((sum, { bytes }) => sum + bytes, 0);

    assert.equal(refreshed.clients.incy.referencedDefaultBytes, expectedBytes);
    assert.ok(refreshed.clients.incy.manifestHash);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
