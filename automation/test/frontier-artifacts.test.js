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
    manifests: [record("surge", "macos", "current"), record("singbox", "android", "edge"), record("happ", "windows", "edge")],
    staticFiles: new Map([
      ["surge/scripts/surge-profile-generator.js", "const url = '/current/surge/rules/Fixture.list';\n"],
      ["sing-box/scripts/sing-box-config-generator.js", "const url = '/current/sing-box/rules/Fixture.json';\n"],
      ["happ/scripts/happ-config-generator.js", "const url = '/current/happ/geosite.dat';\n"],
    ]),
  });
  assert.equal(files.get("current/surge/scripts/surge-profile-generator.js"), "const url = '/current/surge/rules/Fixture.list';\n");
  assert.equal(files.get("edge/sing-box/scripts/sing-box-config-generator.js"), "const url = '/edge/sing-box/rules/Fixture.json';\n");
  assert.ok(files.has("current/surge/macos/manifest.json"));
  assert.ok(files.has("edge/singbox/android/manifest.json"));
  assert.ok(files.has("edge/happ/windows/manifest.json"));
  assert.equal(files.get("edge/happ/scripts/happ-config-generator.js"), "const url = '/edge/happ/geosite.dat';\n");
  assert.ok(files.has("edge/frontier-manifest.json"));
  assert.equal(files.has("edge/manifest.json"), false);
  for (const path of files.keys()) assert.doesNotMatch(path, /(^|\/)(?:\.\.|\/)/u);
});
