import assert from "node:assert/strict";
import test from "node:test";

import { buildClientArtifacts } from "../src/build-artifacts.js";

const upstream = {
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc",
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
};
const source = {
  id: "Fixture", familyId: "Fixture", componentId: "rules", order: 1, priority: 10,
  canonicalPath: "rule/Surge/Fixture/Fixture.list", inputFormat: "RULE-SET", policy: "DIRECT",
  routing: 1, intendedTarget: "direct", minEntries: 1,
};

test("fans one immutable input out to all three native clients and one closed manifest", () => {
  const text = "DOMAIN-SUFFIX,example.com\nDOMAIN,only.example\n";
  const snapshot = new Map([["Fixture", {
    text,
    rawUrl: "https://raw.githubusercontent.com/example",
    sourceBytes: Buffer.byteLength(text),
    sourceSha256: "a".repeat(64),
  }]]);
  const result = buildClientArtifacts({ snapshot, catalog: [source], upstream });
  assert.equal(result.files.has("shadowrocket/rules/Fixture.list"), true);
  assert.equal(result.files.has("surge/rules/Fixture.list"), true);
  assert.equal(result.files.has("egern/rules/Fixture.yaml"), true);
  assert.equal(result.files.has("sing-box/rules/Fixture.json"), true);
  assert.equal(result.files.has("anywhere/rules/Fixture-001.arrs"), true);
  assert.equal(result.files.has("manifest.json"), true);
  assert.equal(result.manifest.files.length, 6);
  assert.deepEqual(result.manifest.clients.shadowrocket.sources[0], {
    id: "Fixture", input: 2, parsed: 2, output: 2, omitted: 0,
  });
  assert.equal(result.manifest.clients.surge.sources[0].output, 2);
  assert.equal(result.manifest.clients.egern.sources[0].output, 2);
  assert.equal(result.manifest.clients.singbox.sources[0].output, 2);
  assert.equal(result.manifest.clients.anywhere.outputCount, 1);
});

test("is byte deterministic for the same snapshot", () => {
  const text = "DOMAIN-KEYWORD,fixture\n";
  const snapshot = new Map([["Fixture", {
    text, rawUrl: "https://raw.githubusercontent.com/example", sourceBytes: Buffer.byteLength(text), sourceSha256: "b".repeat(64),
  }]]);
  const options = { snapshot, catalog: [source], upstream };
  assert.deepEqual([...buildClientArtifacts(options).files], [...buildClientArtifacts(options).files]);
});
