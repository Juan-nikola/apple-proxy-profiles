import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";
import { parseOneXrayOptions } from "./options.js";
import { resolveOneXrayPolicy } from "./resolve-policy.js";
import { renderOneXraySubscription } from "./render-subscription.js";

function formatExcludedCounts(excluded) {
  return Object.keys(excluded)
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((reason) => `${reason}=${excluded[reason]}`)
    .join(",");
}

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
    normalized = normalizeNodes(proxies, { clientChain: options.clientChain });
  } catch {
    throw processorError("invalid-inventory");
  }

  const eligible = filterNodesForClient(normalized.nodes, CLIENT.onexray);
  emitDiagnostics(onDiagnostics, eligible.diagnostics);
  if (eligible.nodes.length === 0) {
    const counts = formatExcludedCounts(eligible.diagnostics.excluded);
    throw processorError(`no-compatible-nodes; excluded counts: ${counts || "none"}`);
  }

  let resolution;
  try {
    resolution = resolveOneXrayPolicy({
      options,
      allNodes: normalized.nodes,
      eligibleNodes: eligible.nodes,
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
