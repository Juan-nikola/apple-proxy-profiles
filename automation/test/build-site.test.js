import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildSite, PUBLIC_RETENTION, snapshotMatches } from "../src/build-site.js";

function artifact(hash, text, time = "2026-08-01T00:00:00Z") {
  const manifest = { manifestHash: hash.repeat(64), generatedAt: time, upstream: { commit: "d".repeat(40) } };
  return { manifest, files: new Map([["manifest.json", `${JSON.stringify(manifest)}\n`], ["rules/x.txt", `${text}\n`]]) };
}

test("builds current, previous, and immutable version snapshots atomically", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-"));
  const publicDirectory = join(root, "public");
  const first = artifact("a", "first");
  const second = artifact("b", "second", "2026-08-02T00:00:00Z");
  await buildSite({ publicDirectory, ...first });
  await buildSite({ publicDirectory, ...second });
  assert.equal(await readFile(join(publicDirectory, "current/rules/x.txt"), "utf8"), "second\n");
  assert.equal(await readFile(join(publicDirectory, "previous/rules/x.txt"), "utf8"), "first\n");
  assert.equal(await snapshotMatches(join(publicDirectory, `versions/${first.manifest.manifestHash}`), first.files), true);
  assert.equal(await snapshotMatches(join(publicDirectory, `versions/${second.manifest.manifestHash}`), second.files), true);
});

test("leaves the last known-good rollback snapshot intact on an identical update", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-noop-"));
  const publicDirectory = join(root, "public");
  const first = artifact("a", "first");
  const second = artifact("b", "second", "2026-08-02T00:00:00Z");
  await buildSite({ publicDirectory, ...first });
  await buildSite({ publicDirectory, ...second });

  const before = {
    current: await readFile(join(publicDirectory, "current/rules/x.txt"), "utf8"),
    previous: await readFile(join(publicDirectory, "previous/rules/x.txt"), "utf8"),
    version: await readFile(join(
      publicDirectory,
      `versions/${second.manifest.manifestHash}/rules/x.txt`,
    ), "utf8"),
  };
  const result = await buildSite({ publicDirectory, ...second });
  const after = {
    current: await readFile(join(publicDirectory, "current/rules/x.txt"), "utf8"),
    previous: await readFile(join(publicDirectory, "previous/rules/x.txt"), "utf8"),
    version: await readFile(join(
      publicDirectory,
      `versions/${second.manifest.manifestHash}/rules/x.txt`,
    ), "utf8"),
  };

  assert.deepEqual(after, before);
  assert.equal(after.current, "second\n");
  assert.equal(after.previous, "first\n");
  assert.equal(result.versionCount, 2);
});

test("fails a no-op update when its immutable version no longer matches", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-corrupt-"));
  const publicDirectory = join(root, "public");
  const first = artifact("a", "first");
  const second = artifact("b", "second", "2026-08-02T00:00:00Z");
  await buildSite({ publicDirectory, ...first });
  await buildSite({ publicDirectory, ...second });
  await writeFile(
    join(publicDirectory, `versions/${second.manifest.manifestHash}/rules/x.txt`),
    "corrupt\n",
    "utf8",
  );

  await assert.rejects(
    () => buildSite({ publicDirectory, ...second }),
    /Immutable public version bytes changed or are missing/u,
  );
  assert.equal(await readFile(join(publicDirectory, "current/rules/x.txt"), "utf8"), "second\n");
  assert.equal(await readFile(join(publicDirectory, "previous/rules/x.txt"), "utf8"), "first\n");
});

test("pins a bounded online version window below the Pages capacity budget", () => {
  assert.deepEqual(PUBLIC_RETENTION, {
    maxBytes: 750 * 1024 * 1024,
    maxVersions: 8,
    minVersions: 2,
  });
});

test("retains the current immutable version when publication timestamps tie", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-tied-retention-"));
  const publicDirectory = join(root, "public");
  let latest;
  for (let index = 0; index < PUBLIC_RETENTION.maxVersions + 2; index += 1) {
    latest = artifact(index.toString(16), `snapshot-${index}`);
    await buildSite({ publicDirectory, ...latest });
  }

  assert.equal(
    await snapshotMatches(join(publicDirectory, `versions/${latest.manifest.manifestHash}`), latest.files),
    true,
  );
  const versions = await readdir(join(publicDirectory, "versions"));
  assert.equal(versions.length, PUBLIC_RETENTION.maxVersions);
});

test("publishes frontier channel files without overwriting the stable snapshot", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-frontier-"));
  const publicDirectory = join(root, "public");
  const stable = artifact("a", "stable");
  const frontierFiles = new Map([
    ["edge/surge/scripts/profile.js", "edge surge\n"],
    ["edge/sing-box/scripts/config.js", "edge sing-box\n"],
  ]);
  await buildSite({ publicDirectory, ...stable, frontierFiles });
  assert.equal(await readFile(join(publicDirectory, "current/rules/x.txt"), "utf8"), "stable\n");
  assert.equal(await readFile(join(publicDirectory, "edge/surge/scripts/profile.js"), "utf8"), "edge surge\n");
  assert.equal(await readFile(join(publicDirectory, "edge/sing-box/scripts/config.js"), "utf8"), "edge sing-box\n");
});
