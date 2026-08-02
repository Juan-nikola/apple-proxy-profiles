import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { increment } from "../../../shared/nodes/diagnostics.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";

const ALLOWED_OPTIONS = new Set(["output", "clientChain"]);

function parseArguments(rawArguments) {
  if (!rawArguments || typeof rawArguments !== "object" || Array.isArray(rawArguments)) {
    throw new Error("arguments must be an object");
  }
  for (const key of Object.keys(rawArguments)) {
    if (!key.startsWith("_") && !ALLOWED_OPTIONS.has(key)) {
      throw new Error(`Unknown option: ${key}`);
    }
  }
  if (!Object.hasOwn(rawArguments, "output") || rawArguments.output !== "nodes") {
    throw new Error("output must be nodes");
  }
  const clientChain = Object.hasOwn(rawArguments, "clientChain") ? rawArguments.clientChain : "off";
  if (clientChain !== "off" && clientChain !== "on") {
    throw new Error("clientChain must be off or on");
  }
  return { clientChain };
}

function logDiagnostics(context, diagnostics) {
  const suppliedLogger = context?.logger;
  const logger = suppliedLogger ?? globalThis?.console;
  const method = typeof logger === "function"
    ? logger
    : typeof logger?.info === "function"
    ? logger.info.bind(logger)
    : typeof logger?.log === "function"
      ? logger.log.bind(logger)
      : null;
  if (!method) return;
  try {
    method(`[shadowrocket-profile] ${JSON.stringify(diagnostics)}`);
  } catch {
    // Logging is optional and must not change the generated subscription.
  }
}

export async function operator(proxies = [], targetPlatform, context = {}) {
  void targetPlatform;
  const { clientChain } = parseArguments(context.arguments ?? {});
  const result = normalizeNodes(proxies, { clientChain });
  const filtered = filterNodesForClient(result.nodes, CLIENT.shadowrocket);
  if (filtered.nodes.length === 0) {
    throw new Error("No compatible Shadowrocket nodes");
  }
  result.diagnostics.accepted = filtered.diagnostics.accepted;
  for (const [reason, count] of Object.entries(filtered.diagnostics.excluded)) {
    increment(result.diagnostics.excluded, reason, count);
  }
  logDiagnostics(context, result.diagnostics);
  return filtered.nodes;
}
