import assert from "node:assert/strict";
import test from "node:test";

import {
  parsePrivatePolicy,
  policyRevisionForChannel,
  resolvePrivatePolicy,
} from "../shared/policies/private-policy.js";
import { defaultUnifiedPolicyTargets } from "../shared/policies/unified-policy.js";

const TARGET_IDS = [
  "ai", "github", "youtube", "overseasMedia", "globalSocial", "overseasGame",
  "domesticCore", "domesticPlatform", "chinaIp", "apple", "microsoft", "download",
];

const defaults = {
  targets: Object.fromEntries(TARGET_IDS.map((id) => [id, ["ai", "github", "youtube", "overseasMedia", "globalSocial", "overseasGame"].includes(id) ? "FOLLOW" : "DIRECT"])),
  dns: { chinaDns: "alidns", globalDns: "cloudflare" },
  adblockMode: "off",
  clientChain: { mode: "off" },
};

function policyObject(overrides = {}) {
  return {
    schemaVersion: 1,
    channels: Object.fromEntries(["edge", "current", "previous"].map((channel) => [channel, {
      revision: `${channel}-2026-08-18-a`,
      defaults: structuredClone(defaults),
      clients: { surge: {}, v2box: {} },
      ...(overrides[channel] ?? {}),
    }])),
  };
}

function policyText(overrides = {}) {
  return JSON.stringify(policyObject(overrides));
}

function clientLayer(ai) {
  return {
    schemaVersion: 2,
    targets: { ...defaultUnifiedPolicyTargets(), ai },
  };
}

function assertRejectedWithoutSecret(text, pattern = /policy|invalid|unsupported|unknown|target|channel|revision/iu) {
  const secret = "TEST_ONLY_SECRET_SENTINEL";
  assert.throws(
    () => parsePrivatePolicy(text),
    (error) => !error.message.includes(secret) && pattern.test(error.message),
  );
}

test("parses complete independent edge/current/previous snapshots and deep-freezes them", () => {
  const policy = parsePrivatePolicy(policyText());
  assert.deepEqual(Object.keys(policy.channels), ["edge", "current", "previous"]);
  for (const channel of ["edge", "current", "previous"]) {
    assert.deepEqual(policy.channels[channel].defaults, defaults);
    if (channel !== "edge") assert.notEqual(policy.channels[channel].defaults, policy.channels.edge.defaults);
    assert.equal(Object.isFrozen(policy.channels[channel]), true);
    assert.equal(Object.isFrozen(policy.channels[channel].defaults), true);
    assert.equal(Object.isFrozen(policy.channels[channel].defaults.targets), true);
  }
  assert.equal(Object.isFrozen(policy), true);
  assert.throws(() => { policy.channels.edge.defaults.targets.ai = "DIRECT"; }, TypeError);
});

test("merges defaults before a client override without mutating the policy", () => {
  const policy = parsePrivatePolicy(policyText({
    edge: {
      surge: {
        targets: { github: "NODE:Tokyo-01" },
        dns: { globalDns: "google" },
        adblockMode: "full",
        clientChain: { mode: "on", target: "NODE:Entry-01" },
      },
    },
  }));
  const resolved = resolvePrivatePolicy({ policy, channel: "edge", client: "surge" });
  assert.deepEqual(resolved, {
    targets: { ...defaults.targets, github: "NODE:Tokyo-01" },
    dns: { chinaDns: "alidns", globalDns: "google" },
    adblockMode: "full",
    clientChain: { mode: "on", target: "NODE:Entry-01" },
  });
  assert.equal(Object.isFrozen(resolved), true);
  assert.equal(Object.isFrozen(resolved.targets), true);
  assert.equal(Object.isFrozen(resolved.dns), true);
  assert.equal(Object.isFrozen(resolved.clientChain), true);
  assert.equal(policy.channels.edge.defaults.dns.globalDns, "cloudflare");
  assert.equal(policy.channels.edge.defaults.targets.github, "FOLLOW");
});

test("rejects missing channels, revisions, unknown keys, and invalid values", () => {
  for (const channel of ["edge", "current", "previous"]) {
    const missing = policyObject();
    delete missing.channels[channel];
    assertRejectedWithoutSecret(JSON.stringify(missing), /channel|required/iu);
  }
  assertRejectedWithoutSecret(policyText({ edge: { revision: "" } }), /revision/iu);
  assertRejectedWithoutSecret(policyText({ edge: { unknown: true } }), /unknown|unsupported/iu);
  assertRejectedWithoutSecret(policyText({ edge: { defaults: { ...structuredClone(defaults), extra: true } } }), /unknown|unsupported/iu);
  assertRejectedWithoutSecret(policyText({ edge: { defaults: { ...structuredClone(defaults), dns: { chinaDns: "invalid", globalDns: "cloudflare" } } } }), /dns|invalid/iu);
  assertRejectedWithoutSecret(policyText({ edge: { defaults: { ...structuredClone(defaults), adblockMode: "balanced" } } }), /adblock|invalid/iu);
  assertRejectedWithoutSecret(policyText({ edge: { defaults: { ...structuredClone(defaults), targets: { ...defaults.targets, unknown: "DIRECT" } } } }), /target|unknown/iu);
  assertRejectedWithoutSecret(policyText({ edge: { defaults: { ...structuredClone(defaults), targets: { ...defaults.targets, github: "NODE:" } } } }), /target/iu);
  assertRejectedWithoutSecret(policyText({ edge: { defaults: { ...structuredClone(defaults), clientChain: { mode: "on" } } } }), /chain|target/iu);
});

test("rejects duplicate keys and protected security or privacy overrides", () => {
  const duplicate = policyText().replace('"revision":"edge-2026-08-18-a"', '"revision":"edge-2026-08-18-a","revision":"edge-2026-08-18-b"');
  assertRejectedWithoutSecret(duplicate, /duplicate|json/iu);
  for (const key of ["security", "privacy", "httpdns", "internalTraffic"]) {
    const value = policyObject();
    value.channels.edge.clients.surge[key] = "DIRECT";
    assertRejectedWithoutSecret(JSON.stringify(value), /unsupported|security|privacy|override/iu);
  }
});

test("rejects secret-shaped fields and values without echoing them in errors", () => {
  for (const [key, value] of [
    ["uuid", "TEST_ONLY_SECRET_SENTINEL"],
    ["password", "TEST_ONLY_SECRET_SENTINEL"],
    ["subscriptionUrl", "https://example.invalid/TEST_ONLY_SECRET_SENTINEL"],
    ["uri", ["vless", "://", "TEST_ONLY_SECRET_SENTINEL", "@example.invalid"].join("")],
  ]) {
    const valueObject = policyObject();
    valueObject.channels.edge.clients.surge[key] = value;
    assertRejectedWithoutSecret(JSON.stringify(valueObject), /secret|unsupported|policy/iu);
  }
});

test("selects each client layer from unified policy schema v3", () => {
  const policy = parsePrivatePolicy(JSON.stringify({
    schemaVersion: 3,
    clients: {
      anywhere: clientLayer("NODE~🇺🇸qqpw家宽|vless"),
      egern: clientLayer("NODE~🇺🇸qqpw家宽|vless"),
      shadowrocket: clientLayer("NODE~🇺🇸qqpw家宽|vless"),
      surge: clientLayer("FOLLOW"),
      "sing-box": clientLayer("NODE~🇺🇸qqpw家宽|vless"),
      happ: clientLayer("NODE~🇺🇸qqpw家宽|vless"),
      v2rayn: clientLayer("NODE~🇺🇸qqpw家宽|vless"),
      v2box: clientLayer("NODE~🇺🇸qqpw家宽|vless"),
      clash: clientLayer("NODE~🇺🇸qqpw家宽|vless"),
      incy: clientLayer("NODE~🇺🇸qqpw家宽|vless"),
    },
  }));

  assert.equal(policy.schemaVersion, 3);
  assert.equal(policy.clients.singbox.targets.ai, "NODE~🇺🇸qqpw家宽|vless");
  assert.equal(resolvePrivatePolicy({ policy, channel: "current", client: "surge" }).targets.ai, "FOLLOW");
  assert.equal(resolvePrivatePolicy({ policy, channel: "current", client: "singbox" }).targets.ai, "NODE~🇺🇸qqpw家宽|vless");
  assert.equal(policyRevisionForChannel(policy, "current"), "schema-3");
});

test("requires every unified policy v3 client layer to be complete and unique", () => {
  const base = {
    schemaVersion: 3,
    clients: Object.fromEntries([
      ["anywhere", clientLayer("NODE~🇺🇸qqpw家宽|vless")],
      ["egern", clientLayer("NODE~🇺🇸qqpw家宽|vless")],
      ["shadowrocket", clientLayer("NODE~🇺🇸qqpw家宽|vless")],
      ["surge", clientLayer("FOLLOW")],
      ["sing-box", clientLayer("NODE~🇺🇸qqpw家宽|vless")],
      ["happ", clientLayer("NODE~🇺🇸qqpw家宽|vless")],
      ["v2rayn", clientLayer("NODE~🇺🇸qqpw家宽|vless")],
      ["v2box", clientLayer("NODE~🇺🇸qqpw家宽|vless")],
      ["clash", clientLayer("NODE~🇺🇸qqpw家宽|vless")],
      ["incy", clientLayer("NODE~🇺🇸qqpw家宽|vless")],
    ]),
  };

  const incomplete = structuredClone(base);
  delete incomplete.clients.surge.targets.final;
  assertRejectedWithoutSecret(JSON.stringify(incomplete), /incomplete|business target/iu);

  const duplicateAlias = structuredClone(base);
  duplicateAlias.clients.singbox = duplicateAlias.clients["sing-box"];
  assertRejectedWithoutSecret(JSON.stringify(duplicateAlias), /conflicting|client/iu);

  const missingClient = structuredClone(base);
  delete missingClient.clients.anywhere;
  assertRejectedWithoutSecret(JSON.stringify(missingClient), /missing|required|client/iu);
});
