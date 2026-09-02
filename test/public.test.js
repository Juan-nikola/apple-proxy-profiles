import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { artifactSha256 } from "../automation/src/artifact-content.js";
import test from "node:test";

const publicRoot = new URL("../public/", import.meta.url);
const currentRoot = new URL("current/", publicRoot);

async function exists(url) {
  try { await access(url); return true; } catch { return false; }
}

async function treeBytes(url) {
  let total = 0;
  for (const entry of await readdir(url, { withFileTypes: true })) {
    const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), url);
    total += entry.isDirectory() ? await treeBytes(child) : (await stat(child)).size;
  }
  return total;
}

test("public site contains one current snapshot and no legacy publication roots", async () => {
  assert.equal(await exists(new URL("current/manifest.json", publicRoot)), true);
  for (const name of ["edge", "previous", "versions"]) assert.equal(await exists(new URL(name + "/", publicRoot)), false, name);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", currentRoot), "utf8"));
  assert.equal(manifest.schemaVersion, 2);
  assert.match(manifest.manifestHash, /^[0-9a-f]{64}$/u);
  assert.ok(manifest.files.length > 0);
});

test("current client manifests close over their emitted bytes", async () => {
  const directories = ["anywhere", "clash", "egern", "happ", "incy", "shadowrocket", "sing-box", "surge", "v2box"];
  for (const directory of directories) {
    const manifest = JSON.parse(await readFile(new URL(directory + "/client-manifest.json", currentRoot), "utf8"));
    assert.match(manifest.manifestHash, /^[0-9a-f]{64}$/u, directory);
    const { manifestHash, ...manifestBase } = manifest;
    assert.equal(artifactSha256(`${JSON.stringify(manifestBase, null, 2)}\n`), manifestHash, `${directory}: manifest hash`);
    for (const record of manifest.files) {
      const bytes = await readFile(new URL(record.path, currentRoot));
      assert.equal(bytes.byteLength, record.bytes, record.path);
      assert.match(record.sha256, /^[0-9a-f]{64}$/u, record.path);
      assert.equal(artifactSha256(bytes), record.sha256, record.path);
    }
  }
});

test("current publication remains within the Pages budget", async () => {
  assert.ok(await treeBytes(currentRoot) < 750 * 1024 * 1024);
});
