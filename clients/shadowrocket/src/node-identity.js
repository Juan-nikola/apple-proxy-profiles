const SECRET_KEYS = new Set([
  "password",
  "psk",
  "uuid",
  "private-key",
  "private_key",
  "token",
]);

const EXCLUDED_TOP_LEVEL_KEYS = new Set([
  "name",
  "_subName",
  "_subDisplayName",
  "_collectionName",
  "_collectionDisplayName",
  "_sr",
  "_resolved",
  "_IPv4",
  "_IPv6",
  "_IP",
  "_IP4P",
  "_domain",
  "_resolved_ips",
]);

function stableValue(value, stack = new Set(), topLevel = false) {
  if (value === null) return "null";

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return Number.isFinite(value) ? String(value) : JSON.stringify(String(value));
    case "bigint":
      return JSON.stringify(`${value}n`);
    case "undefined":
      return "undefined";
    case "function":
    case "symbol":
      return JSON.stringify(String(value));
    default:
      break;
  }

  if (stack.has(value)) return JSON.stringify("[Circular]");
  stack.add(value);
  let result;
  if (Array.isArray(value)) {
    result = `[${value.map((item) => stableValue(item, stack)).join(",")}]`;
  } else {
    const entries = Object.keys(value)
      .filter((key) => !(topLevel && EXCLUDED_TOP_LEVEL_KEYS.has(key)))
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableValue(value[key], stack)}`);
    result = `{${entries.join(",")}}`;
  }
  stack.delete(value);
  return result;
}

export function identityKey(node) {
  return stableValue(node, new Set(), true);
}

export function fingerprint(node) {
  const value = identityKey(node);
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

export function containsSecretKey(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return false;
  seen.add(value);
  for (const key of Object.keys(value)) {
    if (SECRET_KEYS.has(key.toLowerCase())) return true;
    if (containsSecretKey(value[key], seen)) return true;
  }
  return false;
}

