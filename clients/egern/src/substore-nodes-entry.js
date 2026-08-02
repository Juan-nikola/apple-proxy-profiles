import { renderEgernSubscription } from "./render-subscription.js";
import {
  argumentsFrom,
  logEgernDiagnostics,
  mergedEgernDiagnostics,
  produceNormalizedNodes,
} from "./substore-runtime.js";

const ALLOWED_KEYS = new Set(["output", "type", "name", "clientChain"]);
const AMBIGUOUS_WHITESPACE = /[\t\v\f\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]/u;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/u;
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function nodeArguments(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Egern node arguments must be a plain object");
  }
  let prototype;
  let keys;
  try {
    prototype = Object.getPrototypeOf(raw);
    keys = Reflect.ownKeys(raw);
  } catch {
    throw new Error("Egern node arguments must be a plain object");
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("Egern node arguments must not contain inherited options");
  }

  const values = new Map();
  for (const key of keys) {
    if (typeof key !== "string") throw new Error("Unknown Egern node option");
    if (PROTOTYPE_KEYS.has(key)) throw new Error("Egern node prototype option is forbidden");
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(raw, key);
    } catch {
      throw new Error("Invalid Egern node option descriptor");
    }
    if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) {
      throw new Error("Invalid Egern node option descriptor");
    }
    if (!key.startsWith("_") && !ALLOWED_KEYS.has(key)) throw new Error("Unknown Egern node option");
    values.set(key, descriptor.value);
  }

  if (values.get("output") !== "nodes") throw new Error("Egern node output must be nodes");
  if (values.get("type") !== "collection") throw new Error("Egern node type must be collection");
  const name = values.get("name");
  if (
    typeof name !== "string"
    || name.length === 0
    || name.trim() !== name
    || CONTROL_CHARACTERS.test(name)
    || AMBIGUOUS_WHITESPACE.test(name)
  ) throw new Error("Egern node name is invalid");
  const clientChain = values.has("clientChain") ? values.get("clientChain") : "off";
  if (clientChain !== "off" && clientChain !== "on") {
    throw new Error("Egern node clientChain must be off or on");
  }
  return Object.freeze({ output: "nodes", type: "collection", name, clientChain });
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = nodeArguments(argumentsFrom(context));
  const normalized = await produceNormalizedNodes(options, context);
  let egernDiagnostics;
  const content = renderEgernSubscription(normalized.nodes, {
    clientChain: options.clientChain,
    onDiagnostics(value) { egernDiagnostics = value; },
  });
  const diagnostics = mergedEgernDiagnostics(normalized.diagnostics, egernDiagnostics);
  logEgernDiagnostics(context, diagnostics);
  return { ...input, $content: content };
}
