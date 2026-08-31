import {
  PRIVATE_POLICY_CHANNELS,
  PRIVATE_POLICY_CLIENTS,
  PRIVATE_POLICY_TARGET_IDS,
  OPTION_VALUES,
} from "../contracts.js";
import { parseStrictJson } from "../serialization/strict-json.js";
import { parseNodeReference } from "../nodes/node-reference.js";
import {
  UNIFIED_POLICY_TARGET_IDS,
  canonicalUnifiedPolicyTarget,
  defaultUnifiedPolicyTargets,
  unifiedPolicyTargetByKey,
} from "./unified-policy.js";

// Schema v1 is migration-only. Keep reading historical per-client overrides,
// while allowing the active client set to resolve without those keys.
const CHANNEL_KEYS = new Set(["revision", "defaults", "clients", ...PRIVATE_POLICY_CLIENTS]);
const DEFAULT_KEYS = new Set(["targets", "dns", "adblockMode", "clientChain"]);
const OVERRIDE_KEYS = DEFAULT_KEYS;
const DNS_KEYS = new Set(["chinaDns", "globalDns"]);
const CHAIN_KEYS = new Set(["mode", "target"]);
const TARGET_ID_SET = new Set(PRIVATE_POLICY_TARGET_IDS);
const CHANNEL_SET = new Set(PRIVATE_POLICY_CHANNELS);
const CLIENT_SET = new Set(PRIVATE_POLICY_CLIENTS);
const UNIFIED_POLICY_CLIENT_KEYS = new Set([...PRIVATE_POLICY_CLIENTS, "sing-box"]);
const CHINA_DNS_SET = new Set(OPTION_VALUES.chinaDns);
const GLOBAL_DNS_SET = new Set(OPTION_VALUES.globalDns);
const AD_BLOCK_MODES = new Set(["off", "full"]);
const LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;
const URI_VALUE = /(?:[a-z][a-z0-9+.-]{1,15}:\/\/|https?:\/\/)/iu;
const SECRET_VALUE = /(?:password|passwd|secret|token|uuid|psk|private[-_ ]?key|subscription|credential)/iu;
const MAX_REVISION_LENGTH = 160;
const MAX_NODE_NAME_LENGTH = 256;

function invalid(reason) {
  return new Error(`Invalid apple-proxy-policy: ${reason}`);
}

function isRecord(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function requireRecord(value, reason) {
  if (!isRecord(value)) throw invalid(reason);
  return value;
}

function requireKeys(value, required, allowed = required) {
  const allowedSet = allowed instanceof Set ? allowed : new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) throw invalid("contains an unsupported field");
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) throw invalid("is missing a required field");
  }
}

function rejectSecretLikeString(value) {
  if (URI_VALUE.test(value) || SECRET_VALUE.test(value)) {
    throw invalid("contains a secret or URI");
  }
}

function normalizeRevision(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_REVISION_LENGTH
    || value.trim() !== value || LINE_TERMINATOR.test(value)) {
    throw invalid("revision must be a non-empty single-line string");
  }
  rejectSecretLikeString(value);
  return value;
}

function normalizeTarget(value) {
  if (typeof value !== "string" || LINE_TERMINATOR.test(value)) {
    throw invalid("target must be FOLLOW, DIRECT, or NODE:<name>");
  }
  if (/^(?:FOLLOW|DIRECT)$/iu.test(value)) return value.toUpperCase();
  if (!value.startsWith("NODE:")) throw invalid("target must be FOLLOW, DIRECT, or NODE:<name>");
  const name = value.slice("NODE:".length);
  if (name.length === 0 || name.length > MAX_NODE_NAME_LENGTH || name.trim() !== name) {
    throw invalid("target must be FOLLOW, DIRECT, or NODE:<name>");
  }
  rejectSecretLikeString(name);
  return `NODE:${name}`;
}

function normalizeUnifiedTarget(value) {
  if (typeof value !== "string" || LINE_TERMINATOR.test(value)) {
    throw invalid("target must be FOLLOW, DIRECT, NODE:<name>[|<protocol>], or NODE~<query>");
  }
  try {
    const canonical = canonicalUnifiedPolicyTarget(value);
    if (!/^NODE[:~]/iu.test(canonical)) return canonical;
    const reference = parseNodeReference(canonical);
    const normalizedValue = reference.mode === "fuzzy" ? reference.query : reference.name;
    return `${reference.mode === "fuzzy" ? "NODE~" : "NODE:"}${normalizedValue}${reference.protocol ? `|${reference.protocol}` : ""}`;
  } catch {
    throw invalid("target must be FOLLOW, DIRECT, NODE:<name>[|<protocol>], or NODE~<query>");
  }
}

function normalizeTargetMap(value, { complete }) {
  requireRecord(value, "targets must be an object");
  if (complete) {
    for (const key of Object.keys(value)) {
      if (!TARGET_ID_SET.has(key)) throw invalid("contains an unsupported business target");
    }
    for (const id of PRIVATE_POLICY_TARGET_IDS) {
      if (!Object.hasOwn(value, id)) throw invalid("is missing a required business target");
    }
  } else {
    for (const key of Object.keys(value)) {
      if (!TARGET_ID_SET.has(key)) throw invalid("contains an unsupported business target");
    }
  }
  const result = {};
  for (const id of PRIVATE_POLICY_TARGET_IDS) {
    if (Object.hasOwn(value, id)) result[id] = normalizeTarget(value[id]);
  }
  return result;
}

function normalizeDns(value, { complete }) {
  requireRecord(value, "dns must be an object");
  requireKeys(value, complete ? ["chinaDns", "globalDns"] : [], DNS_KEYS);
  const result = {};
  if (Object.hasOwn(value, "chinaDns")) {
    if (typeof value.chinaDns !== "string" || !CHINA_DNS_SET.has(value.chinaDns)) {
      throw invalid("contains an invalid China DNS provider");
    }
    result.chinaDns = value.chinaDns;
  }
  if (Object.hasOwn(value, "globalDns")) {
    if (typeof value.globalDns !== "string" || !GLOBAL_DNS_SET.has(value.globalDns)) {
      throw invalid("contains an invalid global DNS provider");
    }
    result.globalDns = value.globalDns;
  }
  return result;
}

function normalizeChain(value) {
  requireRecord(value, "clientChain must be an object");
  requireKeys(value, ["mode"], CHAIN_KEYS);
  if (value.mode === "off") {
    if (Object.hasOwn(value, "target")) throw invalid("clientChain off cannot contain a target");
    return { mode: "off" };
  }
  if (value.mode !== "on" || !Object.hasOwn(value, "target")) {
    throw invalid("clientChain on requires a target");
  }
  const target = normalizeTarget(value.target);
  if (!target.startsWith("NODE:")) throw invalid("clientChain target must be NODE:<name>");
  return { mode: "on", target };
}

function normalizeDefaults(value) {
  requireRecord(value, "defaults must be an object");
  requireKeys(value, ["targets", "dns", "adblockMode", "clientChain"], DEFAULT_KEYS);
  if (typeof value.adblockMode !== "string" || !AD_BLOCK_MODES.has(value.adblockMode)) {
    throw invalid("contains an invalid adblock mode");
  }
  return {
    targets: normalizeTargetMap(value.targets, { complete: true }),
    dns: normalizeDns(value.dns, { complete: true }),
    adblockMode: value.adblockMode,
    clientChain: normalizeChain(value.clientChain),
  };
}

function normalizeOverride(value) {
  requireRecord(value, "client override must be an object");
  requireKeys(value, [], OVERRIDE_KEYS);
  const result = {};
  if (Object.hasOwn(value, "targets")) result.targets = normalizeTargetMap(value.targets, { complete: false });
  if (Object.hasOwn(value, "dns")) result.dns = normalizeDns(value.dns, { complete: false });
  if (Object.hasOwn(value, "adblockMode")) {
    if (typeof value.adblockMode !== "string" || !AD_BLOCK_MODES.has(value.adblockMode)) {
      throw invalid("contains an invalid adblock mode");
    }
    result.adblockMode = value.adblockMode;
  }
  if (Object.hasOwn(value, "clientChain")) result.clientChain = normalizeChain(value.clientChain);
  return result;
}

function normalizePolicyObject(value) {
  requireRecord(value, "policy must be an object");
  requireKeys(value, ["schemaVersion", "channels"], new Set(["schemaVersion", "channels"]));
  if (value.schemaVersion !== 1) throw invalid("schemaVersion must be 1");
  requireRecord(value.channels, "channels must be an object");
  requireKeys(value.channels, PRIVATE_POLICY_CHANNELS, CHANNEL_SET);
  const channels = {};
  for (const channel of PRIVATE_POLICY_CHANNELS) {
    const record = requireRecord(value.channels[channel], "channel must be an object");
    requireKeys(record, ["revision", "defaults"], CHANNEL_KEYS);
    const legacyClients = isRecord(record.clients) ? record.clients : {};
    const overrides = {};
    for (const [key, override] of Object.entries(legacyClients)) overrides[key] = normalizeOverride(override);
    for (const key of PRIVATE_POLICY_CLIENTS) {
      if (Object.hasOwn(record, key)) overrides[key] = normalizeOverride(record[key]);
    }
    channels[channel] = {
      revision: normalizeRevision(record.revision),
      defaults: normalizeDefaults(record.defaults),
      ...overrides,
    };
  }
  return deepFreeze({ schemaVersion: 1, channels });
}

function normalizeUnifiedTargets(value, { complete }) {
  requireRecord(value.targets, "targets must be an object");

  const targets = complete ? {} : defaultUnifiedPolicyTargets();
  const seen = new Map();
  for (const [key, rawTarget] of Object.entries(value.targets)) {
    const target = unifiedPolicyTargetByKey(key);
    if (!target) throw invalid("contains an unsupported business target");
    const canonical = normalizeUnifiedTarget(rawTarget);
    if (seen.has(target.id) && seen.get(target.id) !== canonical) {
      throw invalid("contains conflicting business target aliases");
    }
    seen.set(target.id, canonical);
    targets[target.id] = canonical;
  }

  if (complete && Object.keys(value.targets).length !== UNIFIED_POLICY_TARGET_IDS.length) {
    throw invalid("contains an incomplete business target map");
  }
  for (const id of UNIFIED_POLICY_TARGET_IDS) {
    if (!Object.hasOwn(targets, id)) throw invalid("contains an incomplete business target map");
  }
  return targets;
}

function normalizeUnifiedPolicyLayer(value, { complete }) {
  requireRecord(value, "client policy must be an object");
  requireKeys(value, ["schemaVersion", "targets"], new Set(["schemaVersion", "targets"]));
  if (value.schemaVersion !== 2) throw invalid("client policy schemaVersion must be 2");
  return {
    schemaVersion: 2,
    targets: normalizeUnifiedTargets(value, { complete }),
  };
}

function normalizeUnifiedPolicyObject(value) {
  requireRecord(value, "policy must be an object");
  requireKeys(value, ["schemaVersion", "targets"], new Set(["schemaVersion", "targets"]));
  if (value.schemaVersion !== 2) throw invalid("schemaVersion must be 2");
  return deepFreeze(normalizeUnifiedPolicyLayer(value, { complete: false }));
}

function normalizeUnifiedPolicyByClient(value) {
  requireRecord(value, "policy must be an object");
  requireKeys(value, ["schemaVersion", "clients"], new Set(["schemaVersion", "clients"]));
  if (value.schemaVersion !== 3) throw invalid("schemaVersion must be 3");
  requireRecord(value.clients, "clients must be an object");

  const clients = {};
  const seen = new Set();
  for (const [key, layer] of Object.entries(value.clients)) {
    if (!UNIFIED_POLICY_CLIENT_KEYS.has(key)) throw invalid("contains an unsupported policy client");
    const client = key === "sing-box" ? "singbox" : key;
    if (seen.has(client)) throw invalid("contains conflicting policy client aliases");
    seen.add(client);
    clients[client] = normalizeUnifiedPolicyLayer(layer, { complete: true });
  }
  for (const client of PRIVATE_POLICY_CLIENTS) {
    if (!Object.hasOwn(clients, client)) throw invalid("is missing a required policy client");
  }
  return deepFreeze({ schemaVersion: 3, clients });
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function parsePrivatePolicy(text) {
  let parsed;
  try {
    parsed = parseStrictJson(text, {
      label: "apple-proxy-policy",
      maxBytes: 256 * 1024,
      maxDepth: 16,
    });
  } catch (error) {
    // parseStrictJson already guarantees that input values are not reflected in errors.
    throw error;
  }
  if (parsed?.schemaVersion === 3) return normalizeUnifiedPolicyByClient(parsed);
  if (parsed?.schemaVersion === 2) return normalizeUnifiedPolicyObject(parsed);
  return normalizePolicyObject(parsed);
}

export function resolvePrivatePolicy({ policy, channel, client } = {}) {
  const normalized = typeof policy === "string" || policy instanceof Uint8Array
    ? parsePrivatePolicy(policy)
    : policy?.schemaVersion === 3
      ? normalizeUnifiedPolicyByClient(policy)
      : policy?.schemaVersion === 2
        ? normalizeUnifiedPolicyObject(policy)
      : normalizePolicyObject(policy);
  if (normalized.schemaVersion === 2 || normalized.schemaVersion === 3) {
    const targets = normalized.schemaVersion === 3
      ? normalized.clients[client]?.targets
      : normalized.targets;
    if (normalized.schemaVersion === 3 && !CLIENT_SET.has(client)) {
      throw invalid("contains an unsupported policy client");
    }
    return deepFreeze({
      targets: { ...targets },
      dns: { chinaDns: "alidns", globalDns: "cloudflare" },
      adblockMode: "off",
      clientChain: { mode: "off" },
    });
  }
  if (!CHANNEL_SET.has(channel)) throw invalid("contains an unsupported channel");
  if (!CLIENT_SET.has(client)) throw invalid("contains an unsupported policy client");
  const record = normalized.channels[channel];
  const override = record[client] ?? {};
  const result = {
    targets: { ...record.defaults.targets, ...(override.targets ?? {}) },
    dns: { ...record.defaults.dns, ...(override.dns ?? {}) },
    adblockMode: override.adblockMode ?? record.defaults.adblockMode,
    clientChain: { ...(override.clientChain ?? record.defaults.clientChain) },
  };
  return deepFreeze(result);
}

export function policyRevisionForChannel(policy, channel) {
  const normalized = typeof policy === "string" || policy instanceof Uint8Array
    ? parsePrivatePolicy(policy)
    : policy?.schemaVersion === 3
      ? normalizeUnifiedPolicyByClient(policy)
      : policy?.schemaVersion === 2
        ? normalizeUnifiedPolicyObject(policy)
      : normalizePolicyObject(policy);
  if (normalized.schemaVersion === 2) return "schema-2";
  if (normalized.schemaVersion === 3) return "schema-3";
  if (!CHANNEL_SET.has(channel)) throw invalid("contains an unsupported channel");
  return normalized.channels[channel].revision;
}
