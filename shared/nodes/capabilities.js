import { CLIENT } from "../contracts.js";
import { createClientFilterDiagnostics, increment } from "./diagnostics.js";
import { normalizeProtocol, protocolSupportsClient } from "./protocol-registry.js";

const ANYWHERE_VLESS_NETWORKS = new Set(["tcp", "ws"]);
const EGERN_SHADOWSOCKS_METHODS = new Set([
  "2022-blake3-aes-128-gcm",
  "2022-blake3-aes-256-gcm",
  "2022-blake3-chacha20-poly1305",
  "chacha20-poly1305",
  "aes-256-gcm",
  "aes-128-gcm",
  "none",
  "table",
  "rc4",
  "rc4-md5",
  "aes-128-cfb",
  "aes-192-cfb",
  "aes-256-cfb",
  "aes-128-ctr",
  "aes-192-ctr",
  "aes-256-ctr",
  "bf-cfb",
  "camellia-128-cfb",
  "camellia-192-cfb",
  "camellia-256-cfb",
  "cast5-cfb",
  "des-cfb",
  "idea-cfb",
  "rc2-cfb",
  "seed-cfb",
  "salsa20",
  "chacha20",
  "chacha20-ietf",
]);
const EGERN_SNELL_VERSIONS = new Set([1, 2, 3, 4, 5]);
const EGERN_OBFS = new Set(["http", "tls"]);
const EGERN_VMESS_SECURITY = new Set(["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"]);
const EGERN_TRANSPORTS = new Set(["tcp", "raw", "ws", "grpc", "h2", "http2", "http", "http1"]);
const EGERN_VLESS_FLOWS = new Set(["xtls-rprx-vision"]);
const EGERN_TUIC_UDP_MODES = new Set(["native", "quic"]);
const EGERN_IP_VERSIONS = new Set(["dual_stack", "v4_only", "v6_only", "v4_prefer", "v6_prefer"]);
const EGERN_BLOCK_QUIC_PROTOCOLS = new Set([
  "ss", "shadowsocks", "snell", "trojan", "anytls", "hysteria2", "hy2",
  "tuic", "socks5", "ssh", "vmess", "vless", "wireguard",
]);
const EGERN_SHADOW_TLS_PROTOCOLS = new Set([
  "ss", "shadowsocks", "trojan", "anytls", "socks5", "ssh", "http", "vmess", "vless",
]);
const EGERN_TFO_PROTOCOLS = new Set([
  "ss", "shadowsocks", "snell", "trojan", "anytls", "socks5", "ssh", "http", "vmess", "vless",
]);
const SHADOW_TLS_ALIASES = Object.freeze(["shadow-tls", "shadow-tls-opts", "shadow_tls"]);
const BLOCK_QUIC_ALIASES = Object.freeze(["block-quic", "block_quic"]);
const IP_VERSION_ALIASES = Object.freeze(["ip-version", "ip_version"]);
const UDP_ALIASES = Object.freeze(["udp", "udp-relay", "udp_relay"]);
const CHAIN_ALIASES = Object.freeze(["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"]);
const GENERATED_CHAIN_FIELD = "underlying-proxy";
const GENERATED_CHAIN_POLICY = "🔗 入口节点";

function hasOption(node, key) {
  return Object.hasOwn(node, key);
}

function hasShadowsocksPlugin(node) {
  return Boolean(node.plugin) || hasOption(node, "plugin-opts");
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonblankString(value) {
  return typeof value === "string" && value.length > 0 && value.trim() === value;
}

function isValidPort(value) {
  return Number.isInteger(value) && value >= 1 && value <= 65535;
}

function firstAliasValue(node, keys) {
  for (const key of keys) {
    if (hasOption(node, key)) return node[key];
  }
  return undefined;
}

function semanticEqual(left, right) {
  if (left === right) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => semanticEqual(value, right[index]));
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key, index) => key === rightKeys[index] && semanticEqual(left[key], right[key]));
  }
  return false;
}

function conflictingAliases(node, keys) {
  const values = keys.filter((key) => hasOption(node, key)).map((key) => node[key]);
  return values.length > 1 && values.slice(1).some((value) => !semanticEqual(value, values[0]));
}

function normalizedHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeEgernHeaders(value) {
  if (!isPlainObject(value)) return null;
  const result = {};
  const semantic = new Map();
  for (const [key, rawValue] of Object.entries(value)) {
    if (!isNonblankString(key) || !isHeaderValue(rawValue)) return null;
    const normalizedValue = normalizedHeaderValue(rawValue);
    const normalizedKey = key.toLowerCase();
    if (semantic.has(normalizedKey)) {
      if (semantic.get(normalizedKey) !== normalizedValue) return null;
      continue;
    }
    semantic.set(normalizedKey, normalizedValue);
    result[normalizedKey === "host" ? "Host" : key] = normalizedValue;
  }
  return result;
}

function hasHeaderAliasConflict(value) {
  if (!isPlainObject(value)) return false;
  const semantic = new Map();
  for (const [key, rawValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const normalizedValue = normalizedHeaderValue(rawValue);
    if (semantic.has(normalizedKey) && semantic.get(normalizedKey) !== normalizedValue) return true;
    semantic.set(normalizedKey, normalizedValue);
  }
  return false;
}

function validShadowTls(value) {
  return isPlainObject(value)
    && Object.keys(value).every((key) => key === "password" || key === "sni")
    && isNonblankString(value.password)
    && (!hasOption(value, "sni") || isNonblankString(value.sni));
}

function validOptionalString(node, key) {
  return !hasOption(node, key) || isNonblankString(node[key]);
}

function resolvedUdp(node) {
  return firstAliasValue(node, UDP_ALIASES);
}

export function resolveEgernNodeOptions(node) {
  return Object.freeze({
    sni: firstAliasValue(node, ["sni", "servername"]),
    skipTlsVerify: firstAliasValue(node, ["skip-cert-verify", "allow-insecure"]),
    fingerprint: firstAliasValue(node, ["fingerprint-sha256", "fingerprint_sha256"]),
    udp: resolvedUdp(node),
    udpPort: firstAliasValue(node, ["udp-port", "udp_port"]),
    obfsHost: firstAliasValue(node, ["obfs-host", "obfs_host"]),
    obfsUri: firstAliasValue(node, ["obfs-uri", "obfs_uri"]),
    portHopping: firstAliasValue(node, ["port-hopping", "port_hopping", "ports"]),
    portHoppingInterval: firstAliasValue(node, ["port-hopping-interval", "port_hopping_interval", "hop-interval"]),
    bandwidth: firstAliasValue(node, ["bandwidth", "up"]),
    blockQuic: firstAliasValue(node, BLOCK_QUIC_ALIASES),
    ipVersion: firstAliasValue(node, IP_VERSION_ALIASES),
    shadowTls: firstAliasValue(node, SHADOW_TLS_ALIASES),
    sshPrivateKey: firstAliasValue(node, ["private-key", "private_key"]),
    sshHostKeys: firstAliasValue(node, ["host-keys", "host_keys"]),
  });
}

function isOptionalBoolean(node, key) {
  return !hasOption(node, key) || typeof node[key] === "boolean";
}

function isOptionalPositiveInteger(node, key, { allowZero = false } = {}) {
  if (!hasOption(node, key)) return true;
  const value = node[key];
  return Number.isInteger(value) && (allowZero ? value >= 0 : value > 0);
}

function hasConflictingAliases(node, keys) {
  return conflictingAliases(node, keys);
}

function optionalStringAliasesAreValid(node, keys) {
  return !hasConflictingAliases(node, keys)
    && keys.every((key) => !hasOption(node, key) || isNonblankString(node[key]));
}

function tlsSecurity(node) {
  if (node.security === "tls" || node.security === "reality") return node.security;
  return node.tls === true ? "tls" : "none";
}

function hasTlsSettings(node) {
  return tlsSecurity(node) !== "none"
    || hasOption(node, "sni")
    || hasOption(node, "servername")
    || hasOption(node, "skip-cert-verify")
    || hasOption(node, "allow-insecure")
    || hasOption(node, "fingerprint-sha256")
    || hasOption(node, "fingerprint_sha256")
    || hasOption(node, "reality-opts");
}

function isCertificateFingerprint(value) {
  if (!isNonblankString(value)) return false;
  if (value.startsWith("TEST_ONLY_")) return true;
  return /^[0-9a-f]{2}(?:[:-]?[0-9a-f]{2}){31}$/i.test(value);
}

function isRealityPublicKey(value) {
  return isNonblankString(value)
    && (value.startsWith("TEST_ONLY_") || /^[A-Za-z0-9_-]{43}=?$/.test(value));
}

function tlsRequestedForCapability(node) {
  return node.tls === true
    || node.security === "tls"
    || node.security === "reality"
    || hasOption(node, "reality-opts");
}

function egernTlsReason(node, { allowReality = true, allowAlpn = false, implicitTls = false } = {}) {
  if (!isOptionalBoolean(node, "tls")
    || !isOptionalBoolean(node, "skip-cert-verify")
    || !isOptionalBoolean(node, "allow-insecure")
    || hasConflictingAliases(node, ["skip-cert-verify", "allow-insecure"])
    || !optionalStringAliasesAreValid(node, ["sni", "servername"])
    || hasConflictingAliases(node, ["fingerprint-sha256", "fingerprint_sha256"])) {
    return "unsupported-egern-tls-shape";
  }

  for (const key of ["fingerprint-sha256", "fingerprint_sha256"]) {
    if (hasOption(node, key) && !isCertificateFingerprint(node[key])) {
      return "unsupported-egern-tls-shape";
    }
  }

  if (hasOption(node, "client-fingerprint") || hasOption(node, "alpn") && !allowAlpn) {
    return "unsupported-egern-tls-shape";
  }

  if (hasOption(node, "security")) {
    const security = node.security;
    const vmessSecurity = normalizeProtocol(node.type) === "vmess" && EGERN_VMESS_SECURITY.has(security);
    if (!vmessSecurity && !["none", "tls", "reality"].includes(security)) {
      return "unsupported-egern-tls-shape";
    }
    if (security === "reality" && !hasOption(node, "reality-opts")) {
      return "incomplete-egern-reality";
    }
    if (node.tls === false && (security === "tls" || security === "reality")) {
      return "unsupported-egern-tls-shape";
    }
  }

  const reality = node["reality-opts"];
  if (reality !== undefined) {
    if (node.tls === false || !allowReality || !isPlainObject(reality) || !isRealityPublicKey(reality["public-key"])) {
      return allowReality ? "incomplete-egern-reality" : "unsupported-egern-tls-shape";
    }
    if (hasOption(reality, "short-id") && (!isNonblankString(reality["short-id"]) || !/^[0-9a-f]+$/i.test(reality["short-id"]))) {
      return "incomplete-egern-reality";
    }
    const realityKeys = Object.keys(reality);
    if (realityKeys.some((key) => !["public-key", "short-id"].includes(key))) {
      return "unsupported-egern-tls-shape";
    }
    if (node["skip-cert-verify"] === true
      || node["allow-insecure"] === true
      || hasOption(node, "fingerprint-sha256")
      || hasOption(node, "fingerprint_sha256")) {
      return "unsupported-egern-tls-shape";
    }
  }

  if (!implicitTls && !tlsRequestedForCapability(node) && hasTlsSettings(node)) {
    return "unsupported-egern-tls-shape";
  }

  return null;
}

function normalizeTransport(node) {
  const network = node.network ?? "tcp";
  return typeof network === "string" ? network.trim().toLowerCase() : "";
}

function unsupportedPlainTransport(node, allowedNetworks = new Set(["tcp", "raw"])) {
  if (hasOption(node, "network") && !allowedNetworks.has(normalizeTransport(node))) return true;
  return ["ws-opts", "grpc-opts", "h2-opts", "http-opts"]
    .some((key) => hasOption(node, key));
}

function isHeaderValue(value) {
  return isNonblankString(value)
    || (Array.isArray(value) && value.length === 1 && isNonblankString(value[0]));
}

function validHeaders(value) {
  return normalizeEgernHeaders(value) !== null;
}

function validPath(value) {
  return isNonblankString(value)
    || (Array.isArray(value) && value.length === 1 && isNonblankString(value[0]));
}

function validHttpTransportOptions(options) {
  if (!isPlainObject(options)) return false;
  const allowed = new Set(["method", "path", "headers"]);
  return Object.keys(options).every((key) => allowed.has(key))
    && (!hasOption(options, "method") || isNonblankString(options.method))
    && (!hasOption(options, "path") || validPath(options.path))
    && (!hasOption(options, "headers") || validHeaders(options.headers));
}

function validHttp2TransportOptions(options) {
  if (!isPlainObject(options)) return false;
  const allowed = new Set(["method", "path", "headers", "host"]);
  if (!Object.keys(options).every((key) => allowed.has(key))
    || hasOption(options, "method") && !isNonblankString(options.method)
    || hasOption(options, "path") && !validPath(options.path)
    || hasOption(options, "headers") && !validHeaders(options.headers)
    || hasOption(options, "host") && !validPath(options.host)) {
    return false;
  }
  if (hasOption(options, "host") && hasOption(options, "headers")) {
    const host = Array.isArray(options.host) ? options.host[0] : options.host;
    const headerHost = options.headers.Host ?? options.headers.host;
    if (headerHost !== undefined && (Array.isArray(headerHost) ? headerHost[0] : headerHost) !== host) return false;
  }
  return true;
}

function egernVmessVlessTransportReason(node) {
  const network = normalizeTransport(node);
  if (!EGERN_TRANSPORTS.has(network)) return "unsupported-egern-transport";

  const tlsReason = egernTlsReason(node);
  if (tlsReason) return tlsReason;
  const tls = tlsSecurity(node) !== "none" || hasOption(node, "reality-opts");
  const optionKeys = ["ws-opts", "grpc-opts", "h2-opts", "http-opts"];

  if (network === "tcp" || network === "raw") {
    return optionKeys.some((key) => hasOption(node, key)) ? "unsupported-egern-transport" : null;
  }

  if (network === "ws") {
    if (optionKeys.some((key) => key !== "ws-opts" && hasOption(node, key))) return "unsupported-egern-transport";
    const options = node["ws-opts"];
    if (!isPlainObject(options)
      || Object.keys(options).some((key) => !["path", "headers"].includes(key))
      || !validPath(options.path)
      || hasOption(options, "headers") && !validHeaders(options.headers)
      || hasOption(node, "reality-opts")) {
      return "unsupported-egern-transport";
    }
    return null;
  }

  if (network === "grpc") {
    if (!tls || optionKeys.some((key) => key !== "grpc-opts" && hasOption(node, key))) {
      return "unsupported-egern-transport";
    }
    const options = node["grpc-opts"];
    if (options === undefined) return null;
    if (!isPlainObject(options)
      || Object.keys(options).some((key) => !["grpc-service-name", "grpc-mode", "user-agent"].includes(key))
      || hasOption(options, "grpc-service-name") && !isNonblankString(options["grpc-service-name"])
      || hasOption(options, "user-agent") && !isNonblankString(options["user-agent"])
      || hasOption(options, "grpc-mode") && options["grpc-mode"] !== "gun") {
      return "unsupported-egern-transport";
    }
    return null;
  }

  if (network === "h2" || network === "http2") {
    if (!tls
      || hasOption(node, "reality-opts")
      || optionKeys.some((key) => key !== "h2-opts" && hasOption(node, key))) {
      return "unsupported-egern-transport";
    }
    return node["h2-opts"] === undefined || validHttp2TransportOptions(node["h2-opts"])
      ? null
      : "unsupported-egern-transport";
  }

  if (tls || hasTlsSettings(node) || optionKeys.some((key) => key !== "http-opts" && hasOption(node, key))) {
    return "unsupported-egern-transport";
  }
  return node["http-opts"] === undefined || validHttpTransportOptions(node["http-opts"])
    ? null
    : "unsupported-egern-transport";
}

function isPortHopping(value) {
  return isNonblankString(value)
    && /^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(value)
    && value.split(",").every((part) => {
      const [start, end = start] = part.split("-").map(Number);
      return start >= 1 && end <= 65535 && start <= end;
    });
}

function isWireGuardKey(value) {
  if (!isNonblankString(value)) return false;
  if (value.startsWith("TEST_ONLY_")) return true;
  return /^[A-Za-z0-9+/]{43}=$/.test(value);
}

function ipFamily(value) {
  if (!isNonblankString(value)) return 0;
  const [address, prefix, ...extra] = value.split("/");
  if (extra.length > 0 || prefix !== undefined && !/^\d+$/.test(prefix)) return 0;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(address)
    && address.split(".").every((part) => Number(part) <= 255)
    && (prefix === undefined || Number(prefix) <= 32)) return 4;
  if (address.includes(":") && (prefix === undefined || Number(prefix) <= 128)) {
    try {
      const host = new URL(`http://[${address}]/`).hostname;
      if (host.startsWith("[") && host.endsWith("]")) return 6;
    } catch {
      return 0;
    }
  }
  return 0;
}

function addressValues(node) {
  const values = [];
  for (const key of ["local_ipv4", "local-ipv4", "local_ipv6", "local-ipv6", "ip", "ipv6", "local-address"]) {
    if (!hasOption(node, key)) continue;
    const value = node[key];
    values.push(...(Array.isArray(value) ? value : [value]));
  }
  return values;
}

function egernWireGuardReason(node) {
  if (hasOption(node, "peers") && (!Array.isArray(node.peers) || node.peers.length !== 1 || !isPlainObject(node.peers[0]))) {
    return "unsupported-egern-wireguard-shape";
  }
  const peer = node.peers?.[0] ?? {};
  if (Object.keys(peer).some((key) => !["server", "port", "public-key", "pre-shared-key", "reserved"].includes(key))) {
    return "unsupported-egern-wireguard-shape";
  }
  if (hasOption(peer, "server") && peer.server !== node.server || hasOption(peer, "port") && Number(peer.port) !== Number(node.port)) {
    return "unsupported-egern-wireguard-shape";
  }
  if (hasOption(node, "public-key") && hasOption(peer, "public-key") && node["public-key"] !== peer["public-key"]
    || hasOption(node, "pre-shared-key") && hasOption(peer, "pre-shared-key") && node["pre-shared-key"] !== peer["pre-shared-key"]
    || hasOption(node, "reserved") && hasOption(peer, "reserved") && JSON.stringify(node.reserved) !== JSON.stringify(peer.reserved)) {
    return "unsupported-egern-wireguard-shape";
  }
  const publicKey = peer["public-key"] ?? node["public-key"];
  const presharedKey = peer["pre-shared-key"] ?? node["pre-shared-key"];
  const reserved = peer.reserved ?? node.reserved;
  if (!isWireGuardKey(node["private-key"]) || !isWireGuardKey(publicKey)
    || presharedKey !== undefined && !isWireGuardKey(presharedKey)
    || reserved !== undefined && (!Array.isArray(reserved)
      || reserved.length !== 3
      || reserved.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255))) {
    return "unsupported-egern-wireguard-shape";
  }
  const addresses = addressValues(node);
  const families = addresses.map(ipFamily);
  if (addresses.length === 0 || families.includes(0)
    || families.filter((family) => family === 4).length > 1
    || families.filter((family) => family === 6).length > 1) {
    return "unsupported-egern-wireguard-shape";
  }
  const dns = node.dns_servers ?? node.dns;
  if (dns !== undefined && (!Array.isArray(dns) || dns.length === 0 || dns.some((value) => ipFamily(value) === 0))
    || !isOptionalPositiveInteger(node, "mtu")
    || !isOptionalPositiveInteger(node, "keepalive", { allowZero: true })) {
    return "unsupported-egern-wireguard-shape";
  }
  return null;
}

function headersInNode(node) {
  const values = [];
  if (hasOption(node, "headers")) values.push(node.headers);
  for (const key of ["ws-opts", "h2-opts", "http-opts"]) {
    if (isPlainObject(node[key]) && hasOption(node[key], "headers")) values.push(node[key].headers);
  }
  return values;
}

function hasHttp2HostConflict(node) {
  const options = node["h2-opts"];
  if (!isPlainObject(options) || !hasOption(options, "host") || !isPlainObject(options.headers)) return false;
  const host = Array.isArray(options.host) ? options.host[0] : options.host;
  const headerValues = Object.entries(options.headers)
    .filter(([key]) => key.toLowerCase() === "host")
    .map(([, value]) => normalizedHeaderValue(value));
  return headerValues.some((value) => value !== host);
}

function hasEgernAliasConflict(node, protocol) {
  const groups = [
    ["sni", "servername"],
    ["skip-cert-verify", "allow-insecure"],
    ["fingerprint-sha256", "fingerprint_sha256"],
    UDP_ALIASES,
    ["udp-port", "udp_port"],
    ["obfs-host", "obfs_host"],
    ["obfs-uri", "obfs_uri"],
    ["obfs-password", "obfs_password"],
    ["port-hopping", "port_hopping", "ports"],
    ["port-hopping-interval", "port_hopping_interval", "hop-interval"],
    ["bandwidth", "up"],
    BLOCK_QUIC_ALIASES,
    IP_VERSION_ALIASES,
    SHADOW_TLS_ALIASES,
    ["private-key", "private_key"],
    ["host-keys", "host_keys"],
    ["udp-relay-mode", "udp_relay_mode"],
  ];
  if (groups.some((keys) => conflictingAliases(node, keys))) return true;
  if (headersInNode(node).some(hasHeaderAliasConflict) || hasHttp2HostConflict(node)) return true;
  if (protocol === "vmess"
    && hasOption(node, "cipher")
    && EGERN_VMESS_SECURITY.has(node.security)
    && node.cipher !== node.security) return true;
  return false;
}

function egernCommonReason(node, protocol) {
  if (!isPlainObject(node)
    || !isNonblankString(node.name)
    || !isNonblankString(node.server)
    || !isValidPort(node.port)) return "invalid-egern-node-shape";
  if (hasEgernAliasConflict(node, protocol)) return "conflicting-egern-alias";
  if (!isOptionalBoolean(node, "tfo")
    || UDP_ALIASES.some((key) => !isOptionalBoolean(node, key))) return "invalid-egern-node-shape";
  if (hasOption(node, "tfo") && !EGERN_TFO_PROTOCOLS.has(protocol)) return "unsupported-egern-option";

  for (const key of BLOCK_QUIC_ALIASES) {
    if (hasOption(node, key) && typeof node[key] !== "boolean") return "invalid-egern-node-shape";
  }
  const blockQuic = firstAliasValue(node, BLOCK_QUIC_ALIASES);
  if (blockQuic !== undefined && !EGERN_BLOCK_QUIC_PROTOCOLS.has(protocol)) return "unsupported-egern-option";

  for (const key of IP_VERSION_ALIASES) {
    if (hasOption(node, key) && !EGERN_IP_VERSIONS.has(node[key])) return "invalid-egern-node-shape";
  }

  const shadowTls = firstAliasValue(node, SHADOW_TLS_ALIASES);
  if (shadowTls !== undefined) {
    if (!EGERN_SHADOW_TLS_PROTOCOLS.has(protocol)) return "unsupported-egern-option";
    if (!validShadowTls(shadowTls) || hasOption(node, "reality-opts")) return "invalid-egern-node-shape";
  }
  return null;
}

function validOptionalAuthentication(node) {
  return validOptionalString(node, "username") && validOptionalString(node, "password");
}

function validSshHostKey(value) {
  if (!isNonblankString(value)) return false;
  const fields = value.split(/\s+/);
  if (fields.length < 2) return false;
  const [type, key] = fields;
  return /^(?:ssh-(?:ed25519|rsa)|ecdsa-sha2-nistp(?:256|384|521))$/.test(type)
    && (key.startsWith("TEST_ONLY_") || /^[A-Za-z0-9+/]+={0,2}$/.test(key));
}

function egernSshReason(node) {
  const sshKeyMaterial = firstAliasValue(node, ["private-key", "private_key"]);
  const hostKeys = firstAliasValue(node, ["host-keys", "host_keys"]);
  if (conflictingAliases(node, ["private-key", "private_key"]) || !isNonblankString(node.username)) {
    return "invalid-egern-node-shape";
  }
  if (!validOptionalString(node, "password")
    || sshKeyMaterial !== undefined && !isNonblankString(sshKeyMaterial)
    || !isNonblankString(node.password) && !isNonblankString(sshKeyMaterial)) {
    return "invalid-egern-node-shape";
  }
  if (hostKeys !== undefined && (!Array.isArray(hostKeys) || hostKeys.some((value) => !validSshHostKey(value)))) {
    return "invalid-egern-node-shape";
  }
  if (hasOption(node, "udp") || hasOption(node, "udp-relay") || hasOption(node, "udp_relay")) {
    return "unsupported-egern-option";
  }
  return unsupportedPlainTransport(node) ? "unsupported-egern-transport" : null;
}

function hasArbitraryChain(node) {
  const present = CHAIN_ALIASES.filter((key) => hasOption(node, key)
    && node[key] !== undefined && node[key] !== null && node[key] !== "");
  if (present.length === 0) return node?._profile?.chained === true;
  return !(present.length === 1
    && present[0] === GENERATED_CHAIN_FIELD
    && node[GENERATED_CHAIN_FIELD] === GENERATED_CHAIN_POLICY
    && node?._profile?.chained === true);
}

export function egernNodeExclusionReason(node) {
  const protocol = normalizeProtocol(node?.type);
  const commonReason = egernCommonReason(node, protocol);
  if (commonReason) return commonReason;
  if (hasArbitraryChain(node)) return "unsupported-existing-chain";

  if (protocol === "ss" || protocol === "shadowsocks") {
    if (!isNonblankString(node.cipher) || !isNonblankString(node.password)) return "invalid-egern-node-shape";
    if (!EGERN_SHADOWSOCKS_METHODS.has(node.cipher)) return "unsupported-egern-method";
    if (hasShadowsocksPlugin(node) || unsupportedPlainTransport(node)) return "unsupported-egern-shadowsocks-shape";
    if (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo")) return "unsupported-egern-shadowsocks-shape";
    if (["udp-port", "udp_port"].some((key) => !isOptionalPositiveInteger(node, key))) return "invalid-egern-node-shape";
    if (hasOption(node, "obfs") && !EGERN_OBFS.has(node.obfs)
      || ["obfs-host", "obfs_host"].some((key) => !validOptionalString(node, key))
      || ["obfs-uri", "obfs_uri"].some((key) => !validOptionalString(node, key))) {
      return "unsupported-egern-shadowsocks-shape";
    }
    return null;
  }

  if (protocol === "snell") {
    if (!isNonblankString(node.psk)) return "invalid-egern-node-shape";
    const version = typeof node.version === "string" && /^\d+$/.test(node.version) ? Number(node.version) : node.version;
    if (!EGERN_SNELL_VERSIONS.has(version)) return "unsupported-egern-version";
    if (hasOption(node, "obfs") && !EGERN_OBFS.has(node.obfs)) return "unsupported-egern-obfs";
    if (unsupportedPlainTransport(node)) return "unsupported-egern-transport";
    if (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "reuse") || !isOptionalBoolean(node, "tfo")
      || resolvedUdp(node) === true && !new Set([3, 4]).has(version)
      || hasOption(node, "reuse") && version !== 4
      || ["obfs-host", "obfs_host"].some((key) => !validOptionalString(node, key))) {
      return "unsupported-egern-snell-shape";
    }
    return null;
  }

  if (protocol === "vmess" || protocol === "vless") {
    if (!isNonblankString(node.uuid)) return "invalid-egern-node-shape";
    if (protocol === "vmess") {
      const security = EGERN_VMESS_SECURITY.has(node.security) ? node.security : node.cipher ?? "auto";
      if (!EGERN_VMESS_SECURITY.has(security)) return "unsupported-egern-security";
      if (hasOption(node, "legacy") && typeof node.legacy !== "boolean"
        || hasOption(node, "alter-id") && node["alter-id"] !== 0
        || hasOption(node, "alterId") && node.alterId !== 0) {
        return "unsupported-egern-vmess-shape";
      }
    } else {
      if (hasOption(node, "flow") && !EGERN_VLESS_FLOWS.has(node.flow)) return "unsupported-egern-flow";
      if (hasOption(node, "flow")
        && (!new Set(["tcp", "raw"]).has(normalizeTransport(node)) || !tlsRequestedForCapability(node))) {
        return "unsupported-egern-flow";
      }
      if (node.security === "none" && (node.tls === true || hasOption(node, "reality-opts"))) {
        return "unsupported-egern-tls-shape";
      }
    }
    if (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo")) return "unsupported-egern-transport";
    return egernVmessVlessTransportReason(node);
  }

  if (protocol === "trojan") {
    if (!isNonblankString(node.password)) return "invalid-egern-node-shape";
    if (node.tls === false || node.security === "none") return "unsupported-egern-tls-shape";
    const network = normalizeTransport(node);
    if (!new Set(["tcp", "raw", "ws"]).has(network)) return "unsupported-egern-transport";
    const tlsReason = egernTlsReason(node, { implicitTls: true });
    if (tlsReason) return tlsReason;
    if (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo")) return "unsupported-egern-trojan-shape";
    if (network === "ws") {
      const options = node["ws-opts"];
      if (!isPlainObject(options)
        || Object.keys(options).some((key) => !["path", "headers"].includes(key))
        || !validPath(options.path)
        || hasOption(options, "headers") && (!validHeaders(options.headers)
          || Object.keys(options.headers).some((key) => key.toLowerCase() !== "host"))) {
        return "unsupported-egern-transport";
      }
    } else if (hasOption(node, "ws-opts")) return "unsupported-egern-transport";
    if (["grpc-opts", "h2-opts", "http-opts"].some((key) => hasOption(node, key))) return "unsupported-egern-transport";
    return null;
  }

  if (protocol === "anytls") {
    if (!isNonblankString(node.password)) return "invalid-egern-node-shape";
    if (node.tls === false || node.security === "none") return "unsupported-egern-tls-shape";
    if (unsupportedPlainTransport(node)) return "unsupported-egern-transport";
    return egernTlsReason(node, { implicitTls: true }) || (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo")
      ? "unsupported-egern-anytls-shape" : null);
  }

  if (protocol === "hysteria2" || protocol === "hy2") {
    if (!isNonblankString(node.password)) return "invalid-egern-node-shape";
    const tlsReason = egernTlsReason(node, { allowReality: false, implicitTls: true });
    if (tlsReason) return tlsReason;
    if (unsupportedPlainTransport(node, new Set(["udp", "quic"]))) return "unsupported-egern-transport";
    if (hasOption(node, "obfs") && node.obfs !== "salamander") return "unsupported-egern-obfs";
    const obfsPassword = firstAliasValue(node, ["obfs-password", "obfs_password"]);
    if (obfsPassword !== undefined && (!isNonblankString(obfsPassword) || node.obfs !== "salamander")) {
      return isNonblankString(obfsPassword) ? "unsupported-egern-obfs" : "invalid-egern-node-shape";
    }
    const hopping = firstAliasValue(node, ["port-hopping", "port_hopping", "ports"]);
    if (hopping !== undefined && !isPortHopping(hopping)
      || hasConflictingAliases(node, ["port-hopping", "port_hopping", "ports"])
      || hasConflictingAliases(node, ["port-hopping-interval", "port_hopping_interval", "hop-interval"])
      || !isOptionalPositiveInteger(node, "port-hopping-interval")
      || !isOptionalPositiveInteger(node, "port_hopping_interval")
      || !isOptionalPositiveInteger(node, "hop-interval")
      || !isOptionalPositiveInteger(node, "bandwidth")
      || !isOptionalPositiveInteger(node, "up")
      || hasConflictingAliases(node, ["bandwidth", "up"])
      || hasOption(node, "down")
      || resolvedUdp(node) === false) {
      return "unsupported-egern-hysteria2-shape";
    }
    return null;
  }

  if (protocol === "tuic") {
    if (!isNonblankString(node.uuid) || !isNonblankString(node.password)) return "invalid-egern-node-shape";
    const tlsReason = egernTlsReason(node, { allowReality: false, allowAlpn: true, implicitTls: true });
    if (tlsReason) return tlsReason;
    if (unsupportedPlainTransport(node, new Set(["udp", "quic"]))) return "unsupported-egern-transport";
    const udpRelayMode = firstAliasValue(node, ["udp-relay-mode", "udp_relay_mode"]);
    if (udpRelayMode !== undefined && !EGERN_TUIC_UDP_MODES.has(udpRelayMode)) return "unsupported-egern-udp-mode";
    if (hasOption(node, "alpn") && (!Array.isArray(node.alpn) || node.alpn.length === 0 || node.alpn.some((item) => !isNonblankString(item)))) {
      return "invalid-egern-node-shape";
    }
    const tuicHopping = firstAliasValue(node, ["port-hopping", "port_hopping"]);
    if (tuicHopping !== undefined && !isPortHopping(tuicHopping)
      || !isOptionalPositiveInteger(node, "port-hopping-interval")
      || !isOptionalPositiveInteger(node, "port_hopping_interval")
      || ["congestion-controller", "reduce-rtt", "disable-sni"].some((key) => hasOption(node, key))
      || resolvedUdp(node) === false) {
      return "unsupported-egern-tuic-shape";
    }
    return null;
  }

  if (protocol === "socks5") {
    if (!validOptionalAuthentication(node)) return "invalid-egern-node-shape";
    const tlsReason = egernTlsReason(node);
    if (tlsReason) return tlsReason;
    if (unsupportedPlainTransport(node)
      || !isOptionalBoolean(node, "udp")
      || !isOptionalBoolean(node, "tfo")) return "unsupported-egern-socks5-shape";
    return null;
  }

  if (protocol === "http") {
    if (!validOptionalAuthentication(node)) return "invalid-egern-node-shape";
    const network = normalizeTransport(node);
    if (network !== "tcp" && network !== "raw") return "unsupported-egern-http-shape";
    if (["ws-opts", "grpc-opts", "h2-opts", "http-opts"].some((key) => hasOption(node, key))) return "unsupported-egern-http-shape";
    const tlsReason = egernTlsReason(node);
    if (tlsReason) return tlsReason;
    if (hasOption(node, "headers") && !validHeaders(node.headers)
      || !isOptionalBoolean(node, "tfo")
      || UDP_ALIASES.some((key) => hasOption(node, key))) {
      return "unsupported-egern-http-shape";
    }
    return null;
  }

  if (protocol === "wireguard") {
    if (unsupportedPlainTransport(node, new Set(["udp"]))) return "unsupported-egern-wireguard-shape";
    return egernWireGuardReason(node);
  }
  if (protocol === "ssh") return egernSshReason(node);
  return null;
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
    : client === CLIENT.egern
      ? egernNodeExclusionReason(node ?? {})
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
