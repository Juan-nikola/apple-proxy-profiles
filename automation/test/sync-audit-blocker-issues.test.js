import assert from "node:assert/strict";
import test from "node:test";

import { synchronizeAuditBlockerIssues } from "../src/sync-audit-blocker-issues.js";

const blocker = {
  key: "source/blackmatrix7",
  severity: "blocker",
  firstSeenAt: "2026-08-18T03:23:00Z",
  lastRecoveredAt: null,
  dashboardPath: "audit/dashboard.json",
};

function response(payload, status = 200) {
  return { status, headers: new Headers({ "content-type": "application/json" }), async json() { return payload; } };
}

test("creates, updates, deduplicates, and closes audit blocker issues without comments", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init: { ...init, headers: Object.fromEntries(new Headers(init.headers).entries()) } });
    if (init.method === "GET") {
      return response([
        { number: 9, state: "open", title: "duplicate", body: "<!-- apple-proxy-audit-key:source/blackmatrix7 -->", labels: [{ name: "audit-blocker" }] },
        { number: 3, state: "open", title: "canonical", body: "<!-- apple-proxy-audit-key:source/blackmatrix7 -->old", labels: [{ name: "audit-blocker" }] },
        { number: 12, state: "open", title: "recovered", body: "<!-- apple-proxy-audit-key:old/key -->old", labels: [{ name: "audit-blocker" }] },
      ]);
    }
    return response({ number: 1, state: "open" });
  };
  const result = await synchronizeAuditBlockerIssues({
    owner: "owner",
    repo: "repo",
    token: "token",
    blockers: [blocker],
    fetchImpl,
    now: "2026-08-18T04:00:00Z",
  });
  assert.deepEqual(result, { created: 0, updated: 1, closed: 2, deduplicated: 1 });
  assert.equal(calls.some(({ init }) => init.method === "POST"), false);
  assert.equal(calls.filter(({ init }) => init.method === "PATCH").length, 3);
  assert.equal(calls.some(({ url }) => url.includes("comments")), false);
  assert.equal(calls[0].init.headers.authorization, "Bearer token");
});

test("creates new blocker, ignores warnings, and rejects secret-shaped API data", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (init.method === "GET") return response([]);
    return response({ number: 7, state: "open" });
  };
  const result = await synchronizeAuditBlockerIssues({
    owner: "owner",
    repo: "repo",
    token: "token",
    blockers: [{ ...blocker, severity: "warning" }, blocker],
    fetchImpl,
  });
  assert.equal(result.created, 1);
  assert.equal(calls.filter(({ init }) => init.method === "POST").length, 1);
  const post = calls.find(({ init }) => init.method === "POST");
  assert.match(post.init.body, /apple-proxy-audit-key:source\/blackmatrix7/u);
  await assert.rejects(
    () => synchronizeAuditBlockerIssues({
      owner: "owner",
      repo: "repo",
      token: "token",
      blockers: [blocker],
      fetchImpl: async (url, init = {}) => init.method === "GET"
        ? response([{ number: 2, state: "open", body: "uuid=secret", labels: [{ name: "audit-blocker" }] }])
        : response({ number: 2 }),
    }),
    /secret|uuid|issue/u,
  );
});
