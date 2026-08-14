import { increment } from "../../../shared/nodes/diagnostics.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";

const DIAGNOSTIC_PREFIX = "[anywhere-profile] ";

export function argumentsFrom(context) {
  if (context === undefined) return {};
  if (context === null || typeof context !== "object") throw new Error("Anywhere operator context is invalid");
  let descriptor;
  try {
    descriptor = Object.getOwnPropertyDescriptor(context, "arguments");
  } catch {
    throw new Error("Anywhere operator arguments are unavailable");
  }
  if (descriptor === undefined) return {};
  if ("get" in descriptor || "set" in descriptor) throw new Error("Anywhere operator arguments are unavailable");
  return descriptor.value;
}

function producerFrom(context) {
  let producer;
  try {
    producer = context?.produceArtifact;
  } catch {
    throw new Error("produceArtifact is unavailable");
  }
  if (typeof producer !== "function") throw new Error("produceArtifact is unavailable");
  return producer;
}

export async function produceNormalizedNodes(options, context) {
  const producer = producerFrom(context);
  let rawNodes;
  try {
    rawNodes = await producer({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal",
    });
  } catch {
    throw new Error("Anywhere node artifact production failed");
  }
  let nonEmptyArray;
  try {
    nonEmptyArray = Array.isArray(rawNodes) && rawNodes.length > 0;
  } catch {
    throw new Error("produceArtifact must return a non-empty node array");
  }
  if (!nonEmptyArray) throw new Error("produceArtifact must return a non-empty node array");
  try {
    return normalizeNodes(rawNodes, { clientChain: "off" });
  } catch {
    throw new Error("Invalid Anywhere node inventory");
  }
}

export function mergedAnywhereDiagnostics(normalizationDiagnostics, anywhereDiagnostics) {
  const diagnostics = structuredClone(normalizationDiagnostics);
  diagnostics.accepted = anywhereDiagnostics.accepted;
  for (const [reason, count] of Object.entries(anywhereDiagnostics.excluded)) {
    increment(diagnostics.excluded, reason, count);
  }
  if (Object.hasOwn(anywhereDiagnostics, "renderFailures")) {
    diagnostics.renderFailures = { ...anywhereDiagnostics.renderFailures };
  }
  return diagnostics;
}

export function logAnywhereDiagnostics(context, diagnostics) {
  let logger;
  try {
    logger = context?.logger;
  } catch {
    return;
  }
  let method = null;
  try {
    method = typeof logger === "function"
      ? logger
      : typeof logger?.info === "function"
        ? logger.info.bind(logger)
        : typeof logger?.log === "function"
          ? logger.log.bind(logger)
          : null;
  } catch {
    return;
  }
  if (method === null) return;
  try {
    method(`${DIAGNOSTIC_PREFIX}${JSON.stringify(diagnostics)}`);
  } catch {
    // Diagnostics are optional and must not change the generated subscription.
  }
}
