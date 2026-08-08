import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { buildClientArtifacts } from "../automation/src/build-artifacts.js";
import { lightweightFixtureSnapshots } from "../automation/test/lightweight-fixture.js";
import {
  loadCompiledSingBoxRules,
  stageSingBoxAuditArtifacts,
} from "../scripts/stage-rule-artifacts.mjs";
import { ruleClientCatalog } from "../shared/rules/lightweight-policy.js";

const upstream = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "e".repeat(40),
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

test("stages only deterministic sing-box audit inputs with a closed manifest", async () => {
  const artifacts = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const root = await mkdtemp(join(tmpdir(), "sing-box-stage-"));
  const result = await stageSingBoxAuditArtifacts({ artifacts, outputRoot: root });
  assert.equal(result.upstream.commit, upstream.commit);
  assert.equal(result.files.length, ruleClientCatalog({ adblockMode: "off" }).length + 2);
  assert.deepEqual(result.files.map(({ path }) => path), [...result.files.map(({ path }) => path)].sort());
  for (const record of result.files) {
    assert.match(record.path, /^(?:optional\/adblock-full\/)?audit\/sing-box\/rules\/[A-Za-z0-9_]+\.json$/u);
    assert.equal((await readFile(join(root, record.path))).length, record.bytes);
    assert.match(record.sha256, /^[0-9a-f]{64}$/u);
  }
  assert.deepEqual(JSON.parse(await readFile(join(root, "stage-manifest.json"), "utf8")), result);
});

test("loads a closed set of non-empty official SRS outputs", async () => {
  const root = await mkdtemp(join(tmpdir(), "sing-box-compiled-"));
  const expected = [
    ...ruleClientCatalog({ adblockMode: "off" }).map(({ id }) => `sing-box/rule-sets/${id}.srs`),
    "optional/adblock-full/sing-box/Advertising.srs",
    "optional/adblock-full/sing-box/Advertising_Domain.srs",
  ].sort();
  for (const [index, path] of expected.entries()) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), Buffer.concat([Buffer.from([0x53, 0x52, 0x53, 0x02]), Buffer.alloc(13, index + 1)]));
  }
  const loaded = await loadCompiledSingBoxRules(root);
  assert.deepEqual([...loaded.keys()], expected);
  await writeFile(join(root, "sing-box/rule-sets/unexpected.srs"), Buffer.alloc(17));
  await assert.rejects(() => loadCompiledSingBoxRules(root), /unexpected/u);
});
