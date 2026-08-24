import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { UNIFIED_POLICY_TARGETS } from "../../../shared/policies/unified-policy.js";
import { argumentsFrom, produceNormalizedNodes } from "./substore-runtime.js";
import { validateCollectionName } from "../../../shared/substore/collection-name.js";

const ALLOWED_KEYS = new Set(["output", "type", "name", "channel"]);
const PROTOTYPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function strategyArguments(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Anywhere strategy arguments must be a plain object");
  }
  let prototype;
  let keys;
  try {
    prototype = Object.getPrototypeOf(raw);
    keys = Reflect.ownKeys(raw);
  } catch {
    throw new Error("Anywhere strategy arguments must be a plain object");
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("Anywhere strategy arguments must not contain inherited options");
  }
  const values = new Map();
  for (const key of keys) {
    if (typeof key !== "string" || PROTOTYPE_KEYS.has(key) || !ALLOWED_KEYS.has(key)) {
      throw new Error("Unknown Anywhere strategy option");
    }
    const descriptor = Object.getOwnPropertyDescriptor(raw, key);
    if (!descriptor || "get" in descriptor || "set" in descriptor || !descriptor.enumerable) {
      throw new Error("Invalid Anywhere strategy option descriptor");
    }
    values.set(key, descriptor.value);
  }
  if (values.get("output") !== "strategy") throw new Error("Anywhere strategy output must be strategy");
  if (values.get("type") !== "collection") throw new Error("Anywhere strategy type must be collection");
  const name = validateCollectionName(values.get("name"), "Anywhere strategy name");
  const channel = values.get("channel") ?? "edge";
  if (!FRONTIER_CHANNELS.includes(channel)) throw new Error("Anywhere strategy channel is unsupported");
  return Object.freeze({ output: "strategy", type: "collection", name, channel, clientChain: "off" });
}

function safeTarget(target) {
  return {
    configured: target.configured,
    resolved: target.resolved,
    status: target.status,
    warningCode: target.warningCode ?? null,
    ...(target.nodeId ? { nodeId: target.nodeId } : {}),
  };
}

function buildStrategy({ options, normalized, filtered, resolution }) {
  return {
    schemaVersion: 1,
    client: CLIENT.anywhere,
    output: "strategy",
    channel: options.channel,
    counts: {
      inputNodes: normalized.diagnostics.total,
      normalizedNodes: normalized.nodes.length,
      eligibleNodes: filtered.nodes.length,
      fixedNodes: resolution.fixedNodes.length,
    },
    targets: Object.fromEntries(
      UNIFIED_POLICY_TARGETS.map(({ id }) => [id, safeTarget(resolution.targets[id])]),
    ),
  };
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = strategyArguments(argumentsFrom(context));
  const normalized = await produceNormalizedNodes(options, context);
  const filtered = filterNodesForClient(normalized.nodes, CLIENT.anywhere);
  if (filtered.nodes.length === 0) throw new Error("Anywhere strategy has no compatible nodes");
  const policy = await loadSubstorePolicyArtifact(context);
  if (policy === null) throw new Error("Anywhere strategy policy artifact is unavailable");
  const resolution = resolveUnifiedPolicy({
    policy,
    channel: options.channel,
    client: CLIENT.anywhere,
    allNodes: normalized.nodes,
    eligibleNodes: filtered.nodes,
  });
  return { ...input, $content: `${JSON.stringify(buildStrategy({ options, normalized, filtered, resolution }), null, 2)}\n` };
}
