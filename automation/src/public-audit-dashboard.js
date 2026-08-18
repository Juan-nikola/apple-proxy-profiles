import { artifactSha256 } from "./artifact-content.js";
import { canonicalJson } from "./render-anywhere-rules.js";
import { allClientIds, clientAdapter } from "../../shared/release/client-catalog.js";

const CHANNELS = Object.freeze(["edge", "current", "previous"]);
const REPORT_KEYS = Object.freeze([
  "schemaVersion",
  "generatedAt",
  "privateDataExcluded",
  "upstream",
  "audits",
  "channels",
  "clients",
  "rules",
  "blockers",
]);
const SOURCE_KEYS = Object.freeze(["repository", "commit", "committedAt", "sha256"]);
const AUDIT_KEYS = Object.freeze(["schemaVersion", "reportOnly", "warningCount", "blockerCount", "sha256"]);
const CHANNEL_KEYS = Object.freeze(["closure", "manifestCount"]);
const CLIENT_KEYS = Object.freeze(["state", "adapterSchema", "edge", "current", "previous", "canary"]);
const CLIENT_CHANNEL_KEYS = Object.freeze(["manifestHash", "closure"]);
const RULE_KEYS = Object.freeze(["sources", "entries", "phases", "semanticTargets"]);
const BLOCKER_KEYS = Object.freeze(["key", "severity", "firstSeenAt", "lastRecoveredAt", "issueNumber"]);
const SHA256 = /^[0-9a-f]{64}$/u;
const SHA1 = /^[0-9a-f]{40}$/u;
const SAFE_CODE = /^[a-z][a-z0-9._:/-]{0,96}$/u;
const SECRET_SHAPE = /(?:password|passwd|secret|token|uuid|psk|private[-_ ]?key|subscription|node(?:s)?\s*[:=/]|vmess|vless|ss:\/\/|trojan:\/\/)/iu;

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
}

function assertClosed(value, keys, label) {
  assertObject(value, label);
  const allowed = new Set(keys);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new TypeError(`${label} contains unknown key: ${key}`);
  for (const key of keys) if (!Object.hasOwn(value, key)) throw new TypeError(`${label} is missing key: ${key}`);
}

function timestamp(value, label, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new TypeError(`${label} must be an ISO timestamp`);
  return value;
}

function sha(value, label, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || !SHA256.test(value)) throw new TypeError(`${label} must be a SHA-256 digest`);
  return value;
}

function commit(value, label, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || !SHA1.test(value)) throw new TypeError(`${label} must be a full SHA`);
  return value;
}

function count(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative integer`);
  return value;
}

function safeString(value, label, { allowUrl = false } = {}) {
  if (typeof value !== "string" || value.trim() !== value || /[\r\n]/u.test(value)) throw new TypeError(`${label} is invalid`);
  if (!allowUrl && SECRET_SHAPE.test(value)) throw new Error(`${label} contains a secret-shaped value`);
  return value;
}

function auditSummary(value, label) {
  assertClosed(value, AUDIT_KEYS, label);
  count(value.schemaVersion, `${label}.schemaVersion`);
  if (typeof value.reportOnly !== "boolean") throw new TypeError(`${label}.reportOnly is invalid`);
  count(value.warningCount, `${label}.warningCount`);
  count(value.blockerCount, `${label}.blockerCount`);
  sha(value.sha256, `${label}.sha256`, true);
}

function channelSummary(value, label) {
  assertClosed(value, CHANNEL_KEYS, label);
  if (value.closure !== true) throw new Error(`${label} is not closed`);
  count(value.manifestCount, `${label}.manifestCount`);
}

function emptyChannel() {
  return { manifestHash: null, closure: true };
}

function normalizeChannel(value, label, planned = false) {
  if (value === undefined || value === null) return emptyChannel();
  assertClosed(value, CLIENT_CHANNEL_KEYS, label);
  if (planned && value.manifestHash !== null) throw new Error(`${label} planned client cannot have a manifest`);
  if (value.manifestHash !== null && !SHA256.test(value.manifestHash)) throw new TypeError(`${label}.manifestHash is invalid`);
  if (value.closure !== true) throw new Error(`${label} is not closed`);
  return { manifestHash: value.manifestHash, closure: true };
}

function extractClientChannel(releaseState, channel, client) {
  const state = releaseState?.channels?.[channel];
  if (!state || typeof state !== "object") return undefined;
  const candidate = state.clients?.[client] ?? state[client];
  if (typeof candidate === "string") return { manifestHash: candidate, closure: true };
  if (candidate && typeof candidate === "object") return candidate;
  return undefined;
}

function extractCanary(canaryState, client) {
  const value = canaryState?.[client];
  if (value === undefined) return null;
  if (typeof value === "string") return { edge: value };
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`Canary state for ${client} is invalid`);
  const result = {};
  for (const [channel, status] of Object.entries(value)) {
    if (!CHANNELS.includes(channel) || !SAFE_CODE.test(status)) throw new TypeError(`Canary state for ${client} is invalid`);
    result[channel] = status;
  }
  return result;
}

function normalizeAudit(value, label) {
  assertObject(value, label);
  return {
    schemaVersion: Number.isSafeInteger(value.schemaVersion) ? value.schemaVersion : 0,
    reportOnly: value.reportOnly === true,
    warningCount: Array.isArray(value.warnings) ? value.warnings.length : 0,
    blockerCount: Array.isArray(value.blockers) ? value.blockers.length : 0,
    sha256: typeof value.sha256 === "string" && SHA256.test(value.sha256) ? value.sha256 : null,
  };
}

function normalizeBlocker(value) {
  assertObject(value, "blocker");
  const key = safeString(value.key, "blocker.key");
  if (!SAFE_CODE.test(key) || SECRET_SHAPE.test(key)) throw new Error("blocker key is invalid");
  if (!["blocker", "warning"].includes(value.severity)) throw new TypeError("blocker severity is invalid");
  const firstSeenAt = value.firstSeenAt === null ? null : timestamp(value.firstSeenAt, "blocker.firstSeenAt", true);
  const lastRecoveredAt = value.lastRecoveredAt === null ? null : timestamp(value.lastRecoveredAt, "blocker.lastRecoveredAt", true);
  const issueNumber = value.issueNumber === null ? null : count(value.issueNumber, "blocker.issueNumber");
  return { key, severity: value.severity, firstSeenAt, lastRecoveredAt, issueNumber };
}

export function buildPublicAuditDashboard({
  generatedAt,
  upstream,
  chinaIpAudit,
  v2flyDomainAudit,
  routingPlanAudit,
  clientCatalog = [],
  releaseState = {},
  canaryState = {},
  blockers = [],
} = {}) {
  assertObject(upstream, "dashboard upstream");
  const catalogById = new Map(clientCatalog.filter((item) => item && typeof item.id === "string").map((item) => [item.id, item]));
  const clients = {};
  for (const id of allClientIds()) {
    const adapter = clientAdapter(id);
    const supplied = catalogById.get(id) ?? {};
    const state = supplied.state ?? adapter.state;
    const adapterSchema = supplied.adapterSchema ?? adapter.adapterSchema;
    if (!["active", "planned"].includes(state)) throw new TypeError(`dashboard client ${id} state is invalid`);
    const planned = state === "planned";
    clients[id] = {
      state,
      adapterSchema: safeString(adapterSchema, `dashboard client ${id} adapterSchema`),
      edge: normalizeChannel(extractClientChannel(releaseState, "edge", id), `dashboard client ${id}.edge`, planned),
      current: normalizeChannel(extractClientChannel(releaseState, "current", id), `dashboard client ${id}.current`, planned),
      previous: normalizeChannel(extractClientChannel(releaseState, "previous", id), `dashboard client ${id}.previous`, planned),
      canary: extractCanary(canaryState, id),
    };
  }
  const channels = {};
  for (const channel of CHANNELS) {
    const state = releaseState.channels?.[channel] ?? {};
    channels[channel] = {
      closure: state.closure === undefined ? true : state.closure === true,
      manifestCount: Number.isSafeInteger(state.manifestCount)
        ? state.manifestCount
        : Object.values(clients).filter((client) => client[channel].manifestHash !== null).length,
    };
  }
  const report = {
    schemaVersion: 1,
    generatedAt: timestamp(generatedAt, "dashboard generatedAt"),
    privateDataExcluded: true,
    upstream: {
      repository: safeString(upstream.repository, "dashboard upstream.repository", { allowUrl: true }),
      commit: commit(upstream.commit, "dashboard upstream.commit"),
      committedAt: upstream.committedAt === undefined || upstream.committedAt === null
        ? null
        : timestamp(upstream.committedAt, "dashboard upstream.committedAt"),
      sha256: upstream.sha256 === undefined || upstream.sha256 === null ? null : sha(upstream.sha256, "dashboard upstream.sha256"),
    },
    audits: {
      chinaIp: normalizeAudit(chinaIpAudit ?? {}, "dashboard ChinaIP audit"),
      v2fly: normalizeAudit(v2flyDomainAudit ?? {}, "dashboard v2fly audit"),
      routingPlan: normalizeAudit(routingPlanAudit ?? {}, "dashboard routing audit"),
    },
    channels,
    clients,
    rules: {
      sources: Number.isSafeInteger(routingPlanAudit?.totals?.sources) ? routingPlanAudit.totals.sources : 0,
      entries: Number.isSafeInteger(routingPlanAudit?.totals?.entries) ? routingPlanAudit.totals.entries : 0,
      phases: Array.isArray(routingPlanAudit?.phases) ? routingPlanAudit.phases.length : 0,
      semanticTargets: Number.isSafeInteger(releaseState.semanticTargets) ? releaseState.semanticTargets : 0,
    },
    blockers: blockers.map(normalizeBlocker).sort((left, right) => left.key.localeCompare(right.key)),
  };
  validatePublicAuditDashboard(report);
  return Object.freeze(report);
}

export function validatePublicAuditDashboard(report) {
  assertClosed(report, REPORT_KEYS, "dashboard");
  if (report.schemaVersion !== 1) throw new TypeError("dashboard schemaVersion must be 1");
  timestamp(report.generatedAt, "dashboard generatedAt");
  if (report.privateDataExcluded !== true) throw new Error("dashboard privateDataExcluded must be true");
  assertClosed(report.upstream, SOURCE_KEYS, "dashboard upstream");
  safeString(report.upstream.repository, "dashboard upstream.repository", { allowUrl: true });
  commit(report.upstream.commit, "dashboard upstream.commit");
  timestamp(report.upstream.committedAt, "dashboard upstream.committedAt", true);
  sha(report.upstream.sha256, "dashboard upstream.sha256", true);
  assertClosed(report.audits, ["chinaIp", "v2fly", "routingPlan"], "dashboard audits");
  for (const [key, value] of Object.entries(report.audits)) auditSummary(value, `dashboard audits.${key}`);
  assertClosed(report.channels, CHANNELS, "dashboard channels");
  for (const channel of CHANNELS) channelSummary(report.channels[channel], `dashboard channels.${channel}`);
  assertClosed(report.clients, allClientIds(), "dashboard clients");
  for (const id of allClientIds()) {
    const value = report.clients[id];
    assertClosed(value, CLIENT_KEYS, `dashboard clients.${id}`);
    if (!["active", "planned"].includes(value.state)) throw new TypeError(`dashboard clients.${id}.state is invalid`);
    safeString(value.adapterSchema, `dashboard clients.${id}.adapterSchema`);
    const planned = value.state === "planned";
    for (const channel of CHANNELS) normalizeChannel(value[channel], `dashboard clients.${id}.${channel}`, planned);
    if (value.canary !== null) {
      assertObject(value.canary, `dashboard clients.${id}.canary`);
      for (const [channel, status] of Object.entries(value.canary)) {
        if (!CHANNELS.includes(channel) || !SAFE_CODE.test(status)) throw new Error(`dashboard clients.${id}.canary is invalid`);
      }
    }
  }
  assertClosed(report.rules, RULE_KEYS, "dashboard rules");
  for (const key of RULE_KEYS) count(report.rules[key], `dashboard rules.${key}`);
  if (!Array.isArray(report.blockers)) throw new TypeError("dashboard blockers must be an array");
  const keys = new Set();
  for (const blocker of report.blockers) {
    const normalized = normalizeBlocker(blocker);
    if (keys.has(normalized.key)) throw new Error("dashboard blocker keys must be unique");
    keys.add(normalized.key);
  }
  if (report.channels.edge.closure !== true || report.channels.current.closure !== true || report.channels.previous.closure !== true) {
    throw new Error("dashboard channel closure is incomplete");
  }
  return true;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderPublicAuditDashboard(report) {
  validatePublicAuditDashboard(report);
  const clients = allClientIds().map((id) => {
    const client = report.clients[id];
    return `<tr><td>${escapeHtml(id)}</td><td>${escapeHtml(client.state)}</td><td>${escapeHtml(client.adapterSchema)}</td><td>${escapeHtml(client.edge.manifestHash ?? "—")}</td><td>${escapeHtml(client.current.manifestHash ?? "—")}</td><td>${escapeHtml(client.previous.manifestHash ?? "—")}</td></tr>`;
  }).join("");
  const warnings = Object.entries(report.audits)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, audit]) => `<li>${escapeHtml(id)} warnings: ${audit.warningCount}, blockers: ${audit.blockerCount}</li>`)
    .join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>公开审计看板</title></head><body><main><h1>公开审计看板</h1><p>生成时间：<code>${escapeHtml(report.generatedAt)}</code></p><p>生产规则源：<code>${escapeHtml(report.upstream.repository)}</code>，commit <code>${escapeHtml(report.upstream.commit)}</code></p><p>公开页不包含私密节点、策略正文或凭据。</p><h2>审计摘要</h2><ul>${warnings}</ul><h2>客户端发布状态</h2><table><thead><tr><th>客户端</th><th>状态</th><th>适配器</th><th>edge</th><th>current</th><th>previous</th></tr></thead><tbody>${clients}</tbody></table></main></body></html>\n`;
}
