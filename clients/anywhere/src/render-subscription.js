import { assertRenderableNodes } from "../../../shared/nodes/renderability.js";
import { renderYaml } from "../../../shared/serialization/render-yaml.js";
import { toAnywhereProxy } from "./render-node.js";
import { assertAnywhereSubscription } from "./validate-subscription.js";

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
  if (!Array.isArray(nodes)) throw new Error("Invalid Anywhere node inventory");
  if (nodes.length === 0) throw new Error("No compatible Anywhere nodes; excluded counts: none");
  assertRenderableNodes(nodes, "Anywhere", toAnywhereProxy);
  const names = new Set();
  const proxies = nodes.map((node) => {
    const proxy = toAnywhereProxy(node);
    if (names.has(proxy.name)) throw new Error("Duplicate Anywhere proxy name");
    names.add(proxy.name);
    return proxy;
  });
  const diagnostics = { accepted: nodes.length, excluded: {} };
  onDiagnostics?.(structuredClone(diagnostics));
  return { proxies, diagnostics };
}

export function renderAnywhereSubscription(nodes, options = {}) {
  const prepared = prepareAnywhereInventory(nodes, options);
  const subscription = renderYaml({ proxies: prepared.proxies });
  assertAnywhereSubscription(subscription, prepared.proxies);
  return subscription;
}
