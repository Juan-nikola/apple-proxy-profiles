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

function isOptionalBoolean(node, key) {
  return !hasOption(node, key) || typeof node[key] === "boolean";
}

function isOptionalPositiveInteger(node, key, { allowZero = false } = {}) {
  if (!hasOption(node, key)) return true;
  const value = node[key];
  return Number.isInteger(value) && (allowZero ? value >= 0 : value > 0);
}

function hasConflictingAliases(node, keys) {
  const values = keys.filter((key) => hasOption(node, key)).map((key) => node[key]);
  return values.length > 1 && values.some((value) => value !== values[0]);
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
    if (node.tls === false || !allowReality || !isPlainObject(reality) || !isNonblankString(reality["public-key"])) {
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
  return ["ws-opts", "grpc-opts", "h2-opts", "http-opts", "shadow-tls", "shadow-tls-opts", "shadow_tls"]
    .some((key) => hasOption(node, key));
}

function isHeaderValue(value) {
  return isNonblankString(value)
    || (Array.isArray(value) && value.length === 1 && isNonblankString(value[0]));
}

function validHeaders(value) {
  return isPlainObject(value)
    && Object.entries(value).every(([key, item]) => isNonblankString(key) && isHeaderValue(item));
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
  const optionKeys = ["ws-opts", "grpc-opts", "h2-opts", "http-opts", "shadow-tls", "shadow-tls-opts", "shadow_tls"];

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
  if (hasArbitraryChain(node)) return "unsupported-existing-chain";
  const protocol = normalizeProtocol(node?.type);

  if (protocol === "ss" || protocol === "shadowsocks") {
    if (!EGERN_SHADOWSOCKS_METHODS.has(node.cipher)) return "unsupported-egern-method";
    if (hasShadowsocksPlugin(node) || unsupportedPlainTransport(node)) return "unsupported-egern-shadowsocks-shape";
    if (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo")) return "unsupported-egern-shadowsocks-shape";
    if (hasOption(node, "udp-port") && !isOptionalPositiveInteger(node, "udp-port")) return "unsupported-egern-shadowsocks-shape";
    if (hasOption(node, "obfs") && !EGERN_OBFS.has(node.obfs)
      || hasOption(node, "obfs-host") && !isNonblankString(node["obfs-host"])
      || hasOption(node, "obfs-uri") && !isNonblankString(node["obfs-uri"])) {
      return "unsupported-egern-shadowsocks-shape";
    }
    return null;
  }

  if (protocol === "snell") {
    const version = typeof node.version === "string" && /^\d+$/.test(node.version) ? Number(node.version) : node.version;
    if (!EGERN_SNELL_VERSIONS.has(version)) return "unsupported-egern-version";
    if (hasOption(node, "obfs") && !EGERN_OBFS.has(node.obfs)) return "unsupported-egern-obfs";
    if (unsupportedPlainTransport(node)) return "unsupported-egern-transport";
    if (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "reuse") || !isOptionalBoolean(node, "tfo")
      || node.udp === true && !new Set([3, 4]).has(version)
      || hasOption(node, "reuse") && version !== 4
      || hasOption(node, "obfs-host") && !isNonblankString(node["obfs-host"])) {
      return "unsupported-egern-snell-shape";
    }
    return null;
  }

  if (protocol === "vmess" || protocol === "vless") {
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
          || Object.keys(options.headers).some((key) => key !== "Host" && key !== "host"))) {
        return "unsupported-egern-transport";
      }
    } else if (hasOption(node, "ws-opts")) return "unsupported-egern-transport";
    if (["grpc-opts", "h2-opts", "http-opts", "shadow-tls", "shadow-tls-opts", "shadow_tls"].some((key) => hasOption(node, key))) return "unsupported-egern-transport";
    return null;
  }

  if (protocol === "anytls") {
    if (node.tls === false || node.security === "none") return "unsupported-egern-tls-shape";
    if (unsupportedPlainTransport(node)) return "unsupported-egern-transport";
    return egernTlsReason(node, { implicitTls: true }) || (!isOptionalBoolean(node, "udp") || !isOptionalBoolean(node, "tfo")
      ? "unsupported-egern-anytls-shape" : null);
  }

  if (protocol === "hysteria2" || protocol === "hy2") {
    const tlsReason = egernTlsReason(node, { allowReality: false, implicitTls: true });
    if (tlsReason) return tlsReason;
    if (unsupportedPlainTransport(node, new Set(["udp", "quic"]))) return "unsupported-egern-transport";
    if (hasOption(node, "obfs") && node.obfs !== "salamander") return "unsupported-egern-obfs";
    if (hasOption(node, "obfs-password") && node.obfs !== "salamander") return "unsupported-egern-obfs";
    const hopping = node["port-hopping"] ?? node.ports;
    if (hopping !== undefined && !isPortHopping(hopping)
      || hasConflictingAliases(node, ["port-hopping", "ports"])
      || hasConflictingAliases(node, ["port-hopping-interval", "hop-interval"])
      || !isOptionalPositiveInteger(node, "port-hopping-interval")
      || !isOptionalPositiveInteger(node, "hop-interval")
      || !isOptionalPositiveInteger(node, "bandwidth")
      || !isOptionalPositiveInteger(node, "up")
      || hasConflictingAliases(node, ["bandwidth", "up"])
      || hasOption(node, "down")
      || node.udp === false) {
      return "unsupported-egern-hysteria2-shape";
    }
    return null;
  }

  if (protocol === "tuic") {
    const tlsReason = egernTlsReason(node, { allowReality: false, allowAlpn: true, implicitTls: true });
    if (tlsReason) return tlsReason;
    if (unsupportedPlainTransport(node, new Set(["udp", "quic"]))) return "unsupported-egern-transport";
    if (hasOption(node, "udp-relay-mode") && !EGERN_TUIC_UDP_MODES.has(node["udp-relay-mode"])) return "unsupported-egern-udp-mode";
    if (hasOption(node, "alpn") && (!Array.isArray(node.alpn) || node.alpn.length === 0 || node.alpn.some((item) => !isNonblankString(item)))) {
      return "unsupported-egern-tuic-shape";
    }
    if (hasOption(node, "port-hopping") && !isPortHopping(node["port-hopping"])
      || !isOptionalPositiveInteger(node, "port-hopping-interval")
      || ["congestion-controller", "reduce-rtt", "disable-sni"].some((key) => hasOption(node, key))
      || node.udp === false) {
      return "unsupported-egern-tuic-shape";
    }
    return null;
  }

  if (protocol === "socks5") {
    const tlsReason = egernTlsReason(node);
    if (tlsReason) return tlsReason;
    if (unsupportedPlainTransport(node)
      || !isOptionalBoolean(node, "udp")
      || !isOptionalBoolean(node, "tfo")) return "unsupported-egern-socks5-shape";
    return null;
  }

  if (protocol === "http") {
    const network = normalizeTransport(node);
    if (network !== "tcp" && network !== "raw") return "unsupported-egern-http-shape";
    if (["ws-opts", "grpc-opts", "h2-opts", "http-opts", "shadow-tls", "shadow-tls-opts", "shadow_tls"].some((key) => hasOption(node, key))) return "unsupported-egern-http-shape";
    const tlsReason = egernTlsReason(node);
    if (tlsReason) return tlsReason;
    if (hasOption(node, "headers") && !validHeaders(node.headers)
      || !isOptionalBoolean(node, "tfo")
      || hasOption(node, "udp")) {
      return "unsupported-egern-http-shape";
    }
    return null;
  }

  if (protocol === "wireguard") {
    if (unsupportedPlainTransport(node, new Set(["udp"]))) return "unsupported-egern-wireguard-shape";
    return egernWireGuardReason(node);
  }
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
