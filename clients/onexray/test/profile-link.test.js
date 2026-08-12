import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildOneXrayProfileLink,
  canonicalProfileJson,
  decodeOneXrayProfileLink,
} from "../src/profile-link.js";

const PROFILE = {
  name: "Apple Proxy · OneXray · edge",
  log: { loglevel: "warning" },
  dns: { servers: [] },
  routing: { domainStrategy: "IPIfNonMatch", rules: [] },
  inbounds: [],
  outbounds: [
    { protocol: "freedom", tag: "direct" },
    { protocol: "blackhole", tag: "block" },
    { protocol: "dns", tag: "dnsOut" },
  ],
};

test("canonicalizes recursively with stable compact bytes and hashes the complete Profile", () => {
  const first = canonicalProfileJson(PROFILE);
  const reordered = canonicalProfileJson({
    outbounds: PROFILE.outbounds,
    inbounds: PROFILE.inbounds,
    routing: PROFILE.routing,
    dns: PROFILE.dns,
    log: PROFILE.log,
    name: PROFILE.name,
  });
  assert.equal(first, reordered);
  assert.equal(first.includes("\n"), false);
  const link = buildOneXrayProfileLink(PROFILE, "edge");
  assert.match(link, /^onexray:\/\/onexray\.com\/config\/add\?type=profile&data=/u);
  assert.match(link, /#Apple%20Proxy%20%C2%B7%20OneXray%20%C2%B7%20edge%20%C2%B7%20[0-9a-f]{8}$/u);
  assert.equal(buildOneXrayProfileLink(PROFILE, "edge").split("#").at(-1).endsWith("aba2118d"), true);
});

test("round-trips standard Base64 bytes and detects content or option changes", () => {
  const link = buildOneXrayProfileLink(PROFILE, "edge");
  const decoded = decodeOneXrayProfileLink(link);
  assert.deepEqual(decoded.profile, PROFILE);
  assert.equal(decoded.channel, "edge");
  assert.equal(decoded.hash.length, 8);
  assert.throws(() => decodeOneXrayProfileLink(link.replace("%C2", "%c2")), /canonical|invalid|standard/u);
  const changed = { ...PROFILE, dns: { servers: [{ tag: "dns-global", address: "system" }] } };
  assert.notEqual(buildOneXrayProfileLink(changed, "edge"), link);
  assert.notEqual(buildOneXrayProfileLink({ ...PROFILE, name: "Apple Proxy · OneXray · current" }, "current"), link);
});

test("rejects malformed links and enforces the 32 KiB encoded-link budget", () => {
  assert.throws(() => decodeOneXrayProfileLink("onexray://onexray.com/config/add?type=profile&data=not-base64#bad"), /invalid|profile|standard/u);
  assert.throws(() => buildOneXrayProfileLink(PROFILE, "unknown"), /channel/u);
  const numericPort = {
    ...PROFILE,
    routing: { ...PROFILE.routing, rules: [{ type: "field", outboundTag: "direct", port: 443 }] },
  };
  assert.throws(() => buildOneXrayProfileLink(numericPort, "edge"), /port|valid/u);
  const nearLimit = { ...PROFILE, dns: { servers: [{ address: "x".repeat(30_000) }] } };
  assert.throws(() => buildOneXrayProfileLink(nearLimit, "edge"), /32|length|budget/u);
});

test("keeps the Profile link module free of Node-only globals and validates before encoding", () => {
  const source = readFileSync(new URL("../src/profile-link.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\bBuffer\b|node:/u);
  const invalid = {
    ...PROFILE,
    routing: { ...PROFILE.routing, rules: [{ type: "field", outboundTag: "missing" }] },
  };
  assert.throws(() => buildOneXrayProfileLink(invalid, "edge"), /valid|missing|reference/u);
});
