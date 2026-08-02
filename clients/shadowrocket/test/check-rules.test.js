import assert from "node:assert/strict";
import test from "node:test";

import { checkRule, isValidDomainSetLine, isValidRuleLine } from "../scripts/check-rules.mjs";

test("accepts only normalized Shadowrocket domain-set entries", () => {
  for (const line of [".example.com", ".sub-domain.example", "exact.example.com"]) {
    assert.equal(isValidDomainSetLine(line), true, line);
  }
  for (const line of ["", ".", "..example.com", "*.example.com", "https://example.com", "example.com,PROXY"]) {
    assert.equal(isValidDomainSetLine(line), false, line);
  }
});

test("accepts representative valid Shadowrocket rule-set lines", () => {
  for (const line of [
    "DOMAIN,example.com",
    "DOMAIN-SUFFIX,sub.example.com",
    "DOMAIN-KEYWORD,streaming",
    "IP-CIDR,192.0.2.0/24",
    "IP-CIDR,192.0.2.0/24,no-resolve",
    "IP-CIDR,2001:db8::/32,no-resolve",
    "IP-CIDR6,2001:db8::/32",
    "IP-ASN,13335",
    "IP-ASN,13335,no-resolve",
    "DST-PORT,443",
    "DST-PORT,1000-2000",
    "DEST-PORT,443",
    "DOMAIN-WILDCARD,a?.example.com",
    "DOMAIN-WILDCARD,*.example.com",
    "GEOIP,CN",
    "URL-REGEX,^https?://example\\.com/[a-z]+$",
    "AND,((DOMAIN-SUFFIX,example.com),(PROTOCOL,UDP))",
    "OR,((DOMAIN,example.com),(DOMAIN,example.net))",
    "NOT,((DOMAIN,example.com))",
    "AND,((PROTOCOL,UDP),(OR,(DOMAIN,example.com),(RULE-SET,https://example.com/rules.list)))",
    "AND,((PROTOCOL,UDP),(DST-PORT,443))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://rules.example.com/path/list.txt?x=1#v))",
    "AND,((PROTOCOL,UDP),(RULE-SET,http://192.0.2.10:8080/list))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://[2001:db8::1]:8443/path))",
  ]) assert.equal(isValidRuleLine(line), true, line);
});

test("rejects type-correct malformed Shadowrocket rule-set lines", () => {
  for (const line of [
    "DOMAIN",
    "DOMAIN,",
    "DOMAIN, example.com",
    "DOMAIN,example..com",
    "IP-CIDR,192.0.2.0/33",
    "IP-CIDR,192.0.2.0/24,unexpected-tail",
    "IP-CIDR6,192.0.2.0/24",
    "IP-ASN,AS13335",
    "DEST-PORT,70000",
    "DST-PORT,0",
    "DST-PORT,443-1",
    "DST-PORT,65536",
    "DST-PORT,not-a-port",
    "AND,((PROTOCOL,UDP),(DST-PORT,443-1))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://:))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://example.com:bad/x))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://[::1/x))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://..))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://-bad.example/x))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://bad-.example/x))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://2001:db8::1/x))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://example.com:0/x))",
    "AND,((PROTOCOL,UDP),(RULE-SET,https://example.com:65536/x))",
    "DOMAIN,*.example.com",
    "DOMAIN-SUFFIX,a?.example.com",
    "DOMAIN-WILDCARD,..bad..",
    "GEOIP,china",
    "URL-REGEX,[",
    "AND,((DOMAIN,example.com),(PROTOCOL,UDP)",
    "OR,((DOMAIN,example.com))",
    "NOT,((DOMAIN,))",
    "AND,((BOGUS,value),(PROTOCOL,UDP))",
    "DOMAIN,example.com\nDOMAIN,example.net",
  ]) assert.equal(isValidRuleLine(line), false, line);
});

test("rejects HTML rule responses even when their body resembles valid rules", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("DOMAIN,example.com\n", {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  try {
    await assert.rejects(
      checkRule({ upstreamUrl: "https://example.invalid/rules", minEntries: 1, inputFormat: "RULE-SET" }),
      /content-type/i,
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("accepts the text/plain content type served by the live rule catalog", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("DOMAIN,example.com\n", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
  try {
    await assert.doesNotReject(
      checkRule({ upstreamUrl: "https://example.invalid/rules", minEntries: 1, inputFormat: "RULE-SET" }),
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("validates domain-set catalogs with domain-set syntax", async () => {
  const previousFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url) => {
    requestedUrl = url;
    return new Response(".example.com\nexact.example.net\n", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  };
  try {
    await assert.doesNotReject(
      checkRule({
        upstreamUrl: "https://example.invalid/domains",
        minEntries: 2,
        inputFormat: "DOMAIN-SET",
      }),
    );
    assert.equal(requestedUrl, "https://example.invalid/domains");
  } finally {
    globalThis.fetch = previousFetch;
  }
});
