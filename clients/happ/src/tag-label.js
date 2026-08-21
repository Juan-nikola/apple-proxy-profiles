const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F-\u009F\u2028\u2029]/gu;
const PATH_SEPARATORS = /[\\/]/gu;
const URL_FRAGMENT = /\b(?:https?|socks(?:4|5)?):\/\/[^\s]+/giu;
const IPV4_FRAGMENT = /\b(?:\d{1,3}\.){3}\d{1,3}\b/gu;
const UUID_FRAGMENT = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/giu;
const CREDENTIAL_FRAGMENT = /\b(?:password|passwd|token|secret|uuid|key)\s*[:=]\s*[^\s,;]+/giu;
const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;

function trimCodePoints(value, limit) {
  return [...value].slice(0, limit).join("");
}

/**
 * Keep the HAPP route tag readable while retaining a stable opaque ID.
 * Node names are user-facing data, so remove only characters that could
 * corrupt a tag or make the HAPP route path ambiguous.
 */
export function normalizeHappTagLabel(value, fallback = "node") {
  const normalized = String(value ?? "")
    .normalize("NFC")
    .replace(URL_FRAGMENT, "")
    .replace(UUID_FRAGMENT, "")
    .replace(IPV4_FRAGMENT, "")
    .replace(CREDENTIAL_FRAGMENT, "")
    .replace(CONTROL_CHARACTERS, "")
    .replace(PATH_SEPARATORS, "-")
    .replace(/\s+/gu, " ")
    .trim();
  return trimCodePoints(normalized || fallback, 96);
}

export function buildHappDisplayTag(namespace, nodeName, stableId, leaf) {
  if (typeof namespace !== "string" || !/^happ-[a-z0-9-]+$/u.test(namespace)) {
    throw new TypeError("Happ tag namespace is invalid");
  }
  if (typeof stableId !== "string" || !STABLE_ID.test(stableId)) {
    throw new TypeError("Happ tag stable ID is invalid");
  }
  const label = normalizeHappTagLabel(nodeName);
  const tag = `${namespace}/${label} [${stableId}]`;
  return leaf === undefined ? tag : `${tag}/${normalizeHappTagLabel(leaf, "route")}`;
}
