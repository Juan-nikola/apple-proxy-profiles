import { CLIENT } from "../../../shared/contracts.js";
import { filterNodesForClient } from "../../../shared/nodes/capabilities.js";
import { normalizeNodes } from "../../../shared/nodes/normalize-nodes.js";

const ALLOWED_OPTIONS = new Set(["output", "type", "name", "clientChain"]);

function parseArguments(rawArguments) {
  if (!rawArguments || typeof rawArguments !== "object" || Array.isArray(rawArguments)) {
    throw new Error("arguments must be an object");
  }
  for (const key of Object.keys(rawArguments)) {
    if (!key.startsWith("_") && !ALLOWED_OPTIONS.has(key)) {
      throw new Error(`Unknown option: ${key}`);
    }
  }
  if (rawArguments.output !== "nodes") throw new Error("output must be nodes");
  if (rawArguments.type !== "collection") throw new Error("type must be collection");
  if (typeof rawArguments.name !== "string" || rawArguments.name.length === 0 || rawArguments.name.trim() !== rawArguments.name) {
    throw new Error("name must be a non-empty single-line string");
  }
  const clientChain = Object.hasOwn(rawArguments, "clientChain") ? rawArguments.clientChain : "off";
  if (clientChain !== "off" && clientChain !== "on") throw new Error("clientChain must be off or on");
  return { type: rawArguments.type, name: rawArguments.name, clientChain };
}

function logDiagnostics(context, diagnostics) {
  const suppliedLogger = context?.logger;
  const logger = suppliedLogger ?? globalThis?.console;
  const method = typeof logger === "function"
    ? logger
    : typeof logger?.info === "function"
      ? logger.info.bind(logger)
      : typeof logger?.log === "function"
        ? logger.log.bind(logger)
        : null;
  if (!method) return;
  try {
    method(`[shadowrocket-node-subscription] ${JSON.stringify(diagnostics)}`);
  } catch {
    // Diagnostics are optional and never change the private output.
  }
}

const SHADOWROCKET_PROXY_KEYS = Object.freeze([
  "name", "type", "server", "port", "udp", "tls", "sni", "servername",
  "flow", "network", "encryption", "packet-encoding", "client-fingerprint",
  "skip-cert-verify", "psk", "version", "reuse", "tfo", "uuid", "cipher",
  "password", "obfs", "obfs-host", "obfs-opts", "plugin", "plugin-opts",
]);

function shadowrocketProxyRecord(node) {
  const record = {};
  for (const key of SHADOWROCKET_PROXY_KEYS) {
    if (node[key] !== undefined && node[key] !== null && node[key] !== "") record[key] = node[key];
  }
  if (node["reality-opts"]) record["reality-opts"] = node["reality-opts"];
  return record;
}

export function renderShadowrocketSubscription(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error("Shadowrocket subscription refuses an empty node list");
  }
  const lines = nodes.map((node) => `  - ${JSON.stringify(shadowrocketProxyRecord(node))}`);
  return `proxies:\n${lines.join("\n")}\n`;
}

export async function operator(input, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseArguments(context.arguments ?? {});
  if (typeof context.produceArtifact !== "function") {
    throw new Error("produceArtifact is unavailable");
  }
  const rawNodes = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(rawNodes) || rawNodes.length === 0) {
    throw new Error("produceArtifact must return a non-empty node array");
  }
  const normalized = normalizeNodes(rawNodes, { clientChain: options.clientChain });
  const filtered = filterNodesForClient(normalized.nodes, CLIENT.shadowrocket);
  if (filtered.nodes.length === 0) {
    throw new Error("No compatible Shadowrocket nodes");
  }
  logDiagnostics(context, filtered.diagnostics);
  return { ...input, $content: renderShadowrocketSubscription(filtered.nodes) };
}
