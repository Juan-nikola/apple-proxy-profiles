const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F\u2028\u2029]/gu;
const PATH_SEPARATORS = /[\\/]/gu;

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
  if (typeof stableId !== "string" || !stableId.trim()) throw new TypeError("Happ tag stable ID is required");
  const label = normalizeHappTagLabel(nodeName);
  const tag = `${namespace}/${label} [${stableId}]`;
  return leaf === undefined ? tag : `${tag}/${normalizeHappTagLabel(leaf, "route")}`;
}
