import { createHash } from "node:crypto";

import { parseExternalRuleSource } from "./rule-sources/adapter-contract.js";
import { EXTERNAL_RULE_SOURCE_CATALOG, validateExternalSourceCatalog } from "../../shared/rules/external-sources.js";

const MAX_SOURCE_BYTES = 128 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;
const RELEASE_ASSET_HOST = "release-assets.githubusercontent.com";

function rawReleaseUrl(source) {
  const repository = new URL(source.repository);
  const [, owner, repo] = repository.pathname.split("/");
  return new URL(`https://raw.githubusercontent.com/${owner}/${repo}/${source.branch}/${source.sourcePath}`);
}

function sourceError(sourceId, reason) {
  return new Error(`External rule source ${sourceId}: ${reason}`);
}

function sleep(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function sourceUrl(source) {
  let url;
  try {
    url = new URL(source.retrievalUrl);
  } catch {
    throw sourceError(source.id, "retrieval URL is invalid");
  }
  const repository = new URL(source.repository);
  const expectedPath = `${repository.pathname}/releases/download/${source.releaseTag}/${source.sourcePath}`;
  if (url.protocol !== "https:" || url.hostname !== "github.com" || url.port
    || url.username || url.password || url.search || url.hash
    || url.pathname !== expectedPath) {
    throw sourceError(source.id, "retrieval URL is outside the pinned release");
  }
  return url;
}

function releaseAssetUrl(location, sourceUrlValue, sourceId) {
  let url;
  try {
    url = new URL(location, sourceUrlValue);
  } catch {
    throw sourceError(sourceId, "release redirect is invalid");
  }
  if (url.protocol !== "https:" || url.hostname !== RELEASE_ASSET_HOST || url.port
    || url.username || url.password || url.hash || !url.search
    || !url.pathname.startsWith("/github-production-release-asset/")) {
    throw sourceError(sourceId, "release redirect is outside the GitHub asset host");
  }
  return url;
}

async function discardBody(response) {
  if (response?.body && typeof response.body.cancel === "function") {
    await response.body.cancel().catch(() => {});
  }
}

async function boundedBody(response, sourceId, maxBytes) {
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

function contentType(response, sourceId) {
  const value = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (value !== "text/plain" && value !== "application/octet-stream") {
    throw sourceError(sourceId, "unexpected content type");
  }
}

async function fetchOne(source, {
  fetchImpl,
  maxBytes,
  timeoutMs,
}) {
  const pinned = sourceUrl(source);
  let response;
  try {
    response = await fetchImpl(pinned, {
      redirect: "manual",
      headers: { Accept: "text/plain, application/octet-stream" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    const fallback = rawReleaseUrl(source);
    if (fallback === null) throw sourceError(source.id, "network failure");
    try {
      response = await fetchImpl(fallback, {
        redirect: "error",
        headers: { Accept: "text/plain, application/octet-stream" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw sourceError(source.id, "network failure");
    }
  }
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    await discardBody(response);
    if (!location) throw sourceError(source.id, "release redirect is missing");
    const redirected = releaseAssetUrl(location, pinned, source.id);
    try {
      response = await fetchImpl(redirected, {
        redirect: "manual",
        headers: { Accept: "text/plain, application/octet-stream" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw sourceError(source.id, "release asset network failure");
    }
  }
  if (response.status >= 300 && response.status < 400) {
    await discardBody(response);
    throw sourceError(source.id, "release asset redirected more than once");
  }
  if (response.status !== 200) {
    await discardBody(response);
    throw sourceError(source.id, `HTTP status ${response.status}`);
  }
  if (response.headers.has("location")) {
    await discardBody(response);
    throw sourceError(source.id, "unexpected redirect metadata");
  }
  contentType(response, source.id);
  const bytes = await boundedBody(response, source.id, maxBytes);
  if (bytes.length === 0) throw sourceError(source.id, "empty content");
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== source.sha256) throw sourceError(source.id, "SHA-256 does not match catalog");
  let input = bytes;
  if (["v2fly-domain-list", "clash-rules-yaml"].includes(source.adapter)) {
    try {
      input = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      throw sourceError(source.id, "invalid UTF-8");
    }
  }
  try {
    return parseExternalRuleSource({
      source,
      text: input,
      sourceSha256: digest,
      retrievedAt: source.retrievedAt,
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("External source ")) {
      throw error;
    }
    throw sourceError(source.id, "payload failed adapter validation");
  }
}

export async function fetchExternalRuleSnapshots({
  catalog = EXTERNAL_RULE_SOURCE_CATALOG,
  fetchImpl = globalThis.fetch,
  maxBytes = MAX_SOURCE_BYTES,
  timeoutMs = REQUEST_TIMEOUT_MS,
  requestIntervalMs = 250,
  sleepImpl = sleep,
} = {}) {
  validateExternalSourceCatalog(catalog);
  if (typeof fetchImpl !== "function") throw new TypeError("External rule source fetch implementation is required");
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_SOURCE_BYTES) {
    throw new RangeError("External rule source byte limit is invalid");
  }
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    throw new RangeError("External rule source timeout is invalid");
  }
  if (!Number.isSafeInteger(requestIntervalMs) || requestIntervalMs < 0 || requestIntervalMs > 5_000) {
    throw new RangeError("External rule source request interval is invalid");
  }
  if (typeof sleepImpl !== "function") throw new TypeError("External rule source sleep implementation is required");
  const snapshots = new Map();
  let started = false;
  for (const source of catalog) {
    if (started && requestIntervalMs > 0) await sleepImpl(requestIntervalMs);
    started = true;
    snapshots.set(source.id, await fetchOne(source, { fetchImpl, maxBytes, timeoutMs }));
  }
  return snapshots;
}
