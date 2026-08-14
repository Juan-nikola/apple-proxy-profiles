import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { assertRenderableNodes } from "../../../shared/nodes/renderability.js";
import { buildHappAudit } from "./audit.js";
import { parseHappOptions } from "./options.js";
import { renderHappOutbound } from "./render-node.js";
import { renderHappSubscription } from "./render-subscription.js";
import { validateHappSubscription } from "./validate-subscription.js";

const POLICY_OVERRIDES = "e30";
const PLATFORMS = Object.freeze(["macos", "iphone", "ipad", "android", "windows", "linux"]);

/** The seven private task argument sets intentionally share one policy encoding. */
export const HAPP_PRIVATE_TASKS = Object.freeze([
  ...PLATFORMS.map((platform) => Object.freeze({
    output: "config",
    type: "collection",
    name: `happ-config-${platform}`,
    subscriptionName: `happ-config-${platform}`,
    platform,
    policyOverrides: POLICY_OVERRIDES,
  })),
  Object.freeze({
    output: "audit",
    type: "collection",
    name: "happ-routing-audit",
    subscriptionName: "happ-routing-audit",
    platform: "all",
    policyOverrides: POLICY_OVERRIDES,
  }),
]);

function loggerMethod(context) {
  const logger = context?.logger;
  if (typeof logger === "function") return logger;
  if (typeof logger?.info === "function") return logger.info.bind(logger);
  if (typeof logger?.log === "function") return logger.log.bind(logger);
  return null;
}

function logDiagnostics(context, options, normalized) {
  const log = loggerMethod(context);
  if (!log) return;
  try {
    log(`[happ-config] ${JSON.stringify({ output: options.output, platform: options.platform, selected: normalized.nodes.length })}`);
  } catch {
    // Diagnostics are optional and cannot affect private generated content.
  }
}

/** Sub-Store entry point for private Happ Xray subscriptions and routing audit. */
export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseHappOptions(context.arguments ?? {});
  if (typeof context.produceArtifact !== "function") throw new Error("produceArtifact is unavailable");
  const rawNodes = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) throw new Error("produceArtifact must return a non-empty node array");
  const normalized = normalizeNodes(rawNodes);
  assertRenderableNodes(normalized.nodes, "Happ", (node) => renderHappOutbound(node, "happ-render-probe"));
  logDiagnostics(context, options, normalized);
  const content = options.output === "audit"
    ? buildHappAudit({ nodes: normalized.nodes, allNodes: normalized.nodes, options })
    : renderHappSubscription({ nodes: normalized.nodes, allNodes: normalized.nodes, options });
  if (options.output === "config") validateHappSubscription(content);
  return { ...input, $content: `${JSON.stringify(content, null, 2)}\n` };
}
