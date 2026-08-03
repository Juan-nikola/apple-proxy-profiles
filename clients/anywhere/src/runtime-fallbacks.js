const CLONE_ERROR = "Anywhere structured clone fallback rejected unsupported data";

function cloneFailure() {
  return new TypeError(CLONE_ERROR);
}

function arrayIndex(key, length) {
  if (!/^(?:0|[1-9]\d*)$/u.test(key)) return false;
  const index = Number(key);
  return Number.isSafeInteger(index)
    && index >= 0
    && index < length
    && index <= 4_294_967_294
    && String(index) === key;
}

function cloneData(value, seen) {
  if (value === null || typeof value !== "object") {
    if (["undefined", "boolean", "string", "number", "bigint"].includes(typeof value)) return value;
    throw cloneFailure();
  }
  if (seen.has(value)) return seen.get(value);

  const prototype = Object.getPrototypeOf(value);
  const isArray = Array.isArray(value);
  if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
    throw cloneFailure();
  }
  const keys = Reflect.ownKeys(value);
  const result = isArray ? [] : Object.create(prototype === null ? null : Object.prototype);
  seen.set(value, result);
  const length = isArray ? value.length : 0;
  for (const key of keys) {
    if (typeof key !== "string") throw cloneFailure();
    if (isArray && key === "length") continue;
    if (isArray && !arrayIndex(key, length)) throw cloneFailure();
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) throw cloneFailure();
    Object.defineProperty(result, key, {
      value: cloneData(descriptor.value, seen),
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  if (isArray) result.length = length;
  return result;
}

export function anywhereStructuredCloneFallback(value) {
  try {
    return cloneData(value, new WeakMap());
  } catch {
    throw cloneFailure();
  }
}

export function installAnywhereRuntimeFallbacks() {
  let implementation;
  try {
    implementation = globalThis.structuredClone;
    if (implementation !== undefined && typeof implementation !== "function") throw new Error();
  } catch {
    throw new Error("Anywhere runtime compatibility unavailable");
  }
  if (implementation !== undefined) return;
  try {
    Object.defineProperty(globalThis, "structuredClone", {
      value: anywhereStructuredCloneFallback,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  } catch {
    throw new Error("Anywhere runtime compatibility unavailable");
  }
}
