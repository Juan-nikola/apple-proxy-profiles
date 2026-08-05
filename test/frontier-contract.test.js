import assert from "node:assert/strict";
import test from "node:test";

import { CLIENT } from "../shared/contracts.js";
import { protocolSupportsClient } from "../shared/nodes/protocol-registry.js";
import {
  createFrontierManifest,
  validateFrontierManifest,
} from "../shared/release/frontier-manifest.js";

test("registers Surge and sing-box as distinct clients with explicit protocol support", () => {
  assert.equal(CLIENT.surge, "surge");
  assert.equal(CLIENT.singbox, "singbox");
  assert.equal(protocolSupportsClient("vless", CLIENT.surge), true);
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
