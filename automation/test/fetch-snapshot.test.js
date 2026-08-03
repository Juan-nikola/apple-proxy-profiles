import assert from "node:assert/strict";
import test from "node:test";

import { fetchSnapshot } from "../src/fetch-snapshot.js";

const commit = "dab47069a30c4ae70f7f5f4c919d639d9aaf79dc";
const source = { id: "Fixture", canonicalPath: "rule/Surge/Fixture/Fixture.list" };

function response(body, init = {}) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain", ...init.headers },
    ...init,
  });
}

test("fetches immutable raw bytes and hashes them without resolving master", async () => {
  const calls = [];
  const snapshot = await fetchSnapshot({
    commit,
    catalog: [source],
    retries: 0,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response("DOMAIN-SUFFIX,example.com\n");
    },
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, new RegExp(`/${commit}/rule/Surge/Fixture/Fixture\\.list$`, "u"));
  assert.equal(calls[0].options.redirect, "manual");
  assert.equal(snapshot.get("Fixture").sourceBytes, 26);
  assert.match(snapshot.get("Fixture").sourceSha256, /^[0-9a-f]{64}$/u);
});

test("fails closed for redirects, HTML, invalid UTF-8, and oversized bodies", async () => {
  const cases = [
    [() => new Response(null, { status: 302, headers: { location: "https://example.invalid" } }), /redirect status 302/u],
    [() => response("<!doctype html><title>bad</title>"), /HTML content rejected/u],
    [() => response(Uint8Array.from([0xc3, 0x28])), /invalid UTF-8/u],
    [() => response("0123456789"), /content exceeds byte limit/u, { maxBytes: 5 }],
  ];
  for (const [factory, pattern, extra = {}] of cases) {
    await assert.rejects(() => fetchSnapshot({
      commit,
      catalog: [source],
      retries: 0,
      fetchImpl: async () => factory(),
      ...extra,
    }), pattern);
  }
});

test("limits concurrency and preserves catalog order", async () => {
  let active = 0;
  let peak = 0;
  const catalog = Array.from({ length: 8 }, (_, index) => ({
    id: `S${index}`,
    canonicalPath: `rule/Surge/S${index}/S${index}.list`,
  }));
  const snapshot = await fetchSnapshot({
    commit,
    catalog,
    concurrency: 4,
    retries: 0,
    fetchImpl: async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return response("DOMAIN-SUFFIX,example.com\n");
    },
  });
  assert.equal(peak, 4);
  assert.deepEqual([...snapshot.keys()], catalog.map(({ id }) => id));
});
