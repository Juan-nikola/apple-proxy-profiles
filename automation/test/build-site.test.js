import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildSite,
  CLIENT_PUBLIC_PATHS,
  PUBLIC_RETENTION,
  publishEdgeRelease,
  snapshotMatches,
} from "../src/build-site.js";

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

test("preserves binary artifact bytes in site emission and snapshot comparison", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-site-binary-"));
  const publicDirectory = join(root, "public");
  const binary = Buffer.from([0xd9, 0x9d, 0x73, 0x72]);
  const release = artifact("c", "text");
  release.files.set("sing-box/rule-sets/test.srs", binary);

  await buildSite({ publicDirectory, ...release });

  assert.deepEqual(await readFile(join(publicDirectory, "current/sing-box/rule-sets/test.srs")), binary);
  assert.equal(await snapshotMatches(join(publicDirectory, "current"), release.files), true);
});

test("publishes edge and immutable per-client bytes without replacing current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-edge-"));
  const publicDirectory = join(root, "public");
  await mkdir(join(publicDirectory, "current"), { recursive: true });
  await writeFile(join(publicDirectory, "current/stable.txt"), "stable\n");
  const defaults = new Map();
  const clients = {};
  let index = 1;
  for (const [client, directory] of Object.entries(CLIENT_PUBLIC_PATHS)) {
    const manifestHash = String(index).repeat(64);
    clients[client] = { manifestHash };
    defaults.set(`${directory}/rules.bin`, Buffer.from([index]));
    defaults.set(`${directory}/client-manifest.json`, `${JSON.stringify({ manifestHash, files: [] })}\n`);
    index += 1;
  }
  const manifest = { manifestHash: "a".repeat(64), clients };
  defaults.set("manifest.json", `${JSON.stringify(manifest)}\n`);
  const optionalPacks = new Map([["adblock-full", new Map([
    ["optional/adblock-full/manifest.json", "{}\n"],
  ])]]);

  await publishEdgeRelease({ publicDirectory, defaults, optionalPacks, manifest });

  assert.equal(await readFile(join(publicDirectory, "current/stable.txt"), "utf8"), "stable\n");
  assert.deepEqual(await readFile(join(publicDirectory, "edge/sing-box/rules.bin")), Buffer.from([1]));
  assert.deepEqual(await readFile(join(
    publicDirectory,
    `edge/clients/singbox/${clients.singbox.manifestHash}/sing-box/rules.bin`,
  )), Buffer.from([1]));
  assert.equal(await readFile(join(publicDirectory, "edge/optional/adblock-full/manifest.json"), "utf8"), "{}\n");
});
