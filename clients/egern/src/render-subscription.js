import { increment } from "../../../shared/nodes/diagnostics.js";
import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";
import { assertRenderableNodes } from "../../../shared/nodes/renderability.js";
import { adaptEgernSubStoreNodes } from "./adapt-substore-nodes.js";
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

export function renderEgernSubscription(nodes, { clientChain = "off", onDiagnostics } = {}) {
  const prepared = prepareEgernInventory(nodes, { clientChain, onDiagnostics });
  return renderYaml({ proxies: prepared.proxies });
}

export function prepareEgernInventory(nodes, { clientChain = "off", onDiagnostics } = {}) {
  if (clientChain !== "off" && clientChain !== "on") {
    throw new Error("clientChain must be off or on");
  }
  if (onDiagnostics !== undefined && typeof onDiagnostics !== "function") {
    throw new Error("onDiagnostics must be a function");
  }

  const adapted = adaptEgernSubStoreNodes(nodes);
  const diagnostics = { accepted: adapted.nodes.length, excluded: {} };
  const compatible = [];
  for (const node of adapted.nodes) {
    if (isGeneratedChain(node) && clientChain === "off") {
      increment(diagnostics.excluded, "client-chain-disabled");
      diagnostics.accepted -= 1;
    } else {
      compatible.push(node);
    }
  }
  if (compatible.length === 0 && adapted.failures.length === 0) {
    throw new Error("No compatible Egern nodes; excluded counts: none");
  }

  const probe = (node) => {
    if (node.adaptationFailure !== undefined) throw new Error("Egern node adaptation failed");
    toEgernProxy(node, { clientChain });
  };
  assertRenderableNodes([...compatible, ...adapted.failures], "Egern", probe);

  const withEgernSshChains = appendEgernSshChainClones(compatible, diagnostics, clientChain);
  assertRenderableNodes(withEgernSshChains.slice(compatible.length), "Egern", probe);

  const seenNames = new Set();
  const proxies = withEgernSshChains.map((node) => {
    const proxy = toEgernProxy(node, { clientChain });
    const protocol = Object.keys(proxy)[0];
    const name = proxy[protocol].name;
    if (seenNames.has(name)) throw new Error("Duplicate Egern proxy name");
    seenNames.add(name);
    return proxy;
  });

  onDiagnostics?.(structuredClone(diagnostics));
  return {
    nodes: withEgernSshChains,
    proxies,
    diagnostics: structuredClone(diagnostics),
  };
}
