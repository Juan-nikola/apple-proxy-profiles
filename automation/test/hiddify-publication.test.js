import assert from "node:assert/strict";
import test from "node:test";
import { buildClientArtifacts } from "../src/build-artifacts.js";
import { lightweightFixtureSnapshots } from "./lightweight-fixture.js";
import { DEFAULT_RULE_SOURCE_IDS, MOBILE_RULE_SOURCE_IDS } from "../../shared/rules/lightweight-policy.js";

const upstream = { repository: "https://github.com/blackmatrix7/ios_rule_script", branch: "master", commit: "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc", committedAt: "2026-08-01T19:07:21Z", license: "GPL-2.0-only" };

test("publishes Hiddify source rules readable by its bundled core without reusing version-5 SRS", () => {
  const result = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const desktop = [...result.defaults.keys()].filter(p => p.startsWith("hiddify/rules/"));
  assert.deepEqual(desktop.sort(), DEFAULT_RULE_SOURCE_IDS.map(id => `hiddify/rules/${id}.json`).sort());
  for (const id of DEFAULT_RULE_SOURCE_IDS) {
    const source = JSON.parse(result.defaults.get(`hiddify/rules/${id}.json`));
    const native = JSON.parse(result.defaults.get(`sing-box/rules/${id}.json`));
    assert.equal(source.version, 3);
    assert.deepEqual(source.rules, native.rules);
  }
  const mobile = [...result.defaults.keys()].filter(p => p.startsWith("hiddify/mobile-rules/"));
  assert.deepEqual(mobile.sort(), MOBILE_RULE_SOURCE_IDS.map(id => `hiddify/mobile-rules/${id}.json`).sort());
  const manifest = JSON.parse(result.defaults.get("hiddify/client-manifest.json"));
  for (const path of [...desktop, ...mobile]) assert.ok(manifest.files.some(file => file.path === path));
  assert.ok(result.diagnostics.defaultManifest.clients.hiddify.referencedDefaultBytes > 0);
});

test("isolates Hiddify full advertising rules in its optional publication", () => {
  const result = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  assert.equal(result.defaults.has("hiddify/rules/Advertising.json"), false);
  const optional = result.optionalPacks.get("adblock-full");
  const source = JSON.parse(optional.get("optional/adblock-full/hiddify/rules/Advertising.json"));
  assert.equal(source.version, 3);
  assert.ok(source.rules.length > 0);
  const optionalManifest = JSON.parse(optional.get("optional/adblock-full/hiddify/client-manifest.json"));
  assert.equal(optionalManifest.client, "hiddify");
  assert.ok(optionalManifest.files.some(file => file.path.endsWith("/Advertising.json")));
});


test("publishes an explicit Hiddify App import blocker and pending device acceptance", () => {
  const result = buildClientArtifacts({ snapshot: lightweightFixtureSnapshots(), upstream });
  const capabilities = result.defaults.get("hiddify/compatibility.json");
  assert.ok(capabilities, "A generated script alone does not prove App support");
  const report = JSON.parse(capabilities);
  assert.equal(report.appVersion, "4.1.1");
  assert.equal(report.appImportPreservesFullConfig, false);
  assert.equal(report.releaseReady, false);
  assert.equal(report.coreRawModeRequirement, "StartRequest.enable_raw_config=true");
  assert.deepEqual(Object.values(report.deviceAcceptance), Array(6).fill("pending"));
  const manifest = JSON.parse(result.defaults.get("hiddify/client-manifest.json"));
  assert.ok(manifest.files.some(file => file.path === "hiddify/compatibility.json"));
});
