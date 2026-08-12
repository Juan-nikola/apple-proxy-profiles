import assert from "node:assert/strict";
import test from "node:test";

import { buildFrontierArtifacts } from "../src/render-frontier-artifacts.js";

const record = (client, platform, channel) => ({
  client,
  platform,
  channel,
  upstream: { branch: client === "singbox" ? "testing" : "beta", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
  schemaVersion: `${client}-testing-1`,
  ruleManifestSha256: "b".repeat(64),
  configSha256: "c".repeat(64),
  status: "validated",
});

test("builds safe channel-scoped frontier files and rewrites public channel links", () => {
  const files = buildFrontierArtifacts({
    ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    manifests: [record("surge", "macos", "current"), record("singbox", "android", "edge")],
    staticFiles: new Map([
      ["surge/scripts/surge-profile-generator.js", "const url = '/current/surge/rules/Fixture.list';\n"],
      ["sing-box/scripts/sing-box-config-generator.js", "const url = '/current/sing-box/rules/Fixture.json';\n"],
    ]),
  });
  assert.equal(files.get("current/surge/scripts/surge-profile-generator.js"), "const url = '/current/surge/rules/Fixture.list';\n");
  assert.equal(files.get("edge/sing-box/scripts/sing-box-config-generator.js"), "const url = '/edge/sing-box/rules/Fixture.json';\n");
  assert.ok(files.has("current/surge/macos/manifest.json"));
  assert.ok(files.has("edge/singbox/android/manifest.json"));
  assert.ok(files.has("edge/frontier-manifest.json"));
  assert.equal(files.has("edge/manifest.json"), false);
  for (const path of files.keys()) assert.doesNotMatch(path, /(^|\/)(?:\.\.|\/)/u);
});

test("renders all six OneXray frontier candidates with one shared contract hash", () => {
  const manifests = ["macos", "iphone", "ipad", "android", "windows", "linux"].map((platform) => ({
    client: "onexray",
    platform,
    channel: "edge",
    upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
    schemaVersion: "onexray-profile-v1",
    ruleManifestSha256: "b".repeat(64),
    configSha256: "c".repeat(64),
    status: "candidate",
  }));
  const files = buildFrontierArtifacts({
    ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    manifests,
    staticFiles: new Map([
      ["onexray/index.html", "release onexray\n"],
      ["onexray/geodata/geosite.dat", "domain\n"],
      ["onexray/geodata/geoip.dat", "ip\n"],
      ["onexray/geodata/manifest.json", "manifest\n"],
    ]),
  });
  assert.ok(files.has("edge/onexray/index.html"));
  assert.ok(files.has("edge/onexray-macos/manifest.json"));
  assert.ok(files.has("edge/onexray-linux/manifest.json"));
  const frontier = JSON.parse(files.get("edge/frontier-manifest.json"));
  assert.deepEqual(frontier.records.map(({ platformKey }) => platformKey), [
    "onexray-macos", "onexray-iphone", "onexray-ipad", "onexray-android", "onexray-windows", "onexray-linux",
  ]);
  assert.equal(new Set(frontier.records.map(({ configSha256 }) => configSha256)).size, 1);
});

test("keeps OneXray binary GeoData bytes intact in frontier static artifacts", () => {
  const bytes = Buffer.from([0, 1, 2, 255]);
  const files = buildFrontierArtifacts({
    ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    manifests: [{
      client: "onexray",
      platform: "macos",
      channel: "edge",
      upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
      schemaVersion: "onexray-profile-v1",
      ruleManifestSha256: "b".repeat(64),
      configSha256: "c".repeat(64),
      status: "candidate",
    }],
    staticFiles: new Map([["onexray/geodata/geosite.dat", bytes]]),
  });
  assert.deepEqual(files.get("edge/onexray/geodata/geosite.dat"), bytes);
});

test("rejects duplicate frontier platform candidates", () => {
  assert.throws(
    () => buildFrontierArtifacts({
      ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
      manifests: [record("onexray", "macos", "edge"), record("onexray", "macos", "edge")],
      staticFiles: new Map([["onexray/index.html", "release\n"]]),
    }),
    /duplicate.*platform|platform.*duplicate/iu,
  );
});

test("allows the same frontier platform in independent channels", () => {
  const files = buildFrontierArtifacts({
    ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    manifests: [record("onexray", "macos", "edge"), record("onexray", "macos", "current")],
    staticFiles: new Map([["onexray/index.html", "release\n"]]),
  });
  assert.ok(files.has("edge/onexray-macos/manifest.json"));
  assert.ok(files.has("current/onexray-macos/manifest.json"));
});
