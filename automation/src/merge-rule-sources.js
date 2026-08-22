import { isIP } from "node:net";
import { normalizeRuleEntry, RULE_KIND } from "../../shared/rules/model.js";
import { semanticIntentForSource } from "../../shared/rules/semantic-intents.js";
import { sourcesForRegion, parseRegion } from "../../shared/rules/region-profiles.js";
import { mappingForEntry, mappingForUserRule } from "../../shared/rules/source-mappings.js";
import { EXTERNAL_RULE_SOURCE_CATALOG } from "../../shared/rules/external-sources.js";

const EXTERNAL_BY_ID = new Map(EXTERNAL_RULE_SOURCE_CATALOG.map((source) => [source.id, source]));

function asSnapshots(snapshots) {
  if (snapshots instanceof Map) return [...snapshots.entries()].map(([id, value]) => ({ id, value }));
  if (Array.isArray(snapshots)) return snapshots.map((value) => ({ id: value?.sourceId, value }));
  if (snapshots && typeof snapshots === "object") return Object.entries(snapshots).map(([id, value]) => ({ id, value }));
  return [];
}

function safeProvenance(value, sourceId) {
  const input = value && typeof value === "object" ? value : {};
  if (input.sourceId !== undefined && input.sourceId !== sourceId) throw new Error(`Source ${sourceId}: provenance source identity mismatch`);
  const external = EXTERNAL_BY_ID.get(sourceId);
  if (external) {
    for (const field of ["repository", "branch", "commit", "releaseTag", "retrievalUrl", "retrievedAt", "sha256"]) {
      if (input[field] !== external[field]) throw new Error(`External source ${sourceId}: provenance mismatch for ${field}`);
    }
    if (!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/releases\/download\/[A-Za-z0-9._-]+\/[A-Za-z0-9_.-]+$/u.test(input.retrievalUrl)
      || !/^[0-9a-f]{40}$/u.test(input.commit) || !/^[0-9a-f]{64}$/u.test(input.sha256)
      || Number.isNaN(Date.parse(input.retrievedAt))) throw new Error(`External source ${sourceId}: unsafe provenance`);
  } else {
    const forbidden = ["repository", "retrievalUrl", "branch", "releaseTag", "commit", "sha256"];
    if (forbidden.some((field) => input[field] !== undefined)) throw new Error(`Source ${sourceId}: non-external provenance metadata is not allowed`);
  }
  const fields = ["sourceId", "repository", "branch", "commit", "releaseTag", "retrievalUrl", "retrievedAt", "sha256"];
  return Object.freeze(Object.fromEntries(fields.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]).concat(input.sourceId ? [] : [["sourceId", sourceId]])));
}

function specificity(entry) {
  if (entry.kind === RULE_KIND.domain || entry.kind === RULE_KIND.domainSuffix) return entry.value.split(".").length * 10 + (entry.kind === RULE_KIND.domain ? 2 : 1);
  if (entry.kind === RULE_KIND.domainKeyword) return entry.value.length;
  const slash = entry.value.lastIndexOf("/");
  return Number(entry.value.slice(slash + 1)) || 0;
}

function candidateSort(a, b) {
  return b.mapping.priority - a.mapping.priority || specificity(b.entry) - specificity(a.entry)
    || a.entry.sourceId.localeCompare(b.entry.sourceId) || a.entry.value.localeCompare(b.entry.value) || a.entry.kind.localeCompare(b.entry.kind);
}

function key(entry) { return `${entry.kind}\0${entry.value}`; }

function addCandidate(groups, rawEntry, mapping, provenance) {
  const entry = normalizeRuleEntry(rawEntry);
  const item = { entry, mapping, provenance };
  const bucket = groups.get(key(entry)) ?? [];
  bucket.push(item);
  groups.set(key(entry), bucket);
}

function sourceMetadata(sourceId, mapping) {
  const intent = semanticIntentForSource(sourceId);
  return {
    policy: intent?.policy ?? mapping.policyGroup,
    phase: intent?.phase ?? (mapping.priority >= 700 ? "security" : "serviceIntent"),
    dnsClass: intent?.dnsClass ?? "none",
  };
}

function matchesDomain(hostname, entry) {
  if (entry.kind === RULE_KIND.domain) return hostname === entry.value;
  if (entry.kind === RULE_KIND.domainSuffix) return hostname === entry.value || hostname.endsWith(`.${entry.value}`);
  return hostname.includes(entry.value);
}

function ipv4Number(value) { return value.split(".").reduce((n, part) => (n * 256) + Number(part), 0); }
function matchesCidr(ip, entry) {
  const slash = entry.value.lastIndexOf("/");
  const prefix = Number(entry.value.slice(slash + 1));
  if (isIP(ip) !== (entry.kind === RULE_KIND.ipv4Cidr ? 4 : 6)) return false;
  if (entry.kind === RULE_KIND.ipv4Cidr) {
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return ((ipv4Number(ip) >>> 0) & mask) === (ipv4Number(entry.value.slice(0, slash)) >>> 0);
  }
  // IPv6 matching is kept local and conservative; expand the common textual form.
  const expand = (text) => { const [left, right = ""] = text.split("::"); const l = left ? left.split(":") : []; const r = right ? right.split(":") : []; return [...l, ...Array(8 - l.length - r.length).fill("0"), ...r].map((x) => parseInt(x || "0", 16)); };
  const a = expand(ip); const n = expand(entry.value.slice(0, slash)); const whole = Math.floor(prefix / 16); const rem = prefix % 16;
  return a.slice(0, whole).every((x, i) => x === n[i]) && (rem === 0 || (a[whole] >> (16 - rem)) === (n[whole] >> (16 - rem)));
}

function matches(ip, hostname, entry) { return entry.kind === RULE_KIND.ipv4Cidr || entry.kind === RULE_KIND.ipv6Cidr ? Boolean(ip) && matchesCidr(ip, entry) : Boolean(hostname) && matchesDomain(hostname, entry); }

export function mergeRuleSources({ snapshots, region = "cn", userRules = [], adblockMode = "off" } = {}) {
  const selected = new Set(sourcesForRegion(parseRegion(region), { adblockMode }));
  const groups = new Map();
  const provenance = [];
  for (const { id, value } of asSnapshots(snapshots)) {
    const valueSourceId = value?.sourceId;
    if (id !== undefined && valueSourceId !== undefined && id !== valueSourceId) throw new Error(`Snapshot identity mismatch for ${id}`);
    const sourceId = valueSourceId ?? id;
    if (value?.provenance?.sourceId !== undefined && value.provenance.sourceId !== sourceId) throw new Error(`Snapshot provenance identity mismatch for ${sourceId}`);
    const prov = safeProvenance(value?.provenance, sourceId);
    if (!sourceId || !selected.has(sourceId)) continue;
    const entries = Array.isArray(value?.entries) ? value.entries : [];
    provenance.push(prov);
    for (const raw of entries) addCandidate(groups, { ...raw, sourceId }, mappingForEntry(raw, { sourceId }), prov);
  }
  for (const raw of userRules) {
    if (!raw || typeof raw !== "object") throw new TypeError("User rule must be an object");
    const sourceId = raw.sourceId ?? "user";
    addCandidate(groups, { ...raw, sourceId }, mappingForUserRule(raw), safeProvenance({ sourceId }, sourceId));
  }
  const decisions = [];
  for (const [matcherKey, candidates] of groups) {
    candidates.sort(candidateSort);
    const winner = candidates[0];
    const tied = candidates.filter((item) => item.mapping.priority === winner.mapping.priority);
    if (new Set(tied.map((item) => item.mapping.action)).size > 1) throw new Error(`Conflicting equal-priority mappings for ${winner.entry.value}`);
    const matchedSources = [...new Set(candidates.map(({ entry }) => entry.sourceId))].sort();
    const matcher = Object.freeze({ ...winner.entry, noResolve: candidates.some(({ entry }) => entry.noResolve) });
    const decision = Object.freeze({ matcher, action: winner.mapping.action, policy: winner.mapping.policy ?? winner.mapping.action, policyGroup: winner.mapping.policyGroup, priority: winner.mapping.priority, reason: winner.mapping.reason, matchedSources, region: parseRegion(region), provenance: Object.freeze(candidates.map(({ provenance: p }) => p)) });
    decisions.push(decision);
  }
  decisions.sort((a, b) => b.priority - a.priority || specificity(b.matcher) - specificity(a.matcher)
    || a.matcher.sourceId.localeCompare(b.matcher.sourceId) || a.matcher.value.localeCompare(b.matcher.value));
  const ruleSets = new Map();
  for (const decision of decisions) {
    const id = decision.policyGroup;
    const metadata = sourceMetadata(decision.matcher.sourceId, { policyGroup: decision.policyGroup, priority: decision.priority });
    const record = ruleSets.get(id) ?? { id, entries: [], policy: decision.policy, phase: metadata.phase, dnsClass: metadata.dnsClass, region: parseRegion(region), sources: new Set() };
    record.entries.push(decision.matcher); decision.matchedSources.forEach((sourceId) => record.sources.add(sourceId)); ruleSets.set(id, record);
  }
  for (const record of ruleSets.values()) { record.entries.sort((a, b) => specificity(b) - specificity(a) || a.value.localeCompare(b.value)); record.sources = Object.freeze([...record.sources].sort()); record.entries = Object.freeze(record.entries); ruleSets.set(record.id, Object.freeze(record)); }
  return Object.freeze({ ruleSets, decisions: Object.freeze(decisions), provenance: Object.freeze(provenance.sort((a, b) => a.sourceId.localeCompare(b.sourceId))), diagnostics: Object.freeze({ sourceCount: provenance.length, matcherCount: decisions.length }), region: parseRegion(region) });
}

export function explainRoute({ hostname, domain, ip, merged } = {}) {
  const value = hostname ?? domain;
  if (typeof value !== "string" || !value || /\s|\/|:/u.test(value)) throw new TypeError("hostname must be a bare hostname");
  const normalized = value.toLowerCase().replace(/\.$/u, "");
  if (ip !== undefined && isIP(ip) === 0) throw new TypeError("ip must be a valid IPv4 or IPv6 address");
  const decisions = merged?.decisions;
  if (!Array.isArray(decisions)) throw new TypeError("merged.decisions must be an array");
  const winner = decisions.filter(({ matcher }) => matches(ip, normalized, matcher)).sort((a, b) => b.priority - a.priority || specificity(b.matcher) - specificity(a.matcher)
    || a.matcher.sourceId.localeCompare(b.matcher.sourceId) || a.matcher.value.localeCompare(b.matcher.value))[0];
  return winner ?? Object.freeze({ matcher: null, action: "PROXY", policyGroup: "Fallback", priority: 0, reason: "default fallback", matchedSources: [], region: merged.region });
}
