import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";
import { assertRenderableNodes, partitionRenderableNodes } from "../../../shared/nodes/renderability.js";

const SHADOWROCKET_PROXY_KEYS = Object.freeze([
  "name", "type", "server", "port", "udp", "tls", "sni", "servername",
  "flow", "network", "encryption", "packet-encoding", "alpn",
  "client-fingerprint", "idle-session-check-interval", "idle-session-timeout",
  "min-idle-session", "skip-cert-verify", "psk", "version", "reuse", "tfo",
  "uuid", "cipher", "password", "protocol", "obfs", "obfs-host", "obfs-opts",
  "plugin", "plugin-opts", "underlying-proxy", "chain",
]);

const SHADOWROCKET_RECORD_FIELDS = new Set([
  ...SHADOWROCKET_PROXY_KEYS,
  "reality-opts",
  "_profile",
]);

const SHADOWROCKET_PROTOCOLS = new Set([
  "ss", "shadowsocks", "ssr", "snell", "vmess", "vless", "trojan",
  "anytls", "hysteria2", "hy2", "tuic", "socks5", "http",
]);

function protocolForError(node) {
  try {
    return normalizeProtocol(node?.type) || "unknown";
  } catch {
    return "unknown";
  }
}

function hasRecordValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function renderRecord(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    throw new Error("Unsupported Shadowrocket node");
  }
  const protocol = normalizeProtocol(node.type);
  if (!SHADOWROCKET_PROTOCOLS.has(protocol)) {
    throw new Error("Unsupported Shadowrocket protocol");
  }
  if (Object.keys(node).some((key) => !SHADOWROCKET_RECORD_FIELDS.has(key))) {
    throw new Error("Unsupported Shadowrocket proxy field");
  }

  const record = {};
  for (const key of SHADOWROCKET_PROXY_KEYS) {
    if (hasRecordValue(node[key])) record[key] = node[key];
  }
  if (hasRecordValue(node["reality-opts"])) record["reality-opts"] = node["reality-opts"];
  if (Object.keys(record).length === 0) throw new Error("Empty Shadowrocket proxy record");
  return record;
}

export function renderShadowrocketProxyRecord(node) {
  const protocol = protocolForError(node);
  try {
    return renderRecord(node);
  } catch {
    throw new Error(`Shadowrocket cannot render protocol: ${protocol}`);
  }
}

export function assertShadowrocketNodeSet(nodes) {
  assertRenderableNodes(nodes, "Shadowrocket", renderShadowrocketProxyRecord);
}

export function partitionShadowrocketNodeSet(nodes) {
  return partitionRenderableNodes(nodes, "Shadowrocket", renderShadowrocketProxyRecord);
}
