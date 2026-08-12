import { createHash } from "node:crypto";

const CHANNELS = new Set(["edge", "current", "previous"]);
const LINK_PREFIX = "onexray://onexray.com/config/add";
const MAX_PROFILE_LINK_LENGTH = 32_768;
const NAME_PREFIX = "Apple Proxy · OneXray";
const HASH = /^[a-f0-9]{8}$/u;

function requiredChannel(channel) {
  if (typeof channel !== "string" || !CHANNELS.has(channel)) {
    throw new TypeError("OneXray Profile channel must be edge, current, or previous");
  }
  return channel;
}

function canonicalValue(value, seen = new Set()) {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new TypeError("OneXray Profile contains a non-finite number");
    if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol" || value === undefined) {
      throw new TypeError("OneXray Profile contains a non-JSON value");
    }
    return value;
  }
  if (seen.has(value)) throw new TypeError("OneXray Profile must not contain cycles");
  seen.add(value);
  let result;
  if (Array.isArray(value)) result = value.map((entry) => canonicalValue(entry, seen));
  else {
    result = {};
    for (const key of Object.keys(value).sort()) result[key] = canonicalValue(value[key], seen);
  }
  seen.delete(value);
  return result;
}

export function canonicalProfileJson(profile) {
  if (profile === null || typeof profile !== "object" || Array.isArray(profile)) {
    throw new TypeError("OneXray Profile must be an object");
  }
  return JSON.stringify(canonicalValue(profile));
}

function profileHash(profile) {
  return createHash("sha256").update(canonicalProfileJson(profile), "utf8").digest("hex").slice(0, 8);
}

function baseName(channel) {
  return `${NAME_PREFIX} · ${requiredChannel(channel)}`;
}

function parseProfileJson(data) {
  if (typeof data !== "string" || data.length === 0 || /\s/u.test(data)) throw new TypeError("OneXray Profile link data is invalid");
  if (!/^[A-Za-z0-9+/]*={0,2}$/u.test(data) || data.length % 4 !== 0) throw new TypeError("OneXray Profile link data is not standard Base64");
  let bytes;
  try {
    bytes = Buffer.from(data, "base64");
  } catch {
    throw new TypeError("OneXray Profile link data is not standard Base64");
  }
  if (bytes.toString("base64") !== data) throw new TypeError("OneXray Profile link data is not canonical Base64");
  let profile;
  try {
    profile = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new TypeError("OneXray Profile link data is not valid JSON");
  }
  if (profile === null || typeof profile !== "object" || Array.isArray(profile)) throw new TypeError("OneXray Profile link JSON must be an object");
  // A UTF-8 replacement character is never emitted by the canonical encoder.
  if (bytes.toString("utf8").includes("\uFFFD")) throw new TypeError("OneXray Profile link JSON is not valid UTF-8");
  return profile;
}

function decodeComponent(value, label) {
  if (typeof value !== "string" || /%(?![0-9A-Fa-f]{2})/u.test(value)) throw new TypeError(`OneXray ${label} is malformed`);
  try {
    return decodeURIComponent(value);
  } catch {
    throw new TypeError(`OneXray ${label} is malformed`);
  }
}

export function buildOneXrayProfileLink(profile, channel) {
  requiredChannel(channel);
  const expectedName = baseName(channel);
  if (profile?.name !== expectedName) throw new Error("OneXray Profile name must be the invariant channel base name");
  const canonical = canonicalProfileJson(profile);
  const encoded = encodeURIComponent(Buffer.from(canonical, "utf8").toString("base64"));
  const displayName = `${expectedName} · ${profileHash(profile)}`;
  const fragment = encodeURIComponent(displayName);
  const link = `${LINK_PREFIX}?type=profile&data=${encoded}#${fragment}`;
  if (link.length > MAX_PROFILE_LINK_LENGTH) throw new RangeError("OneXray Profile deep link exceeds 32 KiB");
  return link;
}

export function decodeOneXrayProfileLink(link) {
  if (typeof link !== "string" || link.length === 0 || link.length > MAX_PROFILE_LINK_LENGTH) {
    throw new TypeError("OneXray Profile link is invalid or exceeds 32 KiB");
  }
  let url;
  try {
    url = new URL(link);
  } catch {
    throw new TypeError("OneXray Profile link is invalid");
  }
  if (url.protocol !== "onexray:" || url.hostname !== "onexray.com" || url.port || url.username || url.password || url.pathname !== "/config/add") {
    throw new TypeError("OneXray Profile link has an invalid endpoint");
  }
  if (url.searchParams.getAll("type").length !== 1 || url.searchParams.get("type") !== "profile" || url.searchParams.getAll("data").length !== 1) {
    throw new TypeError("OneXray Profile link query is invalid");
  }
  const data = decodeComponent(url.searchParams.get("data"), "Profile link data");
  const profile = parseProfileJson(data);
  const fragment = decodeComponent(url.hash.slice(1), "Profile link fragment");
  const match = new RegExp(`^${NAME_PREFIX.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")} · (edge|current|previous) · ([a-f0-9]{8})$`, "u").exec(fragment);
  if (!match) throw new TypeError("OneXray Profile link fragment is invalid");
  const channel = match[1];
  const hash = match[2];
  if (profile.name !== baseName(channel)) throw new Error("OneXray Profile link name/channel mismatch");
  const actualHash = profileHash(profile);
  if (actualHash !== hash) throw new Error("OneXray Profile link hash mismatch");
  if (buildOneXrayProfileLink(profile, channel) !== link) throw new Error("OneXray Profile link is not canonical");
  return Object.freeze({ profile, channel, hash, displayName: fragment });
}

export { MAX_PROFILE_LINK_LENGTH, NAME_PREFIX };
