const API_ROOT = "https://api.github.com";
const LABEL = "audit-blocker";
const MARKER_PREFIX = "<!-- apple-proxy-audit-key:";
const MARKER_SUFFIX = " -->";
const SAFE_PART = /^[A-Za-z0-9_.-]+$/u;
const SAFE_KEY = /^[a-z][a-z0-9._:/-]{0,96}$/u;
const SECRET_SHAPE = /(?:password|passwd|secret|token|uuid|psk|private[-_ ]?key|subscription|vmess|vless|ss:\/\/|trojan:\/\/)/iu;

function required(value, label) {
  if (typeof value !== "string" || !value || value.trim() !== value || /[\r\n]/u.test(value)) {
    throw new TypeError(`${label} is required`);
  }
  return value;
}

function repositoryPart(value, label) {
  const result = required(value, label);
  if (!SAFE_PART.test(result)) throw new TypeError(`${label} is invalid`);
  return result;
}

function validateResponse(value, label) {
  const serialized = JSON.stringify(value);
  if (SECRET_SHAPE.test(serialized)) throw new Error(`${label} contains a secret-shaped value`);
  return value;
}

function validateBlocker(blocker) {
  if (!blocker || typeof blocker !== "object" || Array.isArray(blocker)) throw new TypeError("Audit blocker must be an object");
  const key = required(blocker.key, "Audit blocker key");
  if (!SAFE_KEY.test(key) || SECRET_SHAPE.test(key)) throw new Error("Audit blocker key is unsafe");
  if (blocker.severity !== "blocker") return null;
  const firstSeenAt = required(blocker.firstSeenAt, `Audit blocker ${key} firstSeenAt`);
  if (Number.isNaN(Date.parse(firstSeenAt))) throw new TypeError(`Audit blocker ${key} firstSeenAt is invalid`);
  const lastSeenAt = blocker.lastSeenAt ?? blocker.lastFoundAt ?? firstSeenAt;
  if (typeof lastSeenAt !== "string" || Number.isNaN(Date.parse(lastSeenAt))) throw new TypeError(`Audit blocker ${key} lastSeenAt is invalid`);
  const dashboardPath = blocker.dashboardPath ?? "audit/dashboard.json";
  if (typeof dashboardPath !== "string" || !/^audit\/[A-Za-z0-9._/-]+$/u.test(dashboardPath) || dashboardPath.includes("..")) {
    throw new TypeError(`Audit blocker ${key} dashboard path is invalid`);
  }
  return Object.freeze({ key, severity: "blocker", firstSeenAt, lastSeenAt, dashboardPath });
}

function markerFor(key) {
  return `${MARKER_PREFIX}${key}${MARKER_SUFFIX}`;
}

function issueBody(blocker) {
  return `${markerFor(blocker.key)}\n\n## Audit blocker: ${blocker.key}\n\n- Severity: blocker\n- First seen: ${blocker.firstSeenAt}\n- Last seen: ${blocker.lastSeenAt}\n- Dashboard: ${blocker.dashboardPath}\n`;
}

function issueTitle(blocker) {
  return `Audit blocker: ${blocker.key}`;
}

function issueMarker(body) {
  if (typeof body !== "string") return null;
  const pattern = /<!-- apple-proxy-audit-key:([a-z][a-z0-9._:/-]{0,96}) -->/gu;
  const match = pattern.exec(body);
  return match?.[1] ?? null;
}

function normalizeIssue(issue) {
  if (!issue || typeof issue !== "object" || Array.isArray(issue)) throw new Error("GitHub issue response is invalid");
  if (!Number.isSafeInteger(issue.number) || issue.number < 1 || issue.state !== "open") {
    throw new Error("GitHub issue response has invalid number or state");
  }
  if (issue.body !== null && typeof issue.body !== "string") throw new Error("GitHub issue body is invalid");
  const labels = Array.isArray(issue.labels) ? issue.labels : [];
  if (labels.some((label) => !label || typeof label !== "object" || typeof label.name !== "string")) {
    throw new Error("GitHub issue labels are invalid");
  }
  const marker = issueMarker(issue.body ?? "");
  if (issue.body && SECRET_SHAPE.test(issue.body)) throw new Error("GitHub issue body contains a secret-shaped value");
  return Object.freeze({
    number: issue.number,
    state: issue.state,
    title: typeof issue.title === "string" ? issue.title : "",
    body: issue.body ?? "",
    marker,
    auditLabel: labels.some(({ name }) => name === LABEL),
  });
}

async function request({ owner, repo, token, path, method = "GET", body, fetchImpl }) {
  const init = {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
      "User-Agent": "apple-proxy-audit-blocker",
    },
  };
  if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetchImpl(`${API_ROOT}/repos/${owner}/${repo}${path}`, init);
  } catch {
    throw new Error(`GitHub issue ${method} ${path} network failure`);
  }
  if (!response || response.status < 200 || response.status >= 300) {
    throw new Error(`GitHub issue ${method} ${path} HTTP ${response?.status ?? "unknown"}`);
  }
  let payload;
  try { payload = await response.json(); } catch { throw new Error(`GitHub issue ${method} ${path} returned invalid JSON`); }
  return validateResponse(payload, `GitHub issue ${method} ${path}`);
}

export async function synchronizeAuditBlockerIssues({
  owner,
  repo,
  token,
  blockers = [],
  fetchImpl = globalThis.fetch,
  now = new Date(),
} = {}) {
  const safeOwner = repositoryPart(owner, "GitHub owner");
  const safeRepo = repositoryPart(repo, "GitHub repository");
  const safeToken = required(token, "GitHub token");
  if (typeof fetchImpl !== "function") throw new TypeError("GitHub issue fetch is required");
  const nowIso = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  if (Number.isNaN(Date.parse(nowIso))) throw new TypeError("Audit blocker sync time is invalid");
  if (!Array.isArray(blockers)) throw new TypeError("Audit blockers must be an array");
  const active = new Map();
  for (const item of blockers) {
    const normalized = validateBlocker(item);
    if (!normalized) continue;
    if (active.has(normalized.key)) throw new Error(`Duplicate audit blocker key: ${normalized.key}`);
    active.set(normalized.key, normalized);
  }

  const issuesPayload = await request({
    owner: safeOwner,
    repo: safeRepo,
    token: safeToken,
    path: `/issues?state=open&labels=${LABEL}&per_page=100&page=1`,
    fetchImpl,
  });
  if (!Array.isArray(issuesPayload)) throw new Error("GitHub open issues response must be an array");
  const issues = issuesPayload
    .map(normalizeIssue)
    .filter((issue) => issue.auditLabel && issue.marker !== null)
    .sort((left, right) => left.number - right.number);
  const byKey = new Map();
  for (const issue of issues) {
    const list = byKey.get(issue.marker) ?? [];
    list.push(issue);
    byKey.set(issue.marker, list);
  }

  let created = 0;
  let updated = 0;
  let closed = 0;
  let deduplicated = 0;
  for (const [key, blocker] of active) {
    const matches = byKey.get(key) ?? [];
    const canonical = matches[0];
    if (!canonical) {
      const payload = await request({
        owner: safeOwner,
        repo: safeRepo,
        token: safeToken,
        path: "/issues",
        method: "POST",
        body: { title: issueTitle(blocker), body: issueBody(blocker), labels: [LABEL] },
        fetchImpl,
      });
      if (!payload || !Number.isSafeInteger(payload.number)) throw new Error("GitHub issue create response is invalid");
      created += 1;
    } else {
      const body = issueBody(blocker);
      if (canonical.title !== issueTitle(blocker) || canonical.body !== body) {
        await request({
          owner: safeOwner,
          repo: safeRepo,
          token: safeToken,
          path: `/issues/${canonical.number}`,
          method: "PATCH",
          body: { title: issueTitle(blocker), body, state: "open", labels: [LABEL] },
          fetchImpl,
        });
        updated += 1;
      }
    }
    for (const duplicate of matches.slice(1)) {
      await request({
        owner: safeOwner,
        repo: safeRepo,
        token: safeToken,
        path: `/issues/${duplicate.number}`,
        method: "PATCH",
        body: { state: "closed" },
        fetchImpl,
      });
      closed += 1;
      deduplicated += 1;
    }
  }
  for (const [key, matches] of byKey) {
    if (active.has(key)) continue;
    for (const issue of matches) {
      await request({
        owner: safeOwner,
        repo: safeRepo,
        token: safeToken,
        path: `/issues/${issue.number}`,
        method: "PATCH",
        body: { state: "closed" },
        fetchImpl,
      });
      closed += 1;
    }
  }
  return Object.freeze({ created, updated, closed, deduplicated });
}
