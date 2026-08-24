import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { CLIENT } from "../../../shared/contracts.js";
import { assertRenderableNodes, partitionRenderableNodes } from "../../../shared/nodes/renderability.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { parseSingBoxOptions } from "./options.js";
import { renderSingBoxConfig } from "./render-config.js";
import { renderSingBoxNode } from "./render-node.js";

export const PUBLIC_RULE_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";

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
    method(`[sing-box-config] ${JSON.stringify({ client: "singbox", platform: options.platform, channel: options.channel, accepted: nodes.length, renderFailures })}`);
  } catch {
    // Diagnostics are optional and never change the private JSON output.
  }
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseSingBoxOptions(context.arguments ?? {});
  if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
  const rawNodes = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) throw new Error("produceArtifact must return a non-empty node array");
  const normalized = normalizeNodes(rawNodes, { clientChain: options.clientChain });
  const invalidInputCount = Object.entries(normalized.diagnostics.excluded)
    .filter(([reason]) => reason !== "exact-duplicate")
    .reduce((total, [, count]) => total + count, 0);
  if (options.nodeErrorMode === "strict" && invalidInputCount > 0) {
    throw new Error(`sing-box strict node inventory rejected ${invalidInputCount} invalid input node(s): ${JSON.stringify(normalized.diagnostics.excluded)}`);
  }
  let renderable;
  let renderFailures;
  if (options.nodeErrorMode === "compatible") {
    const partitioned = partitionRenderableNodes(normalized.nodes, "sing-box", renderSingBoxNode);
    renderable = partitioned.renderable;
    renderFailures = partitioned.failureProtocols;
  } else {
    assertRenderableNodes(normalized.nodes, "sing-box", renderSingBoxNode);
    renderable = normalized.nodes;
    renderFailures = {};
  }
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: options.channel,
    client: CLIENT.singbox,
    allNodes: normalized.nodes,
    eligibleNodes: renderable,
  });
  logDiagnostics(context, options, renderable, renderFailures);
  const ruleBaseUrl = `${PUBLIC_RULE_ROOT}/${options.channel}/sing-box/rule-sets`;
  const config = renderSingBoxConfig(options, renderable, { ruleBaseUrl, policyResolution });
  return { ...input, $content: `${JSON.stringify(config, null, 2)}\n` };
}
