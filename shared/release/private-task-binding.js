import { PRIVATE_POLICY_CHANNELS, PRIVATE_POLICY_CLIENTS } from "../contracts.js";
import { parsePrivatePolicy, policyRevisionForChannel } from "../policies/private-policy.js";

const CHANNEL_SET = new Set(PRIVATE_POLICY_CHANNELS);
const CLIENT_SET = new Set(PRIVATE_POLICY_CLIENTS);
const SHA256 = /^[0-9a-f]{64}$/u;

function invalid(reason) {
  return new Error(`Invalid private task binding: ${reason}`);
}

function isRecord(value) {
  return value !== null && typeof value === "object"
    && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function manifestHash(publicManifest) {
  if (!isRecord(publicManifest)) throw invalid("public client manifest is required");
  if (typeof publicManifest.client !== "string" || !CLIENT_SET.has(publicManifest.client)) {
    throw invalid("public client manifest has an unsupported client");
  }
  const hash = publicManifest.manifestHash ?? publicManifest.manifestSha256;
  if (typeof hash !== "string" || !SHA256.test(hash)) {
    throw invalid("public client manifest hash must be a lowercase SHA-256");
  }
  return hash;
}

function validateGeoDataSha256(value) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    throw invalid("GeoData hash must be a lowercase SHA-256");
  }
  return value;
}

export function bindPrivateTask({
  client,
  channel,
  policy,
  publicManifest,
  geoDataSha256,
  readsPolicy,
} = {}) {
  if (typeof client !== "string" || !CLIENT_SET.has(client)) throw invalid("client is unsupported");
  if (typeof channel !== "string" || !CHANNEL_SET.has(channel)) throw invalid("channel is unsupported");
  if (typeof readsPolicy !== "boolean") throw invalid("readsPolicy must be boolean");
  if (!isRecord(publicManifest) || publicManifest.client !== client) {
    throw invalid("public client manifest does not match client");
  }
  if (publicManifest.channel !== undefined && publicManifest.channel !== channel) {
    throw invalid("public client manifest does not match channel");
  }
  const publicClientManifestSha256 = manifestHash(publicManifest);
  const geoHash = validateGeoDataSha256(geoDataSha256);
  if (publicManifest.geoDataSha256 !== undefined && publicManifest.geoDataSha256 !== geoHash) {
    throw invalid("public GeoData does not match binding");
  }

  let policyRevision = null;
  if (readsPolicy) {
    if (policy === undefined || policy === null) throw invalid("policy is required when readsPolicy is true");
    const parsed = typeof policy === "string" || policy instanceof Uint8Array
      ? parsePrivatePolicy(policy)
      : policy;
    policyRevision = policyRevisionForChannel(parsed, channel);
    if (typeof policyRevision !== "string" || policyRevision.length === 0) {
      throw invalid("policy revision is required");
    }
  } else if (policy !== undefined) {
    throw invalid("node-only task cannot accept a policy override");
  }

  return Object.freeze({
    client,
    channel,
    policyRevision,
    publicClientManifestSha256,
    geoDataSha256: geoHash,
    readsPolicy,
  });
}
