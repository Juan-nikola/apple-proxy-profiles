import { anywhereNodeExclusionReason } from "../../../shared/nodes/capabilities.js";
import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";

const ANYTLS_FIELDS = new Set([
  "name", "type", "server", "port", "password", "network", "tls", "security",
  "sni", "servername", "alpn", "client-fingerprint", "ech-opts",
  "skip-cert-verify", "allow-insecure", "idle-session-check-interval",
  "idle-session-timeout", "min-idle-session", "_profile",
]);

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function firstOwn(source, keys) {
  for (const key of keys) {
    if (hasOwn(source, key)) return source[key];
  }
  return undefined;
}

function copyOptional(target, key, source, sourceKey = key) {
  if (hasOwn(source, sourceKey)) target[key] = source[sourceKey];
}

function assertSupportedFields(node, supportedFields) {
  if (Object.keys(node).some((key) => !supportedFields.has(key))) {
    throw new Error("Unsupported Anywhere proxy field");
  }
}

function protocolForError(node) {
  try {
    return normalizeProtocol(node?.type) || "unknown";
  } catch {
    return "unknown";
  }
}

function commonFields(node, type) {
  return {
    name: node.name,
    type,
    server: node.server,
    port: Number(node.port),
  };
}

function appendTlsFields(target, node) {
  const servername = firstOwn(node, ["servername", "sni"]);
  if (servername !== undefined) target.servername = servername;
  if (hasOwn(node, "alpn")) target.alpn = [...node.alpn];
  copyOptional(target, "client-fingerprint", node);
  if (hasOwn(node, "ech-opts")) {
    const source = node["ech-opts"];
    const ech = {};
    for (const key of ["enable", "config", "query-server-name"]) copyOptional(ech, key, source);
    target["ech-opts"] = ech;
  }
  return target;
}

function renderVless(node) {
  const network = String(node.network ?? "tcp").trim().toLowerCase();
  const proxy = {
    ...commonFields(node, "vless"),
    uuid: node.uuid,
    network,
    encryption: node.encryption ?? "none",
  };
  copyOptional(proxy, "flow", node);
  if (node.tls === true || node.security === "tls") proxy.tls = true;
  appendTlsFields(proxy, node);
  if (hasOwn(node, "reality-opts")) {
    const source = node["reality-opts"];
    proxy["reality-opts"] = { "public-key": source["public-key"] };
    copyOptional(proxy["reality-opts"], "short-id", source);
  }
  if (network === "ws" && hasOwn(node, "ws-opts")) {
    const source = node["ws-opts"];
    const options = {};
    for (const key of ["path", "v2ray-http-upgrade", "max-early-data", "early-data-header-name"]) {
      copyOptional(options, key, source);
    }
    if (hasOwn(source, "headers")) options.headers = { ...source.headers };
    proxy["ws-opts"] = options;
  }
  return proxy;
}

function renderTrojan(node) {
  return appendTlsFields({
    ...commonFields(node, "trojan"),
    password: node.password,
    network: "tcp",
    tls: true,
  }, node);
}

function renderAnyTls(node) {
  assertSupportedFields(node, ANYTLS_FIELDS);
  const proxy = appendTlsFields({
    ...commonFields(node, "anytls"),
    password: node.password,
    network: "tcp",
    tls: true,
  }, node);
  for (const key of ["idle-session-check-interval", "idle-session-timeout", "min-idle-session"]) {
    copyOptional(proxy, key, node);
  }
  return proxy;
}

function renderHysteria2(node) {
  const proxy = {
    ...commonFields(node, "hysteria2"),
    password: node.password,
  };
  const sni = firstOwn(node, ["servername", "sni"]);
  if (sni !== undefined) proxy.sni = sni;
  copyOptional(proxy, "up", node);
  copyOptional(proxy, "down", node);
  copyOptional(proxy, "obfs", node);
  const obfsPassword = firstOwn(node, ["obfs-password", "obfs_password"]);
  const obfsMin = firstOwn(node, ["obfs-min-packet-size", "obfs_min_packet_size"]);
  const obfsMax = firstOwn(node, ["obfs-max-packet-size", "obfs_max_packet_size"]);
  if (obfsPassword !== undefined) proxy["obfs-password"] = obfsPassword;
  if (obfsMin !== undefined) proxy["obfs-min-packet-size"] = obfsMin;
  if (obfsMax !== undefined) proxy["obfs-max-packet-size"] = obfsMax;
  return proxy;
}

function renderShadowsocks(node) {
  return {
    ...commonFields(node, "ss"),
    cipher: node.cipher.toLowerCase(),
    password: node.password,
    network: "tcp",
  };
}

function renderSocks5(node) {
  const proxy = commonFields(node, "socks5");
  copyOptional(proxy, "username", node);
  copyOptional(proxy, "password", node);
  return proxy;
}

function normalizedSudokuAscii(value) {
  switch (String(value ?? "prefer_entropy").toLowerCase()) {
    case "ascii": return "prefer_ascii";
    case "entropy": return "prefer_entropy";
    default: return String(value ?? "prefer_entropy").toLowerCase();
  }
}

function renderSudoku(node) {
  const proxy = {
    ...commonFields(node, "sudoku"),
    key: node.key,
  };
  const aead = firstOwn(node, ["aead-method", "aead"]);
  const ascii = firstOwn(node, ["table-type", "ascii"]);
  const tables = firstOwn(node, ["custom-tables", "custom_tables", "customTables"]);
  const legacyTable = firstOwn(node, ["custom-table", "custom_table", "table"]);
  const paddingMin = firstOwn(node, ["padding-min", "padding_min"]);
  const paddingMax = firstOwn(node, ["padding-max", "padding_max"]);
  const pureDownlink = firstOwn(node, ["enable-pure-downlink", "enable_pure_downlink"]);
  if (aead !== undefined) proxy["aead-method"] = aead.toLowerCase();
  if (ascii !== undefined) proxy["table-type"] = normalizedSudokuAscii(ascii);
  if (tables !== undefined) proxy["custom-tables"] = [...tables];
  if (legacyTable !== undefined) proxy["custom-table"] = legacyTable;
  if (paddingMin !== undefined) proxy["padding-min"] = paddingMin;
  if (paddingMax !== undefined) proxy["padding-max"] = paddingMax;
  if (pureDownlink !== undefined) proxy["enable-pure-downlink"] = pureDownlink;
  if (hasOwn(node, "multiplex")) proxy.multiplex = node.multiplex.toLowerCase();
  if (hasOwn(node, "httpmask")) {
    const source = node.httpmask;
    const httpmask = {};
    for (const key of ["disable", "mode", "tls", "host"]) copyOptional(httpmask, key, source);
    const pathRoot = firstOwn(source, ["path-root", "path_root"]);
    if (pathRoot !== undefined) httpmask["path-root"] = pathRoot;
    proxy.httpmask = httpmask;
  }
  return proxy;
}

function renderAnywhereProxy(node) {
  const reason = anywhereNodeExclusionReason(node);
  if (reason) throw new Error("Unsupported Anywhere proxy node");
  switch (normalizeProtocol(node.type)) {
    case "vless": return renderVless(node);
    case "hysteria2":
    case "hy2": return renderHysteria2(node);
    case "trojan": return renderTrojan(node);
    case "anytls": return renderAnyTls(node);
    case "ss":
    case "shadowsocks": return renderShadowsocks(node);
    case "socks5": return renderSocks5(node);
    case "sudoku": return renderSudoku(node);
    default: throw new Error("Unsupported Anywhere proxy node");
  }
}

export function toAnywhereProxy(node) {
  const protocol = protocolForError(node);
  try {
    return renderAnywhereProxy(node);
  } catch {
    throw new Error(`Anywhere cannot render protocol: ${protocol}`);
  }
}
