import { createHash } from "node:crypto";

const REPOSITORY = "https://github.com/v2fly/domain-list-community";
const OWNER_REPOSITORY = "v2fly/domain-list-community";
const BRANCH = "master";
const COMMITS_API = `https://api.github.com/repos/${OWNER_REPOSITORY}/commits/${BRANCH}`;
const RAW_ROOT = `https://raw.githubusercontent.com/${OWNER_REPOSITORY}`;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 512;
const MAX_DEPTH = 16;
const TIMEOUT_MS = 30_000;
const SAFE_PATH = /^[A-Za-z0-9._/!-]+$/u;
const ENTRY_KINDS = new Map([
  ["domain", "domainSuffix"],
  ["full", "domain"],
  ["keyword", "domainKeyword"],
  ["regexp", "regexp"],
]);

function timestamp(value, label) {
  const millis = value instanceof Date ? value.getTime() : (
    typeof value === "number" ? value : Date.parse(value)
  );
  if (!Number.isFinite(millis)) throw new TypeError(`${label} is invalid`);
  return Object.freeze({ millis, iso: new Date(millis).toISOString().replace(".000Z", "Z") });
}

function pinnedCommit(commit) {
  if (typeof commit === "string") {
    if (!/^[0-9a-f]{40}$/u.test(commit)) throw new TypeError("v2fly audit commit is invalid");
    return Object.freeze({ sha: commit, committedAt: null });
  }
  if (!commit || typeof commit !== "object" || Array.isArray(commit)
    || typeof commit.sha !== "string" || !/^[0-9a-f]{40}$/u.test(commit.sha)) {
    throw new TypeError("v2fly audit commit is invalid");
  }
  const committedAt = commit.committedAt === null || commit.committedAt === undefined
    ? null
    : timestamp(commit.committedAt, "v2fly audit committedAt").iso;
  return Object.freeze({ sha: commit.sha, committedAt });
}

function fetchError(path, reason) {
  return new Error(`v2fly domain audit ${path}: ${reason}`);
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
  if (response.status >= 300 && response.status < 400) throw fetchError(path, `redirect status ${response.status}`);
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
    text,
    bytes,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

function safeIncludePath(raw) {
  if (typeof raw !== "string" || !raw || raw.startsWith("/") || raw.includes("\\")
    || raw.split("/").some((segment) => !segment || segment === "." || segment === "..")
    || !SAFE_PATH.test(raw)) {
    throw new Error("v2fly domain audit include path is unsafe");
  }
  const path = raw.startsWith("data/") ? raw : `data/${raw}`;
  if (!SAFE_PATH.test(path) || path.split("/").some((segment) => segment === ".." || !segment)) {
    throw new Error("v2fly domain audit include path is unsafe");
  }
  return path;
}

function validateAttributes(attributes, path) {
  for (const attribute of attributes) {
    if (!/^@[!-~]+$/u.test(attribute)) throw fetchError(path, "rule attribute is invalid");
  }
  return Object.freeze(attributes);
}

function stripInlineComment(line) {
  return line.replace(/\s+#.*$/u, "").trim();
}

function parseSourceLines(text, path) {
  const entries = [];
  const includes = [];
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = stripInlineComment(rawLine.trim());
    if (!line || line.startsWith("#")) continue;
    const match = /^(?:(domain|full|keyword|regexp|include):)?([^\s]+)(?:\s+(.+))?$/u.exec(line);
    if (!match) throw fetchError(path, "unknown or malformed rule syntax");
    let [, kind, value, rawAttributes = ""] = match;
    if (!kind) {
      if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.?$/iu.test(value)) {
        throw fetchError(path, "unknown or malformed rule syntax");
      }
      kind = "domain";
    }
    const attributes = validateAttributes(rawAttributes ? rawAttributes.trim().split(/\s+/u) : [], path);
    if (kind === "include") {
      includes.push(Object.freeze({ path: safeIncludePath(value), attributes: Object.freeze(attributes) }));
      continue;
    }
    const normalizedValue = kind === "regexp" ? value : value.toLowerCase().replace(/\.$/u, "");
    if (!normalizedValue || /[\r\n\0]/u.test(normalizedValue)) throw fetchError(path, "rule value is invalid");
    entries.push(Object.freeze({
      kind: ENTRY_KINDS.get(kind),
      value: normalizedValue,
      attributes: Object.freeze(attributes),
      sourcePath: path,
    }));
  }
  return Object.freeze({ entries: Object.freeze(entries), includes: Object.freeze(includes) });
}

export function parseV2flyDomainList({ text, path = "data/cn" } = {}) {
  if (typeof text !== "string" || typeof path !== "string" || !path) {
    throw new TypeError("v2fly domain list text and path are required");
  }
  return parseSourceLines(text, path).entries;
}

export async function resolveV2flyAuditCommit(fetchImpl = globalThis.fetch, now = Date.now()) {
  if (typeof fetchImpl !== "function") throw new TypeError("v2fly audit resolver requires fetch");
  const validationTime = timestamp(now, "v2fly audit resolver time");
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
    throw new Error("v2fly audit resolver network failure");
  }
  if (response.status >= 300 && response.status < 400) throw new Error(`v2fly audit resolver redirect status ${response.status}`);
  if (response.status !== 200) throw new Error(`v2fly audit resolver HTTP status ${response.status}`);
  if (response.headers.has("location")) throw new Error("v2fly audit resolver returned redirect metadata");
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("v2fly audit resolver returned invalid JSON");
  }
  if (typeof payload?.sha !== "string" || !/^[0-9a-f]{40}$/u.test(payload.sha)) {
    throw new Error("v2fly audit resolver returned an invalid commit");
  }
  const committedAt = timestamp(payload?.commit?.committer?.date, "v2fly audit commit time");
  if (committedAt.millis > validationTime.millis) throw new Error("v2fly audit resolver returned a future commit time");
  return Object.freeze({ sha: payload.sha, committedAt: committedAt.iso });
}

export async function fetchV2flyDomainAuditSnapshot({ commit, fetchImpl = globalThis.fetch } = {}) {
  const pinned = pinnedCommit(commit);
  if (typeof fetchImpl !== "function") throw new TypeError("v2fly audit snapshot requires fetch");
  const parsedByPath = new Map();
  const fetchedByPath = new Map();
  const queue = [{ path: "data/cn", depth: 0, selector: [], ancestors: [] }];
  const fetched = [];
  const entries = [];
  let totalBytes = 0;
  const matchesAttributes = (attributes, selector) => selector.every((token) => {
    const negative = token.startsWith("@-");
    const name = negative ? `@${token.slice(2)}` : token;
    const present = attributes.includes(name);
    return negative ? !present : present;
  });
  while (queue.length > 0) {
    const item = queue.shift();
    if (item.depth > MAX_DEPTH) throw new Error("v2fly domain audit include depth exceeded");
    if (item.ancestors.includes(item.path)) throw new Error("v2fly domain audit include cycle detected");
    let parsed = parsedByPath.get(item.path);
    if (!parsed) {
      if (fetchedByPath.size >= MAX_FILES) throw new Error("v2fly domain audit include file limit exceeded");
      const file = await fetchFile({ path: item.path, commit: pinned, fetchImpl });
      totalBytes += file.bytes.byteLength;
      if (totalBytes > MAX_TOTAL_BYTES) throw new Error("v2fly domain audit total byte limit exceeded");
      fetchedByPath.set(item.path, file);
      fetched.push(file);
      parsed = parseSourceLines(file.text, item.path);
      parsedByPath.set(item.path, parsed);
    }
    for (const entry of parsed.entries) {
      if (matchesAttributes(entry.attributes, item.selector)) entries.push(entry);
    }
    const ancestors = [...item.ancestors, item.path];
    for (const include of parsed.includes) {
      if (ancestors.includes(include.path)) throw new Error("v2fly domain audit include cycle detected");
      queue.push({ path: include.path, depth: item.depth + 1, selector: include.attributes, ancestors });
    }
  }
  const uniqueEntries = [];
  const entryKeys = new Set();
  for (const entry of entries) {
    const key = `${entry.kind}\u0000${entry.value}\u0000${entry.attributes.join(" ")}`;
    if (entryKeys.has(key)) continue;
    entryKeys.add(key);
    uniqueEntries.push(Object.freeze({
      kind: entry.kind,
      value: entry.value,
      attributes: entry.attributes,
    }));
  }
  const digest = createHash("sha256");
  for (const file of [...fetched].sort((left, right) => left.path.localeCompare(right.path))) digest.update(file.bytes);
  return Object.freeze({
    source: Object.freeze({
      repository: REPOSITORY,
      branch: BRANCH,
      commit: pinned.sha,
      committedAt: pinned.committedAt,
      license: "MIT",
    }),
    files: Object.freeze(fetched.map(({ path, bytes, sha256 }) => Object.freeze({ path, bytes: bytes.byteLength, sha256 }))),
    entries: Object.freeze(uniqueEntries),
    sha256: digest.digest("hex"),
  });
}

export const V2FLY_AUDIT_LIMITS = Object.freeze({ maxFileBytes: MAX_FILE_BYTES, maxTotalBytes: MAX_TOTAL_BYTES, maxFiles: MAX_FILES, maxDepth: MAX_DEPTH });
