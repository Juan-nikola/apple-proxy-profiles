import assert from "node:assert/strict";
import vm from "node:vm";
import { parentPort, workerData } from "node:worker_threads";

function syntheticInventory() {
  return Array.from({ length: 25 }, (_, index) => ({
    name: `Synthetic ${index + 1}`,
    _profile: {
      id: `synthetic-${index + 1}`,
      continent: "asiaPacific",
      sourceKind: "airport",
      udp: true,
      p2p: false,
      entry: true,
      chained: false,
    },
  }));
}

function bootstrapSource(kind, scenario) {
  const configuration = JSON.stringify({
    kind,
    arguments: scenario.arguments,
    input: scenario.input,
    artifactMode: scenario.artifactMode ?? "inventory",
    inventory: syntheticInventory(),
  });
  return `
(() => {
  const configuration = JSON.parse(${JSON.stringify(configuration)});
  const calls = [];
  function sanitize(value, seen = new WeakSet()) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
    if (typeof value === "undefined") return { type: "undefined" };
    if (typeof value === "bigint" || typeof value === "symbol" || typeof value === "function") return { type: typeof value };
    if (seen.has(value)) return { type: "circular" };
    seen.add(value);
    if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
    const result = {};
    for (const key of Object.keys(value).sort()) result[key] = sanitize(value[key], seen);
    return result;
  }
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function record(interfaceName, method, args) {
    calls.push({ interface: interfaceName, method, arguments: sanitize(args) });
  }
  function realmStructuredClone(...args) {
    record("structuredClone", "call", args);
    return clone(args[0]);
  }
  const realmConsole = Object.freeze({
    debug(...args) { record("console", "debug", args); },
    error(...args) { record("console", "error", args); },
    info(...args) { record("console", "info", args); },
    log(...args) { record("console", "log", args); },
    warn(...args) { record("console", "warn", args); },
  });
  const realmProduceArtifact = configuration.kind === "profile" && configuration.artifactMode !== "unavailable"
    ? async function produceArtifact(...args) {
      record("produceArtifact", "call", args);
      return configuration.artifactMode === "empty" ? [] : clone(configuration.inventory);
    }
    : undefined;
  Object.defineProperties(globalThis, {
    $arguments: { value: configuration.arguments, enumerable: true },
    structuredClone: { value: realmStructuredClone, enumerable: true },
    console: { value: realmConsole, enumerable: true },
    produceArtifact: { value: realmProduceArtifact, enumerable: configuration.kind === "profile" },
    __compatInput: { value: configuration.input },
    __compatCallsJson: { value: () => JSON.stringify(calls) },
  });
})();
`;
}

function primitiveType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function exactDescription(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value === "undefined") return { type: "undefined" };
  if (Array.isArray(value)) return Array.from(value, (item) => exactDescription(item));
  if (typeof value === "object") {
    return Object.keys(value).sort().map((key) => [key, exactDescription(value[key])]);
  }
  return { type: typeof value };
}

function metadataDescription(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { type: primitiveType(value) };
  return {
    type: "object",
    entries: Object.keys(value).sort().map((key) => [
      key,
      key === "id"
        ? { type: primitiveType(value[key]), value: "<ignored-private-id>" }
        : exactDescription(value[key]),
    ]),
  };
}

function valueShape(value, role) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return { type: "array", items: Array.from(value, (item) => valueShape(item, role)) };
  }
  if (typeof value === "object") {
    return {
      type: "object",
      entries: Object.keys(value).sort().map((key) => {
        const canonicalKey = role === "baseline" && key === "_sr" ? "_profile" : key;
        const description = canonicalKey === "_profile"
          ? metadataDescription(value[key])
          : canonicalKey.startsWith("_")
            ? exactDescription(value[key])
            : valueShape(value[key], role);
        return [canonicalKey, description];
      }).sort(([left], [right]) => left.localeCompare(right, "en")),
    };
  }
  return typeof value;
}

function publicGlobalSignature(context, names) {
  return names.map((name) => {
    const value = context[name];
    if (typeof value === "function") return { name, type: "function", arity: value.length };
    if (value && typeof value === "object") {
      return {
        name,
        type: "object",
        exports: Object.keys(value).sort().map((exportName) => {
          const exported = value[exportName];
          return {
            name: exportName,
            type: typeof exported,
            arity: typeof exported === "function" ? exported.length : null,
          };
        }),
      };
    }
    return { name, type: typeof value };
  });
}

function loadBundle(kind, source, scenario, label, timeoutMs) {
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false },
    name: label,
  });
  vm.runInContext(bootstrapSource(kind, scenario), context, {
    filename: `${label}:bootstrap`,
    timeout: timeoutMs,
  });
  const initialNames = new Set(Object.getOwnPropertyNames(context));
  vm.runInContext(source, context, { filename: label, timeout: timeoutMs });
  const addedNames = Object.getOwnPropertyNames(context)
    .filter((name) => !initialNames.has(name))
    .sort();
  return { context, signature: publicGlobalSignature(context, addedNames) };
}

async function characterizeScenario(kind, source, scenario, label, role, timeoutMs) {
  let context;
  try {
    ({ context } = loadBundle(kind, source, scenario, `${label}:${scenario.name}`, timeoutMs));
    assert.equal(typeof context.operator, "function", `${label}: operator global is unavailable`);
    const value = await vm.runInContext('operator(__compatInput, "Shadowrocket")', context, {
      filename: `${label}:${scenario.name}:operator`,
      timeout: timeoutMs,
    });
    return {
      status: "fulfilled",
      shape: valueShape(value, role),
      calls: JSON.parse(vm.runInContext("__compatCallsJson()", context, { timeout: timeoutMs })),
    };
  } catch (error) {
    let calls = [];
    if (context) {
      try {
        calls = JSON.parse(vm.runInContext("__compatCallsJson()", context, { timeout: timeoutMs }));
      } catch {
        calls = [];
      }
    }
    return {
      status: "rejected",
      error: { name: error?.name ?? typeof error, message: error?.message ?? String(error) },
      calls,
    };
  }
}

async function compare() {
  const { kind, currentSource, baselineSource, label, scenarios, timeoutMs } = workerData;
  const signatureScenario = scenarios[0];
  const currentSignature = loadBundle(kind, currentSource, signatureScenario, `${label}:current`, timeoutMs).signature;
  const baselineSignature = loadBundle(kind, baselineSource, signatureScenario, `${label}:baseline`, timeoutMs).signature;
  assert.deepEqual(currentSignature, baselineSignature, `${label}: exported globals or operator arity changed`);

  for (const scenario of scenarios) {
    const current = await characterizeScenario(kind, currentSource, scenario, `${label}:current`, "current", timeoutMs);
    const baseline = await characterizeScenario(kind, baselineSource, scenario, `${label}:baseline`, "baseline", timeoutMs);
    assert.equal(baseline.status, scenario.expectedStatus, `${label}: baseline ${scenario.name} characterization is invalid`);
    assert.equal(current.status, scenario.expectedStatus, `${label}: current ${scenario.name} characterization changed`);
    assert.deepEqual(current, baseline, `${label}: ${scenario.name} behavior changed`);
  }
}

const keepAlive = setInterval(() => {}, 1_000);
try {
  await compare();
  parentPort.postMessage({ ok: true });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: { name: error?.name ?? "Error", message: error?.message ?? String(error) },
  });
} finally {
  clearInterval(keepAlive);
}
