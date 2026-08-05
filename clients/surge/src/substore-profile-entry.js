import { parseSurgeOptions } from "./options.js";
import { renderSurgeProfile } from "./render-profile.js";

export const PUBLIC_RULE_BASE_URL = "https://juan-nikola.github.io/apple-proxy-profiles/current/surge/rules";

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
    method(`[surge-profile] ${JSON.stringify({ client: "surge", platform: options.platform, accepted: nodes.length })}`);
  } catch {
    // Diagnostics are optional and never change the private output.
  }
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseSurgeOptions(context.arguments ?? {});
  if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
  const nodes = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("produceArtifact must return a non-empty node array");
  logDiagnostics(context, options, nodes);
  const profile = renderSurgeProfile(options, nodes, { ruleBaseUrl: PUBLIC_RULE_BASE_URL });
  return { ...input, $content: profile };
}
