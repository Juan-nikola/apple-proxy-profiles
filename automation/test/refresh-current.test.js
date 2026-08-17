import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { buildClientArtifacts } from "../src/build-artifacts.js";
import { artifactSha256 } from "../src/artifact-content.js";
import { canonicalJson } from "../src/render-anywhere-rules.js";
import { refreshChannelManifest, refreshCurrentManifest } from "../src/refresh-current.js";
import { lightweightFixtureSnapshots } from "./lightweight-fixture.js";
import { explainRouteMain } from "../../scripts/explain-route.mjs";

async function writeFiles(directory, files) {
  for (const [path, content] of files) {
    const destination = join(directory, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}

async function treeRecords(directory) {
  const found = [];
  async function walk(current) {
    for (const entry of await readdir(join(directory, current), { withFileTypes: true })) {
      const relative = current ? `${current}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(relative);
      else if (entry.isFile()) found.push(relative);
      else throw new Error("Fixture tree contains a non-regular entry");
    }
  }
  await walk("");
  const records = [];
  for (const path of found) {
    if (path === "manifest.json") continue;
    const content = await readFile(join(directory, path));
    records.push({ path, bytes: content.byteLength, sha256: artifactSha256(content) });
  }
  return records.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

async function fixtureTree() {
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots() });
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-refresh-"));
  await writeFiles(join(root, "current"), artifacts.defaults);
  await writeFiles(join(root, "edge"), artifacts.defaults);
  return { root, defaults: artifacts.defaults };
}

test("refreshCurrentManifest repairs a stale current manifest from the actual tree", async () => {
  const { root, defaults } = await fixtureTree();
  try {
    const stale = JSON.parse(await readFile(join(root, "current/manifest.json"), "utf8"));
    stale.clients.shadowrocket = { manifestHash: "0".repeat(64), referencedDefaultBytes: 1 };
    stale.files = stale.files.filter(({ path }) => path !== "LICENSE");
    const { manifestHash: ignored, ...staleBase } = stale;
    stale.manifestHash = artifactSha256(canonicalJson(staleBase));
    await writeFile(join(root, "current/manifest.json"), canonicalJson(stale), "utf8");

    const refreshed = await refreshCurrentManifest({ publicDirectory: root });
    const onDisk = JSON.parse(await readFile(join(root, "current/manifest.json"), "utf8"));
    const { manifestHash, ...base } = onDisk;
    assert.equal(artifactSha256(canonicalJson(base)), manifestHash);
    assert.equal(refreshed.manifestHash, manifestHash);

    assert.deepEqual(onDisk.files, await treeRecords(join(root, "current")));

    const shadowrocketManifest = JSON.parse(await readFile(join(root, "current/shadowrocket/client-manifest.json"), "utf8"));
    assert.equal(onDisk.clients.shadowrocket.manifestHash, shadowrocketManifest.manifestHash);
    const edgeManifest = JSON.parse(await readFile(join(root, "edge/manifest.json"), "utf8"));
    assert.deepEqual(onDisk.upstream, edgeManifest.upstream);
    assert.deepEqual(onDisk.diagnostics, edgeManifest.diagnostics);
    assert.equal(onDisk.generatedAt, edgeManifest.generatedAt);

    const audit = JSON.parse(await readFile(join(root, "current/audit/routing-plan.json"), "utf8"));
    assert.equal(audit.schemaVersion, 1);
    assert.equal(Array.isArray(audit.phases), true);

    const explanation = await explainRouteMain(
      ["--channel", "current", "--domain", "example.cn"],
      { publicRoot: root },
    );
    assert.equal(explanation.matchedSource, "ChinaTLD");
    assert.equal(explanation.expectedPolicy, "DIRECT");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refreshCurrentManifest counts sing-box mobile rule-set bytes", async () => {
  const { root } = await fixtureTree();
  try {
    const mobileRuleSet = Buffer.from("SRS\\u0002mobile-ai", "utf8");
    await writeFiles(join(root, "current"), [["sing-box/mobile-rule-sets/AI.srs", mobileRuleSet]]);

    const refreshed = await refreshCurrentManifest({ publicDirectory: root });
    const records = await treeRecords(join(root, "current"));
    const expectedBytes = records
      .filter(({ path }) => (
        path.startsWith("sing-box/rules/")
        || path.startsWith("sing-box/rule-sets/")
        || path.startsWith("sing-box/mobile-rule-sets/")
      ))
      .reduce((sum, { bytes }) => sum + bytes, 0);

    assert.equal(refreshed.clients.singbox.referencedDefaultBytes, expectedBytes);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refreshCurrentManifest refuses when current routing bytes diverge from edge", async () => {
  const { root } = await fixtureTree();
  try {
    await writeFile(
      join(root, "current/surge/rules/DomesticCore.list"),
      "DOMAIN-SUFFIX,modified.example\n",
      "utf8",
    );
    await assert.rejects(
      () => refreshCurrentManifest({ publicDirectory: root, adoptEdgeMetadata: true }),
      /routing bytes|edge/iu,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
