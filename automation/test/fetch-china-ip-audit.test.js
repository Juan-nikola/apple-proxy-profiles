import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  fetchChinaIpAuditSnapshot,
  resolveChinaIpAuditCommit,
} from "../src/fetch-china-ip-audit.js";

const COMMIT = "b".repeat(40);
const NOW = Date.parse("2026-08-09T00:00:00Z");
const IPV4 = "8.8.8.0/24\n";
const IPV6 = "2001:4860::/32\n";

function textResponse(body, init = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain", ...init.headers },
    ...init,
  });
}

test("resolves the audit branch to one immutable non-future commit", async () => {
  let request;
  const result = await resolveChinaIpAuditCommit(async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      sha: COMMIT,
      commit: { committer: { date: "2026-08-08T00:00:00Z" } },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }, NOW);

  assert.deepEqual(result, { sha: COMMIT, committedAt: "2026-08-08T00:00:00Z" });
  assert.equal(
    request.url,
    "https://api.github.com/repos/gaoyifan/china-operator-ip/commits/ip-lists",
  );
  assert.equal(request.options.redirect, "manual");
  assert.ok(request.options.signal instanceof AbortSignal);
});

test("rejects resolver redirects, non-200 responses, invalid payloads, and future commits", async () => {
  const cases = [
    [async () => new Response(null, { status: 302, headers: { location: "https://example.invalid" } }), /redirect status 302/u],
    [async () => new Response("private", { status: 503 }), /HTTP status 503/u],
    [async () => new Response("not-json", { status: 200 }), /invalid JSON/u],
    [async () => new Response(JSON.stringify({ sha: "main", commit: { committer: { date: "2026-08-08T00:00:00Z" } } })), /invalid commit/u],
    [async () => new Response(JSON.stringify({ sha: COMMIT, commit: { committer: { date: "not-a-time" } } })), /invalid commit time/u],
    [async () => new Response(JSON.stringify({ sha: COMMIT, commit: { committer: { date: "2026-08-10T00:00:00Z" } } })), /future commit time/u],
  ];
  for (const [fetchImpl, pattern] of cases) {
    await assert.rejects(() => resolveChinaIpAuditCommit(fetchImpl, NOW), pattern);
  }
});

test("fetches both allowlisted files at the resolved SHA and preserves their provenance", async () => {
  const requests = [];
  const result = await fetchChinaIpAuditSnapshot({
    commit: { sha: COMMIT, committedAt: "2026-08-08T00:00:00Z" },
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      return textResponse(url.endsWith("/china.txt") ? IPV4 : IPV6);
    },
  });

  assert.deepEqual(requests.map(({ url }) => url), [
    `https://raw.githubusercontent.com/gaoyifan/china-operator-ip/${COMMIT}/china.txt`,
    `https://raw.githubusercontent.com/gaoyifan/china-operator-ip/${COMMIT}/china6.txt`,
  ]);
  assert.ok(requests.every(({ options }) => (
    options.redirect === "manual"
      && options.headers.Accept === "text/plain"
      && options.signal instanceof AbortSignal
  )));
  assert.deepEqual(result.source, {
    repository: "https://github.com/gaoyifan/china-operator-ip",
    branch: "ip-lists",
    commit: COMMIT,
    committedAt: "2026-08-08T00:00:00Z",
    license: "MIT",
    files: [
      {
        path: "china.txt",
        sha256: createHash("sha256").update(IPV4).digest("hex"),
        bytes: Buffer.byteLength(IPV4),
      },
      {
        path: "china6.txt",
        sha256: createHash("sha256").update(IPV6).digest("hex"),
        bytes: Buffer.byteLength(IPV6),
      },
    ],
  });
  assert.deepEqual(result.entries, [
    { kind: "ipv4Cidr", value: "8.8.8.0/24", noResolve: true, sourceId: "ChinaIP-audit" },
    { kind: "ipv6Cidr", value: "2001:4860::/32", noResolve: true, sourceId: "ChinaIP-audit" },
  ]);
  assert.equal(result.sha256, createHash("sha256").update(IPV4).update(IPV6).digest("hex"));
});

test("fails closed for disallowed fetch responses and bodies above four MiB", async () => {
  const cases = [
    [() => new Response(null, { status: 301, headers: { location: "https://example.invalid" } }), /redirect status 301/u],
    [() => textResponse("private", { status: 403 }), /HTTP status 403/u],
    [() => textResponse("<!doctype html><title>bad</title>"), /HTML/u],
    [() => textResponse(Uint8Array.from([0xc3, 0x28])), /invalid UTF-8/u],
    [() => textResponse("\n"), /empty content/u],
    [() => textResponse("x", { headers: { "content-length": String(4 * 1024 * 1024 + 1) } }), /byte limit/u],
  ];
  for (const [factory, pattern] of cases) {
    await assert.rejects(() => fetchChinaIpAuditSnapshot({
      commit: { sha: COMMIT, committedAt: "2026-08-08T00:00:00Z" },
      fetchImpl: async () => factory(),
    }), pattern);
  }
});

test("rejects invalid pinned commit identities before fetching", async () => {
  for (const commit of [null, {}, { sha: "main", committedAt: "2026-08-08T00:00:00Z" }, {
    sha: COMMIT,
    committedAt: "not-a-time",
  }]) {
    await assert.rejects(() => fetchChinaIpAuditSnapshot({
      commit,
      fetchImpl: async () => { throw new Error("must not fetch"); },
    }), /commit/u);
  }
});
