import assert from "node:assert/strict";
import test from "node:test";

import { EXPLICIT_OVERSEAS_RULE_SOURCE_IDS, orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { renderOneXrayDns } from "../src/render-dns.js";

const GEO = Object.freeze({
  siteName: "AppleProxySiteEdge",
  code: (sourceId) => `APP-${sourceId.toUpperCase()}`,
});

const OPTIONS = Object.freeze({
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  ipv6Mode: "auto",
});

function render(overrides = {}) {
  return renderOneXrayDns({
    options: { ...OPTIONS, ...overrides },
    routingPlan: orderedRoutingPlan(),
    geo: GEO,
  });
}

test("renders tagged China and global resolvers with explicit overseas GeoData selection", () => {
  const { dns } = render();

  assert.deepEqual(dns, {
    servers: [
      {
        tag: "dns-global",
        address: "https://cloudflare-dns.com/dns-query",
        domains: EXPLICIT_OVERSEAS_RULE_SOURCE_IDS.map((sourceId) => (
          `ext:AppleProxySiteEdge.dat:APP-${sourceId.toUpperCase()}`
        )),
        skipFallback: true,
      },
      {
        tag: "dns-china",
        address: "https://dns.alidns.com/dns-query",
        skipFallback: true,
      },
    ],
  });
  assert.equal(Object.hasOwn(dns, "queryStrategy"), false);
  assert.equal(dns.servers.every((server) => Object.hasOwn(server, "queryStrategy") === false), true);
});

test("routes TUN DNS through dnsOut while keeping resolver transport direct or proxied without a loop", () => {
  const { rules } = render();

  assert.deepEqual(rules, [
    { type: "field", inboundTag: ["tunIn"], network: "tcp,udp", port: "53", outboundTag: "dnsOut" },
    {
      type: "field",
      inboundTag: ["dnsOut"],
      domain: ["full:dns.alidns.com"],
      outboundTag: "direct",
    },
    { type: "field", inboundTag: ["dnsOut"], ip: ["223.5.5.5"], outboundTag: "direct" },
    {
      type: "field",
      inboundTag: ["dnsOut"],
      domain: ["full:cloudflare-dns.com"],
      outboundTag: "proxy",
    },
    { type: "field", inboundTag: ["dnsOut"], ip: ["1.1.1.1"], outboundTag: "proxy" },
    { type: "field", inboundTag: ["dnsOut"], outboundTag: "direct" },
  ]);
  assert.equal(rules.some((rule) => rule.inboundTag?.includes("dnsOut") && rule.outboundTag === "dnsOut"), false);
});

test("uses global DNS as the privacy catch-all without changing runtime IPv6 query strategy ownership", () => {
  const { dns, rules } = render({ dnsMode: "privacy", chinaDns: "system", globalDns: "google", ipv6Mode: "ipv4-only" });

  assert.deepEqual(dns.servers, [
    {
      tag: "dns-global",
      address: "https://dns.google/dns-query",
      skipFallback: true,
    },
    { tag: "dns-china", address: "system", skipFallback: true },
  ]);
  assert.deepEqual(rules, [
    { type: "field", inboundTag: ["tunIn"], network: "tcp,udp", port: "53", outboundTag: "dnsOut" },
    {
      type: "field",
      inboundTag: ["dnsOut"],
      domain: ["full:dns.google"],
      outboundTag: "proxy",
    },
    { type: "field", inboundTag: ["dnsOut"], ip: ["8.8.8.8"], outboundTag: "proxy" },
    { type: "field", inboundTag: ["dnsOut"], outboundTag: "direct" },
  ]);
  assert.equal(JSON.stringify({ dns, rules }).includes("queryStrategy"), false);
});
