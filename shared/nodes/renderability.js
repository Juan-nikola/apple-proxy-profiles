import { increment } from "./diagnostics.js";
import { diagnosticProtocol } from "./protocol-registry.js";

function protocolOf(node) {
  try {
    return diagnosticProtocol(node?.type);
  } catch {
    return "unknown";
  }
}

export function assertRenderableNodes(nodes, clientName, renderOneNode) {
  if (!Array.isArray(nodes)) throw new TypeError("Renderable node inventory must be an array");
  if (typeof clientName !== "string" || !/^[A-Za-z][A-Za-z0-9 -]*$/u.test(clientName)) {
    throw new TypeError("Render client name is invalid");
  }
  if (typeof renderOneNode !== "function") throw new TypeError("Node renderer must be a function");

  const failures = {};
  for (const node of nodes) {
    try {
      renderOneNode(node);
    } catch {
      increment(failures, protocolOf(node));
    }
  }

  const counts = Object.keys(failures)
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((protocol) => `${protocol}=${failures[protocol]}`)
    .join(",");
  if (counts) throw new Error(`${clientName} cannot render selected protocols: ${counts}`);
}
