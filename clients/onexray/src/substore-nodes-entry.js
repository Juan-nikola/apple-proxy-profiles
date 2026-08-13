import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { assertRenderableNodes } from "../../../shared/nodes/renderability.js";
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

function diagnosticSummary(diagnostics) {
  return {
    accepted: diagnostics.accepted,
    excluded: Object.fromEntries(
      Object.keys(diagnostics.excluded)
        .sort((left, right) => left.localeCompare(right, "en"))
        .map((reason) => [reason, diagnostics.excluded[reason]]),
    ),
  };
}

function emitDiagnostics(onDiagnostics, diagnostics) {
  if (onDiagnostics === undefined) return;
  if (typeof onDiagnostics !== "function") throw processorError("invalid-diagnostics-handler");
  try {
    onDiagnostics(diagnosticSummary(diagnostics));
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

  assertRenderableNodes(normalized.nodes, "OneXray", (node) => renderOneXrayOutbound(node, {
    tag: node.name,
    allowDisplayTag: true,
  }));
  const renderability = { accepted: normalized.nodes.length, excluded: {} };
  emitDiagnostics(onDiagnostics, renderability);

  let resolution;
  try {
    resolution = resolveOneXrayPolicy({
      options,
      allNodes: normalized.nodes,
      eligibleNodes: normalized.nodes,
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
