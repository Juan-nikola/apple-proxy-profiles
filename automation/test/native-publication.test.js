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

test("builds native clients and shared region GeoData into the closed default publication", () => {
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
    "v2rayn/scripts/substore-node-generator.js",
    "v2rayn/scripts/substore-config-generator.js",
    "v2box/scripts/substore-node-generator.js",
    "v2box/scripts/substore-config-generator.js",
    "clash/scripts/clash-node-generator.js",
    "clash/scripts/substore-node-generator.js",
    "clash/scripts/clash-profile-generator.js",
    "clash/scripts/substore-profile-generator.js",
    "v2rayn/client-manifest.json",
    "v2box/client-manifest.json",
  ]) {
    assert.equal(result.defaults.has(path), true, path);
  }
  for (const region of ["cn", "global", "ru", "ir"]) {
    assert.equal(result.defaults.has(`geodata/${region}/manifest.json`), true, region);
  }
  assert.equal(result.diagnostics.defaultManifest.clients.happ !== undefined, true);
  assert.equal(result.diagnostics.defaultManifest.clients.onexray !== undefined, true);
  assert.equal(result.diagnostics.defaultManifest.clients.clash !== undefined, true);
  for (const client of ["v2rayn", "v2box"]) {
    const manifest = JSON.parse(result.defaults.get(`${client}/client-manifest.json`));
    assert.equal(manifest.files.some(({ path }) => path.startsWith("geodata/")), false, client);
      assert.equal(manifest.sharedAssets.length, 12, client);
      for (const record of manifest.sharedAssets) {
        assert.match(record.path, /^geodata\/(?:cn|global|ru|ir)\//u, record.path);
        assert.equal(result.defaults.has(record.path), true, record.path);
        assert.equal(result.defaults.get(record.path).byteLength, record.bytes, record.path);
        if (record.path.endsWith(".dat")) assert.ok(record.bytes > 0, record.path);
      }
  }
  assert.match(result.defaults.get("onexray/index.html").toString("utf8"), /credential-free|无凭据/u);
});
