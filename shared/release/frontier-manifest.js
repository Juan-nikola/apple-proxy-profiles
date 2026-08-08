import { CLIENT } from "../contracts.js";

export const FRONTIER_CHANNELS = Object.freeze(["edge", "current", "previous"]);

export const FRONTIER_PLATFORMS = Object.freeze({
  [CLIENT.surge]: Object.freeze(["macos", "iphone", "ipad"]),
  [CLIENT.singbox]: Object.freeze(["macos", "iphone", "ipad", "android", "openwrt"]),
});

const STATUS_VALUES = new Set(["candidate", "validated", "rejected", "rolled-back"]);
const SHA256 = /^[0-9a-f]{64}$/u;
const COMMIT = /^[0-9a-f]{40}$/u;
const FAILURE_KEYS = new Set(["stage", "code", "count"]);

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

export function frontierPlatformKey(client, platform) {
  requiredString(client, "Frontier client");
  requiredString(platform, "Frontier platform");
  if (!Object.hasOwn(FRONTIER_PLATFORMS, client) || !FRONTIER_PLATFORMS[client].includes(platform)) {
    throw new Error(`Unsupported frontier platform: ${client}/${platform}`);
  }
  return `${client}/${platform}`;
}

export function createFrontierManifest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Frontier manifest input is required");
  const platformKey = frontierPlatformKey(input.client, input.platform);
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
  return Object.freeze(manifest);
}

export function validateFrontierManifest(manifest) {
  try {
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
    });
    return true;
  } catch {
    return false;
  }
}
