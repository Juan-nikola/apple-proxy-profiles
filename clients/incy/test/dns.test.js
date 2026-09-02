import assert from "node:assert/strict";
import test from "node:test";

import { renderIncyDns } from "../src/render-dns.js";

test("renders domestic and overseas DNS servers with IPv4-only strategy", () => {
  const dns = renderIncyDns(
    {
      dnsMode: "stable",
      chinaDns: "alidns",
      globalDns: "cloudflare",
      ipv6Mode: "ipv4-only",
    },
    {
      followTag: "ap-incy-follow/main",
      directTag: "ap-incy-direct/main",
      dnsRulesTag: "ap-incy-dns/main",
    },
  );

  assert.equal(dns.tag, "ap-incy-dns/main");
  assert.equal(dns.queryStrategy, "UseIPv4");
  assert.equal(dns.servers.length, 2);
  assert.equal(dns.servers[0].address, "https://dns.alidns.com/dns-query");
  assert.deepEqual(dns.servers[0].domains, ["geosite:CN", "geosite:PRIVATE"]);
  assert.deepEqual(dns.servers[0].expectIPs, ["geoip:PRIVATE", "geoip:CN"]);
  assert.equal(dns.servers[1].address, "https://cloudflare-dns.com/dns-query");
  assert.ok(dns.servers[1].domains.includes("geosite:OPENAI"));
  assert.ok(dns.servers[1].domains.includes("geosite:GITHUB"));
  assert.ok(dns.servers[1].domains.includes("geosite:YOUTUBE"));
  assert.equal(dns.servers[1].skipFallback, true);
  assert.equal(dns.servers[1].clientIp, "1.1.1.1");
});

test("uses IPv4 preference only when requested", () => {
  const dns = renderIncyDns(
    {
      dnsMode: "privacy",
      chinaDns: "dnspod",
      globalDns: "quad9",
      ipv6Mode: "auto",
    },
    {
      followTag: "ap-incy-follow/alt",
      directTag: "ap-incy-direct/alt",
      dnsRulesTag: "ap-incy-dns/alt",
    },
  );

  assert.equal(dns.queryStrategy, "UseIP");
  assert.equal(dns.servers[0].address, "https://doh.pub/dns-query");
  assert.equal(dns.servers[1].clientIp, "9.9.9.9");
});

test("accepts the system China DNS resolver without parsing it as a URL", () => {
  const dns = renderIncyDns(
    {
      chinaDns: "system",
      globalDns: "cloudflare",
      ipv6Mode: "ipv4-only",
    },
    {
      followTag: "ap-incy-follow/system",
      directTag: "ap-incy-direct/system",
      dnsRulesTag: "ap-incy-dns/system",
    },
  );

  assert.equal(dns.servers[0].address, "system");
  assert.equal(dns.servers[0].tag, "ap-incy-direct/system");
  assert.equal(dns.servers[1].address, "https://cloudflare-dns.com/dns-query");
});

test("changes DNS fallback behavior for privacy and speed modes", () => {
  const privacy = renderIncyDns({ dnsMode: "privacy", ipv6Mode: "auto" }, {
    followTag: "ap-incy-follow/privacy",
    directTag: "ap-incy-direct/privacy",
    dnsRulesTag: "ap-incy-dns/privacy",
  });
  assert.deepEqual(privacy.servers[0].domains, ["geosite:PRIVATE"]);
  assert.deepEqual(privacy.servers[1].domains, []);
  assert.equal(privacy.servers[1].skipFallback, false);
  assert.equal(privacy.disableFallback, true);

  const speed = renderIncyDns({ dnsMode: "speed", ipv6Mode: "auto" }, {
    followTag: "ap-incy-follow/speed",
    directTag: "ap-incy-direct/speed",
    dnsRulesTag: "ap-incy-dns/speed",
  });
  assert.equal(speed.servers[1].skipFallback, false);
  assert.equal(speed.disableFallback, false);
});
