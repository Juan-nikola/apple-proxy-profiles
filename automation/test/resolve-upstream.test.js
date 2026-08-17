import assert from "node:assert/strict";
import test from "node:test";

import { resolveUpstreamCommit } from "../src/resolve-upstream.js";

const headSha = "538b8a79532c44dfbcb8e694d2f43e753c60b157";
const olderSha = "2ba8dfe636e64b41d4857a621fec35868ab50e08";
const now = Date.parse("2026-08-17T16:00:00Z");
const commitFeed = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>tag:github.com,2008:Grit::Commit/538b8a79532c44dfbcb8e694d2f43e753c60b157</id>
    <link href="https://github.com/blackmatrix7/ios_rule_script/commit/538b8a79532c44dfbcb8e694d2f43e753c60b157" rel="alternate" type="text/html"/>
    <updated>2026-08-15T18:26:29Z</updated>
  </entry>
  <entry>
    <id>tag:github.com,2008:Grit::Commit/2ba8dfe636e64b41d4857a621fec35868ab50e08</id>
    <link type="text/html" rel="alternate" href="https://github.com/blackmatrix7/ios_rule_script/commit/2ba8dfe636e64b41d4857a621fec35868ab50e08"/>
    <updated>2026-08-16T00:00:00Z</updated>
  </entry>
</feed>`;

test("resolves the first immutable default-branch Atom entry", async () => {
  let request;
  const result = await resolveUpstreamCommit(async (url, options) => {
    request = { url, options };
    return new Response(commitFeed, { status: 200 });
  }, now);
  assert.deepEqual(result, { sha: headSha, committedAt: "2026-08-15T18:26:29Z" });
  assert.equal(request.url, "https://github.com/blackmatrix7/ios_rule_script/commits/master.atom");
  assert.equal(request.options.redirect, "manual");
  assert.equal(request.options.headers.Accept, "application/atom+xml");
});

test("retries transient commit feed failures before resolving the head", async () => {
  let attempts = 0;
  const delays = [];
  const result = await resolveUpstreamCommit(async () => {
    attempts += 1;
    if (attempts < 3) return new Response("gateway timeout", { status: 504 });
    return new Response(commitFeed, { status: 200 });
  }, now, async (delayMs) => { delays.push(delayMs); });
  assert.deepEqual(result, { sha: headSha, committedAt: "2026-08-15T18:26:29Z" });
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [1_000, 2_000]);
});

test("does not retry a permanent commit feed status", async () => {
  let attempts = 0;
  await assert.rejects(
    resolveUpstreamCommit(async () => {
      attempts += 1;
      return new Response("not found", { status: 404 });
    }, now, async () => {}),
    /HTTP status 404/u,
  );
  assert.equal(attempts, 1);
});

test("rejects malformed commit entries, mismatched links, and invalid times", async () => {
  const invalidShaFeed = commitFeed.replace(headSha, "master");
  const mismatchedLinkFeed = commitFeed.replace(
    `https://github.com/blackmatrix7/ios_rule_script/commit/${headSha}`,
    `https://github.com/blackmatrix7/ios_rule_script/commit/${olderSha}`,
  );
  const duplicateIdentityFeed = commitFeed.replace(
    "    <updated>2026-08-15T18:26:29Z</updated>",
    `    <id>tag:github.com,2008:Grit::Commit/${headSha}</id>
    <link rel="alternate" type="text/html" href="https://github.com/blackmatrix7/ios_rule_script/commit/${headSha}"/>
    <updated>2026-08-15T18:26:29Z</updated>`,
  );
  const cases = [
    ["<feed></feed>", /invalid commit$/u],
    [invalidShaFeed, /invalid commit$/u],
    [mismatchedLinkFeed, /invalid commit$/u],
    [duplicateIdentityFeed, /invalid commit$/u],
    [commitFeed.replace("2026-08-15T18:26:29Z", "not-a-time"), /invalid commit time/u],
    [commitFeed.replace("2026-08-15T18:26:29Z", "2030-01-01T00:00:00Z"), /invalid commit time/u],
  ];
  for (const [body, pattern] of cases) {
    await assert.rejects(
      resolveUpstreamCommit(async () => new Response(body, { status: 200 }), now),
      pattern,
    );
  }
});

test("reports a commit feed network failure without exposing fetch details", async () => {
  await assert.rejects(
    resolveUpstreamCommit(async () => { throw new Error("private network detail"); }, now),
    /Blackmatrix7 resolver network failure/u,
  );
});
