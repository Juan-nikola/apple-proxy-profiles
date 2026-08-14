import { increment } from "./diagnostics.js";
import { normalizeProtocol } from "./protocol-registry.js";

function protocolOf(node) {
  try {
    return normalizeProtocol(node?.type) || "unknown";
  } catch {
    return "unknown";
  }
}

function validateRenderableInvocation(nodes, clientName, renderOneNode) {
  if (!Array.isArray(nodes)) throw new TypeError("Renderable node inventory must be an array");
  if (typeof clientName !== "string" || !/^[A-Za-z][A-Za-z0-9 -]*$/u.test(clientName)) {
    throw new TypeError("Render client name is invalid");
  }
  if (typeof renderOneNode !== "function") throw new TypeError("Node renderer must be a function");
}

function failureSummary(failures) {
  return Object.keys(failures)
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((protocol) => `${protocol}=${failures[protocol]}`)
    .join(",");
}

/**
 * Splits a selected inventory into nodes the concrete renderer can emit and a
 * protocol-keyed count of skipped nodes. The whole task only fails when no
 * selected node can be rendered; callers decide how to surface partial counts.
 */
export function partitionRenderableNodes(nodes, clientName, renderOneNode) {
  validateRenderableInvocation(nodes, clientName, renderOneNode);
  const failures = {};
  const renderable = [];
  for (const node of nodes) {
    try {
      renderOneNode(node);
      renderable.push(node);
    } catch {
      increment(failures, protocolOf(node));
    }
  }

  if (renderable.length === 0) {
    throw new Error(`${clientName} cannot render selected protocols: ${failureSummary(failures)}`);
  }
  return { renderable, failureProtocols: failures };
}

export function assertRenderableNodes(nodes, clientName, renderOneNode) {
  validateRenderableInvocation(nodes, clientName, renderOneNode);
  const failures = {};
  for (const node of nodes) {
    try {
      renderOneNode(node);
    } catch {
      increment(failures, protocolOf(node));
    }
  }
  const counts = failureSummary(failures);
  if (counts) throw new Error(`${clientName} cannot render selected protocols: ${counts}`);
}
