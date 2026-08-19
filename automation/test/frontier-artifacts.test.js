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

test("keeps binary static bytes intact for maintained frontier clients", () => {
  const bytes = Buffer.from([0, 1, 2, 255]);
  const files = buildFrontierArtifacts({
    ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    manifests: [{
      client: "singbox",
      platform: "macos",
      channel: "edge",
      upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
      schemaVersion: "singbox-profile-v1",
      ruleManifestSha256: "b".repeat(64),
      configSha256: "c".repeat(64),
      status: "candidate",
    }],
    staticFiles: new Map([["sing-box/scripts/config.bin", bytes]]),
  });
  assert.deepEqual(files.get("edge/sing-box/scripts/config.bin"), bytes);
});

test("rejects duplicate frontier platform candidates", () => {
  assert.throws(
    () => buildFrontierArtifacts({
      ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
      manifests: [record("surge", "macos", "edge"), record("surge", "macos", "edge")],
      staticFiles: new Map([["surge/index.html", "release\n"]]),
    }),
    /duplicate.*platform|platform.*duplicate/iu,
  );
});

test("allows the same frontier platform in independent channels", () => {
  const files = buildFrontierArtifacts({
    ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    manifests: [record("surge", "macos", "edge"), record("surge", "macos", "current")],
    staticFiles: new Map([["surge/index.html", "release\n"]]),
  });
  assert.ok(files.has("edge/surge/macos/manifest.json"));
  assert.ok(files.has("current/surge/macos/manifest.json"));
});

test("renders six-platform HAPP and OneXray candidates without duplicating native bytes", () => {
  const files = buildFrontierArtifacts({
    ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    manifests: [
      record("happ", "windows", "edge"),
      { ...record("onexray", "linux", "edge"), status: "candidate" },
    ],
    staticFiles: new Map([
      ["happ/index.html", "https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html\n"],
      ["onexray/index.html", "https://juan-nikola.github.io/apple-profiles/current/onexray/index.html\n"],
    ]),
  });
  assert.ok(files.has("edge/happ/windows/manifest.json"));
  assert.ok(files.has("edge/onexray-linux/manifest.json"));
  assert.match(files.get("edge/happ/index.html"), /\/edge\/happ\/index\.html/u);
  assert.match(files.get("edge/onexray/index.html"), /\/edge\/onexray\/index\.html/u);
});
