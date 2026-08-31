import { createHash } from "node:crypto";

import { BLACKMATRIX7_BASELINE, pinnedRawUrl } from "./source-catalog.js";

const MAX_SOURCE_BYTES = 64 * 1024 * 1024;
const MAX_RETRY_DELAY_MS = 5 * 60_000;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const TRANSIENT_RETRY_DELAYS_MS = Object.freeze([1_000, 2_000]);
const RATE_LIMIT_RETRY_DELAYS_MS = Object.freeze([30_000, 60_000]);
const FETCH_USER_AGENT = "apple-proxy-profiles/0.1";

function sleep(delayMs) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, delayMs));
}

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

function parsedHttpDate(value) {
  const timestamp = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function boundedDelay(delayMs, fallbackMs) {
  const selected = Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : fallbackMs;
  return Math.min(MAX_RETRY_DELAY_MS, Math.max(1_000, Math.ceil(selected)));
}

function responseRetryDelay(response, attempt, nowImpl) {
  const status = response?.status;
  const fallback = status === 429
    ? RATE_LIMIT_RETRY_DELAYS_MS[attempt]
    : TRANSIENT_RETRY_DELAYS_MS[attempt];
  const serverDate = parsedHttpDate(response?.headers?.get("date")) ?? nowImpl();
  const retryAfter = response?.headers?.get("retry-after");
  if (typeof retryAfter === "string" && /^\d+$/u.test(retryAfter)) {
    return boundedDelay(Number(retryAfter) * 1_000, fallback);
  }
  const retryAt = parsedHttpDate(retryAfter);
  if (retryAt !== null) return boundedDelay(retryAt - serverDate, fallback);
  const expiresAt = parsedHttpDate(response?.headers?.get("expires"));
  if (expiresAt !== null) return boundedDelay(expiresAt - serverDate, fallback);
  return boundedDelay(fallback, fallback);
}

async function discardBody(response) {
  if (response?.body && typeof response.body.cancel === "function") {
    await response.body.cancel().catch(() => {});
  }
}

function requestStarter(requestIntervalMs, sleepImpl) {
  let tail = Promise.resolve();
  let started = false;
  return async function startRequest(start) {
    const turn = tail;
    let release;
    tail = new Promise((resolvePromise) => { release = resolvePromise; });
    await turn;
    try {
      if (started && requestIntervalMs > 0) await sleepImpl(requestIntervalMs);
      started = true;
      return start();
    } finally {
      release();
    }
  };
}

async function fetchOne(source, {
  commit,
  fetchImpl,
  maxBytes,
  timeoutMs,
  retries,
  sleepImpl,
  nowImpl,
  startRequest,
}) {
  const rawUrl = validateRawUrl(pinnedRawUrl(source, commit), commit);
  let lastReason = "network failure";
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    let response;
    try {
      response = await startRequest(() => fetchImpl(rawUrl, {
        redirect: "manual",
        headers: { Accept: "text/plain", "User-Agent": FETCH_USER_AGENT },
        signal: AbortSignal.timeout(timeoutMs),
      }));
    } catch {
      lastReason = "network failure";
      if (attempt < retries) {
        await sleepImpl(TRANSIENT_RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw sourceError(source.id, lastReason);
    }
    if (response.status >= 300 && response.status < 400) {
      throw sourceError(source.id, `redirect status ${response.status}`);
    }
    if (response.status !== 200) {
      lastReason = `HTTP status ${response.status}`;
      if (RETRYABLE_STATUS.has(response.status) && attempt < retries) {
        const delayMs = responseRetryDelay(response, attempt, nowImpl);
        await discardBody(response);
        await sleepImpl(delayMs);
        continue;
      }
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
      source: Object.freeze({ ...source }),
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
  sleepImpl = sleep,
  nowImpl = Date.now,
  requestIntervalMs = 0,
}) {
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new TypeError("Snapshot commit must be a full SHA");
  if (!Array.isArray(catalog) || catalog.length === 0) throw new TypeError("Snapshot catalog must be non-empty");
  if (typeof fetchImpl !== "function") throw new TypeError("Snapshot fetch implementation is required");
  if (typeof sleepImpl !== "function") throw new TypeError("Snapshot sleep implementation is required");
  if (typeof nowImpl !== "function") throw new TypeError("Snapshot clock implementation is required");
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 4) {
    throw new RangeError("Snapshot concurrency must be between 1 and 4");
  }
  if (!Number.isSafeInteger(retries) || retries < 0 || retries > 2) {
    throw new RangeError("Snapshot retries must be between 0 and 2");
  }
  if (!Number.isSafeInteger(requestIntervalMs) || requestIntervalMs < 0 || requestIntervalMs > 5_000) {
    throw new RangeError("Snapshot request interval must be between 0 and 5000 milliseconds");
  }
  const results = new Array(catalog.length);
  let cursor = 0;
  const startRequest = requestStarter(requestIntervalMs, sleepImpl);
  async function worker() {
    while (cursor < catalog.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await fetchOne(catalog[index], {
        commit,
        fetchImpl,
        maxBytes,
        timeoutMs,
        retries,
        sleepImpl,
        nowImpl,
        startRequest,
      });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, catalog.length) }, () => worker()));
  return new Map(catalog.map((source, index) => [source.id, results[index]]));
}
