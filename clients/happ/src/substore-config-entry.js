import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { parseHappOptions } from "./options.js";
import { renderHappSubscription } from "./render-subscription.js";
import { renderHappRoutingDeepLink, renderHappRoutingProfile } from "./routing-profile-data.js";

const PUBLIC_ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";
const HAPP_PUBLIC_CHANNEL = "current";

function requestOptionsFrom(input, context) {
  const candidates = [context?.requestOptions, input?.$options];
  return candidates.find((value) => value && typeof value === "object" && !Array.isArray(value));
}

function setResponseHeader(requestOptions, name, value) {
  if (!requestOptions) return false;
  if (!requestOptions._res || typeof requestOptions._res !== "object" || Array.isArray(requestOptions._res)) requestOptions._res = {};
  const response = requestOptions._res;
  if (!response.headers || typeof response.headers !== "object" || Array.isArray(response.headers)) response.headers = {};
  if (typeof response.headers.set === "function") response.headers.set(name, value);
  else response.headers[name] = value;
  return true;
}

function attachRoutingProfile(input, context, options) {
  const requestOptions = requestOptionsFrom(input, context);
  if (!requestOptions) return;
  const profile = renderHappRoutingProfile({
    baseUrl: `${PUBLIC_ROOT}/${HAPP_PUBLIC_CHANNEL}`,
    generatedAt: new Date().toISOString(),
  });
  setResponseHeader(requestOptions, "routing", renderHappRoutingDeepLink(profile));
  setResponseHeader(requestOptions, "content-type", "application/json; charset=utf-8");
  setResponseHeader(requestOptions, "content-disposition", `attachment; filename="happ-${options.platform}.json"`);
  // HAPP's default 50 MB tunnel cap is too small for a multi-node Xray JSON subscription.
  // Use the documented subscription header so the core raises its RAM limit before startup.
  setResponseHeader(requestOptions, "no-limit-enabled", "1");
}

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
      channel: HAPP_PUBLIC_CHANNEL,
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
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: HAPP_PUBLIC_CHANNEL,
    client: CLIENT.happ,
    allNodes: normalized.nodes,
    eligibleNodes: filtered.nodes,
  });
  logDiagnostics(context, options, normalized, filtered);
  const configs = renderHappSubscription({
    nodes: filtered.nodes,
    allNodes: normalized.nodes,
    options,
    policyResolution,
  });
  attachRoutingProfile(input, context, options);
  return { ...input, $content: `${JSON.stringify(configs, null, 2)}\n` };
}
