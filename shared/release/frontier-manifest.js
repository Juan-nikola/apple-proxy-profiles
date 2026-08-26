import { CLIENT } from "../contracts.js";
import { activeClientIds, clientAdapter } from "./client-catalog.js";

export const FRONTIER_CHANNELS = Object.freeze(["current"]);

export const FRONTIER_PLATFORMS = Object.freeze({
  [CLIENT.surge]: Object.freeze(["macos", "iphone", "ipad"]),
  [CLIENT.singbox]: Object.freeze(["macos", "iphone", "ipad", "android", "openwrt"]),
  [CLIENT.onexray]: Object.freeze(["macos", "iphone", "ipad", "android", "windows", "linux"]),
  [CLIENT.happ]: Object.freeze(["macos", "iphone", "ipad", "android", "windows", "linux"]),
});

const STATUS_VALUES = new Set(["candidate", "validated", "rejected", "rolled-back"]);
const SHA256 = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const FAILURE_KEYS = new Set(["stage", "code", "count"]);
const CANARY_SECRET = /(?:password|passwd|secret|token|uuid|psk|private|public[-_ ]?key|subscription|profile|node)/iu;

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n]/u.test(value)) {
    throw new TypeError(`${label} must be a non-empty single-line string`);
  }
  return value;
}

function validateFailure(failure) {
  if (failure === undefined) return undefined;
  if (!failure || typeof failure !== "object" || Array.isArray(failure)) {
    throw new TypeError("Frontier failure must be an object");
  }
  const keys = Object.keys(failure);
  if (keys.some((key) => !FAILURE_KEYS.has(key))) throw new Error("Frontier failure contains an unsupported field");
  const stage = requiredString(failure.stage, "Frontier failure stage");
  const code = requiredString(failure.code, "Frontier failure code");
  if (!Number.isInteger(failure.count) || failure.count < 1) throw new TypeError("Frontier failure count must be positive");
  return Object.freeze({ stage, code, count: failure.count });
}

function validateCanary(canary) {
  if (canary === undefined) return undefined;
  if (!canary || typeof canary !== "object" || Array.isArray(canary)) {
    throw new TypeError("Frontier canary evidence must be an object");
  }
  const copy = structuredClone(canary);
  const deepFreeze = (value) => {
    if (value && typeof value === "object") {
      for (const child of Object.values(value)) deepFreeze(child);
      Object.freeze(value);
    }
    return value;
  };
  const walk = (value, depth = 0) => {
    if (value === null) return;
    if (depth > 2) throw new Error("Frontier canary evidence is too deeply nested");
    if (typeof value === "string") {
      if (CANARY_SECRET.test(value)) throw new Error("Frontier canary evidence contains a secret-shaped value");
      if (value.length > 200) throw new Error("Frontier canary evidence value is too long");
      return;
    }
    if (typeof value === "number" || typeof value === "boolean") return;
    if (typeof value !== "object" || Array.isArray(value)) throw new TypeError("Frontier canary evidence values are invalid");
    for (const [key, item] of Object.entries(value)) {
      if (!/^[a-z][a-zA-Z0-9_-]{0,31}$/u.test(key) || CANARY_SECRET.test(key)) {
        throw new Error("Frontier canary evidence contains an unsupported field");
      }
      walk(item, depth + 1);
    }
  };
  walk(copy);
  return deepFreeze(copy);
}

export function frontierPlatformKey(client, platform) {
  requiredString(client, "Frontier client");
  requiredString(platform, "Frontier platform");
  const adapter = (() => {
    try { return clientAdapter(client); } catch { return undefined; }
  })();
  if (!adapter || !activeClientIds().includes(client)
    || !Object.hasOwn(FRONTIER_PLATFORMS, client) || !FRONTIER_PLATFORMS[client].includes(platform)) {
    throw new Error(`Unsupported frontier platform: ${client}/${platform}`);
  }
  return client === CLIENT.onexray ? `onexray-${platform}` : `${client}/${platform}`;
}

export function createFrontierManifest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Frontier manifest input is required");
  const platformKey = frontierPlatformKey(input.client, input.platform);
  if (input.platformKey !== undefined && input.platformKey !== platformKey) {
    throw new Error("Frontier platformKey does not match client/platform identity");
  }
  if (!FRONTIER_CHANNELS.includes(input.channel)) throw new Error(`Unsupported frontier channel: ${input.channel}`);
  if (!input.upstream || typeof input.upstream !== "object" || Array.isArray(input.upstream)) {
    throw new TypeError("Frontier upstream metadata is required");
  }
  const branch = requiredString(input.upstream.branch, "Frontier upstream branch");
  const commit = requiredString(input.upstream.commit, "Frontier upstream commit");
  if (!COMMIT.test(commit)) throw new Error("Frontier upstream commit must be a full SHA");
  const fetchedAt = requiredString(input.upstream.fetchedAt, "Frontier upstream fetchedAt");
  if (Number.isNaN(Date.parse(fetchedAt))) throw new Error("Frontier upstream fetchedAt must be an ISO date");
  const schemaVersion = requiredString(input.schemaVersion, "Frontier schemaVersion");
  if (!SHA256.test(input.ruleManifestSha256)) throw new Error("Frontier ruleManifestSha256 must be a SHA-256");
  if (!SHA256.test(input.configSha256)) throw new Error("Frontier configSha256 must be a SHA-256");
  if (!STATUS_VALUES.has(input.status)) throw new Error(`Unsupported frontier status: ${input.status}`);
  const failure = validateFailure(input.failure);
  const verifiedAt = input.verifiedAt === undefined
    ? undefined
    : requiredString(input.verifiedAt, "Frontier verifiedAt");
  if (verifiedAt !== undefined && Number.isNaN(Date.parse(verifiedAt))) {
    throw new Error("Frontier verifiedAt must be an ISO date");
  }
  const canary = validateCanary(input.canary);
  if (input.status === "rejected" && failure === undefined) throw new Error("Rejected frontier manifest requires failure details");

  const manifest = {
    schemaVersion: 1,
    platformKey,
    client: input.client,
    platform: input.platform,
    channel: input.channel,
    upstream: { branch, commit, fetchedAt },
    adapterSchema: schemaVersion,
    ruleManifestSha256: input.ruleManifestSha256,
    configSha256: input.configSha256,
    status: input.status,
  };
  if (failure !== undefined) manifest.failure = failure;
  if (verifiedAt !== undefined) manifest.verifiedAt = verifiedAt;
  if (canary !== undefined) manifest.canary = canary;
  return Object.freeze(manifest);
}

/**
 * Expands one sanitized OneXray profile contract into six independent
 * platform candidates. The profile digest is carried in configSha256; no
 * profile bytes or node credentials are copied into platform manifests.
 */
export function createOneXrayFrontierCandidates(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("OneXray frontier input is required");
  }
  if (!SHA256.test(input.profileSha256 ?? input.configSha256)) {
    throw new TypeError("OneXray frontier profileSha256 must be a SHA-256");
  }
  const states = input.states === undefined ? {} : input.states;
  if (!states || typeof states !== "object" || Array.isArray(states)) {
    throw new TypeError("OneXray frontier states must be an object");
  }
  const stateKeys = new Set(["status", "verifiedAt", "canary", "failure"]);
  return Object.freeze(FRONTIER_PLATFORMS[CLIENT.onexray].map((platform) => {
    const state = states[platform] ?? {};
    if (!state || typeof state !== "object" || Array.isArray(state)) {
      throw new TypeError(`OneXray frontier state is invalid: ${platform}`);
    }
    if (Object.keys(state).some((key) => !stateKeys.has(key))) {
      throw new Error(`OneXray frontier state contains an unsupported shared field: ${platform}`);
    }
    return createFrontierManifest({
      client: CLIENT.onexray,
      platform,
      channel: input.channel,
      upstream: input.upstream,
      schemaVersion: input.schemaVersion ?? "onexray-profile-v1",
      configSha256: input.profileSha256 ?? input.configSha256,
      status: state.status ?? input.status ?? "candidate",
      ruleManifestSha256: input.ruleManifestSha256,
      failure: state.failure ?? input.failure,
      verifiedAt: state.verifiedAt,
      canary: state.canary,
    });
  }));
}

export function validateFrontierManifest(manifest) {
  try {
    if (manifest.platformKey !== frontierPlatformKey(manifest.client, manifest.platform)) return false;
    createFrontierManifest({
      client: manifest.client,
      platform: manifest.platform,
      channel: manifest.channel,
      upstream: manifest.upstream,
      schemaVersion: manifest.adapterSchema,
      ruleManifestSha256: manifest.ruleManifestSha256,
      configSha256: manifest.configSha256,
      status: manifest.status,
      failure: manifest.failure,
      verifiedAt: manifest.verifiedAt,
      canary: manifest.canary,
    });
    return true;
  } catch {
    return false;
  }
}
