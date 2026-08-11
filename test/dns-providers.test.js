import assert from "node:assert/strict";
import test from "node:test";

import { chinaDnsProvider, globalDnsProvider } from "../shared/dns/providers.js";

test("exposes immutable neutral DNS provider metadata for every shared option", () => {
  assert.deepEqual(chinaDnsProvider("alidns"), {
    address: "223.5.5.5",
    doh: "https://dns.alidns.com/dns-query",
  });
  assert.deepEqual(chinaDnsProvider("dnspod"), {
    address: "119.29.29.29",
    doh: "https://doh.pub/dns-query",
  });
  assert.deepEqual(chinaDnsProvider("system"), {
    address: "local",
    doh: "system",
  });

  assert.deepEqual(globalDnsProvider("cloudflare"), {
    address: "1.1.1.1",
    serverName: "cloudflare-dns.com",
    doh: "https://cloudflare-dns.com/dns-query",
  });
  assert.deepEqual(globalDnsProvider("google"), {
    address: "8.8.8.8",
    serverName: "dns.google",
    doh: "https://dns.google/dns-query",
  });
  assert.deepEqual(globalDnsProvider("quad9"), {
    address: "9.9.9.9",
    serverName: "dns.quad9.net",
    doh: "https://dns.quad9.net/dns-query",
  });

  assert.equal(Object.isFrozen(chinaDnsProvider("alidns")), true);
  assert.equal(Object.isFrozen(globalDnsProvider("cloudflare")), true);
});

test("rejects unsupported shared DNS provider identifiers", () => {
  assert.throws(() => chinaDnsProvider("unknown"), /China DNS provider/u);
  assert.throws(() => globalDnsProvider("unknown"), /global DNS provider/u);
});
