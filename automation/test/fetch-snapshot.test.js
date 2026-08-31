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
  assert.deepEqual(snapshot.get("Fixture").source, source);
});

test("sends a descriptive user agent to GitHub raw sources", async () => {
  let headers;
  await fetchSnapshot({
    commit,
    catalog: [source],
    retries: 0,
    fetchImpl: async (url, options) => {
      headers = options.headers;
      return response("DOMAIN-SUFFIX,example.com\n");
    },
  });
  assert.match(headers["User-Agent"], /^apple-proxy-profiles\//u);
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

test("honors the server Expires cooldown before retrying a 429", async () => {
  let attempts = 0;
  const delays = [];
  const snapshot = await fetchSnapshot({
    commit,
    catalog: [source],
    retries: 2,
    sleepImpl: async (delayMs) => { delays.push(delayMs); },
    nowImpl: () => Date.parse("2026-08-17T15:37:40Z"),
    fetchImpl: async () => {
      attempts += 1;
      if (attempts < 3) {
        return new Response("too many requests", {
          status: 429,
          headers: {
            date: "Mon, 17 Aug 2026 15:37:40 GMT",
            expires: "Mon, 17 Aug 2026 15:42:40 GMT",
          },
        });
      }
      return response("DOMAIN-SUFFIX,example.com\n");
    },
  });
  assert.equal(snapshot.get("Fixture").sourceBytes, 26);
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [300_000, 300_000]);
});

test("uses bounded fallback delays for retryable status and network failures", async () => {
  for (const mode of ["status", "network"]) {
    let attempts = 0;
    const delays = [];
    const snapshot = await fetchSnapshot({
      commit,
      catalog: [source],
      retries: 2,
      sleepImpl: async (delayMs) => { delays.push(delayMs); },
      fetchImpl: async () => {
        attempts += 1;
        if (attempts < 3) {
          if (mode === "network") throw new Error("temporary network failure");
          return new Response("unavailable", { status: 503 });
        }
        return response("DOMAIN-SUFFIX,example.com\n");
      },
    });
    assert.equal(snapshot.get("Fixture").sourceBytes, 26, mode);
    assert.equal(attempts, 3, mode);
    assert.deepEqual(delays, [1_000, 2_000], mode);
  }
});

test("does not wait or retry a permanent source status", async () => {
  let attempts = 0;
  const delays = [];
  await assert.rejects(() => fetchSnapshot({
    commit,
    catalog: [source],
    retries: 2,
    sleepImpl: async (delayMs) => { delays.push(delayMs); },
    fetchImpl: async () => {
      attempts += 1;
      return new Response("not found", { status: 404 });
    },
  }), /HTTP status 404/u);
  assert.equal(attempts, 1);
  assert.deepEqual(delays, []);
});

test("paces request starts through one shared gate", async () => {
  const events = [];
  const catalog = Array.from({ length: 3 }, (_, index) => ({
    id: `S${index}`,
    canonicalPath: `rule/Surge/S${index}/S${index}.list`,
  }));
  const snapshot = await fetchSnapshot({
    commit,
    catalog,
    concurrency: 3,
    retries: 0,
    requestIntervalMs: 250,
    sleepImpl: async (delayMs) => { events.push(`sleep:${delayMs}`); },
    fetchImpl: async (url) => {
      const id = /\/(S\d+)\.list$/u.exec(url)?.[1];
      events.push(`fetch:${id}`);
      return response("DOMAIN-SUFFIX,example.com\n");
    },
  });
  assert.deepEqual(events, ["fetch:S0", "sleep:250", "fetch:S1", "sleep:250", "fetch:S2"]);
  assert.deepEqual([...snapshot.keys()], catalog.map(({ id }) => id));
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
