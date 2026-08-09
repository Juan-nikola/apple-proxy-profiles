import { createHash } from "node:crypto";

import { parseAuditCidrs } from "./china-ip-audit.js";

const REPOSITORY = "https://github.com/gaoyifan/china-operator-ip";
const OWNER_REPOSITORY = "gaoyifan/china-operator-ip";
const BRANCH = "ip-lists";
const COMMITS_API = `https://api.github.com/repos/${OWNER_REPOSITORY}/commits/${BRANCH}`;
const RAW_ROOT = `https://raw.githubusercontent.com/${OWNER_REPOSITORY}`;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const TIMEOUT_MS = 30_000;
const FILES = Object.freeze(["china.txt", "china6.txt"]);

function timestamp(value, label) {
  const milliseconds = value instanceof Date ? value.getTime() : (
    typeof value === "number" ? value : Date.parse(value)
  );
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${label} is invalid`);
  return Object.freeze({ milliseconds, iso: new Date(milliseconds).toISOString().replace(".000Z", "Z") });
}

function pinnedCommit(commit) {
  if (!commit || typeof commit !== "object" || Array.isArray(commit)
    || typeof commit.sha !== "string" || !/^[0-9a-f]{40}$/u.test(commit.sha)) {
    throw new TypeError("ChinaIP audit commit is invalid");
  }
  const committedAt = timestamp(commit.committedAt, "ChinaIP audit committedAt").iso;
  return Object.freeze({ sha: commit.sha, committedAt });
}

function fetchError(path, reason) {
  return new Error(`ChinaIP audit ${path}: ${reason}`);
}

async function boundedBody(response, path) {
  const declared = response.headers.get("content-length");
  if (declared !== null && (!/^(?:0|[1-9][0-9]*)$/u.test(declared) || Number(declared) > MAX_FILE_BYTES)) {
    throw fetchError(path, "content exceeds byte limit");
  }
  if (!response.body || typeof response.body.getReader !== "function") {
    throw fetchError(path, "response body is unavailable");
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FILE_BYTES) {
      await reader.cancel().catch(() => {});
      throw fetchError(path, "content exceeds byte limit");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

async function fetchFile({ path, commit, fetchImpl }) {
  const url = `${RAW_ROOT}/${commit.sha}/${path}`;
  let response;
  try {
    response = await fetchImpl(url, {
      redirect: "manual",
      headers: { Accept: "text/plain" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw fetchError(path, "network failure");
  }
  if (response.status >= 300 && response.status < 400) {
    throw fetchError(path, `redirect status ${response.status}`);
  }
  if (response.status !== 200) throw fetchError(path, `HTTP status ${response.status}`);
  if (response.headers.has("location")) throw fetchError(path, "unexpected redirect metadata");
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (contentType !== "text/plain" && contentType !== "application/octet-stream") {
    throw fetchError(path, "unexpected content type");
  }
  const bytes = await boundedBody(response, path);
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw fetchError(path, "invalid UTF-8");
  }
  if (!text.trim()) throw fetchError(path, "empty content");
  if (/(?:<!doctype\s+html|<html\b)/iu.test(text)) throw fetchError(path, "HTML content rejected");
  return Object.freeze({
    path,
    bytes,
    text,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

export async function resolveChinaIpAuditCommit(fetchImpl = globalThis.fetch, now = Date.now()) {
  if (typeof fetchImpl !== "function") throw new TypeError("ChinaIP audit resolver requires fetch");
  const validationTime = timestamp(now, "ChinaIP audit resolver time");
  let response;
  try {
    response = await fetchImpl(COMMITS_API, {
      redirect: "manual",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Juan-nikola-apple-proxy-profiles",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new Error("ChinaIP audit resolver network failure");
  }
  if (response.status >= 300 && response.status < 400) {
    throw new Error(`ChinaIP audit resolver redirect status ${response.status}`);
  }
  if (response.status !== 200) throw new Error(`ChinaIP audit resolver HTTP status ${response.status}`);
  if (response.headers.has("location")) throw new Error("ChinaIP audit resolver returned redirect metadata");
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("ChinaIP audit resolver returned invalid JSON");
  }
  if (typeof payload?.sha !== "string" || !/^[0-9a-f]{40}$/u.test(payload.sha)) {
    throw new Error("ChinaIP audit resolver returned an invalid commit");
  }
  let committedAt;
  try {
    committedAt = timestamp(payload?.commit?.committer?.date, "ChinaIP audit commit time");
  } catch {
    throw new Error("ChinaIP audit resolver returned an invalid commit time");
  }
  if (committedAt.milliseconds > validationTime.milliseconds) {
    throw new Error("ChinaIP audit resolver returned a future commit time");
  }
  return Object.freeze({ sha: payload.sha, committedAt: committedAt.iso });
}

export async function fetchChinaIpAuditSnapshot({ commit, fetchImpl = globalThis.fetch } = {}) {
  const pinned = pinnedCommit(commit);
  if (typeof fetchImpl !== "function") throw new TypeError("ChinaIP audit snapshot requires fetch");
  const fetched = [];
  for (const path of FILES) fetched.push(await fetchFile({ path, commit: pinned, fetchImpl }));
  const entries = parseAuditCidrs({
    ipv4Text: fetched[0].text,
    ipv6Text: fetched[1].text,
    sourceId: "ChinaIP-audit",
  });
  const files = Object.freeze(fetched.map(({ path, sha256, bytes }) => Object.freeze({
    path,
    sha256,
    bytes: bytes.byteLength,
  })));
  return Object.freeze({
    source: Object.freeze({
      repository: REPOSITORY,
      branch: BRANCH,
      commit: pinned.sha,
      committedAt: pinned.committedAt,
      license: "MIT",
      files,
    }),
    entries,
    sha256: createHash("sha256").update(fetched[0].bytes).update(fetched[1].bytes).digest("hex"),
  });
}
