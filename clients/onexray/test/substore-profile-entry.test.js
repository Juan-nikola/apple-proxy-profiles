import assert from "node:assert/strict";
import test from "node:test";

import { buildPrivateOneXrayContext, runOneXrayProfileProcessor } from "../src/substore-profile-entry.js";
import { validateOneXrayProfile } from "../src/validate-profile.js";

const UUID = "00000000-0000-4000-8000-000000000001";
const NODE = {
  name: "🇯🇵 Tokyo vless",
  type: "vless",
  server: "tokyo.example.invalid",
  port: 443,
  uuid: UUID,
  _subName: "[自建]",
};
const BASE = Object.freeze({ type: "collection", name: "apple-proxy-onexray" });
const LANDING = Object.freeze({
  name: "🇩🇪 Frankfurt vless",
  type: "vless",
  server: "landing.example.invalid",
  port: 443,
  uuid: UUID,
  _subName: "[落地]",
});

function args(output, extra = {}) {
  return { ...BASE, output, ...extra };
}

test("Profile and audit modes share one private transaction and exact output framing", () => {
  const profile = runOneXrayProfileProcessor({ proxies: [NODE], arguments: args("profile") });
  assert.match(profile, /^onexray:\/\/onexray\.com\/config\/add\?type=profile&data=.+\n$/u);
  assert.equal(profile.endsWith("\n\n"), false);

  const audit = runOneXrayProfileProcessor({ proxies: [NODE], arguments: args("audit") });
  assert.equal(audit.endsWith("\n"), true);
  assert.equal(audit.endsWith("\n\n"), false);
  assert.equal(JSON.parse(audit).profile.deepLink.withinBudget, true);
  assert.equal(JSON.parse(audit).profile.shortVersion, decodeURIComponent(profile.trim().split("#").at(-1)).split(" · ").at(-1));
  assert.equal(JSON.parse(audit).profile.geoData.available, false);
});

test("passes validated compiled GeoData hashes into the shared audit context", () => {
  const domain = "a".repeat(64);
  const ip = "b".repeat(64);
  const audit = JSON.parse(runOneXrayProfileProcessor({
    proxies: [NODE],
    arguments: args("audit"),
    geoManifest: { hashes: { domain, ip } },
  }));
  assert.deepEqual(
    { domain: audit.profile.geoData.domain, ip: audit.profile.geoData.ip, available: audit.profile.geoData.available },
    { domain, ip, available: true },
  );
});

test("reads a readable Sub-Store policy file with Chinese business keys", () => {
  const policy = JSON.stringify({
    "AI 专用": "NODE:🇯🇵 Tokyo · VLESS｜自建",
    "GitHub": "FOLLOW",
  });
  const audit = JSON.parse(runOneXrayProfileProcessor({
    proxies: [NODE],
    arguments: args("audit", { policyFile: "onexray-policy" }),
    policy,
  }));
  const ai = audit.policy.businesses.find(({ id }) => id === "ai");
  const github = audit.policy.businesses.find(({ id }) => id === "github");
  assert.equal(ai.status, "fixed");
  assert.match(ai.configured, /^NODE:<[0-9a-f]{12}>$/u);
  assert.equal(github.status, "follow");

  const profile = runOneXrayProfileProcessor({
    proxies: [NODE],
    arguments: args("profile", { policyFile: "onexray-policy" }),
    policy,
  });
  assert.match(profile, /^onexray:\/\/onexray\.com\/config\/add\?type=profile&data=.+\n$/u);
});

test("policy file mode fails closed on missing, invalid, or conflicting input", () => {
  const cases = [
    {
      name: "missing policy content",
      input: { proxies: [NODE], arguments: args("profile", { policyFile: "onexray-policy" }) },
      code: "policy-file-unavailable",
    },
    {
      name: "policy without policyFile",
      input: { proxies: [NODE], arguments: args("profile"), policy: "{}" },
      code: "policy-file-not-configured",
    },
    {
      name: "conflict with policyOverrides",
      input: {
        proxies: [NODE],
        arguments: args("profile", { policyFile: "onexray-policy", policyOverrides: "e30" }),
        policy: "{}",
      },
      code: "invalid-arguments",
    },
    {
      name: "invalid policy JSON",
      input: { proxies: [NODE], arguments: args("profile", { policyFile: "onexray-policy" }), policy: "{bad" },
      code: "invalid-policy-file-json",
    },
  ];
  for (const { name, input, code } of cases) {
    assert.throws(
      () => runOneXrayProfileProcessor(input),
      (error) => error.message === `OneXray profile: ${code}`,
      name,
    );
  }
});

test("rejects node output at the profile entry boundary", () => {
  assert.throws(
    () => runOneXrayProfileProcessor({ proxies: [NODE], arguments: args("nodes") }),
    (error) => error.message === "OneXray profile: unsupported-output",
  );
});

test("fixed policy and profile failures reject both modes with the same stable code", () => {
  const bad = { output: "profile", ...BASE, clientChain: "off", policyOverrides: "eyJnaXRodWIiOiJOT0RFOm1pc3Npbmctbm9kZSJ9" };
  for (const output of ["profile", "audit"]) {
    assert.throws(
      () => runOneXrayProfileProcessor({ proxies: [NODE], arguments: { ...bad, output } }),
      (error) => error.message === "OneXray profile: invalid-policy; 业务: 🐙 GitHub",
    );
  }
});

test("never places request or raw node secrets in profile errors", () => {
  const secret = "TEST_ONLY_PROFILE_ENTRY_SECRET";
  assert.throws(
    () => runOneXrayProfileProcessor({
      proxies: [{ ...NODE, name: secret, uuid: secret }],
      arguments: { ...args("profile"), policyOverrides: "not-base64" },
    }),
    (error) => {
      assert.match(error.message, /^OneXray profile: /u);
      assert.equal(error.message.includes(secret), false);
      return true;
    },
  );
});

test("contains Proxy request traps behind the stable invalid-request code", () => {
  const secret = "TEST_ONLY_PROXY_REQUEST_SECRET";
  const request = new Proxy({}, {
    getPrototypeOf() { throw new Error(secret); },
  });
  assert.throws(
    () => runOneXrayProfileProcessor(request),
    (error) => {
      assert.equal(error.message, "OneXray profile: invalid-request");
      assert.equal(error.message.includes(secret), false);
      return true;
    },
  );
});

test("Profile and audit skip a mixed unrenderable inventory without leaking private nodes", () => {
  const privateNode = {
    ...NODE,
    name: "PRIVATE_ONEXRAY_PROFILE_SNELL",
    type: "snell",
    server: "private-onexray.example.invalid",
    psk: "TEST_ONLY_ONEXRAY_PROFILE_PSK",
    version: 4,
  };
  const profile = runOneXrayProfileProcessor({ proxies: [NODE, privateNode], arguments: args("profile") });
  assert.match(profile, /^onexray:\/\/onexray\.com\/config\/add\?type=profile&data=.+\n$/u);
  for (const secret of [privateNode.name, privateNode.server, privateNode.psk]) {
    assert.equal(profile.includes(secret), false);
  }

  const auditText = runOneXrayProfileProcessor({ proxies: [NODE, privateNode], arguments: args("audit") });
  const audit = JSON.parse(auditText);
  assert.deepEqual(audit.nodes.renderFailures, { total: 1, protocols: { snell: 1 } });
  for (const secret of [privateNode.name, privateNode.server, privateNode.psk]) {
    assert.equal(auditText.includes(secret), false);
  }
});

test("Profile keeps OneXray native client-chain resolution without generic chain clones", () => {
  const profile = runOneXrayProfileProcessor({
    proxies: [NODE, LANDING],
    arguments: args("profile", {
      clientChain: "on",
      clientChainTarget: "NODE:🇩🇪 Frankfurt · VLESS｜落地",
    }),
  });
  assert.match(profile, /^onexray:\/\/onexray\.com\/config\/add\?type=profile&data=.+\n$/u);
  assert.equal(profile.includes(LANDING.server), false);
});

test("private Profile stays native and valid with FOLLOW and DIRECT routing semantics", () => {
  const context = buildPrivateOneXrayContext(args("profile"), [NODE]);
  const profile = context.profile;
  assert.deepEqual(validateOneXrayProfile(profile, {
    channel: "edge",
    geo: context.geo,
    resolution: context.resolution,
    chain: context.resolution.chain,
  }), {
    valid: true,
    errors: [],
    checks: {
      uniqueTags: true,
      allOutboundRefsExist: true,
      allInboundRefsAllowed: true,
      allGeoRefsExist: true,
      reservedTagsValid: true,
      oneXrayModelKeysOnly: true,
      chainShapeValid: true,
      canonicalRoundTrip: true,
      encodedLengthAtMost: true,
    },
  });
  assert.equal(Object.hasOwn(profile, "policy_groups"), false);
  assert.equal(Object.hasOwn(profile.routing, "balancers"), false);
  assert.deepEqual(profile.outbounds.map(({ protocol, tag }) => [protocol, tag]), [
    ["freedom", "direct"],
    ["blackhole", "block"],
    ["dns", "dnsOut"],
  ]);
  assert.equal(context.resolution.targets.ai.resolvedTag, "proxy");
  assert.equal(context.resolution.targets.github.resolvedTag, "proxy");
  assert.equal(context.resolution.targets.apple.resolvedTag, "direct");
});
