import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { partitionRenderableNodes } from "../../../shared/nodes/renderability.js";
import { parseSurgeOptions } from "./options.js";
import { renderSurgeProfile } from "./render-profile.js";
import { renderSurgeProxy, sanitizeSurgeNode } from "./render-node.js";

export const PUBLIC_RULE_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";
export const PUBLIC_RULE_BASE_URL = `${PUBLIC_RULE_ROOT}/current/surge/rules`;

function logDiagnostics(context, options, nodes, renderFailures) {
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
    method(`[surge-profile] ${JSON.stringify({ client: "surge", platform: options.platform, channel: options.channel, accepted: nodes.length, renderFailures })}`);
  } catch {
    // Diagnostics are optional and never change the private output.
  }
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseSurgeOptions(context.arguments ?? {});
  if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
  const rawNodes = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) throw new Error("produceArtifact must return a non-empty node array");
  const normalized = normalizeNodes(rawNodes, { clientChain: options.clientChain });
  const probe = (node) => renderSurgeProxy(sanitizeSurgeNode(node));
  const partitioned = partitionRenderableNodes(normalized.nodes, "Surge", probe);
  logDiagnostics(context, options, partitioned.renderable, partitioned.failureProtocols);
  const ruleBaseUrl = `${PUBLIC_RULE_ROOT}/${options.channel}/surge/rules`;
  const profile = renderSurgeProfile(options, partitioned.renderable.map(sanitizeSurgeNode), { ruleBaseUrl });
  return { ...input, $content: profile };
}
