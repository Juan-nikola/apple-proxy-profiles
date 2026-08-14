import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { partitionRenderableNodes } from "../../../shared/nodes/renderability.js";
import { parseOneXrayOptions } from "./options.js";
import { renderOneXrayOutbound } from "./render-outbound.js";
import { resolveOneXrayPolicy } from "./resolve-policy.js";
import { renderOneXraySubscription } from "./render-subscription.js";

function nodeOptions(raw) {
  const options = parseOneXrayOptions(raw);
  if (options.output !== "nodes") throw new Error("OneXray node output must be nodes");
  return options;
}

function processorError(code) {
  return new Error(`OneXray nodes: ${code}`);
}

function processorInput(input) {
  try {
    if (input === null || typeof input !== "object" || Array.isArray(input)) throw new Error();
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) throw new Error();
    const values = {};
    for (const key of ["proxies", "arguments", "onDiagnostics"]) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (descriptor === undefined) continue;
      if ("get" in descriptor || "set" in descriptor) throw new Error();
      values[key] = descriptor.value;
    }
    return values;
  } catch {
    throw processorError("invalid-request");
  }
}

function sortedCounts(counts) {
  return Object.fromEntries(
    Object.keys(counts ?? {})
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((key) => [key, counts[key]]),
  );
}

function diagnosticSummary(diagnostics, renderFailures = {}) {
  return {
    normalization: {
      total: diagnostics.total,
      accepted: diagnostics.accepted,
      protocols: sortedCounts(diagnostics.protocol),
      excluded: sortedCounts(diagnostics.excluded),
    },
    renderFailures: sortedCounts(renderFailures),
  };
}

function emitDiagnostics(onDiagnostics, diagnostics, renderFailures) {
  if (onDiagnostics === undefined) return;
  if (typeof onDiagnostics !== "function") throw processorError("invalid-diagnostics-handler");
  try {
    onDiagnostics(diagnosticSummary(diagnostics, renderFailures));
  } catch {
    // Optional diagnostics must not change the generated private subscription.
  }
}

/**
 * Pure Sub-Store node processor. Callers provide the raw proxy inventory and
 * lexical $arguments; this boundary never logs either private input.
 */
export function runOneXrayNodesProcessor(input = {}) {
  const { proxies, arguments: rawArguments, onDiagnostics } = processorInput(input);
  let options;
  try {
    options = nodeOptions(rawArguments);
  } catch {
    throw processorError("invalid-arguments");
  }

  let normalized;
  try {
    // OneXray resolves its native chain separately; generic generated clones
    // are not selected source nodes and cannot be rendered as native outbounds.
    normalized = normalizeNodes(proxies, { clientChain: "off" });
  } catch {
    throw processorError("invalid-inventory");
  }

  const partitioned = partitionRenderableNodes(normalized.nodes, "OneXray", (node) => renderOneXrayOutbound(node, {
    tag: node.name,
    allowDisplayTag: true,
  }));
  emitDiagnostics(onDiagnostics, normalized.diagnostics, partitioned.failureProtocols);

  let resolution;
  try {
    resolution = resolveOneXrayPolicy({
      options,
      allNodes: normalized.nodes,
      eligibleNodes: partitioned.renderable,
    });
  } catch (error) {
    void error;
    throw processorError("invalid-policy");
  }

  try {
    return renderOneXraySubscription(resolution);
  } catch (error) {
    void error;
    throw processorError("invalid-subscription");
  }
}
