import assert from "node:assert/strict";
import test from "node:test";

import { buildFrontierArtifacts } from "../src/render-frontier-artifacts.js";

test("legacy frontier renderer is not part of current-only publication", () => {
  const files = buildFrontierArtifacts({
    ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    manifests: [{
      client: "surge",
      platform: "macos",
      channel: "current",
      upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
      schemaVersion: "surge-current-1",
      ruleManifestSha256: "b".repeat(64),
      configSha256: "c".repeat(64),
      status: "validated",
    }],
    staticFiles: new Map([["surge/index.html", "current\n"]]),
  });
  assert.ok(files.has("current/surge/macos/manifest.json"));
  assert.ok([...files.keys()].every((path) => !path.startsWith("edge/") && !path.startsWith("previous/") && !path.startsWith("versions/")));
});

test("rejects duplicate current candidates", () => {
  assert.throws(() => buildFrontierArtifacts({
    ruleBaseUrl: "https://juan-nikola.github.io/apple-proxy-profiles/current",
    manifests: [
      { client: "surge", platform: "macos", channel: "current", upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" }, schemaVersion: "x", ruleManifestSha256: "b".repeat(64), configSha256: "c".repeat(64), status: "validated" },
      { client: "surge", platform: "macos", channel: "current", upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" }, schemaVersion: "x", ruleManifestSha256: "b".repeat(64), configSha256: "c".repeat(64), status: "validated" },
    ],
    staticFiles: new Map([["surge/index.html", "current\n"]]),
  }), /duplicate.*platform/iu);
});
