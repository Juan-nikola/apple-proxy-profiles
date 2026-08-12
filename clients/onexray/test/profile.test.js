import assert from "node:assert/strict";
import test from "node:test";

import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { renderOneXrayDns } from "../src/render-dns.js";
import { renderOneXrayProfile } from "../src/render-profile.js";

const OPTIONS = Object.freeze({
  channel: "edge",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "auto",
  clientChain: "off",
  clientChainTarget: "",
});

const UUID = "00000000-0000-4000-8000-000000000001";

function node(name, id, overrides = {}) {
  return {
    name,
    type: "vless",
    server: `${id}.example.invalid`,
    port: 443,
    uuid: UUID,
    _profile: { id, entry: true, landing: false, chained: false },
    ...overrides,
  };
}

function resolution(overrides = {}) {
  const follow = { configured: "FOLLOW", resolvedTag: "proxy", status: "follow" };
  return {
    homepageNodes: [],
    fixedNodes: [],
    finalOutbound: null,
    targets: Object.fromEntries([
      "ai", "github", "youtube", "globalMedia", "globalSocial", "apple", "microsoft", "domestic",
      "overseasGame", "download", "dnsAndRules", "final",
    ].map((id) => [id, follow])),
    chain: { enabled: false, landingTag: null, entryCount: 0 },
    ...overrides,
  };
}

const GEO = Object.freeze({
  siteName: "AppleProxySiteEdge",
  code: (sourceId) => `APP-${sourceId.toUpperCase().replaceAll("_", "-")}`,
});

function render(overrides = {}) {
  const options = { ...OPTIONS, ...overrides.options };
  const dns = renderOneXrayDns({ options, routingPlan: orderedRoutingPlan(), geo: GEO });
  return renderOneXrayProfile({
    ...overrides,
    options,
    resolution: overrides.resolution ?? resolution(),
    routingPlan: orderedRoutingPlan(),
    geo: GEO,
    dns,
  });
}

test("renders a minimal native Profile with system outbounds and no raw config fields", () => {
  const profile = render();

  assert.deepEqual(Object.keys(profile), ["name", "log", "dns", "routing", "inbounds", "outbounds"]);
  assert.equal(profile.name, "Apple Proxy · OneXray · edge");
  assert.deepEqual(profile.log, { loglevel: "warning" });
  assert.ok(Array.isArray(profile.inbounds));
  assert.deepEqual(profile.outbounds.map(({ tag }) => tag), ["direct", "block", "dnsOut"]);
  assert.deepEqual(profile.outbounds.map(({ protocol }) => protocol), ["freedom", "blackhole", "dns"]);
  assert.equal(JSON.stringify(profile).includes("rawConfig"), false);
  assert.equal(JSON.stringify(profile).includes("dialerProxy"), false);
});

test("renders the configured OneXray log level", () => {
  assert.deepEqual(render({ options: { logLevel: "warning" } }).log, { loglevel: "warning" });
  assert.deepEqual(render({ options: { logLevel: "info" } }).log, { loglevel: "info" });
  assert.deepEqual(render({ options: { logLevel: "debug" } }).log, { loglevel: "debug" });
});

test("enables DNS logging only when dnsLog is on", () => {
  assert.deepEqual(render().log, { loglevel: "warning" });
  assert.deepEqual(render({ options: { dnsLog: "off" } }).log, { loglevel: "warning" });
  assert.deepEqual(render({ options: { dnsLog: "on" } }).log, { loglevel: "warning", dnsLog: true });
});

test("emits one shared fixed outbound for multiple businesses and no custom outbound when none is fixed", () => {
  const shared = node("🇺🇸 Los Angeles｜自建", "fixed-1");
  const fixedResolution = resolution({
    fixedNodes: [{ node: shared, tag: "🇺🇸 Los Angeles｜自建" }],
    targets: {
      ...resolution().targets,
      ai: { configured: "NODE:🇺🇸 Los Angeles｜自建", resolvedTag: "🇺🇸 Los Angeles｜自建", status: "fixed" },
      github: { configured: "NODE:🇺🇸 Los Angeles｜自建", resolvedTag: "🇺🇸 Los Angeles｜自建", status: "fixed" },
      final: { configured: "FOLLOW", resolvedTag: "proxy", status: "follow" },
    },
  });
  const profile = render({ resolution: fixedResolution });
  assert.equal(profile.outbounds.filter(({ tag }) => tag === "🇺🇸 Los Angeles｜自建").length, 1);
  assert.equal(render().outbounds.some(({ tag }) => tag.startsWith("ap-fixed-")), false);
});

test("stores the chain landing exactly once as chainProxy and never adds dialerProxy", () => {
  const landing = {
    name: "🇩🇪 Frankfurt｜落地",
    type: "trojan",
    server: "landing-1.example.invalid",
    port: 443,
    password: "TEST_ONLY_CHAIN_PASSWORD",
    _profile: { id: "landing-1", entry: false, landing: true, chained: false },
  };
  const profile = render({
    options: { clientChain: "on", clientChainTarget: `NODE:${landing.name}` },
    resolution: resolution({
      finalOutbound: { node: landing, tag: "chainProxy" },
      chain: { enabled: true, landingTag: "chainProxy", entryCount: 1 },
    }),
  });
  assert.equal(profile.outbounds.filter(({ tag }) => tag === "chainProxy").length, 1);
  assert.equal(profile.outbounds.some((outbound) => Object.hasOwn(outbound, "dialerProxy")), false);
});

test("rejects a Profile when the client-chain option disagrees with policy resolution", () => {
  assert.throws(
    () => render({ options: { clientChain: "on", clientChainTarget: "NODE:landing" } }),
    /chain.*disagree/u,
  );
});
