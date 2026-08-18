import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { parseHappOptions } from "./options.js";
import { renderHappSubscription } from "./render-subscription.js";

function logDiagnostics(context, options, normalized, filtered) {
  const method = typeof context?.logger === "function"
    ? context.logger
    : typeof context?.logger?.info === "function"
      ? context.logger.info.bind(context.logger)
      : null;
  if (!method) return;
  try {
    method(`[happ-config] ${JSON.stringify({
      client: "happ",
      platform: options.platform,
      channel: options.channel,
      accepted: filtered.nodes.length,
      excluded: filtered.diagnostics.excluded,
      normalized: normalized.diagnostics.total,
    })}`);
  } catch {
    // Diagnostics must never alter the private output or expose node values.
  }
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseHappOptions(context.arguments ?? {});
  if (options.output !== "config") throw new Error("HAPP config entry requires output=config");
  if (typeof context.produceArtifact !== "function") throw new Error("HAPP produceArtifact is unavailable");
  const raw = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("HAPP source collection is empty");
  const normalized = normalizeNodes(raw, { clientChain: "off" });
  const filtered = filterNodesForClient(normalized.nodes, CLIENT.happ);
  if (filtered.nodes.length === 0) throw new Error("HAPP has no compatible nodes");
  logDiagnostics(context, options, normalized, filtered);
  const configs = renderHappSubscription({
    nodes: filtered.nodes,
    allNodes: normalized.nodes,
    options,
  });
  return { ...input, $content: `${JSON.stringify(configs, null, 2)}\n` };
}
