import { renderAnywhereSubscription } from "./render-subscription.js";
import { installAnywhereRuntimeFallbacks } from "./runtime-fallbacks.js";
import {
  argumentsFrom,
  logAnywhereDiagnostics,
  mergedAnywhereDiagnostics,
  produceNormalizedNodes,
} from "./substore-runtime.js";

const ALLOWED_KEYS = new Set(["output", "type", "name", "clientChain"]);
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const COLLECTION_NAME = "apple-proxy-sources";

function nodeArguments(raw) {
  let array;
  try {
    array = Array.isArray(raw);
  } catch {
    throw new Error("Anywhere node arguments must be a plain object");
  }
  if (raw === null || typeof raw !== "object" || array) {
    throw new Error("Anywhere node arguments must be a plain object");
  }
  let prototype;
  let keys;
  try {
    prototype = Object.getPrototypeOf(raw);
    keys = Reflect.ownKeys(raw);
  } catch {
    throw new Error("Anywhere node arguments must be a plain object");
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("Anywhere node arguments must not contain inherited options");
  }
  const values = new Map();
  for (const key of keys) {
    if (typeof key !== "string" || PROTOTYPE_KEYS.has(key) || !ALLOWED_KEYS.has(key)) {
      throw new Error("Unknown Anywhere node option");
    }
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(raw, key);
    } catch {
      throw new Error("Invalid Anywhere node option descriptor");
    }
    if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) {
      throw new Error("Invalid Anywhere node option descriptor");
    }
    values.set(key, descriptor.value);
  }
  if (values.get("output") !== "nodes") throw new Error("Anywhere node output must be nodes");
  if (values.get("type") !== "collection") throw new Error("Anywhere node type must be collection");
  if (values.get("name") !== COLLECTION_NAME) throw new Error("Anywhere node collection is invalid");
  if (values.get("clientChain") !== "off") throw new Error("Anywhere clientChain must be off");
  return Object.freeze({ output: "nodes", type: "collection", name: COLLECTION_NAME, clientChain: "off" });
}

function outputWithContent(input, content) {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error();
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) throw new Error();
    const output = {};
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key !== "string") throw new Error();
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || "get" in descriptor || "set" in descriptor) throw new Error();
      if (!descriptor.enumerable || key === "$content") continue;
      Object.defineProperty(output, key, {
        value: descriptor.value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    output.$content = content;
    return output;
  } catch {
    throw new Error("Invalid Anywhere input artifact");
  }
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  installAnywhereRuntimeFallbacks();
  const options = nodeArguments(argumentsFrom(context));
  const normalized = await produceNormalizedNodes(options, context);
  let anywhereDiagnostics;
  const content = renderAnywhereSubscription(normalized.nodes, {
    onDiagnostics(value) { anywhereDiagnostics = value; },
  });
  const diagnostics = mergedAnywhereDiagnostics(normalized.diagnostics, anywhereDiagnostics);
  logAnywhereDiagnostics(context, diagnostics);
  return outputWithContent(input, content);
}
