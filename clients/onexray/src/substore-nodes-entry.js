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

function errorMessage(error) {
  if (error && typeof error === "object" && typeof error.message === "string") return error.message;
  return "OneXray node processing failed";
}

/**
 * Pure Sub-Store node processor. Callers provide the raw proxy inventory and
 * lexical $arguments; this boundary never logs either private input.
 */
export function runOneXrayNodesProcessor({ proxies, arguments: rawArguments } = {}) {
  try {
    const options = nodeOptions(rawArguments);
    const normalized = normalizeNodes(proxies, { clientChain: options.clientChain });
    const eligible = filterNodesForClient(normalized.nodes, CLIENT.onexray);
    if (eligible.nodes.length === 0) {
      const counts = formatExcludedCounts(eligible.diagnostics.excluded);
      throw new Error(`No compatible OneXray nodes; excluded counts: ${counts || "none"}`);
    }
    const resolution = resolveOneXrayPolicy({
      options,
      allNodes: normalized.nodes,
      eligibleNodes: eligible.nodes,
    });
    return renderOneXraySubscription(resolution);
  } catch (error) {
    throw new Error(`OneXray nodes: ${errorMessage(error)}`);
  }
}
