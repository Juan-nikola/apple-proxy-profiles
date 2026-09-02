import { CLIENT } from "../../../shared/contracts.js";
import { identityKey } from "../../../shared/nodes/node-identity.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { loadSubstorePolicyArtifact } from "../../../shared/substore/policy-artifact.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";
import { parseIncyOptions } from "./options.js";
import { incyAutoroutingUrl } from "./link-encoder.js";
import { renderIncySubscription } from "./render-subscription.js";
import { validateIncySubscription } from "./validate-subscription.js";

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

function attachResponseHeaders(input, context, options) {
  const requestOptions = requestOptionsFrom(input, context);
  if (!requestOptions) return;
  setResponseHeader(requestOptions, "content-type", "application/json; charset=utf-8");
  setResponseHeader(requestOptions, "content-disposition", `attachment; filename="incy-${options.platform}.json"`);
  setResponseHeader(requestOptions, "autorouting", `incy://autorouting/onadd/${incyAutoroutingUrl("current")}`);
}

function logDiagnostics(context, options, normalized, configs) {
  const logger = typeof context?.logger === "function"
    ? context.logger
    : typeof context?.logger?.info === "function"
      ? context.logger.info.bind(context.logger)
      : null;
  if (!logger) return;
  try {
    logger(`[incy-config] ${JSON.stringify({
      client: "incy",
      platform: options.platform,
      schemaVersion: 2,
      normalized: normalized.diagnostics.total,
      accepted: configs.length,
      protocol: normalized.diagnostics.protocol,
    })}`);
  } catch {
    // Diagnostics must never interfere with the generated JSON output.
  }
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseIncyOptions(context.arguments ?? {});
  if (typeof context.produceArtifact !== "function") {
    throw new Error("INCY produceArtifact is unavailable");
  }
  const raw = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("INCY source collection is empty");
  }
  const normalized = normalizeNodes(raw, { clientChain: options.clientChain });
  if (normalized.nodes.length !== raw.length) {
    const excluded = Object.entries(normalized.diagnostics.excluded ?? {})
      .map(([reason, count]) => `${reason}=${count}`)
      .join(",");
    throw new Error(`INCY cannot render selected protocols: ${excluded || "unknown"}`);
  }
  const normalizedById = new Map(normalized.nodes.map((node) => [identityKey(node), node]));
  const orderedNodes = raw.map((node) => normalizedById.get(identityKey(node))).filter(Boolean);
  const policy = await loadSubstorePolicyArtifact(context);
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: options.channel,
    client: CLIENT.incy,
    allNodes: orderedNodes,
    eligibleNodes: orderedNodes,
  });
  const configs = renderIncySubscription({
    nodes: orderedNodes,
    options,
    policyResolution,
  });
  validateIncySubscription(configs);
  logDiagnostics(context, options, normalized, configs);
  attachResponseHeaders(input, context, options);
  return { ...input, $content: `${JSON.stringify(configs, null, 2)}\n` };
}
