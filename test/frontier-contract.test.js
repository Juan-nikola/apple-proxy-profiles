import assert from "node:assert/strict";
import test from "node:test";

import { CLIENT } from "../shared/contracts.js";
import { clientAdapter } from "../shared/release/client-catalog.js";
import { protocolSupportsClient } from "../shared/nodes/protocol-registry.js";
import {
  createFrontierManifest,
  FRONTIER_PLATFORMS,
  validateFrontierManifest,
} from "../shared/release/frontier-manifest.js";

test("registers Surge and sing-box as distinct clients with explicit protocol support", () => {
  assert.equal(CLIENT.surge, "surge");
  assert.equal(CLIENT.singbox, "singbox");
  assert.equal(protocolSupportsClient("vless", CLIENT.surge), false);
  assert.equal(protocolSupportsClient("vless", CLIENT.singbox), true);
  assert.equal(protocolSupportsClient("ssr", CLIENT.singbox), false);
  assert.equal(protocolSupportsClient("snell", CLIENT.surge), true);
  assert.equal(protocolSupportsClient("snell", CLIENT.singbox), true);
});

test("frontier manifest records platform-specific upstream and rejects secret-shaped fields", () => {
  const input = {
    client: CLIENT.singbox,
    platform: "macos",
    channel: "edge",
    upstream: {
      branch: "testing",
      commit: "a".repeat(40),
      fetchedAt: "2026-08-05T00:00:00Z",
    },
    schemaVersion: "singbox-testing-1",
    ruleManifestSha256: "b".repeat(64),
    configSha256: "c".repeat(64),
    status: "validated",
  };
  const manifest = createFrontierManifest(input);
  assert.equal(manifest.platformKey, "singbox/macos");
  assert.equal(validateFrontierManifest(manifest), true);
  assert.equal(Object.hasOwn(manifest, "password"), false);
  assert.throws(
    () => createFrontierManifest({ ...input, configSha256: "password=secret" }),
    /sha256/iu,
  );
});

test("frontier manifest preserves failure details without reflecting node values", () => {
  const manifest = createFrontierManifest({
    client: CLIENT.surge,
    platform: "iphone",
    channel: "edge",
    upstream: {
      branch: "beta",
      commit: "d".repeat(40),
      fetchedAt: "2026-08-05T00:00:00Z",
    },
    schemaVersion: "surge-beta-1",
    ruleManifestSha256: "e".repeat(64),
    configSha256: "f".repeat(64),
    status: "rejected",
    failure: {
      stage: "validate",
      code: "unsupported-field",
      count: 2,
    },
  });
  assert.deepEqual(manifest.failure, {
    stage: "validate",
    code: "unsupported-field",
    count: 2,
  });
  assert.doesNotMatch(JSON.stringify(manifest), /198\.51\.100\.10|TEST_ONLY_PASSWORD/iu);
});

test("frontier platforms cover only maintained clients", () => {
  assert.deepEqual(FRONTIER_PLATFORMS, {
    surge: ["macos", "iphone", "ipad"],
    singbox: ["macos", "iphone", "ipad", "android"],
  });
});

test("frontier identity validation accepts registered planned clients but emits no renderer platforms", () => {
  assert.equal(clientAdapter(CLIENT.onexray).state, "planned");
  assert.equal(clientAdapter(CLIENT.happ).state, "planned");
  assert.throws(() => createFrontierManifest({
    client: CLIENT.happ,
    platform: "iphone",
    channel: "edge",
    upstream: { branch: "main", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
    schemaVersion: "happ-v4-planned",
    ruleManifestSha256: "b".repeat(64),
    configSha256: "c".repeat(64),
    status: "candidate",
  }), /unsupported frontier platform/i);
});

test("rejects a frontier manifest whose platform key does not match its identity", () => {
  const manifest = createFrontierManifest({
    client: CLIENT.surge,
    platform: "macos",
    channel: "edge",
    upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
    schemaVersion: "surge-profile-v1",
    ruleManifestSha256: "b".repeat(64),
    configSha256: "c".repeat(64),
    status: "candidate",
  });
  assert.equal(validateFrontierManifest({ ...manifest, platformKey: "surge/iphone" }), false);
});
