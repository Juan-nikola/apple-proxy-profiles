import assert from "node:assert/strict";
import test from "node:test";

import { renderXrayGeoData, decodeXrayGeoData } from "../../../automation/src/render-xray-geodata.js";
import { DEFAULT_RULE_SOURCE_IDS, orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { BUSINESS_TARGETS } from "../../../shared/policies/business-targets.js";
import { RULE_KIND } from "../../../shared/rules/model.js";
import { LIGHTWEIGHT_ROUTING_CASES } from "../../../test/fixtures/lightweight-routing-cases.js";
import { oneXrayGeoCode, oneXrayGeoNames } from "../src/geodata-contract.js";
import { renderOneXrayProfile } from "../src/render-profile.js";
import { classifyOneXrayProfile, oneXrayPath } from "./parity-helpers.js";

const CHANNEL = "edge";
const GEO_NAMES = oneXrayGeoNames(CHANNEL);
const OPTIONS = Object.freeze({
  channel: CHANNEL,
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

function parityEntry(routingCase, sourceId) {
  if (sourceId === "ChinaIP" && (routingCase.ip !== undefined || routingCase.resolvedIp !== undefined)) {
    const ip = routingCase.ip ?? routingCase.resolvedIp;
    return {
      kind: ip.includes(":") ? RULE_KIND.ipv6Cidr : RULE_KIND.ipv4Cidr,
      value: `${ip}/${ip.includes(":") ? 128 : 32}`,
      noResolve: true,
      sourceId,
    };
  }
  return {
    kind: RULE_KIND.domainSuffix,
    value: routingCase.domain,
    noResolve: false,
    sourceId,
  };
}

function parityGeoData() {
  const entriesBySource = new Map(DEFAULT_RULE_SOURCE_IDS.map((sourceId) => [sourceId, []]));
  for (const routingCase of LIGHTWEIGHT_ROUTING_CASES) {
    const sourceId = routingCase.sourceId ?? (routingCase.resolvedCountry === "CN" ? "ChinaIP" : null);
    if (typeof sourceId !== "string") continue;
    if (routingCase.domain === undefined && routingCase.ip === undefined && routingCase.resolvedIp === undefined) continue;
    entriesBySource.get(sourceId)?.push(parityEntry(routingCase, sourceId));
  }
  const snapshot = new Map(DEFAULT_RULE_SOURCE_IDS.map((sourceId) => [sourceId, {
    id: sourceId,
    entries: entriesBySource.get(sourceId),
  }]));
  const rendered = renderXrayGeoData(snapshot, CHANNEL);
  return Object.freeze({
    domain: decodeXrayGeoData(rendered.domain, "domain"),
    ip: decodeXrayGeoData(rendered.ip, "ip"),
    manifest: rendered.manifest,
  });
}

const DECODED_GEO = parityGeoData();

function node(name, id, overrides = {}) {
  return {
    name,
    type: "vless",
    server: `${id}.example.invalid`,
    port: 443,
    uuid: UUID,
    network: "raw",
    _profile: { id, entry: true, landing: false, chained: false },
    ...overrides,
  };
}

const FIXED_NODE = node("🇺🇸 Fixed Node", "fixed-node", { _profile: { id: "fixed-node", entry: false, landing: false, chained: false } });
const LANDING_NODE = {
  name: "🇩🇪 Landing Node",
  type: "trojan",
  server: "landing-node.example.invalid",
  port: 443,
  password: "TEST_ONLY_CHAIN_PASSWORD",
  tls: true,
  _profile: { id: "landing-node", entry: false, landing: true, chained: false },
};

function resolvedTarget(configured) {
  if (configured === "DIRECT") return { configured, resolvedTag: "direct", status: "direct" };
  if (configured === "FOLLOW") return { configured, resolvedTag: "proxy", status: "follow" };
  if (configured === "BLOCK") return { configured, resolvedTag: "block", status: "block" };
  return { configured, resolvedTag: "ap-fixed-fixed-node", status: "fixed" };
}

function makeResolution(overrides = {}, { chain = false, fixed = false } = {}) {
  const targets = Object.fromEntries(BUSINESS_TARGETS.map(({ id, defaultTarget }) => [id, resolvedTarget(defaultTarget)]));
  const fixedNodes = [];
  if (fixed) {
    targets.github = resolvedTarget("NODE:🇺🇸 Fixed Node");
    fixedNodes.push({ node: FIXED_NODE, tag: "ap-fixed-fixed-node" });
  }
  for (const [id, configured] of Object.entries(overrides)) targets[id] = resolvedTarget(configured);
  return {
    homepageNodes: [],
    fixedNodes,
    finalOutbound: chain ? { node: LANDING_NODE, tag: "chainProxy" } : null,
    targets,
    chain: { enabled: chain, landingTag: chain ? "chainProxy" : null, entryCount: chain ? 1 : 0 },
  };
}

function profileFor({ overrides = {}, options = {}, chain = false, fixed = false } = {}) {
  const selectedOptions = {
    ...OPTIONS,
    ...options,
    clientChain: chain ? "on" : "off",
    clientChainTarget: chain ? `NODE:${LANDING_NODE.name}` : "",
  };
  return renderOneXrayProfile({
    options: selectedOptions,
    resolution: makeResolution(overrides, { chain, fixed }),
    routingPlan: orderedRoutingPlan(),
    geo: { siteName: GEO_NAMES.domain, code: oneXrayGeoCode },
  });
}

function requestFor(routingCase) {
  return {
    domain: routingCase.domain,
    ip: routingCase.ip ?? routingCase.resolvedIp,
    network: routingCase.network,
    port: routingCase.port,
  };
}

function expectedTag(routingCase) {
  if (routingCase.oneXrayExpected) return routingCase.oneXrayExpected;
  if (routingCase.expected === "DIRECT") return "direct";
  if (routingCase.expected === "REJECT") return "block";
  if (routingCase.expected === "🕵️ 严格跟踪") return "direct";
  return "proxy";
}

test("OneXray parity matrix covers local, private, security, business, GeoData, QUIC, and final paths", () => {
  const kinds = new Set(LIGHTWEIGHT_ROUTING_CASES.map(({ kind }) => kind));
  for (const kind of [
    "local-domain", "private-ipv4", "private-ipv6", "security-threat", "security-httpdns", "security-privacy",
    "custom", "domestic-game", "domestic-business", "github", "video", "global-media", "global-social",
    "download", "rule-download", "quic",
  ]) assert.equal(kinds.has(kind), true, `missing parity fixture kind ${kind}`);
  assert.equal(LIGHTWEIGHT_ROUTING_CASES.some(({ sourceId }) => sourceId === "ChinaTLD"), true);
  assert.equal(LIGHTWEIGHT_ROUTING_CASES.some(({ resolvedIp }) => resolvedIp?.includes(":")), true);
  assert.equal(LIGHTWEIGHT_ROUTING_CASES.some(({ resolvedIp }) => resolvedIp && !resolvedIp.includes(":")), true);
});

test("classifies the serialized OneXray Profile in shared routing order", () => {
  const profile = profileFor();
  for (const routingCase of LIGHTWEIGHT_ROUTING_CASES) {
    const selectedProfile = routingCase.quicMode ? profileFor({ options: { quicMode: routingCase.quicMode } }) : profile;
    const actual = classifyOneXrayProfile(selectedProfile, requestFor(routingCase), DECODED_GEO);
    assert.equal(actual, expectedTag(routingCase), routingCase.domain ?? routingCase.ip);
  }
  assert.equal(profile.routing.rules.at(-1).outboundTag, "proxy");
  assert.equal(profile.routing.rules.some(({ domain }) => domain?.includes(`ext:${GEO_NAMES.domain}.dat:${oneXrayGeoCode("ChinaTLD")}`)), true);
  assert.equal(profile.routing.rules.some(({ ip }) => ip?.includes(`ext:${GEO_NAMES.ip}.dat:${oneXrayGeoCode("ChinaIP")}`)), true);
});

test("homepage switching changes FOLLOW and final paths but not fixed, direct, or block paths", () => {
  const profile = profileFor({ fixed: true });
  const followCases = LIGHTWEIGHT_ROUTING_CASES.filter(({ oneXrayExpected, expected, sourceId, kind }) => (
    sourceId !== "GitHub" && kind !== "quic" && ((oneXrayExpected ?? expected) === "proxy" || oneXrayExpected === "proxy")
  )).slice(0, 6);
  assert.ok(followCases.length >= 4);
  for (const routingCase of followCases) {
    const tag = classifyOneXrayProfile(profile, requestFor(routingCase), DECODED_GEO);
    assert.deepEqual(oneXrayPath(profile, tag, "proxy-a"), ["proxy-a"], routingCase.domain);
    assert.deepEqual(oneXrayPath(profile, tag, "proxy-b"), ["proxy-b"], routingCase.domain);
  }

  const fixedCase = LIGHTWEIGHT_ROUTING_CASES.find(({ sourceId }) => sourceId === "GitHub");
  const directCase = LIGHTWEIGHT_ROUTING_CASES.find(({ sourceId }) => sourceId === "BiliBili");
  const blockCase = LIGHTWEIGHT_ROUTING_CASES.find(({ sourceId }) => sourceId === "Hijacking");
  const fixedTag = classifyOneXrayProfile(profile, requestFor(fixedCase), DECODED_GEO);
  const directTag = classifyOneXrayProfile(profile, requestFor(directCase), DECODED_GEO);
  const blockTag = classifyOneXrayProfile(profile, requestFor(blockCase), DECODED_GEO);
  assert.equal(fixedTag, "ap-fixed-fixed-node");
  assert.equal(directTag, "direct");
  assert.equal(blockTag, "block");
  for (const tag of [fixedTag, directTag, blockTag]) {
    assert.deepEqual(oneXrayPath(profile, tag, "proxy-a"), oneXrayPath(profile, tag, "proxy-b"));
  }
});

test("client-chain applies only to FOLLOW paths and keeps fixed/direct/block isolated", () => {
  const profile = profileFor({ chain: true, fixed: true });
  const followCase = LIGHTWEIGHT_ROUTING_CASES.find(({ sourceId }) => sourceId === "OpenAI");
  const fixedCase = LIGHTWEIGHT_ROUTING_CASES.find(({ sourceId }) => sourceId === "GitHub");
  const directCase = LIGHTWEIGHT_ROUTING_CASES.find(({ sourceId }) => sourceId === "BiliBili");
  const blockCase = LIGHTWEIGHT_ROUTING_CASES.find(({ sourceId }) => sourceId === "Hijacking");
  const followTag = classifyOneXrayProfile(profile, requestFor(followCase), DECODED_GEO);
  const fixedTag = classifyOneXrayProfile(profile, requestFor(fixedCase), DECODED_GEO);
  const directTag = classifyOneXrayProfile(profile, requestFor(directCase), DECODED_GEO);
  const blockTag = classifyOneXrayProfile(profile, requestFor(blockCase), DECODED_GEO);
  assert.deepEqual(oneXrayPath(profile, followTag, "proxy-a"), ["proxy-a", "chainProxy"]);
  assert.deepEqual(oneXrayPath(profile, fixedTag, "proxy-a"), ["ap-fixed-fixed-node"]);
  assert.deepEqual(oneXrayPath(profile, directTag, "proxy-a"), ["direct"]);
  assert.deepEqual(oneXrayPath(profile, blockTag, "proxy-a"), ["block"]);
  assert.equal(profile.outbounds.filter(({ tag }) => tag === "chainProxy").length, 1);
  assert.equal(profile.outbounds.some((outbound) => Object.hasOwn(outbound, "dialerProxy")), false);
});
