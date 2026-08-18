import assert from "node:assert/strict";
import test from "node:test";

import { bindPrivateTask } from "../shared/release/private-task-binding.js";
import { parsePrivatePolicy } from "../shared/policies/private-policy.js";

const policy = parsePrivatePolicy(JSON.stringify({
  schemaVersion: 1,
  channels: Object.fromEntries(["edge", "current", "previous"].map((channel) => [channel, {
    revision: `${channel}-2026-08-18-a`,
    defaults: {
      targets: {
        ai: "FOLLOW", github: "FOLLOW", youtube: "FOLLOW", overseasMedia: "FOLLOW",
        globalSocial: "FOLLOW", overseasGame: "FOLLOW", domesticCore: "DIRECT",
        domesticPlatform: "DIRECT", chinaIp: "DIRECT", apple: "DIRECT", microsoft: "DIRECT",
        download: "DIRECT",
      },
      dns: { chinaDns: "alidns", globalDns: "cloudflare" },
      adblockMode: "off",
      clientChain: { mode: "off" },
    },
    happ: {},
    onexray: {},
  }])),
}));

const manifest = { client: "happ", manifestHash: "a".repeat(64) };
const geoDataSha256 = "b".repeat(64);

test("binds a policy-reading task to one channel and public evidence hashes", () => {
  const binding = bindPrivateTask({
    client: "happ",
    channel: "edge",
    policy,
    publicManifest: manifest,
    geoDataSha256,
    readsPolicy: true,
  });
  assert.deepEqual(binding, {
    client: "happ",
    channel: "edge",
    policyRevision: "edge-2026-08-18-a",
    publicClientManifestSha256: "a".repeat(64),
    geoDataSha256,
    readsPolicy: true,
  });
  assert.deepEqual(Object.keys(binding).sort(), [
    "channel", "client", "geoDataSha256", "policyRevision", "publicClientManifestSha256", "readsPolicy",
  ].sort());
  assert.equal(Object.isFrozen(binding), true);
});

test("binds node-only tasks without policy revision and rejects policy injection", () => {
  const binding = bindPrivateTask({
    client: "onexray",
    channel: "previous",
    publicManifest: { client: "onexray", manifestHash: "c".repeat(64) },
    geoDataSha256: "d".repeat(64),
    readsPolicy: false,
  });
  assert.deepEqual(binding, {
    client: "onexray",
    channel: "previous",
    policyRevision: null,
    publicClientManifestSha256: "c".repeat(64),
    geoDataSha256: "d".repeat(64),
    readsPolicy: false,
  });
  assert.throws(() => bindPrivateTask({
    client: "onexray",
    channel: "previous",
    policy,
    publicManifest: { client: "onexray", manifestHash: "c".repeat(64) },
    geoDataSha256: "d".repeat(64),
    readsPolicy: false,
  }), /policy|override|node-only/iu);
});

test("rejects channel, identity, revision and digest mismatches", () => {
  assert.throws(() => bindPrivateTask({
    client: "happ", channel: "beta", policy, publicManifest: manifest, geoDataSha256, readsPolicy: true,
  }), /channel/iu);
  assert.throws(() => bindPrivateTask({
    client: "onexray", channel: "edge", policy, publicManifest: manifest, geoDataSha256, readsPolicy: true,
  }), /client|identity/iu);
  for (const badHash of ["A".repeat(64), "a".repeat(63), "g".repeat(64), "a".repeat(65)]) {
    assert.throws(() => bindPrivateTask({
      client: "happ", channel: "edge", policy,
      publicManifest: { client: "happ", manifestHash: badHash }, geoDataSha256, readsPolicy: true,
    }), /sha|digest|manifest/iu);
  }
  assert.throws(() => bindPrivateTask({
    client: "happ", channel: "edge", policy,
    publicManifest: manifest, geoDataSha256: "A".repeat(64), readsPolicy: true,
  }), /sha|digest|geo/iu);
  assert.throws(() => bindPrivateTask({
    client: "happ", channel: "edge", policy,
    publicManifest: { client: "happ", manifestHash: "a".repeat(64), channel: "current" },
    geoDataSha256, readsPolicy: true,
  }), /channel/iu);
});

test("requires a non-empty revision for policy-reading tasks and does not leak secrets", () => {
  const malformedPolicy = structuredClone(policy);
  malformedPolicy.channels.edge.revision = "";
  const secret = "TEST_ONLY_SECRET_SENTINEL";
  assert.throws(
    () => bindPrivateTask({
      client: "happ", channel: "edge", policy: malformedPolicy,
      publicManifest: manifest, geoDataSha256, readsPolicy: true,
    }),
    (error) => !error.message.includes(secret) && /revision|policy/iu.test(error.message),
  );
  assert.throws(() => bindPrivateTask({
    client: "happ", channel: "edge", policy, publicManifest: manifest, geoDataSha256, readsPolicy: "true",
  }), /readsPolicy|boolean/iu);
});
