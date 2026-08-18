import assert from "node:assert/strict";
import test from "node:test";

import {
  fetchV2flyDomainAuditSnapshot,
  resolveV2flyAuditCommit,
} from "../src/fetch-v2fly-domain-audit.js";

function response(text, { status = 200, contentType = "text/plain" } = {}) {
  const bytes = Buffer.from(text, "utf8");
  let used = false;
  return {
    status,
    headers: new Headers({ "content-type": contentType, "content-length": String(bytes.length) }),
    body: {
      getReader() {
        return {
          async read() {
            if (used) return { done: true, value: undefined };
            used = true;
            return { done: false, value: bytes };
          },
          async cancel() {},
        };
      },
    },
    async json() { return JSON.parse(text); },
  };
}

function fakeFetch(files, commit = "a".repeat(40)) {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes("api.github.com")) {
      return response(JSON.stringify({
        sha: commit,
        commit: { committer: { date: "2026-08-17T00:00:00Z" } },
      }), { contentType: "application/json" });
    }
    const path = url.split(`/${commit}/`, 2)[1];
    if (!Object.hasOwn(files, path)) return response("missing", { status: 404 });
    return response(files[path]);
  };
  return { fetchImpl, calls };
}

test("resolves one immutable non-future v2fly commit", async () => {
  const { fetchImpl } = fakeFetch({});
  assert.deepEqual(
    await resolveV2flyAuditCommit(fetchImpl, "2026-08-18T00:00:00Z"),
    { sha: "a".repeat(40), committedAt: "2026-08-17T00:00:00Z" },
  );
});

test("expands include closure once and preserves include attributes", async () => {
  const { fetchImpl, calls } = fakeFetch({
    "data/cn": "include:tld-cn\ninclude:geolocation-cn\ninclude:tld-cn @cn\n",
    "data/tld-cn": "domain:example.cn # inline comment\nfull:full.example.cn\ninclude:shared @-!cn\n",
    "data/geolocation-cn": "keyword:china\nregexp:^cn[0-9]+$\n",
    "data/shared": "domain:shared.example @cn\n",
  });
  const snapshot = await fetchV2flyDomainAuditSnapshot({
    commit: { sha: "a".repeat(40), committedAt: "2026-08-17T00:00:00Z" },
    fetchImpl,
  });
  assert.equal(snapshot.entries.length, 5);
  assert.deepEqual(snapshot.entries.map(({ kind }) => kind), [
    "domainSuffix", "domain", "domainKeyword", "regexp", "domainSuffix",
  ]);
  assert.deepEqual(snapshot.entries.find(({ value }) => value === "shared.example").attributes, ["@cn"]);
  assert.equal(calls.filter((url) => url.includes("data/tld-cn")).length, 1);
  assert.equal(snapshot.source.commit, "a".repeat(40));
});

test("rejects unsafe, cyclic, too-deep, oversized, and malformed source trees", async () => {
  for (const root of [
    "include:../escape\n",
    "include:/absolute\n",
    "include:bad\\path\n",
    "wat:example.com\n",
  ]) {
    const { fetchImpl } = fakeFetch({ "data/cn": root });
    await assert.rejects(
      () => fetchV2flyDomainAuditSnapshot({ commit: "a".repeat(40), fetchImpl }),
      /v2fly domain audit/u,
    );
  }
  const cycle = fakeFetch({ "data/cn": "include:a\n", "data/a": "include:cn\n" });
  await assert.rejects(
    () => fetchV2flyDomainAuditSnapshot({ commit: "a".repeat(40), fetchImpl: cycle.fetchImpl }),
    /cycle|closure|depth/u,
  );
});

test("accepts v2fly exclusion markers in include file names", async () => {
  const { fetchImpl } = fakeFetch({
    "data/cn": "include:category-games-!cn\n",
    "data/category-games-!cn": "domain:example.cn\n",
  });
  const snapshot = await fetchV2flyDomainAuditSnapshot({
    commit: "a".repeat(40),
    fetchImpl,
  });
  assert.deepEqual(snapshot.entries, [{ kind: "domainSuffix", value: "example.cn", attributes: [] }]);
});
