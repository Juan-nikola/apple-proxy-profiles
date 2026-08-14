import assert from "node:assert/strict";
import test from "node:test";

import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { renderHappDns, renderHappDnsRoutes } from "../src/render-dns.js";

const proxySourceIds = orderedRoutingPlan().filter(({ dnsClass }) => dnsClass === "proxy").map(({ id }) => id);
const chinaSourceIds = orderedRoutingPlan().filter(({ dnsClass }) => dnsClass === "china").map(({ id }) => id);

const baseOptions = Object.freeze({
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  ipv6Mode: "auto",
  dnsTarget: Object.freeze({ resolved: "FOLLOW", outboundTag: "happ-follow/current" }),
});

function serverByTag(dns, tag) {
  return dns.servers.find((server) => typeof server === "object" && server.tag === tag);
}

test("assigns authoritative domestic and proxy DNS classes to their respective resolvers", () => {
  const dns = renderHappDns(baseOptions);
  const domestic = serverByTag(dns, "happ-dns-domestic");
  const global = serverByTag(dns, "happ-dns-global");

  assert.deepEqual(domestic.domains, chinaSourceIds.map((id) => `geosite:HAPP-${id.toUpperCase()}`));
  assert.deepEqual(global.domains, proxySourceIds.map((id) => `geosite:HAPP-${id.toUpperCase()}`));
  assert.equal(domestic.address, "223.5.5.5");
  assert.equal(global.address, "https://cloudflare-dns.com/dns-query");
  assert.deepEqual(dns.hosts, { "cloudflare-dns.com": "1.1.1.1" });

  assert.deepEqual(renderHappDnsRoutes(baseOptions), [
    { inboundTag: ["happ-dns"], ip: ["223.5.5.5"], outboundTag: "happ-direct" },
    { inboundTag: ["happ-dns"], ip: ["1.1.1.1"], outboundTag: "happ-follow/current" },
  ]);
});

test("renders resolver routes before service rules and never sends DNS through a fixed balancer", () => {
  const routes = renderHappDnsRoutes({
    ...baseOptions,
    dnsTarget: { resolved: "NODE:Tokyo", outboundTag: "happ-fixed/abc/candidate" },
  });
  assert.equal(routes.length, 2);
  assert.deepEqual(routes[1], {
    inboundTag: ["happ-dns"], ip: ["1.1.1.1"], outboundTag: "happ-fixed/abc/candidate",
  });
  assert.equal(routes.some((rule) => Object.hasOwn(rule, "balancerTag")), false);
  assert.throws(() => renderHappDnsRoutes({
    ...baseOptions,
    dnsTarget: { resolved: "NODE:Tokyo", balancerTag: "happ-fixed/abc/balancer" },
  }), /outboundTag/u);
});

test("uses the shared IPv4 query strategy and keeps explicit domestic assignments across DNS modes", () => {
  assert.equal(renderHappDns({ ...baseOptions, ipv6Mode: "ipv4-only" }).queryStrategy, "UseIPv4");
  assert.equal(renderHappDns(baseOptions).queryStrategy, "UseIP");

  const strategies = new Set();
  for (const dnsMode of ["stable", "privacy", "speed"]) {
    const dns = renderHappDns({ ...baseOptions, dnsMode });
    strategies.add(JSON.stringify({ disableFallbackIfMatch: dns.disableFallbackIfMatch, enableParallelQuery: dns.enableParallelQuery }));
    assert.deepEqual(serverByTag(dns, "happ-dns-domestic").domains, chinaSourceIds.map((id) => `geosite:HAPP-${id.toUpperCase()}`), dnsMode);
  }
  assert.equal(strategies.size, 3);
});

test("selects every supported domestic and global resolver without changing DNS safety routes", () => {
  const domestic = { alidns: "223.5.5.5", dnspod: "119.29.29.29", system: "localhost" };
  const global = {
    cloudflare: ["https://cloudflare-dns.com/dns-query", "cloudflare-dns.com", "1.1.1.1"],
    google: ["https://dns.google/dns-query", "dns.google", "8.8.8.8"],
    quad9: ["https://dns.quad9.net/dns-query", "dns.quad9.net", "9.9.9.9"],
  };
  for (const [chinaDns, address] of Object.entries(domestic)) {
    for (const [globalDns, [doh, name, literal]] of Object.entries(global)) {
      const options = { ...baseOptions, chinaDns, globalDns };
      const dns = renderHappDns(options);
      assert.equal(serverByTag(dns, "happ-dns-domestic").address, address, `${chinaDns}/${globalDns}`);
      assert.equal(serverByTag(dns, "happ-dns-global").address, doh, `${chinaDns}/${globalDns}`);
      assert.deepEqual(dns.hosts, { [name]: literal }, `${chinaDns}/${globalDns}`);
      const routes = renderHappDnsRoutes(options);
      assert.equal(routes.at(-1).ip[0], literal, `${chinaDns}/${globalDns}`);
      if (chinaDns === "system") assert.equal(routes.length, 1, `${chinaDns}/${globalDns}`);
      else assert.equal(routes[0].outboundTag, "happ-direct", `${chinaDns}/${globalDns}`);
    }
  }
});

test("routes the global resolver direct when the DNS policy resolves direct", () => {
  const routes = renderHappDnsRoutes({
    ...baseOptions,
    dnsTarget: { resolved: "DIRECT", outboundTag: "happ-direct" },
  });
  assert.equal(routes.at(-1).outboundTag, "happ-direct");
});
