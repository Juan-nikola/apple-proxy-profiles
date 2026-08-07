import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { canonicalJson } from "../automation/src/render-anywhere-rules.js";
import {
  parseUpdateRulesArguments,
  promoteClientRelease,
} from "../scripts/update-rules.mjs";

function signedClientManifest(files) {
  const base = {
    schemaVersion: 1,
    client: "singbox",
    generatedAt: "2026-08-01T00:00:00Z",
    files,
  };
  return {
    ...base,
    manifestHash: createHash("sha256").update(canonicalJson(base)).digest("hex"),
  };
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

test("promotes exact tested client bytes without changing other clients", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-"));
  const publicDirectory = join(root, "public");
  const binary = Buffer.from([0xd9, 0x9d, 0x73, 0x72]);
  const clientManifest = signedClientManifest([{
    path: "sing-box/rules.srs",
    bytes: binary.byteLength,
    sha256: createHash("sha256").update(binary).digest("hex"),
  }]);
  const hash = clientManifest.manifestHash;
  await mkdir(join(publicDirectory, "edge/clients/singbox", hash, "sing-box"), { recursive: true });
  await mkdir(join(publicDirectory, "current/sing-box"), { recursive: true });
  await mkdir(join(publicDirectory, "current/surge"), { recursive: true });
  await writeFile(join(publicDirectory, "edge/clients/singbox", hash, "sing-box/rules.srs"), binary);
  await writeFile(join(publicDirectory, "edge/clients/singbox", hash, "client-manifest.json"), canonicalJson(clientManifest));
  await writeFile(join(publicDirectory, "current/sing-box/old.txt"), "old\n");
  await writeFile(join(publicDirectory, "current/surge/keep.txt"), "keep\n");

  await promoteClientRelease({ publicDirectory, client: "singbox", manifestHash: hash });

  assert.deepEqual(await readFile(join(publicDirectory, "current/sing-box/rules.srs")), Buffer.from([0xd9, 0x9d, 0x73, 0x72]));
  assert.equal(await readFile(join(publicDirectory, "previous/sing-box/old.txt"), "utf8"), "old\n");
  assert.equal(await readFile(join(publicDirectory, "current/surge/keep.txt"), "utf8"), "keep\n");
  const rollout = JSON.parse(await readFile(join(publicDirectory, "rollout.json"), "utf8"));
  assert.equal(rollout.clients.singbox, hash);
  assert.equal(rollout.clients.surge, null);
});

test("rejects a tampered immutable manifest before touching current", async () => {
  const root = await mkdtemp(join(tmpdir(), "apple-proxy-promote-extra-"));
  const publicDirectory = join(root, "public");
  const binary = Buffer.from([0xd9, 0x9d, 0x73, 0x72]);
  const validManifest = signedClientManifest([{
    path: "sing-box/rules.srs",
    bytes: binary.byteLength,
    sha256: createHash("sha256").update(binary).digest("hex"),
  }]);
  const hash = validManifest.manifestHash;
  const immutable = join(publicDirectory, "edge/clients/singbox", hash);
  await mkdir(join(immutable, "sing-box"), { recursive: true });
  await mkdir(join(publicDirectory, "current/sing-box"), { recursive: true });
  await writeFile(join(immutable, "sing-box/rules.srs"), binary);
  await writeFile(join(immutable, "sing-box/unmanifested.txt"), "injected\n");
  const injected = Buffer.from("injected\n");
  await writeFile(join(immutable, "client-manifest.json"), canonicalJson({
    ...validManifest,
    files: [...validManifest.files, {
      path: "sing-box/unmanifested.txt",
      bytes: injected.byteLength,
      sha256: createHash("sha256").update(injected).digest("hex"),
    }],
  }));
  await writeFile(join(publicDirectory, "current/sing-box/old.txt"), "old\n");

  await assert.rejects(
    () => promoteClientRelease({ publicDirectory, client: "singbox", manifestHash: hash }),
    /manifest hash/u,
  );
  assert.equal(await readFile(join(publicDirectory, "current/sing-box/old.txt"), "utf8"), "old\n");
});
