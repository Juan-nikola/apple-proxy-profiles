import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { increment } from "../../../shared/nodes/diagnostics.js";
import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";
import { renderYaml } from "./render-yaml.js";
import { EGERN_CHAIN_POLICY, toEgernProxy } from "./render-node.js";

function isGeneratedChain(node) {
  return node?.["underlying-proxy"] === EGERN_CHAIN_POLICY && node?._profile?.chained === true;
}

function appendEgernSshChainClones(nodes, diagnostics, clientChain) {
  if (clientChain !== "on") return nodes;
  const hasEntry = nodes.some((node) => node?._profile?.entry === true && node?._profile?.chained !== true);
  if (!hasEntry) return nodes;

  const generatedNames = new Set(nodes.filter(isGeneratedChain).map((node) => node.name));
  const clones = [];
  for (const landing of nodes) {
    if (normalizeProtocol(landing.type) !== "ssh"
      || landing?._profile?.sourceKind !== "landing"
      || landing?._profile?.chained === true) continue;
    const name = `🔗 ${landing.name}`;
    if (generatedNames.has(name)) continue;
    const clone = structuredClone(landing);
    clone.name = name;
    clone["underlying-proxy"] = EGERN_CHAIN_POLICY;
    clone._profile = { ...clone._profile, chained: true };
    clones.push(clone);
    generatedNames.add(name);
  }
  diagnostics.accepted += clones.length;
  return clones.length === 0 ? nodes : [...nodes, ...clones];
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
  const withEgernSshChains = appendEgernSshChainClones(compatible, filtered.diagnostics, clientChain);

  if (withEgernSshChains.length === 0) {
    const counts = formatExcludedCounts(filtered.diagnostics.excluded);
    throw new Error(`No compatible Egern nodes; excluded counts: ${counts || "none"}`);
  }

  const seenNames = new Set();
  const proxies = withEgernSshChains.map((node) => {
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
