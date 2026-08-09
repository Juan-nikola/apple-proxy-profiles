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

function fragment(node) {
  return `#${encodeURIComponent(node.name)}`;
}

const VLESS_SCHEME = "vless";
const SS_SCHEME = "ss";
const TROJAN_SCHEME = "trojan";
const HY2_SCHEME = "hy2";
const TUIC_SCHEME = "tuic";

function vlessUri(node) {
  const params = new URLSearchParams();
  params.set("encryption", node.encryption ?? "none");
  if (node.flow) params.set("flow", node.flow);
  const reality = node["reality-opts"];
  if (reality) {
    params.set("security", "reality");
    if (reality["public-key"]) params.set("pbk", reality["public-key"]);
    if (reality["short-id"]) params.set("sid", reality["short-id"]);
    if (reality["_spider-x"]) params.set("spx", reality["_spider-x"]);
  } else if (node.tls) {
    params.set("security", "tls");
  }
  if (node.sni ?? node.servername) params.set("sni", node.sni ?? node.servername);
  if (node["client-fingerprint"]) params.set("fp", node["client-fingerprint"]);
  params.set("type", node.network ?? "tcp");
  if (node["packet-encoding"]) params.set("packetEncoding", node["packet-encoding"]);
  return `${VLESS_SCHEME}://${encodeURIComponent(node.uuid)}@${node.server}:${node.port}?${params}${fragment(node)}`;
}

function snellLine(node) {
  const parts = [`snell,${node.server},${node.port}`, `psk=${node.psk}`];
  if (node.version !== undefined && node.version !== null && node.version !== "") parts.push(`version=${node.version}`);
  if (node.reuse === true) parts.push("reuse=true");
  if (node.tfo === true) parts.push("tfo=true");
  if (node.obfs) parts.push(`obfs=${node.obfs}`);
  if (node["obfs-host"]) parts.push(`obfs-host=${node["obfs-host"]}`);
  return `${parts.join(",")}${fragment(node)}`;
}

function ssLine(node) {
  const userinfo = Buffer.from(`${node.cipher}:${node.password}`).toString("base64");
  return `${SS_SCHEME}://${userinfo}@${node.server}:${node.port}${fragment(node)}`;
}

function trojanUri(node) {
  const params = new URLSearchParams();
  if (node.sni ?? node.servername) params.set("sni", node.sni ?? node.servername);
  if (node["client-fingerprint"]) params.set("fp", node["client-fingerprint"]);
  const query = params.toString();
  return `${TROJAN_SCHEME}://${encodeURIComponent(node.password)}@${node.server}:${node.port}${query ? `?${query}` : ""}${fragment(node)}`;
}

function hysteria2Uri(node) {
  const params = new URLSearchParams();
  if (node.sni ?? node.servername) params.set("sni", node.sni ?? node.servername);
  if (node["skip-cert-verify"] === true) params.set("insecure", "1");
  const query = params.toString();
  return `${HY2_SCHEME}://${encodeURIComponent(node.password)}@${node.server}:${node.port}${query ? `?${query}` : ""}${fragment(node)}`;
}

function tuicUri(node) {
  const params = new URLSearchParams();
  if (node.sni ?? node.servername) params.set("sni", node.sni ?? node.servername);
  if (node["udp-relay-mode"]) params.set("udp_relay_mode", node["udp-relay-mode"]);
  const query = params.toString();
  return `${TUIC_SCHEME}://${encodeURIComponent(node.uuid)}:${encodeURIComponent(node.password)}@${node.server}:${node.port}${query ? `?${query}` : ""}${fragment(node)}`;
}

export function renderShadowrocketSubscription(nodes) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new Error("Shadowrocket subscription refuses an empty node list");
  }
  const lines = nodes.map((node) => {
    switch (node.type) {
      case "vless":
        return vlessUri(node);
      case "snell":
        return snellLine(node);
      case "ss":
      case "shadowsocks":
        return ssLine(node);
      case "trojan":
        return trojanUri(node);
      case "hysteria2":
      case "hy2":
        return hysteria2Uri(node);
      case "tuic":
        return tuicUri(node);
      default:
        throw new Error(`Shadowrocket subscription serialization is unsupported for protocol: ${node.type}`);
    }
  });
  return `${lines.join("\n")}\n`;
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
