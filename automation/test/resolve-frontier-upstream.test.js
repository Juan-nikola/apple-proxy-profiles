import assert from "node:assert/strict";
import test from "node:test";

import { resolveSingBoxUpstream } from "../src/resolve-frontier-upstream.js";

test("resolves the official sing-box testing branch to a full commit", async () => {
  const result = await resolveSingBoxUpstream({
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://api.github.com/repos/SagerNet/sing-box/commits/testing");
      assert.equal(init.headers.accept, "application/vnd.github+json");
      return { ok: true, async json() { return { sha: "a".repeat(40) }; } };
    },
    now: new Date("2026-08-05T00:00:00Z"),
  });
  assert.deepEqual(result, {
    repository: "https://github.com/SagerNet/sing-box",
    branch: "testing",
    commit: "a".repeat(40),
    fetchedAt: "2026-08-05T00:00:00.000Z",
  });
});
