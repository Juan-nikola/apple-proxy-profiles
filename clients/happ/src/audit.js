import { resolvePolicyOverrides } from "./policy-overrides.js";

function nodeId(node) {
  const id = node?._profile?.id;
  if (typeof id !== "string" || id.length === 0) throw new Error("Happ normalized node is missing _profile.id");
  return id;
}

/** Builds private diagnostic metadata only; it deliberately never retains node objects. */
export function buildHappAudit({ nodes, allNodes = nodes, options }) {
  if (!Array.isArray(nodes) || !Array.isArray(allNodes)) throw new TypeError("Happ audit nodes must be arrays");
  if (!options || typeof options !== "object" || Array.isArray(options)) throw new TypeError("Happ audit options are invalid");
  const resolution = resolvePolicyOverrides({ encoded: options.policyOverrides ?? "", allNodes, eligibleNodes: nodes });
  const names = new Map(nodes.map((node) => [nodeId(node), node.name]));
  const targets = Object.fromEntries(Object.entries(resolution.targets).map(([businessKey, target]) => [businessKey, Object.freeze({
    configured: target.configured,
    resolved: target.resolved,
    status: target.status,
    warningCode: target.warningCode,
    nodeName: target.nodeId === null ? null : names.get(target.nodeId) ?? null,
  })]));
  return Object.freeze({
    schemaVersion: 1,
    counts: Object.freeze({ eligibleNodes: nodes.length, fixedNodes: resolution.fixedNodes.length, warnings: resolution.warnings.length }),
    targets: Object.freeze(targets),
    warnings: Object.freeze(resolution.warnings.map(({ businessKey, code }) => Object.freeze({ businessKey, code }))),
  });
}
