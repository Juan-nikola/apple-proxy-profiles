import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { partitionRenderableNodes } from "../../../shared/nodes/renderability.js";
import { parseSurgeNodeOptions } from "./options.js";
import { renderSurgeNodeResource, renderSurgeProxy, sanitizeSurgeNode } from "./render-node.js";

function logDiagnostics(context, options, normalized, renderFailures) {
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
      accepted: normalized.nodes.length - Object.values(renderFailures ?? {}).reduce((sum, count) => sum + count, 0),
      renderFailures,
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
  const probe = (node) => renderSurgeProxy(sanitizeSurgeNode(node));
  const partitioned = partitionRenderableNodes(normalized.nodes, "Surge", probe);
  logDiagnostics(context, options, normalized, partitioned.failureProtocols);
  return { ...input, $content: renderSurgeNodeResource(partitioned.renderable) };
}
