import { BUSINESS_TARGETS } from "../../../shared/policies/business-targets.js";
import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";
import { canonicalProfileJson } from "./profile-codec.js";
import { oneXrayGeoCode, oneXrayGeoNames } from "./geodata-contract.js";

const MAX_PROFILE_LINK_LENGTH = 32_768;
const HASH = /^[a-f0-9]{64}$/u;

// Keep the audit renderer synchronous and browser-safe. The private Sub-Store
// task must be able to calculate the same digest as profile-link.js without
// importing a Node-only crypto implementation.
const SHA256_K = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value, shift) {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256Hex(value) {
  const input = new TextEncoder().encode(String(value));
  const bitLength = input.length * 8;
  const paddedLength = Math.ceil((input.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[input.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x1_0000_0000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const schedule = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) schedule[index] = view.getUint32(offset + index * 4);
    for (let index = 16; index < 64; index += 1) {
      const s0 = rotateRight(schedule[index - 15], 7) ^ rotateRight(schedule[index - 15], 18) ^ (schedule[index - 15] >>> 3);
      const s1 = rotateRight(schedule[index - 2], 17) ^ rotateRight(schedule[index - 2], 19) ^ (schedule[index - 2] >>> 10);
      schedule[index] = (schedule[index - 16] + s0 + schedule[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + SHA256_K[index] + schedule[index]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + temp1) >>> 0, c, b, a, (temp1 + temp2) >>> 0];
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }
  return [...hash].map((word) => word.toString(16).padStart(8, "0")).join("");
}

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function number(value, fallback = 0) {
  return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
}

function sortedCounts(value) {
  if (!object(value)) return {};
  return Object.fromEntries(Object.entries(value)
    .filter(([, count]) => Number.isSafeInteger(count) && count >= 0)
    .sort(([left], [right]) => left.localeCompare(right, "en")));
}

function mergeCounts(...buckets) {
  const result = {};
  for (const bucket of buckets) {
    for (const [key, count] of Object.entries(sortedCounts(bucket))) result[key] = (result[key] ?? 0) + count;
  }
  return sortedCounts(result);
}

function safeHash(value, fallback) {
  return typeof value === "string" && HASH.test(value) ? value : fallback;
}

function hashNodeName(name) {
  return sha256Hex(typeof name === "string" ? name : "").slice(0, 12);
}

function publicTarget(target, fallback) {
  const configured = typeof target?.configured === "string" ? target.configured : fallback;
  const status = typeof target?.status === "string" ? target.status : configured === "DIRECT" ? "direct" : "follow";
  const resolved = typeof target?.resolvedTag === "string" ? target.resolvedTag : "proxy";
  const redact = (value) => {
    if (!value.startsWith("NODE:")) return value;
    return `NODE:<${hashNodeName(value.slice(5))}>`;
  };
  return {
    configured: redact(configured),
    resolved: status === "fixed" ? `FIXED:<${hashNodeName(resolved)}>` : status === "direct" ? "DIRECT" : "FOLLOW",
    status,
  };
}

function businessSummary(resolution) {
  const targets = object(resolution?.targets) ? resolution.targets : {};
  return BUSINESS_TARGETS.map((target) => ({
    id: target.id,
    label: target.label,
    ...publicTarget(targets[target.id], target.defaultTarget),
  }));
}

function fixedSummary(resolution) {
  const fixedNodes = Array.isArray(resolution?.fixedNodes) ? resolution.fixedNodes : [];
  const tags = fixedNodes.map((entry) => entry?.tag).filter((tag) => typeof tag === "string");
  const unique = new Set(tags).size === tags.length;
  const entries = fixedNodes.map((entry) => ({
    protocol: normalizeProtocol(entry?.node?.type) || "unknown",
    tag: typeof entry?.tag === "string" ? entry.tag : "invalid",
    unique: unique && typeof entry?.tag === "string",
    compatible: true,
  }));
  return {
    count: entries.length,
    unique,
    compatible: entries.every(({ compatible }) => compatible),
    entries,
  };
}

function protocolSummary(context) {
  if (object(context.protocolCounts)) {
    return Object.fromEntries(Object.entries(context.protocolCounts)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([protocol, value]) => [protocol, {
        accepted: number(value?.accepted),
        excluded: number(value?.excluded),
      }]));
  }
  const normalized = Array.isArray(context.normalizedNodes) ? context.normalizedNodes : [];
  const eligible = new Set(Array.isArray(context.eligibleNodes) ? context.eligibleNodes : []);
  const values = {};
  for (const node of normalized) {
    const protocol = normalizeProtocol(node?.type) || "unknown";
    values[protocol] ??= { accepted: 0, excluded: 0 };
    if (eligible.has(node)) values[protocol].accepted += 1;
    else values[protocol].excluded += 1;
  }
  return Object.fromEntries(Object.entries(values).sort(([left], [right]) => left.localeCompare(right, "en")));
}

function geoSummary(context, channel) {
  const names = oneXrayGeoNames(channel);
  const fallbackDomain = sha256Hex(JSON.stringify({ type: "domain", name: names.domain, channel }));
  const fallbackIp = sha256Hex(JSON.stringify({ type: "ip", name: names.ip, channel }));
  const supplied = object(context.geoHashes)
    ? context.geoHashes
    : object(context.geoManifest?.hashes)
      ? context.geoManifest.hashes
      : {};
  return {
    domain: safeHash(supplied.domain, fallbackDomain),
    ip: safeHash(supplied.ip, fallbackIp),
    domainName: names.domain,
    ipName: names.ip,
  };
}

function profileSummary(context, fullHash) {
  const linkLength = typeof context.profileLink === "string" ? context.profileLink.length : 0;
  const channel = context.options?.channel;
  const ruleReleaseId = typeof context.ruleReleaseId === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(context.ruleReleaseId)
    ? context.ruleReleaseId
    : `shared-lightweight-${channel}`;
  return {
    fullHash,
    shortVersion: fullHash.slice(0, 8),
    ruleReleaseId,
    geoData: geoSummary(context, channel),
    deepLink: {
      bytes: linkLength,
      limit: MAX_PROFILE_LINK_LENGTH,
      withinBudget: linkLength > 0 && linkLength <= MAX_PROFILE_LINK_LENGTH,
      budgetState: linkLength > 0 && linkLength <= MAX_PROFILE_LINK_LENGTH ? "within" : "exceeded",
    },
  };
}

function validateContext(context) {
  if (!object(context) || !object(context.options) || !object(context.profile)) {
    throw new TypeError("OneXray audit context is incomplete");
  }
  if (typeof context.options.channel !== "string") throw new TypeError("OneXray audit channel is missing");
}

/**
 * Explicitly builds an allowlist. Never JSON.stringify the private build
 * context or redact a serialized Profile: both approaches are easy to extend
 * accidentally with credentials or encoded policy input.
 */
export function renderOneXrayAudit(context = {}) {
  validateContext(context);
  let canonical;
  try {
    canonical = canonicalProfileJson(context.profile);
  } catch {
    throw new Error("OneXray audit: invalid-profile");
  }
  const fullHash = sha256Hex(canonical);
  const normalized = context.normalizedDiagnostics ?? {};
  const eligible = context.eligibleDiagnostics ?? {};
  const accepted = number(eligible.accepted);
  const inputTotal = number(normalized.total, accepted + Object.values(mergeCounts(normalized.excluded, eligible.excluded)).reduce((sum, count) => sum + count, 0));
  const excluded = Math.max(0, inputTotal - accepted);
  const report = {
    schema: "onexray-routing-audit-v1",
    client: "OneXray",
    language: "zh-CN",
    nodes: {
      total: inputTotal,
      normalized: number(normalized.accepted),
      accepted,
      excluded,
      perProtocol: protocolSummary(context),
    },
    exclusionReasons: mergeCounts(normalized.excluded, eligible.excluded),
    policy: {
      businesses: businessSummary(context.resolution),
      fixed: fixedSummary(context.resolution),
      chain: {
        enabled: context.resolution?.chain?.enabled === true,
        entryCount: number(context.resolution?.chain?.entryCount),
        landingDisplayName: context.resolution?.chain?.enabled === true ? "已配置落地节点" : "未启用",
      },
    },
    runtime: {
      dns: {
        mode: context.options.dnsMode,
        chinaProvider: context.options.chinaDns,
        globalProvider: context.options.globalDns,
        routing: { china: "direct", global: "proxy" },
      },
      ipv6: context.options.ipv6Mode,
      quic: context.options.quicMode,
      block: context.options.blockMode,
    },
    profile: profileSummary(context, fullHash),
  };
  return `${JSON.stringify(report, null, 2)}\n`;
}

export { sha256Hex };
