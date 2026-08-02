import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { increment } from "../../../shared/nodes/diagnostics.js";
import { renderYaml } from "./render-yaml.js";
import { EGERN_CHAIN_POLICY, toEgernProxy } from "./render-node.js";

function isGeneratedChain(node) {
  return node?.["underlying-proxy"] === EGERN_CHAIN_POLICY && node?._profile?.chained === true;
}

function formatExcludedCounts(excluded) {
  return Object.keys(excluded)
    .sort((left, right) => left.localeCompare(right, "en"))
    .map((reason) => `${reason}=${excluded[reason]}`)
    .join(",");
}

export function renderEgernSubscription(nodes, { clientChain = "off", onDiagnostics } = {}) {
  if (clientChain !== "off" && clientChain !== "on") {
    throw new Error("clientChain must be off or on");
  }
  if (onDiagnostics !== undefined && typeof onDiagnostics !== "function") {
    throw new Error("onDiagnostics must be a function");
  }

  const filtered = filterNodesForClient(nodes, CLIENT.egern);
  const compatible = [];
  for (const node of filtered.nodes) {
    if (isGeneratedChain(node) && clientChain === "off") {
      increment(filtered.diagnostics.excluded, "client-chain-disabled");
      filtered.diagnostics.accepted -= 1;
    } else {
      compatible.push(node);
    }
  }

  if (compatible.length === 0) {
    const counts = formatExcludedCounts(filtered.diagnostics.excluded);
    throw new Error(`No compatible Egern nodes; excluded counts: ${counts || "none"}`);
  }

  const seenNames = new Set();
  const proxies = compatible.map((node) => {
    const proxy = toEgernProxy(node, { clientChain });
    const protocol = Object.keys(proxy)[0];
    const name = proxy[protocol].name;
    if (seenNames.has(name)) throw new Error("Duplicate Egern proxy name");
    seenNames.add(name);
    return proxy;
  });

  onDiagnostics?.(structuredClone(filtered.diagnostics));
  return renderYaml({ proxies });
}
