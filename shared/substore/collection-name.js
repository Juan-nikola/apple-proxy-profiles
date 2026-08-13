const SAFE_COLLECTION_NAME = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function validateCollectionName(value, label = "collection name") {
  if (
    typeof value !== "string"
    || !SAFE_COLLECTION_NAME.test(value)
    || PROTOTYPE_KEYS.has(value)
  ) {
    throw new Error(`${label} must be a safe collection slug`);
  }
  return value;
}
