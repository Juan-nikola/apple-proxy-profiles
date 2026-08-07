import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { buildClientArtifacts } from "../automation/src/build-artifacts.js";
import { publishEdgeRelease } from "../automation/src/build-site.js";
import { lightweightFixtureSnapshots } from "../automation/test/lightweight-fixture.js";
import {
  parseUpdateRulesArguments,
  promoteClientRelease,
  selectDefaultStaticFiles,
  verifyTrackedPublications,
} from "../scripts/update-rules.mjs";

const upstream = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "d".repeat(40),
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

const nextUpstream = Object.freeze({
  ...upstream,
  commit: "e".repeat(40),
  committedAt: "2026-08-02T19:07:21Z",
});

async function writeFiles(directory, files) {
  for (const [path, content] of files) {
    const destination = join(directory, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, content);
  }
}

test("accepts only explicit edge, current-check, and client promotion operations", () => {
  assert.deepEqual(parseUpdateRulesArguments(["--channel", "edge"]), { operation: "build-edge" });
  assert.deepEqual(parseUpdateRulesArguments(["--check", "--channel", "current"]), { operation: "check-current" });
  assert.deepEqual(parseUpdateRulesArguments(["--promote", "singbox", "a".repeat(64)]), {
    operation: "promote",
    client: "singbox",
    manifestHash: "a".repeat(64),
  });
  for (const args of [[], ["--check"], ["--channel", "current"], ["--promote", "unknown", "a".repeat(64)]]) {
    assert.throws(() => parseUpdateRulesArguments(args), /update-rules arguments/u);
  }
});

test("keeps known legacy profiles outside defaults and rejects unexpected forbidden statics", () => {
  const selected = selectDefaultStaticFiles(new Map([
    ["LICENSE", "safe\n"],
    ["surge/examples/surge-macos.conf", "RULE-SET,https://example.invalid/Advertising.list,REJECT\n"],
    ["surge/scripts/surge-profile-generator.js", 'const id = "ChinaMax_Domain";\n'],
  ]));
  assert.deepEqual([...selected], [["LICENSE", "safe\n"]]);
  assert.throws(
    () => selectDefaultStaticFiles(new Map([["unexpected.txt", 'const id = "Advertising";\n']])),
    /Forbidden default rule reference/u,
  );
  assert.throws(
    () => selectDefaultStaticFiles(new Map([[
      "unknown/examples/legacy.conf",
      "RULE-SET,Advertising,REJECT\n",
    ]])),
    /Forbidden default rule reference/u,
  );
});

test("verifies legacy current defaults and a separately tracked optional snapshot", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-trees-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await writeFiles(join(publicDirectory, "current"), artifacts.defaults);
  await writeFiles(publicDirectory, artifacts.optionalPacks.get("adblock-full"));

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), true);
  await writeFile(join(publicDirectory, "optional/adblock-full/surge/rules/Advertising.list"), "tampered\n");
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...artifacts }), false);

  const noOptionalRoot = await mkdtemp(join(tmpdir(), "apple-proxy-check-default-only-"));
  const noOptionalPublic = join(noOptionalRoot, "public");
  await writeFiles(join(noOptionalPublic, "current"), artifacts.defaults);
  assert.equal(await verifyTrackedPublications({ publicDirectory: noOptionalPublic, ...artifacts }), true);
});

test("verifies a hybrid current from independently promoted clients", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-check-hybrid-"));
  const publicDirectory = join(root, "public");
  const baseline = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const candidate = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream: nextUpstream });
  await writeFiles(join(publicDirectory, "current"), baseline.defaults);
  await publishEdgeRelease({
    publicDirectory,
    defaults: candidate.defaults,
    optionalPacks: candidate.optionalPacks,
    manifest: candidate.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: candidate.diagnostics.defaultManifest.clients.singbox.manifestHash,
  });

  assert.equal(await verifyTrackedPublications({ publicDirectory, ...baseline }), true);
  const optionalDirectory = join(publicDirectory, "optional/adblock-full/current/sing-box");
  const deleted = `${optionalDirectory}.deleted`;
  const { rename } = await import("node:fs/promises");
  await rename(optionalDirectory, deleted);
  assert.equal(await verifyTrackedPublications({ publicDirectory, ...baseline }), false);
});

test("promotes exact tested client bytes without changing other clients", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  await mkdir(join(publicDirectory, "current/sing-box"), { recursive: true });
  await mkdir(join(publicDirectory, "current/surge"), { recursive: true });
  await mkdir(join(publicDirectory, "optional/adblock-full/current/sing-box"), { recursive: true });
  await writeFile(join(publicDirectory, "current/sing-box/old.txt"), "old\n");
  await writeFile(join(publicDirectory, "current/surge/keep.txt"), "keep\n");
  await writeFile(join(publicDirectory, "optional/adblock-full/current/sing-box/old.txt"), "old optional\n");

  await promoteClientRelease({ publicDirectory, client: "singbox", manifestHash: hash });

  assert.deepEqual(
    await readFile(join(publicDirectory, "current/sing-box/rules/ChinaIP.json")),
    Buffer.from(artifacts.defaults.get("sing-box/rules/ChinaIP.json")),
  );
  assert.equal(await readFile(join(publicDirectory, "previous/sing-box/old.txt"), "utf8"), "old\n");
  assert.equal(await readFile(join(publicDirectory, "current/surge/keep.txt"), "utf8"), "keep\n");
  assert.deepEqual(
    await readFile(join(publicDirectory, "optional/adblock-full/current/sing-box/rules/Advertising.json")),
    Buffer.from(artifacts.optionalPacks.get("adblock-full").get("optional/adblock-full/sing-box/rules/Advertising.json")),
  );
  assert.equal(
    await readFile(join(publicDirectory, "optional/adblock-full/previous/sing-box/old.txt"), "utf8"),
    "old optional\n",
  );
  const rollout = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  assert.equal(rollout.clients.singbox, hash);
  assert.equal(rollout.clients.surge, null);
  assert.equal(
    rollout.optionalPacks["adblock-full"].singbox,
    artifacts.diagnostics.optionalManifests["adblock-full"].clients.singbox.manifestHash,
  );
});

test("promotes and rolls back optional bytes independently per client", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-optional-clients-"));
  const publicDirectory = join(root, "public");
  const first = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  await publishEdgeRelease({
    publicDirectory,
    defaults: first.defaults,
    optionalPacks: first.optionalPacks,
    manifest: first.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "surge",
    manifestHash: first.diagnostics.defaultManifest.clients.surge.manifestHash,
  });
  const surgeBefore = await readFile(join(
    publicDirectory,
    "optional/adblock-full/current/surge/rules/Advertising.list",
  ));

  const second = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream: nextUpstream });
  await publishEdgeRelease({
    publicDirectory,
    defaults: second.defaults,
    optionalPacks: second.optionalPacks,
    manifest: second.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: second.diagnostics.defaultManifest.clients.singbox.manifestHash,
  });

  assert.deepEqual(await readFile(join(
    publicDirectory,
    "optional/adblock-full/current/surge/rules/Advertising.list",
  )), surgeBefore);
  const rollout = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  assert.equal(
    rollout.optionalPacks["adblock-full"].surge,
    first.diagnostics.optionalManifests["adblock-full"].clients.surge.manifestHash,
  );
  assert.equal(
    rollout.optionalPacks["adblock-full"].singbox,
    second.diagnostics.optionalManifests["adblock-full"].clients.singbox.manifestHash,
  );

  await publishEdgeRelease({
    publicDirectory,
    defaults: first.defaults,
    optionalPacks: first.optionalPacks,
    manifest: first.diagnostics.defaultManifest,
  });
  await promoteClientRelease({
    publicDirectory,
    client: "singbox",
    manifestHash: first.diagnostics.defaultManifest.clients.singbox.manifestHash,
  });
  const rollback = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  assert.equal(
    rollback.previousOptionalPacks["adblock-full"].singbox,
    second.diagnostics.optionalManifests["adblock-full"].clients.singbox.manifestHash,
  );
  assert.equal(
    rollback.optionalPacks["adblock-full"].surge,
    first.diagnostics.optionalManifests["adblock-full"].clients.surge.manifestHash,
  );
});

test("rejects a tampered immutable manifest before touching current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-extra-"));
  const publicDirectory = join(root, "public");
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const hash = artifacts.diagnostics.defaultManifest.clients.singbox.manifestHash;
  await publishEdgeRelease({
    publicDirectory,
    defaults: artifacts.defaults,
    optionalPacks: artifacts.optionalPacks,
    manifest: artifacts.diagnostics.defaultManifest,
  });
  const immutable = join(publicDirectory, "edge/clients/singbox", hash);
  await mkdir(join(publicDirectory, "current/sing-box"), { recursive: true });
  const clientManifest = JSON.parse(await readFile(join(immutable, "client-manifest.json"), "utf8"));
  clientManifest.files = [];
  await writeFile(join(immutable, "client-manifest.json"), `${JSON.stringify(clientManifest)}\n`);
  await writeFile(join(publicDirectory, "current/sing-box/old.txt"), "old\n");

  await assert.rejects(
    () => promoteClientRelease({ publicDirectory, client: "singbox", manifestHash: hash }),
    /manifest hash/u,
  );
  assert.equal(await readFile(join(publicDirectory, "current/sing-box/old.txt"), "utf8"), "old\n");
});
