import assert from "node:assert/strict";
import test from "node:test";

import { validateOneXrayProfile } from "../src/validate-profile.js";

const PROFILE = {
  name: "Apple Proxy · OneXray · edge",
  log: { loglevel: "warning" },
  dns: {
    servers: [
      { tag: "dns-global", address: "https://cloudflare-dns.com/dns-query", skipFallback: true },
      { tag: "dns-china", address: "https://dns.alidns.com/dns-query", skipFallback: true },
    ],
  },
  routing: {
    domainStrategy: "IPIfNonMatch",
    rules: [
      { type: "field", inboundTag: ["tunIn"], outboundTag: "dnsOut" },
      { type: "field", inboundTag: ["pingIn"], outboundTag: "proxy" },
      { type: "field", domain: ["ext:AppleProxySiteEdge.dat:APP-OPENAI"], outboundTag: "proxy" },
      { type: "field", outboundTag: "direct" },
    ],
  },
  inbounds: [],
  outbounds: [
    { protocol: "freedom", tag: "direct" },
    { protocol: "blackhole", tag: "block" },
    { protocol: "dns", tag: "dnsOut" },
  ],
};

const CONTEXT = {
  channel: "edge",
  geo: { siteName: "AppleProxySiteEdge", codes: new Set(["APP-OPENAI"]) },
  chain: { enabled: false, landingTag: null },
};

test("accepts a closed native Profile and reports every validation check", () => {
  const result = validateOneXrayProfile(PROFILE, CONTEXT);
  assert.equal(result.valid, true);
  for (const key of [
    "uniqueTags", "allOutboundRefsExist", "allInboundRefsAllowed", "allGeoRefsExist",
    "reservedTagsValid", "oneXrayModelKeysOnly", "chainShapeValid", "canonicalRoundTrip",
    "encodedLengthAtMost",
  ]) assert.equal(result.checks[key], true, key);
});

test("rejects dangling references, unknown model fields, bad GeoData, and chain shape", () => {
  for (const mutate of [
    (profile) => ({ ...profile, outbounds: [...profile.outbounds, { protocol: "freedom", tag: "direct" }] }),
    (profile) => ({ ...profile, routing: { ...profile.routing, rules: [...profile.routing.rules, { type: "field", outboundTag: "missing" }] } }),
    (profile) => ({ ...profile, routing: { ...profile.routing, rules: [...profile.routing.rules, { type: "field", inboundTag: ["unknown"], outboundTag: "direct" }] } }),
    (profile) => ({ ...profile, routing: { ...profile.routing, rules: [...profile.routing.rules, { type: "field", domain: ["ext:AppleProxySiteEdge.dat:APP-MISSING"], outboundTag: "direct" }] } }),
    (profile) => ({ ...profile, rawConfig: { log: "leak" } }),
    (profile) => ({ ...profile, outbounds: [...profile.outbounds, { protocol: "freedom", tag: "chainProxy" }] }),
  ]) {
    const result = validateOneXrayProfile(mutate(PROFILE), CONTEXT);
    assert.equal(result.valid, false);
    assert.ok(result.errors.length > 0);
  }
});

test("rejects credentials outside custom outbound settings and diagnostic or subscription payloads", () => {
  const extra = {
    ...PROFILE,
    dns: { ...PROFILE.dns, diagnostics: { password: "TEST_ONLY_SECRET" } },
  };
  const result = validateOneXrayProfile(extra, CONTEXT);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /diagnostic|model|secret|credential/u);
});

