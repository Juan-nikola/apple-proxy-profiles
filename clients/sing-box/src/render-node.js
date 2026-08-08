import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";

const ALLOWED_KEYS = new Set([
  "name", "type", "server", "port", "udp", "tls", "security", "sni", "servername",
  "skip-cert-verify", "allow-insecure", "client-fingerprint", "reality-opts", "network",
  "ws-opts", "grpc-opts", "h2-opts", "http-opts", "cipher", "password", "uuid", "flow",
  "alter-id", "alterId", "psk", "version", "username", "private-key", "private_key",
  "public-key", "pre-shared-key", "peers", "local-address", "local_ipv4", "local-ipv4",
  "local_ipv6", "local-ipv6", "ip", "ipv6", "dns", "dns_servers", "mtu", "keepalive",
  "obfs", "obfs-mode", "obfs_mode", "obfs-host", "obfs_host", "obfs-password", "obfs_password", "mode", "userkey", "user-key", "udp-relay-mode", "udp_relay_mode", "ports",
  "port-hopping", "port_hopping", "port-hopping-interval", "port_hopping_interval",
  "bandwidth", "up", "down", "reuse", "tfo", "udp_relay", "underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop",
]);
const CHAIN_ALIASES = ["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"];
const GENERATED_CHAIN_POLICY = "🔗 入口节点";

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function requiredString(node, key) {
  const value = node[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) throw new Error(`sing-box node field '${key}' is invalid`);
  return value;
}

function requiredPort(node) {
  const port = Number(node.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("sing-box node port is invalid");
  return port;
}

function validateNodeShape(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) throw new TypeError("sing-box node is invalid");
  if (typeof node.name !== "string" || node.name.length === 0 || /[\r\n]/u.test(node.name)) throw new Error("sing-box node name is invalid");
  requiredString(node, "server");
  requiredPort(node);
  for (const key of Object.keys(node)) {
    if (key.startsWith("_")) continue;
    if (!ALLOWED_KEYS.has(key)) throw new Error(`sing-box node contains unsupported field: ${key}`);
  }
}

export function sanitizeSingBoxNode(node) {
  return Object.fromEntries(Object.entries(node).filter(([key]) => key.startsWith("_") || ALLOWED_KEYS.has(key)));
}

function setIf(target, key, value) {
  if (value !== undefined && value !== null && value !== "") target[key] = value;
}

function tlsFields(node, required = false) {
  const reality = node["reality-opts"];
  const enabled = required || node.tls === true || node.security === "tls" || node.security === "reality" || reality !== undefined;
  if (!enabled) return undefined;
  const tls = { enabled: true };
  setIf(tls, "server_name", node.sni ?? node.servername);
  if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) tls.insecure = true;
  if (node["client-fingerprint"] !== undefined) {
    tls.utls = { enabled: true, fingerprint: node["client-fingerprint"] };
  }
  if (reality !== undefined) {
    if (!reality || typeof reality !== "object" || Array.isArray(reality) || typeof reality["public-key"] !== "string") {
      throw new Error("sing-box Reality options are invalid");
    }
    tls.reality = { enabled: true, public_key: reality["public-key"] };
    setIf(tls.reality, "short_id", reality["short-id"]);
  }
  return tls;
}

function transportFields(node) {
  const network = String(node.network ?? "tcp").trim().toLowerCase();
  if (network === "tcp" || network === "raw") return undefined;
  if (network === "ws") {
    const source = node["ws-opts"];
    if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("sing-box WebSocket options are invalid");
    const transport = { type: "ws", path: Array.isArray(source.path) ? source.path[0] : source.path ?? "/" };
    if (source.headers !== undefined) transport.headers = { ...source.headers };
    return transport;
  }
  if (network === "grpc") {
    const source = node["grpc-opts"] ?? {};
    const transport = { type: "grpc" };
    setIf(transport, "service_name", source["grpc-service-name"]);
    return transport;
  }
  if (network === "h2" || network === "http2" || network === "http") {
    const source = node["h2-opts"] ?? node["http-opts"] ?? {};
    const transport = { type: "http" };
    setIf(transport, "method", source.method);
    setIf(transport, "path", Array.isArray(source.path) ? source.path[0] : source.path);
    if (source.headers !== undefined) transport.headers = { ...source.headers };
    if (source.host !== undefined) transport.host = Array.isArray(source.host) ? source.host : [source.host];
    return transport;
  }
  throw new Error(`Unsupported sing-box transport: ${network}`);
}

function base(node, type) {
  return { type, tag: node.name, server: node.server, server_port: requiredPort(node) };
}

function appendChain(outbound, node) {
  const aliases = CHAIN_ALIASES.filter((key) => hasOwn(node, key) && node[key] !== undefined && node[key] !== null && node[key] !== "");
  if (aliases.length === 0) return outbound;
  if (aliases.length !== 1 || aliases[0] !== "underlying-proxy" || node["underlying-proxy"] !== GENERATED_CHAIN_POLICY || node?._profile?.chained !== true) {
    throw new Error("Unsupported existing sing-box proxy chain");
  }
  outbound.detour = GENERATED_CHAIN_POLICY;
  return outbound;
}

export function renderSingBoxOutbound(node) {
  validateNodeShape(node);
  const protocol = normalizeProtocol(node.type);
  let outbound;
  switch (protocol) {
    case "ss":
    case "shadowsocks":
      outbound = { ...base(node, "shadowsocks"), method: requiredString(node, "cipher"), password: requiredString(node, "password") };
      if (node.network === "tcp" || node.network === "udp") outbound.network = node.network;
      break;
    case "vmess":
      outbound = { ...base(node, "vmess"), uuid: requiredString(node, "uuid"), security: node.security ?? node.cipher ?? "auto" };
      if (node["alter-id"] !== undefined || node.alterId !== undefined) outbound.alter_id = Number(node["alter-id"] ?? node.alterId);
      outbound.tls = tlsFields(node);
      outbound.transport = transportFields(node);
      break;
    case "snell":
      {
        const version = Number(node.version);
        if (![4, 5, 6].includes(version)) throw new Error("Unsupported sing-box Snell version");
        // sing-box deliberately implements Snell v5 through its v4 wire format.
        const outputVersion = version === 5 ? 4 : version;
        outbound = { ...base(node, "snell"), psk: requiredString(node, "psk"), version: outputVersion };
        if (node.network === "tcp" || node.network === "udp") outbound.network = node.network;
        if (outputVersion === 4) {
          setIf(outbound, "reuse", node.reuse);
          setIf(outbound, "obfs_mode", node.obfs_mode ?? node["obfs-mode"] ?? node.obfs);
          setIf(outbound, "obfs_host", node["obfs-host"] ?? node.obfs_host);
        } else {
          setIf(outbound, "userkey", node.userkey ?? node["user-key"]);
          setIf(outbound, "reuse", node.reuse);
          setIf(outbound, "mode", node.mode);
        }
      }
      break;
    case "vless":
      outbound = { ...base(node, "vless"), uuid: requiredString(node, "uuid") };
      setIf(outbound, "flow", node.flow);
      if (node.network === "tcp" || node.network === "udp") outbound.network = node.network;
      outbound.tls = tlsFields(node);
      outbound.transport = transportFields(node);
      break;
    case "trojan":
      outbound = { ...base(node, "trojan"), password: requiredString(node, "password"), tls: tlsFields(node, true) };
      outbound.transport = transportFields(node);
      break;
    case "anytls":
      outbound = { ...base(node, "anytls"), password: requiredString(node, "password"), tls: tlsFields(node, true) };
      break;
    case "hysteria2":
    case "hy2":
      outbound = { ...base(node, "hysteria2"), password: requiredString(node, "password"), tls: tlsFields(node, true) };
      if (node.obfs !== undefined) {
        outbound.obfs = { type: node.obfs };
        setIf(outbound.obfs, "password", node["obfs-password"] ?? node["obfs_password"]);
      }
      break;
    case "tuic":
      outbound = { ...base(node, "tuic"), uuid: requiredString(node, "uuid"), password: requiredString(node, "password"), tls: tlsFields(node, true) };
      setIf(outbound, "udp_relay_mode", node["udp-relay-mode"] ?? node["udp_relay_mode"]);
      break;
    case "socks5":
      outbound = base(node, "socks");
      setIf(outbound, "username", node.username);
      setIf(outbound, "password", node.password);
      break;
    case "http":
      outbound = base(node, "http");
      setIf(outbound, "username", node.username);
      setIf(outbound, "password", node.password);
      outbound.tls = tlsFields(node);
      break;
    case "ssh":
      outbound = { ...base(node, "ssh"), user: requiredString(node, "username") };
      setIf(outbound, "password", node.password);
      setIf(outbound, "private_key", node["private-key"] ?? node.private_key);
      break;
    case "wireguard": {
      const peer = node.peers?.[0] ?? {};
      outbound = {
        ...base(node, "wireguard"),
        private_key: requiredString(node, "private-key"),
        peer_public_key: requiredString({ "public-key": peer["public-key"] ?? node["public-key"] }, "public-key"),
      };
      const address = node["local-address"] ?? node.local_ipv4 ?? node["local-ipv4"] ?? node.ip;
      if (address !== undefined) outbound.local_address = Array.isArray(address) ? address : [address];
      setIf(outbound, "pre_shared_key", peer["pre-shared-key"] ?? node["pre-shared-key"]);
      break;
    }
    default:
      throw new Error(`Unsupported sing-box protocol: ${protocol || "unknown"}`);
  }
  for (const key of ["tls", "transport"]) if (outbound[key] === undefined) delete outbound[key];
  return appendChain(outbound, node);
}
