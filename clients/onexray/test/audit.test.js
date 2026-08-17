import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { BUSINESS_TARGETS } from "../../../shared/policies/business-targets.js";
import { canonicalProfileJson } from "../src/profile-codec.js";
import { renderOneXrayAudit } from "../src/render-audit.js";

const PROFILE = {
  name: "Apple Proxy · OneXray · edge",
  log: { loglevel: "warning" },
  dns: { servers: [{ tag: "dns-global", address: "https://cloudflare-dns.com/dns-query", skipFallback: true }] },
  routing: { domainStrategy: "IPIfNonMatch", rules: [{ type: "field", outboundTag: "direct" }] },
  inbounds: [],
  outbounds: [
    { protocol: "freedom", tag: "direct" },
    { protocol: "blackhole", tag: "block" },
    { protocol: "dns", tag: "dnsOut" },
  ],
};

function context(overrides = {}) {
  const options = {
    channel: "edge",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    clientChain: "off",
    clientChainTarget: "",
    ...overrides.options,
  };
  return {
    options,
    normalizedDiagnostics: { total: 3, accepted: 2, protocol: { vless: 1, vmess: 1 }, excluded: { "pseudo-node": 1 } },
    renderFailureProtocols: { snell: 1 },
    resolution: {
      targets: {
        ai: { configured: "FOLLOW", resolvedTag: "proxy", status: "follow" },
        github: { configured: "DIRECT", resolvedTag: "direct", status: "direct" },
      },
      fixedNodes: [],
      finalOutbound: null,
      chain: { enabled: false, entryCount: 1 },
    },
    profile: PROFILE,
    profileLink: "onexray://private-link-with-secret",
    ruleReleaseId: "edge-2026-08-12",
    geoHashes: { domain: "a".repeat(64), ip: "b".repeat(64) },
    ...overrides,
  };
}

test("renders deterministic Chinese credential-free audit allowlist", () => {
  const audit = JSON.parse(renderOneXrayAudit(context()));
  assert.deepEqual(audit.nodes, {
    normalization: {
      total: 3,
      accepted: 2,
      protocols: { vless: 1, vmess: 1 },
      excluded: { "pseudo-node": 1 },
    },
    renderFailures: {
      total: 1,
      protocols: { snell: 1 },
    },
  });
  assert.equal(Object.hasOwn(audit, "exclusionReasons"), false);
  assert.equal(audit.policy.businesses.length, BUSINESS_TARGETS.length);
  assert.deepEqual(audit.policy.businesses.slice(0, 2).map(({ id }) => id), ["ai", "github"]);
  assert.equal(audit.profile.ruleReleaseId, "edge-2026-08-12");
  assert.equal(audit.profile.geoData.domain, "a".repeat(64));
  assert.equal(audit.profile.deepLink.withinBudget, true);
  assert.match(audit.profile.fullHash, /^[a-f0-9]{64}$/u);
  assert.equal(audit.profile.fullHash, createHash("sha256").update(canonicalProfileJson(PROFILE)).digest("hex"));
  assert.match(audit.profile.shortVersion, /^[a-f0-9]{8}$/u);
  assert.equal(renderOneXrayAudit(context()), renderOneXrayAudit(context()));
});

test("does not serialize private node fields, policy input, Profile, or deep link", () => {
  const canaries = [
    "TEST_ONLY_AUDIT_PASSWORD",
    "TEST_ONLY_AUDIT_UUID",
    "TEST_ONLY_AUDIT_PSK",
    "TEST_ONLY_AUDIT_PRIVATE_KEY",
    "TEST_ONLY_AUDIT_PUBLIC_KEY",
    "https://private.example.invalid/sub?token=TEST_ONLY_AUDIT_TOKEN",
    "eyJmaXhlZCI6Ik5PREU6c2VjcmV0In0",
  ];
  const output = renderOneXrayAudit({
    ...context(),
    profile: {
      ...PROFILE,
      outbounds: [
        ...PROFILE.outbounds,
        {
          protocol: "vless",
          tag: "ap-fixed-secret",
          settings: { address: "secret.example.invalid", port: 443, id: canaries[1] },
          streamSettings: { network: "tcp", security: "reality", realitySettings: { publicKey: canaries[4] } },
        },
      ],
    },
    policyOverrides: canaries[6],
    privateNode: { password: canaries[0], psk: canaries[2], privateKey: canaries[3], publicKey: canaries[4] },
    profileLink: `onexray://onexray.com/config/add?data=${canaries[5]}`,
  });
  for (const canary of canaries) assert.equal(output.includes(canary), false, canary);
  assert.doesNotMatch(output, /(?:password|uuid|psk|private.?key|public.?key|subscription|policyOverrides|profileLink)/iu);
});

test("whitelists audit target fields and hashes fixed and landing display identities", () => {
  const secretName = "https://private.invalid/sub?token=TEST_ONLY_AUDIT_TARGET";
  const output = renderOneXrayAudit({
    ...context(),
    resolution: {
      ...context().resolution,
      targets: {
        ai: { configured: secretName, resolvedTag: secretName, status: "unexpected" },
        github: { configured: "NODE:fixed-secret", resolvedTag: "ap-fixed-secret", status: "fixed" },
      },
      fixedNodes: [{
        tag: "ap-fixed-secret",
        node: { name: "Fixed Secret", type: "vless", _profile: { chained: false } },
      }],
      finalOutbound: {
        tag: "chainProxy",
        node: { name: "Landing Secret", type: "vless", _profile: { chained: false } },
      },
      chain: { enabled: true, entryCount: 2 },
    },
  });
  const audit = JSON.parse(output);
  const ai = audit.policy.businesses.find(({ id }) => id === "ai");
  const github = audit.policy.businesses.find(({ id }) => id === "github");
  assert.deepEqual(ai, {
    id: "ai",
    label: "🤖 AI 专用",
    configured: "INVALID",
    resolved: "INVALID",
    status: "invalid",
  });
  assert.match(github.configured, /^NODE:<[a-f0-9]{12}>$/u);
  assert.match(github.resolved, /^FIXED:<[a-f0-9]{12}>$/u);
  assert.match(audit.policy.fixed.entries[0].tagHash, /^[a-f0-9]{12}$/u);
  assert.equal("tag" in audit.policy.fixed.entries[0], false);
  assert.equal(audit.policy.fixed.entries[0].compatible, false);
  assert.match(audit.policy.chain.landingDisplayName, /^NODE:<[a-f0-9]{12}>$/u);
  assert.equal(output.includes(secretName), false);
});

test("keeps the private profile transaction browser-safe", () => {
  for (const file of [
    "shared/policies/business-targets.js",
    "clients/onexray/src/resolve-policy.js",
    "shared/encoding/base64url.js",
  ]) {
    const source = readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bBuffer\b|\bnode:/u, file);
  }
});

test("does not fabricate GeoData hashes when no compiled manifest is supplied", () => {
  const withoutHashes = renderOneXrayAudit({ ...context(), geoHashes: {} });
  const geoData = JSON.parse(withoutHashes).profile.geoData;
  assert.equal(geoData.domain, null);
  assert.equal(geoData.ip, null);
  assert.equal(geoData.available, false);
});

test("turns audit context Proxy/getter failures into a stable error", () => {
  const secret = "TEST_ONLY_AUDIT_CONTEXT_SECRET";
  const contextProxy = new Proxy({}, {
    get() { throw new Error(secret); },
  });
  assert.throws(
    () => renderOneXrayAudit(contextProxy),
    (error) => error.message === "OneXray audit: invalid-context" && !error.message.includes(secret),
  );
});
