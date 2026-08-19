import assert from "node:assert/strict";
import test from "node:test";

import { buildClientArtifacts } from "../src/build-artifacts.js";
import { lightweightFixtureSnapshots } from "./lightweight-fixture.js";

const upstream = {
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc",
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
};

test("builds HAPP and OneXray native assets into the closed default publication", () => {
  const result = buildClientArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    channel: "edge",
    additionalFiles: new Map([
      ["happ/scripts/happ-config-generator.js", Buffer.from("happ fixture")],
      ["onexray/scripts/onexray-profile-generator.js", Buffer.from("onexray fixture")],
    ]),
  });

  for (const path of [
    "happ/geosite.dat",
    "happ/geoip.dat",
    "onexray/geodata/geosite.dat",
    "onexray/geodata/geoip.dat",
    "onexray/geodata/manifest.json",
    "onexray/index.html",
    "happ/client-manifest.json",
    "onexray/client-manifest.json",
  ]) {
    assert.equal(result.defaults.has(path), true, path);
  }
  assert.equal(result.diagnostics.defaultManifest.clients.happ !== undefined, true);
  assert.equal(result.diagnostics.defaultManifest.clients.onexray !== undefined, true);
  assert.match(result.defaults.get("onexray/index.html").toString("utf8"), /credential-free|无凭据/u);
});
