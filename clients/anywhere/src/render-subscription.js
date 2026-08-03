import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { renderYaml } from "../../../shared/serialization/render-yaml.js";
import { toAnywhereProxy } from "./render-node.js";
import { assertAnywhereSubscription } from "./validate-subscription.js";

function formatExcludedCounts(excluded) {
  return Object.keys(excluded)
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((reason) => `${reason}=${excluded[reason]}`)
    .join(",");
}

function parsePrepareOptions(options) {
  try {
    if (options === undefined) return {};
    if (options === null || typeof options !== "object" || Array.isArray(options)) throw new Error();
    const prototype = Object.getPrototypeOf(options);
    if (prototype !== Object.prototype && prototype !== null) throw new Error();
    const keys = Reflect.ownKeys(options);
    if (keys.some((key) => typeof key !== "string" || key !== "onDiagnostics")) throw new Error();
    if (!Object.hasOwn(options, "onDiagnostics")) return {};
    const descriptor = Object.getOwnPropertyDescriptor(options, "onDiagnostics");
    if (!descriptor || "get" in descriptor || "set" in descriptor || typeof descriptor.value !== "function") throw new Error();
    return { onDiagnostics: descriptor.value };
  } catch {
    throw new Error("Invalid Anywhere render options");
  }
}

export function prepareAnywhereInventory(nodes, options) {
  const { onDiagnostics } = parsePrepareOptions(options);
  if (onDiagnostics !== undefined && typeof onDiagnostics !== "function") {
    throw new Error("onDiagnostics must be a function");
  }
  let filtered;
  try {
    filtered = filterNodesForClient(nodes, CLIENT.anywhere);
  } catch {
    throw new Error("Invalid Anywhere node inventory");
  }
  if (filtered.nodes.length === 0) {
    const counts = formatExcludedCounts(filtered.diagnostics.excluded);
    throw new Error(`No compatible Anywhere nodes; excluded counts: ${counts || "none"}`);
  }
  const names = new Set();
  const proxies = filtered.nodes.map((node) => {
    const proxy = toAnywhereProxy(node);
    if (names.has(proxy.name)) throw new Error("Duplicate Anywhere proxy name");
    names.add(proxy.name);
    return proxy;
  });
  const diagnostics = structuredClone(filtered.diagnostics);
  onDiagnostics?.(structuredClone(diagnostics));
  return { proxies, diagnostics };
}

export function renderAnywhereSubscription(nodes, options = {}) {
  const prepared = prepareAnywhereInventory(nodes, options);
  const subscription = renderYaml({ proxies: prepared.proxies });
  assertAnywhereSubscription(subscription, prepared.proxies);
  return subscription;
}
