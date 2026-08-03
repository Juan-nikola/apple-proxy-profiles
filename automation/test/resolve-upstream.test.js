import assert from "node:assert/strict";
import test from "node:test";

import { resolveUpstreamCommit } from "../src/resolve-upstream.js";

const sha = "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc";

test("resolves one immutable default-branch commit with the GitHub media type", async () => {
  let request;
  const result = await resolveUpstreamCommit(async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ sha, commit: { committer: { date: "2026-08-01T19:07:21Z" } } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }, Date.parse("2026-08-03T00:00:00Z"));
  assert.deepEqual(result, { sha, committedAt: "2026-08-01T19:07:21Z" });
  assert.match(request.url, /blackmatrix7\/ios_rule_script\/commits\/master$/u);
  assert.equal(request.options.redirect, "manual");
  assert.equal(request.options.headers.Accept, "application/vnd.github+json");
});

test("rejects bad status, JSON, sha, and future timestamps without response bodies", async () => {
  const cases = [
    [async () => new Response("private", { status: 503 }), /HTTP status 503/u],
    [async () => new Response("not-json", { status: 200 }), /invalid JSON/u],
    [async () => new Response(JSON.stringify({ sha: "main", commit: { committer: { date: "2026-08-01T00:00:00Z" } } })), /invalid commit$/u],
    [async () => new Response(JSON.stringify({ sha, commit: { committer: { date: "2030-01-01T00:00:00Z" } } })), /invalid commit time/u],
  ];
  for (const [fetchImpl, pattern] of cases) {
    await assert.rejects(() => resolveUpstreamCommit(fetchImpl, Date.parse("2026-08-03T00:00:00Z")), pattern);
  }
});
