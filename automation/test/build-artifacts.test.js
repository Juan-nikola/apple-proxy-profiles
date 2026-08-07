import assert from "node:assert/strict";
import test from "node:test";

import { buildClientArtifacts } from "../src/build-artifacts.js";
import { DEFAULT_RULE_SOURCE_IDS } from "../../shared/rules/lightweight-policy.js";
import { lightweightFixtureSnapshots } from "./lightweight-fixture.js";

const upstream = {
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc",
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
};
test("fans compiled lightweight defaults out without publishing input-only rules", () => {
  const result = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  assert.equal(result.defaults.has("shadowrocket/rules/DomesticCore.list"), true);
  assert.equal(result.defaults.has("surge/rules/OverseasGame.list"), true);
  assert.equal(result.defaults.has("egern/rules/ChinaIP.yaml"), true);
  assert.equal(result.defaults.has("sing-box/rules/ChinaIP.json"), true);
  assert.equal(result.defaults.has("anywhere/rules/DomesticCore-001.arrs"), true);
  assert.equal(result.defaults.has("manifest.json"), true);
  assert.equal(result.defaults.has("shadowrocket/rules/Advertising.list"), false);
  assert.equal(result.defaults.has("shadowrocket/rules/ChinaMax_Domain.list"), false);
  assert.deepEqual(result.diagnostics.defaultRuleIds, DEFAULT_RULE_SOURCE_IDS);
  assert.deepEqual([...result.optionalPacks.keys()], ["adblock-full"]);
  const chinaIp = result.defaults.get("surge/rules/ChinaIP.list");
  assert.match(chinaIp, /IP-CIDR,1\.0\.1\.0\/24,no-resolve/u);
  assert.match(chinaIp, /IP-CIDR6,2400:3200::\/32,no-resolve/u);
  assert.equal(chinaIp.includes("/25"), false);
  assert.equal(result.diagnostics.compaction.ChinaIP.removed, 2);
});

test("is byte deterministic for the same snapshot", () => {
  const options = { snapshot: lightweightFixtureSnapshots(), upstream };
  assert.deepEqual([...buildClientArtifacts(options).defaults], [...buildClientArtifacts(options).defaults]);
});
