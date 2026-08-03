import { createHash } from "node:crypto";

import { BLACKMATRIX7_BASELINE, pinnedRawUrl } from "./source-catalog.js";

const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function sourceError(sourceId, reason) {
  return new Error(`Rule source ${sourceId}: ${reason}`);
}

function validateRawUrl(rawUrl, commit) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:"
    || url.hostname !== "raw.githubusercontent.com"
    || url.port
    || url.username
    || url.password
    || url.search
    || url.hash
    || !url.pathname.startsWith(`/blackmatrix7/ios_rule_script/${commit}/rule/Surge/`)) {
    throw new TypeError("Pinned raw URL violates the source allowlist");
  }
  return url.href;
}

async function readBoundedBody(response, sourceId, maxBytes) {
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^\d+$/u.test(declared) || Number(declared) > maxBytes)) {
    throw sourceError(sourceId, "content exceeds byte limit");
  }
  if (!response.body || typeof response.body.getReader !== "function") {
    throw sourceError(sourceId, "response body is unavailable");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      throw sourceError(sourceId, "content exceeds byte limit");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

async function fetchOne(source, { commit, fetchImpl, maxBytes, timeoutMs, retries }) {
  const rawUrl = validateRawUrl(pinnedRawUrl(source, commit), commit);
  let lastReason = "network failure";
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(rawUrl, {
        redirect: "manual",
        headers: { Accept: "text/plain" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      lastReason = "network failure";
      if (attempt < retries) continue;
      throw sourceError(source.id, lastReason);
    }
    if (response.status >= 300 && response.status < 400) {
      throw sourceError(source.id, `redirect status ${response.status}`);
    }
    if (response.status !== 200) {
      lastReason = `HTTP status ${response.status}`;
      if (RETRYABLE_STATUS.has(response.status) && attempt < retries) continue;
      throw sourceError(source.id, lastReason);
    }
    if (response.headers.has("location")) throw sourceError(source.id, "unexpected redirect metadata");
    const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "text/plain" && contentType !== "application/octet-stream") {
      throw sourceError(source.id, "unexpected content type");
    }
    const bytes = await readBoundedBody(response, source.id, maxBytes);
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw sourceError(source.id, "invalid UTF-8");
    }
    if (!text.trim()) throw sourceError(source.id, "empty content");
    if (/^\s*(?:<!doctype\s+html|<html\b)/iu.test(text)) {
      throw sourceError(source.id, "HTML content rejected");
    }
    return Object.freeze({
      text,
      rawUrl,
      sourceBytes: bytes.byteLength,
      sourceSha256: createHash("sha256").update(bytes).digest("hex"),
    });
  }
  throw sourceError(source.id, lastReason);
}

export async function fetchSnapshot({
  commit = BLACKMATRIX7_BASELINE.commit,
  catalog,
  fetchImpl = globalThis.fetch,
  concurrency = 4,
  maxBytes = MAX_SOURCE_BYTES,
  timeoutMs = 30_000,
  retries = 2,
}) {
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new TypeError("Snapshot commit must be a full SHA");
  if (!Array.isArray(catalog) || catalog.length === 0) throw new TypeError("Snapshot catalog must be non-empty");
  if (typeof fetchImpl !== "function") throw new TypeError("Snapshot fetch implementation is required");
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 4) {
    throw new RangeError("Snapshot concurrency must be between 1 and 4");
  }
  const results = new Array(catalog.length);
  let cursor = 0;
  async function worker() {
    while (cursor < catalog.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fetchOne(catalog[index], {
        commit, fetchImpl, maxBytes, timeoutMs, retries,
      });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, catalog.length) }, () => worker()));
  return new Map(catalog.map((source, index) => [source.id, results[index]]));
}
