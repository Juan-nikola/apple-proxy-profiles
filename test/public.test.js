import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, readFile, readdir, stat } from "node:fs/promises";
import test from "node:test";

const publicRoot = new URL("../public/", import.meta.url);
const currentRoot = new URL("current/", publicRoot);
const edgeRoot = new URL("edge/", publicRoot);

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

function ruleSetUrls(value, urls = []) {
  if (typeof value === "string" && value.includes("rule-sets")) urls.push(value);
  else if (Array.isArray(value)) value.forEach((item) => ruleSetUrls(item, urls));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => ruleSetUrls(item, urls));
  return urls;
}

test("publishes one hash-closed multi-client current snapshot", async () => {
  const rollout = JSON.parse(await readFile(new URL("rollout.json", publicRoot), "utf8"));
  assert.equal(rollout.schemaVersion, 2);
  const clientDirectories = {
    shadowrocket: "shadowrocket",
    egern: "egern",
    anywhere: "anywhere",
    surge: "surge",
    singbox: "sing-box",
    onexray: "onexray",
    happ: "happ",
  };
  for (const [client, directory] of Object.entries(clientDirectories)) {
    const hash = rollout.clients[client];
    if (hash === undefined || hash === null) continue;
    assert.match(hash, /^[0-9a-f]{64}$/u, client);
    const manifest = JSON.parse(await readFile(new URL(`${directory}/client-manifest.json`, currentRoot), "utf8"));
    assert.equal(manifest.manifestHash, hash, client);
    for (const record of manifest.files) {
      const content = await readFile(new URL(record.path, currentRoot));
      assert.equal(content.byteLength, record.bytes, record.path);
      assert.equal(sha256(content), record.sha256, record.path);
    }
  }
  const requiredCurrentPaths = [
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
    "surge/scripts/surge-nodes-generator.js",
    "surge/scripts/surge-profile-generator.js",
    "surge/scripts/substore-nodes-generator.js",
    "surge/scripts/substore-profile-generator.js",
    "sing-box/scripts/sing-box-config-generator.js",
    "sing-box/scripts/substore-config-generator.js",
  ];
  if (rollout.clients.onexray) requiredCurrentPaths.push(
    "onexray/index.html",
    "onexray/geodata/geosite.dat",
    "onexray/geodata/geoip.dat",
    "onexray/geodata/manifest.json",
  );
  if (rollout.clients.happ) requiredCurrentPaths.push(
    "happ/index.html",
    "happ/geosite.dat",
    "happ/geoip.dat",
    "happ/scripts/happ-config-generator.js",
  );
  for (const path of requiredCurrentPaths) {
    await access(new URL(path, currentRoot));
  }
});

test("public client entrypoints close over hosted channels and never raw master", async () => {
  const scriptMarkers = {
    "shadowrocket/scripts/shadowrocket-profile-generator.js": /shadowrocket\/rules/u,
    "shadowrocket/scripts/substore-profile-generator.js": /shadowrocket\/rules/u,
    "egern/scripts/egern-profile-generator.js": /egern\/rules/u,
    "egern/scripts/substore-profile-generator.js": /egern\/rules/u,
    "surge/scripts/surge-profile-generator.js": /surge\/rules/u,
    "surge/scripts/substore-profile-generator.js": /surge\/rules/u,
    "sing-box/scripts/sing-box-config-generator.js": /sing-box\/rule-sets/u,
    "sing-box/scripts/substore-config-generator.js": /sing-box\/rule-sets/u,
  };
  for (const [path, marker] of Object.entries(scriptMarkers)) {
    const content = await readFile(new URL(path, currentRoot), "utf8");
    assert.equal(content.includes("raw.githubusercontent.com/blackmatrix7"), false, path);
    assert.match(content, /https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles/u, path);
    assert.match(content, marker, path);
  }
  for (const path of [
    "shadowrocket/examples/shadowrocket-macos.conf",
    "shadowrocket/examples/shadowrocket-iphone.conf",
    "shadowrocket/examples/shadowrocket-ipad.conf",
  ]) {
    const content = await readFile(new URL(path, currentRoot), "utf8");
    assert.equal(content.includes("raw.githubusercontent.com/blackmatrix7"), false, path);
    assert.match(content, /juan-nikola\.github\.io\/apple-proxy-profiles\/[a-z]+\/shadowrocket\/rules\/[A-Za-z0-9_-]+\.list/u, path);
  }
  for (const path of [
    "egern/examples/egern-macos.yaml",
    "egern/examples/egern-iphone.yaml",
    "egern/examples/egern-ipad.yaml",
  ]) {
    const content = await readFile(new URL(path, currentRoot), "utf8");
    assert.match(content, /^ipv6:/u);
    assert.doesNotMatch(content, /^auto_update: \{\}$/mu);
    assert.equal(content.includes("raw.githubusercontent.com/blackmatrix7"), false, path);
    assert.match(content, /juan-nikola\.github\.io\/apple-proxy-profiles\/[a-z]+\/egern\/rules\/[A-Za-z0-9_-]+\.yaml/u);
  }
  for (const path of [
    "egern/scripts/egern-profile-generator.js",
    "egern/scripts/substore-profile-generator.js",
  ]) {
    const content = await readFile(new URL(path, currentRoot), "utf8");
    assert.doesNotMatch(content, /auto_update:\s*\{\}/u);
  }
  assert.match(await readFile(new URL("anywhere/import.html", currentRoot), "utf8"), /导入批次 \d+/u);

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

test("publishes an independent lightweight edge candidate beside stable current", async () => {
  const edge = JSON.parse(await readFile(new URL("edge/manifest.json", publicRoot), "utf8"));
  const current = JSON.parse(await readFile(new URL("current/manifest.json", publicRoot), "utf8"));
  assert.equal(edge.schemaVersion, 2);
  assert.equal(edge.generatedAt, edge.upstream.committedAt);
  assert.match(edge.upstream.commit, /^[0-9a-f]{40}$/u);
  assert.equal(current.upstream.commit.length, 40);
  assert.deepEqual(Object.keys(edge.clients).sort(), ["anywhere", "egern", "happ", "onexray", "shadowrocket", "singbox", "surge"]);
  assert.ok(edge.clients.singbox.referencedDefaultBytes > 0);
  const surgeGenerator = await readFile(new URL("edge/surge/scripts/surge-profile-generator.js", publicRoot), "utf8");
  assert.match(surgeGenerator, /channel:\s*"edge"/u);
  assert.match(surgeGenerator, /\$\{PUBLIC_RULE_ROOT\}\/\$\{options\.channel\}\/surge\/rules/u);
  assert.ok((await stat(new URL("edge/sing-box/rule-sets/ChinaIP.srs", publicRoot))).size > 0);
});

test("keeps the edge sing-box bundle and Android example on the mobile contract", async () => {
  for (const filename of ["sing-box-config-generator.js", "substore-config-generator.js"]) {
    assert.equal(
      await readFile(new URL(`sing-box/scripts/${filename}`, edgeRoot), "utf8"),
      await readFile(new URL(`../clients/sing-box/dist/${filename}`, import.meta.url), "utf8"),
      filename,
    );
  }

  const android = JSON.parse(await readFile(new URL("sing-box/examples/sing-box-android.json", edgeRoot), "utf8"));
  const androidUrls = ruleSetUrls(android);
  assert.equal(androidUrls.length, 14);
  assert.ok(androidUrls.every((url) => url.includes("/edge/sing-box/mobile-rule-sets/")));
  assert.ok(androidUrls.every((url) => !url.includes("/edge/sing-box/rule-sets/")));

  const macos = JSON.parse(await readFile(new URL("sing-box/examples/sing-box-macos.json", edgeRoot), "utf8"));
  const macosUrls = ruleSetUrls(macos);
  assert.ok(macosUrls.length > androidUrls.length);
  assert.ok(macosUrls.every((url) => url.includes("/edge/sing-box/rule-sets/")));
  assert.ok(macosUrls.every((url) => !url.includes("/edge/sing-box/mobile-rule-sets/")));
});

test("keeps current, previous, and an online version within the hard Pages budget", async () => {
  const rootManifest = JSON.parse(await readFile(new URL("manifest.json", currentRoot), "utf8"));
  const version = new URL(`versions/${rootManifest.manifestHash}/manifest.json`, publicRoot);
  assert.equal(await readFile(version, "utf8"), await readFile(new URL("manifest.json", currentRoot), "utf8"));
  assert.equal(await readFile(new URL("previous/manifest.json", publicRoot), "utf8").then(Boolean), true);
  assert.ok(await treeBytes(publicRoot) <= 750 * 1024 * 1024);
  assert.equal((await stat(new URL(".nojekyll", publicRoot))).size, 0);
});
