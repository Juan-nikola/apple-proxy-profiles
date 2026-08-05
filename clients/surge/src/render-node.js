import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";

const COMMON_KEYS = new Set([
  "name", "type", "server", "port", "udp", "tls", "security", "sni", "servername",
  "skip-cert-verify", "allow-insecure", "client-fingerprint", "network", "ws-opts",
  "grpc-opts", "h2-opts", "http-opts", "cipher", "password", "protocol", "obfs",
  "protocol-param", "obfs-param", "psk", "version", "uuid", "flow", "alter-id",
  "alterId", "username", "private-key", "public-key", "peers", "pre-shared-key",
  "local-address", "local_ipv4", "local-ipv4", "local_ipv6", "local-ipv6", "ip", "ipv6",
  "reality-opts", "reuse", "tfo", "udp_relay",
]);

function escapeValue(value) {
  const text = String(value);
  if (/[\r\n]/u.test(text)) throw new Error("Surge node value contains a line break");
  return text.replaceAll("\\", "\\\\").replaceAll(",", "\\,");
}

function requiredString(node, key) {
  const value = node[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    throw new Error(`Surge node field '${key}' is invalid`);
  }
  return value;
}

function requiredPort(node) {
  const port = Number(node.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Surge node port is invalid");
  return port;
}

function validateNodeShape(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) throw new TypeError("Surge node is invalid");
  if (typeof node.name !== "string" || !node.name || /[\r\n=]/u.test(node.name)) throw new Error("Surge node name is invalid");
  requiredString(node, "server");
  requiredPort(node);
  for (const key of Object.keys(node)) {
    if (key.startsWith("_")) continue;
    if (!COMMON_KEYS.has(key)) throw new Error(`Surge node contains unsupported field: ${key}`);
  }
}

export function sanitizeSurgeNode(node) {
  return Object.fromEntries(Object.entries(node).filter(([key]) => key.startsWith("_") || COMMON_KEYS.has(key)));
}

function option(target, key, value) {
  if (value !== undefined && value !== null && value !== "") target.push(`${key}=${escapeValue(value)}`);
}

function tlsOptions(node, target) {
  const tls = node.tls === true || node.security === "tls" || node.security === "reality" || node["reality-opts"] !== undefined;
  if (!tls) return;
  target.push("tls=true");
  option(target, "sni", node.sni ?? node.servername);
  if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) target.push("skip-cert-verify=true");
  option(target, "client-fingerprint", node["client-fingerprint"]);
  const reality = node["reality-opts"];
  if (reality !== undefined) {
    if (!reality || typeof reality !== "object" || typeof reality["public-key"] !== "string") throw new Error("Surge Reality options are invalid");
    target.push("reality=true");
    option(target, "public-key", reality["public-key"]);
    option(target, "short-id", reality["short-id"]);
  }
}

function transportOptions(node, target) {
  const network = String(node.network ?? "tcp").toLowerCase();
  if (network === "tcp" || network === "raw") return;
  if (network === "ws") {
    const ws = node["ws-opts"];
    if (!ws || typeof ws !== "object" || Array.isArray(ws)) throw new Error("Surge WebSocket options are invalid");
    target.push("ws=true");
    option(target, "ws-path", Array.isArray(ws.path) ? ws.path[0] : ws.path ?? "/");
    const headers = ws.headers;
    if (headers && typeof headers === "object") {
      const host = headers.Host ?? headers.host;
      option(target, "ws-headers", host === undefined ? undefined : `Host=${host}`);
    }
    return;
  }
  if (network === "grpc") {
    const grpc = node["grpc-opts"] ?? {};
    target.push("grpc=true");
    option(target, "grpc-service-name", grpc["grpc-service-name"]);
    return;
  }
  if (network === "h2" || network === "http2") {
    const h2 = node["h2-opts"] ?? {};
    target.push("h2=true");
    option(target, "h2-path", Array.isArray(h2.path) ? h2.path[0] : h2.path);
    return;
  }
  throw new Error(`Unsupported Surge transport: ${network}`);
}

function base(node, type) {
  return [escapeValue(node.name), type, escapeValue(node.server), String(requiredPort(node))];
}

export function renderSurgeProxy(node) {
  validateNodeShape(node);
  const protocol = normalizeProtocol(node.type);
  let fields;
  switch (protocol) {
    case "ss":
    case "shadowsocks":
      fields = base(node, "ss");
      option(fields, "encrypt-method", requiredString(node, "cipher"));
      option(fields, "password", requiredString(node, "password"));
      if (node.udp === true) fields.push("udp-relay=true");
      break;
    case "ssr":
      fields = base(node, "ssr");
      option(fields, "encrypt-method", requiredString(node, "cipher"));
      option(fields, "password", requiredString(node, "password"));
      option(fields, "protocol", requiredString(node, "protocol"));
      option(fields, "obfs", requiredString(node, "obfs"));
      option(fields, "protocol-param", node["protocol-param"]);
      option(fields, "obfs-param", node["obfs-param"]);
      break;
    case "snell":
      fields = base(node, "snell");
      option(fields, "psk", requiredString(node, "psk"));
      option(fields, "version", node.version);
      break;
    case "vmess":
      fields = base(node, "vmess");
      option(fields, "username", requiredString(node, "uuid"));
      option(fields, "encrypt-method", node.cipher ?? node.security ?? "auto");
      tlsOptions(node, fields);
      transportOptions(node, fields);
      break;
    case "vless":
      fields = base(node, "vless");
      option(fields, "username", requiredString(node, "uuid"));
      option(fields, "flow", node.flow);
      tlsOptions(node, fields);
      transportOptions(node, fields);
      break;
    case "trojan":
      fields = base(node, "trojan");
      option(fields, "password", requiredString(node, "password"));
      tlsOptions({ ...node, tls: true }, fields);
      transportOptions(node, fields);
      break;
    case "hysteria2":
    case "hy2":
      fields = base(node, "hysteria2");
      option(fields, "password", requiredString(node, "password"));
      tlsOptions({ ...node, tls: true }, fields);
      option(fields, "obfs", node.obfs);
      option(fields, "obfs-password", node["obfs-password"] ?? node["obfs_password"]);
      break;
    case "tuic":
      fields = base(node, "tuic");
      option(fields, "uuid", requiredString(node, "uuid"));
      option(fields, "password", requiredString(node, "password"));
      tlsOptions({ ...node, tls: true }, fields);
      option(fields, "udp-relay-mode", node["udp-relay-mode"] ?? node["udp_relay_mode"]);
      break;
    case "socks5":
      fields = base(node, node.tls === true ? "socks5-tls" : "socks5");
      option(fields, "username", node.username);
      option(fields, "password", node.password);
      if (node.tls === true) tlsOptions(node, fields);
      break;
    case "http":
      fields = base(node, node.tls === true ? "https" : "http");
      option(fields, "username", node.username);
      option(fields, "password", node.password);
      if (node.tls === true) tlsOptions(node, fields);
      break;
    default:
      throw new Error(`Unsupported Surge protocol: ${protocol || "unknown"}`);
  }
  return `${fields[0]} = ${fields.slice(1).join(",")}`;
}
