import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const publicRoot = new URL("../public/", import.meta.url);
const currentRoot = new URL("current/", publicRoot);

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function treeBytes(url) {
  let total = 0;
  for (const entry of await readdir(url, { withFileTypes: true })) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, url);
    if (entry.isDirectory()) total += await treeBytes(child);
    else if (entry.isFile()) total += (await stat(child)).size;
    else throw new Error("public tree contains a non-regular entry");
  }
  return total;
}

async function relativeFiles(url, prefix = "") {
  const files = [];
  for (const entry of await readdir(url, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, url);
    if (entry.isDirectory()) files.push(...await relativeFiles(child, relative));
    else if (entry.isFile()) files.push([relative, child]);
    else throw new Error("public tree contains a non-regular entry");
  }
  return files;
}

test("publishes one hash-closed three-client current snapshot", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", currentRoot), "utf8"));
  assert.equal(manifest.upstream.commit, "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc");
  assert.equal(manifest.clients.shadowrocket.sourceCount, 32);
  assert.equal(manifest.clients.egern.sourceCount, 32);
  assert.equal(manifest.clients.anywhere.sourceCount, 32);
  const manifestPaths = new Set(manifest.files.map(({ path }) => path));
  for (const path of [
    "shadowrocket/scripts/shadowrocket-node-operator.js",
    "shadowrocket/scripts/shadowrocket-profile-generator.js",
    "shadowrocket/scripts/substore-node-operator.js",
    "shadowrocket/scripts/substore-profile-generator.js",
    "egern/scripts/egern-node-generator.js",
    "egern/scripts/egern-profile-generator.js",
    "egern/scripts/substore-node-generator.js",
    "egern/scripts/substore-profile-generator.js",
    "anywhere/scripts/anywhere-node-generator.js",
    "anywhere/scripts/substore-node-generator.js",
  ]) {
    assert.equal(manifestPaths.has(path), true, path);
  }
  for (const file of manifest.files) {
    const content = await readFile(new URL(file.path, currentRoot));
    assert.equal(content.byteLength, file.bytes, file.path);
    assert.equal(sha256(content), file.sha256, file.path);
  }
});

test("public client entrypoints close over current and never raw master", async () => {
  for (const path of [
    "shadowrocket/scripts/shadowrocket-profile-generator.js",
    "shadowrocket/scripts/substore-profile-generator.js",
    "shadowrocket/examples/shadowrocket-macos.conf",
    "shadowrocket/examples/shadowrocket-iphone.conf",
    "shadowrocket/examples/shadowrocket-ipad.conf",
  ]) {
    const content = await readFile(new URL(path, currentRoot), "utf8");
    assert.equal(content.includes("raw.githubusercontent.com/blackmatrix7"), false, path);
    if (path.includes("scripts/")) {
      assert.match(content, /current\/shadowrocket\/rules/u);
      assert.match(content, /`\$\{RULE_ROOT\}\/\$\{id\}\.list`/u);
    } else {
      assert.match(content, /current\/shadowrocket\/rules\/Advertising_Domain\.list/u);
    }
  }
  for (const path of [
    "egern/examples/egern-macos.yaml",
    "egern/examples/egern-iphone.yaml",
    "egern/examples/egern-ipad.yaml",
  ]) {
    const content = await readFile(new URL(path, currentRoot), "utf8");
    assert.match(content, /current\/egern\/rules\/Advertising_Domain\.yaml/u);
  }
  assert.match(await readFile(new URL("anywhere/import.html", currentRoot), "utf8"), /导入批次 3/u);

  for (const [canonical, legacy] of [
    ["shadowrocket/scripts/shadowrocket-node-operator.js", "shadowrocket/scripts/substore-node-operator.js"],
    ["shadowrocket/scripts/shadowrocket-profile-generator.js", "shadowrocket/scripts/substore-profile-generator.js"],
    ["egern/scripts/egern-node-generator.js", "egern/scripts/substore-node-generator.js"],
    ["egern/scripts/egern-profile-generator.js", "egern/scripts/substore-profile-generator.js"],
    ["anywhere/scripts/anywhere-node-generator.js", "anywhere/scripts/substore-node-generator.js"],
  ]) {
    assert.equal(
      await readFile(new URL(canonical, currentRoot), "utf8"),
      await readFile(new URL(legacy, currentRoot), "utf8"),
      canonical,
    );
  }

  const rawBranchUrl = /raw\.githubusercontent\.com\/blackmatrix7\/ios_rule_script\/(?:master|main)\//u;
  for (const [path, url] of await relativeFiles(currentRoot)) {
    const content = await readFile(url, "utf8");
    assert.doesNotMatch(content, rawBranchUrl, path);
  }
});

test("keeps current, previous, and an online version within the hard Pages budget", async () => {
  const rootManifest = JSON.parse(await readFile(new URL("manifest.json", currentRoot), "utf8"));
  const version = new URL(`versions/${rootManifest.manifestHash}/manifest.json`, publicRoot);
  assert.equal(await readFile(version, "utf8"), await readFile(new URL("manifest.json", currentRoot), "utf8"));
  assert.equal(await readFile(new URL("previous/manifest.json", publicRoot), "utf8").then(Boolean), true);
  assert.ok(await treeBytes(publicRoot) <= 750 * 1024 * 1024);
  assert.equal((await stat(new URL(".nojekyll", publicRoot))).size, 0);
});
