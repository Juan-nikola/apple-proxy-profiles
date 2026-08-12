import assert from "node:assert/strict";
import test from "node:test";

import { CLIENT } from "../shared/contracts.js";
import { protocolSupportsClient } from "../shared/nodes/protocol-registry.js";
import {
  createOneXrayFrontierCandidates,
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
    platform: "openwrt",
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
  assert.equal(manifest.platformKey, "singbox/openwrt");
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

test("fans one sanitized OneXray contract out to six independent platform candidates", () => {
  assert.deepEqual(FRONTIER_PLATFORMS.onexray, ["macos", "iphone", "ipad", "android", "windows", "linux"]);
  const candidates = createOneXrayFrontierCandidates({
    channel: "edge",
    upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
    ruleManifestSha256: "b".repeat(64),
    profileSha256: "c".repeat(64),
  });
  assert.deepEqual(candidates.map(({ platformKey }) => platformKey), [
    "onexray-macos", "onexray-iphone", "onexray-ipad", "onexray-android", "onexray-windows", "onexray-linux",
  ]);
  assert.equal(new Set(candidates.map(({ configSha256 }) => configSha256)).size, 1);
  assert.equal(new Set(candidates.map(({ ruleManifestSha256 }) => ruleManifestSha256)).size, 1);
  assert.deepEqual(candidates.map(({ status }) => status), Array(6).fill("candidate"));

  const varied = createOneXrayFrontierCandidates({
    channel: "edge",
    upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
    ruleManifestSha256: "b".repeat(64),
    profileSha256: "c".repeat(64),
    states: {
      macos: { status: "validated", verifiedAt: "2026-08-06T00:00:00Z", canary: { vpn: "passed" } },
    },
  });
  assert.equal(varied[0].status, "validated");
  assert.equal(varied[0].verifiedAt, "2026-08-06T00:00:00Z");
  assert.deepEqual(varied[0].canary, { vpn: "passed" });
  assert.equal(varied[1].status, "candidate");
  assert.throws(() => { varied[0].canary.vpn = "PASSWORD=supersecret"; }, TypeError);
});

test("rejects deeply nested OneXray canary secrets", () => {
  assert.throws(
    () => createOneXrayFrontierCandidates({
      channel: "edge",
      upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
      ruleManifestSha256: "b".repeat(64),
      profileSha256: "c".repeat(64),
      states: { macos: { canary: { first: { second: { value: "PASSWORD=supersecret" } } } } },
    }),
    /deeply nested|secret-shaped/iu,
  );
});

test("does not allow a platform canary state to override the shared OneXray contract", () => {
  assert.throws(
    () => createOneXrayFrontierCandidates({
      channel: "edge",
      upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
      ruleManifestSha256: "b".repeat(64),
      profileSha256: "c".repeat(64),
      states: {
        macos: {
          status: "validated",
          channel: "current",
          upstream: { branch: "evil", commit: "d".repeat(40), fetchedAt: "2026-08-06T00:00:00Z" },
        },
      },
    }),
    /unsupported|state|shared/iu,
  );
});

test("rejects a frontier manifest whose platform key does not match its identity", () => {
  const manifest = createFrontierManifest({
    client: "onexray",
    platform: "macos",
    channel: "edge",
    upstream: { branch: "master", commit: "a".repeat(40), fetchedAt: "2026-08-05T00:00:00Z" },
    schemaVersion: "onexray-profile-v1",
    ruleManifestSha256: "b".repeat(64),
    configSha256: "c".repeat(64),
    status: "candidate",
  });
  assert.equal(validateFrontierManifest({ ...manifest, platformKey: "onexray-iphone" }), false);
});
