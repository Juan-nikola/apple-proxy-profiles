import { parseSingBoxOptions } from "./options.js";
import { renderSingBoxConfig } from "./render-config.js";

export const PUBLIC_RULE_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";

function logDiagnostics(context, options, nodes) {
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
    method(`[sing-box-config] ${JSON.stringify({ client: "singbox", platform: options.platform, channel: options.channel, accepted: nodes.length })}`);
  } catch {
    // Diagnostics are optional and never change the private JSON output.
  }
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseSingBoxOptions(context.arguments ?? {});
  if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
  const nodes = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("produceArtifact must return a non-empty node array");
  logDiagnostics(context, options, nodes);
  const ruleBaseUrl = `${PUBLIC_RULE_ROOT}/${options.channel}/sing-box/rules`;
  const config = renderSingBoxConfig(options, nodes, { ruleBaseUrl, ruleSetFormat: "binary" });
  return { ...input, $content: `${JSON.stringify(config, null, 2)}\n` };
}
