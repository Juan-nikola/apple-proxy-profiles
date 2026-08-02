import { CLIENT } from "../contracts.js";
import { createClientFilterDiagnostics, increment } from "./diagnostics.js";
import { normalizeProtocol, protocolSupportsClient } from "./protocol-registry.js";

const ANYWHERE_VLESS_NETWORKS = new Set(["tcp", "ws"]);

function hasOption(node, key) {
  return Object.hasOwn(node, key);
}

function hasShadowsocksPlugin(node) {
  return Boolean(node.plugin) || hasOption(node, "plugin-opts");
}

function supportsAnywhereTransport(node, protocol) {
  if (protocol === "vless" && !ANYWHERE_VLESS_NETWORKS.has(node.network)) {
    return "unsupported-vless-network";
  }

  if (protocol === "trojan" && (
    node.network !== "tcp" ||
    hasOption(node, "grpc-opts") ||
    hasOption(node, "reality-opts") ||
    node["ss-opts"]?.enabled === true
  )) {
    return "unsupported-trojan-transport";
  }

  if ((protocol === "ss" || protocol === "shadowsocks") && hasShadowsocksPlugin(node)) {
    return "unsupported-shadowsocks-plugin";
  }

  return null;
}

export function evaluateNodeForClient(node, client) {
  if (!Object.values(CLIENT).includes(client)) return { supported: false, reason: "unsupported-client" };

  const protocol = normalizeProtocol(node?.type);
  if (!protocolSupportsClient(protocol, client)) return { supported: false, reason: "unsupported-protocol" };

  const transportReason = client === CLIENT.anywhere
    ? supportsAnywhereTransport(node ?? {}, protocol)
    : null;
  return transportReason
    ? { supported: false, reason: transportReason }
    : { supported: true, reason: null };
}

export function filterNodesForClient(nodes, client) {
  const diagnostics = createClientFilterDiagnostics();
  const supportedNodes = [];

  for (const node of Array.isArray(nodes) ? nodes : []) {
    const evaluation = evaluateNodeForClient(node, client);
    if (evaluation.supported) {
      supportedNodes.push(node);
      diagnostics.accepted += 1;
    } else {
      increment(diagnostics.excluded, evaluation.reason);
    }
  }

  return { nodes: supportedNodes, diagnostics };
}
