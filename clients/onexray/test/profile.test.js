import assert from "node:assert/strict";
import test from "node:test";

import { renderOneXrayProfile } from "../src/render-profile.js";
import { encodeBase64UrlUtf8 } from "../../../shared/encoding/base64url.js";
import { parseOneXrayOptions } from "../src/options.js";
import { resolveOneXrayPolicy } from "../src/resolve-policy.js";
import { validateOneXrayProfile } from "../src/validate-profile.js";

const OPTIONS = {
  output: "profile",
  type: "collection",
  name: "apple-proxy-onexray",
  channel: "current",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "ipv4-only",
  clientChain: "off",
  clientChainTarget: "",
  policyOverrides: "",
};

const NODE = {
  name: "🇯🇵 Tokyo",
  type: "vless",
  server: "example.invalid",
  port: 443,
  uuid: "00000000-0000-4000-8000-000000000001",
  tls: true,
  sni: "www.example.com",
};

test("renders OneXray structured profile with direct, block, DNS, and final proxy", () => {
  const profile = renderOneXrayProfile({ options: OPTIONS, nodes: [NODE] });
  assert.equal(profile.name, "apple-proxy-onexray");
  assert.equal(profile.routing.domainStrategy, "IPIfNonMatch");
  assert.equal(profile.routing.rules.at(-1).outboundTag, "proxy");
  assert.deepEqual(profile.outbounds.slice(0, 2), [
    { protocol: "freedom", tag: "direct" },
    { protocol: "blackhole", tag: "block" },
  ]);
  assert.equal(profile.dns.servers[0].address, "223.5.5.5");
  assert.equal(profile.dns.servers[1].address, "1.1.1.1");
  assert.equal(profile.inbounds[0].tag, "tun");
});

test("profile renders fixed business outbounds and optional chain without copying homepage nodes", () => {
  const fixed = { ...NODE, name: "🇺🇸 Los Angeles", server: "fixed.invalid", _profile: { id: "fixed", entry: true, sourceKind: "selfHosted", chained: false } };
  const entry = { ...NODE, _profile: { id: "entry", entry: true, sourceKind: "airport", chained: false } };
  const options = parseOneXrayOptions({
    ...OPTIONS,
    policyOverrides: encodeBase64UrlUtf8(JSON.stringify({ ai: "NODE:🇺🇸 Los Angeles" })),
  });
  const resolution = resolveOneXrayPolicy({ options, allNodes: [entry, fixed], eligibleNodes: [entry, fixed] });
  const profile = renderOneXrayProfile({ options, nodes: [entry, fixed], resolution });
  assert.equal(profile.outbounds.some(({ tag }) => tag === "proxy"), false);
  assert.equal(profile.outbounds.some(({ tag }) => tag === resolution.targets.ai.resolvedTag), true);
  assert.equal(profile.outbounds.filter(({ tag }) => tag.startsWith("ap-fixed-")).length, 1);
  assert.equal(profile.routing.rules.at(-1).outboundTag, "proxy");
});

test("profile validator closes every route reference and accepts the runtime proxy tag", () => {
  const profile = renderOneXrayProfile({ options: OPTIONS, nodes: [NODE] });
  assert.deepEqual(validateOneXrayProfile(profile), { valid: true, errors: [] });
  const broken = structuredClone(profile);
  broken.routing.rules[0].outboundTag = "missing";
  assert.equal(validateOneXrayProfile(broken).valid, false);
});
