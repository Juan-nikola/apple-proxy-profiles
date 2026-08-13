import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { assertRenderableNodes } from "../../../shared/nodes/renderability.js";
import { parseSurgeNodeOptions } from "./options.js";
import { renderSurgeNodeResource, renderSurgeProxy, sanitizeSurgeNode } from "./render-node.js";

function logDiagnostics(context, options, normalized) {
  const logger = context?.logger;
  const method = typeof logger === "function"
    ? logger
    : typeof logger?.info === "function"
      ? logger.info.bind(logger)
      : typeof logger?.log === "function"
        ? logger.log.bind(logger)
        : null;
  if (!method) return;
  try {
    method(`[surge-nodes] ${JSON.stringify({
      client: "surge",
      collection: options.name,
      total: normalized.diagnostics.total,
      accepted: normalized.nodes.length,
    })}`);
  } catch {
    // Diagnostics are optional and never change the private output.
  }
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseSurgeNodeOptions(context.arguments ?? {});
  if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
  const rawNodes = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
    throw new Error("produceArtifact must return a non-empty node array");
  }
  const normalized = normalizeNodes(rawNodes, { clientChain: options.clientChain });
  assertRenderableNodes(normalized.nodes, "Surge", (node) => renderSurgeProxy(sanitizeSurgeNode(node)));
  logDiagnostics(context, options, normalized);
  return { ...input, $content: renderSurgeNodeResource(normalized.nodes) };
}
