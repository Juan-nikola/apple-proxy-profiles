import {
  egernNodeExclusionReason,
  normalizeEgernHeaders,
  resolveEgernNodeOptions,
} from "../../../shared/nodes/capabilities.js";
import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";

export const EGERN_CHAIN_POLICY = "🔗 入口节点";

const CHAIN_ALIASES = Object.freeze(["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"]);
const ANYTLS_FIELDS = new Set([
  "name", "type", "server", "port", "password", "network", "tls", "security",
  "sni", "servername", "tfo", "udp", "udp-relay", "udp_relay",
  "skip-cert-verify", "allow-insecure", "fingerprint-sha256", "fingerprint_sha256",
  "alpn", "client-fingerprint",
  "reality-opts", "block-quic", "block_quic", "shadow-tls", "shadow-tls-opts",
  "shadow_tls", "ip-version", "ip_version", "underlying-proxy", "chain",
  "dialer-proxy", "detour", "prev_hop", "_profile", "_subName",
]);
const REASON_MESSAGES = Object.freeze({
  "unsupported-existing-chain": "Unsupported existing Egern proxy chain",
  "unsupported-egern-transport": "Unsupported Egern transport",
  "incomplete-egern-reality": "Incomplete Egern Reality configuration",
  "unsupported-egern-security": "Unsupported Egern security",
  "unsupported-egern-method": "Unsupported Egern Shadowsocks method",
  "unsupported-egern-version": "Unsupported Egern Snell version",
  "unsupported-egern-flow": "Unsupported Egern VLESS flow",
  "unsupported-egern-http-shape": "Unsupported Egern HTTP shape",
  "unsupported-egern-wireguard-shape": "Unsupported Egern WireGuard shape",
  "unsupported-egern-obfs": "Unsupported Egern obfuscation",
  "unsupported-egern-udp-mode": "Unsupported Egern UDP mode",
  "unsupported-egern-tls-shape": "Unsupported Egern TLS shape",
  "unsupported-egern-shadowsocks-shape": "Unsupported Egern Shadowsocks shape",
  "unsupported-egern-snell-shape": "Unsupported Egern Snell shape",
  "unsupported-egern-vmess-shape": "Unsupported Egern VMess shape",
  "unsupported-egern-trojan-shape": "Unsupported Egern Trojan shape",
  "unsupported-egern-anytls-shape": "Unsupported Egern AnyTLS shape",
  "unsupported-egern-hysteria2-shape": "Unsupported Egern Hysteria2 shape",
  "unsupported-egern-tuic-shape": "Unsupported Egern TUIC shape",
  "unsupported-egern-socks5-shape": "Unsupported Egern SOCKS5 shape",
  "invalid-egern-node-shape": "Invalid Egern proxy shape",
  "conflicting-egern-alias": "Conflicting Egern proxy aliases",
  "unsupported-egern-option": "Unsupported Egern proxy option",
});

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function copyOptional(target, outputKey, source, sourceKey = outputKey) {
  if (hasOwn(source, sourceKey)) target[outputKey] = source[sourceKey];
}

function setCredentialField(target, key, value) {
  target[key] = value;
  return target;
}

function firstOwn(source, keys) {
  for (const key of keys) {
    if (hasOwn(source, key)) return source[key];
  }
  return undefined;
}

function requiredString(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Incomplete Egern proxy node");
  }
  return value;
}

function assertSupportedFields(node, supportedFields) {
  if (Object.keys(node).some((key) => !supportedFields.has(key))) {
    throw new Error("Unsupported Egern proxy option");
  }
}

function protocolForError(node) {
  try {
    return normalizeProtocol(node?.type) || "unknown";
  } catch {
    return "unknown";
  }
}

function commonFields(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)
    || typeof node.name !== "string" || node.name.length === 0
    || typeof node.server !== "string" || node.server.length === 0
    || !Number.isInteger(Number(node.port)) || Number(node.port) < 1 || Number(node.port) > 65535) {
    throw new Error("Incomplete Egern proxy node");
  }
  return { name: node.name, server: node.server, port: Number(node.port) };
}

function normalizedPath(value) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizedHeaders(value) {
  if (value === undefined) return undefined;
  return normalizeEgernHeaders(value);
}

function tlsRequested(node) {
  return node.tls === true
    || node.security === "tls"
    || node.security === "reality"
    || hasOwn(node, "reality-opts");
}

function realityFields(node) {
  const source = node["reality-opts"];
  if (source === undefined) return undefined;
  const reality = { public_key: source["public-key"] };
  copyOptional(reality, "short_id", source, "short-id");
  return reality;
}

function appendTlsFields(target, node, { includeReality = true } = {}) {
  const resolved = resolveEgernNodeOptions(node);
  const sni = resolved.sni;
  if (sni !== undefined) target.sni = sni;
  const skipTlsVerify = resolved.skipTlsVerify;
  if (skipTlsVerify !== undefined) target.skip_tls_verify = skipTlsVerify;
  const fingerprint = resolved.fingerprint;
  if (fingerprint !== undefined) target.fingerprint_sha256 = fingerprint;
  if (includeReality) {
    const reality = realityFields(node);
    if (reality !== undefined) target.reality = reality;
  }
  return target;
}

function networkLabel(node) {
  return String(node.network ?? "tcp").trim().toLowerCase();
}

function httpTransportFields(options = {}) {
  const result = {};
  copyOptional(result, "method", options);
  if (hasOwn(options, "path")) result.path = normalizedPath(options.path);
  if (hasOwn(options, "headers")) result.headers = normalizedHeaders(options.headers);
  if (hasOwn(options, "host")) {
    result.headers = { ...(result.headers ?? {}), Host: normalizedPath(options.host) };
  }
  return result;
}

function renderVmessVlessTransport(node) {
  const network = networkLabel(node);
  if (network === "tcp" || network === "raw") {
    if (!tlsRequested(node)) return undefined;
    return { tls: appendTlsFields({}, node) };
  }

  if (network === "ws") {
    const source = node["ws-opts"];
    const fields = { path: normalizedPath(source.path) };
    if (hasOwn(source, "headers")) fields.headers = normalizedHeaders(source.headers);
    if (tlsRequested(node)) appendTlsFields(fields, node, { includeReality: false });
    return { [tlsRequested(node) ? "wss" : "ws"]: fields };
  }

  if (network === "grpc") {
    const source = node["grpc-opts"] ?? {};
    const fields = {};
    copyOptional(fields, "service_name", source, "grpc-service-name");
    copyOptional(fields, "user_agent", source, "user-agent");
    appendTlsFields(fields, node);
    return { grpc: fields };
  }

  if (network === "h2" || network === "http2") {
    return { http2: appendTlsFields(httpTransportFields(node["h2-opts"]), node) };
  }

  if (network === "http" || network === "http1") {
    return { http1: httpTransportFields(node["http-opts"]) };
  }

  throw new Error("Unsupported Egern transport");
}

function appendCommonTcpOptions(target, node, { udp = false } = {}) {
  copyOptional(target, "tfo", node);
  const resolvedUdp = resolveEgernNodeOptions(node).udp;
  if (udp && resolvedUdp !== undefined) target.udp_relay = resolvedUdp;
  return target;
}

function appendLatestCommonOptions(target, node) {
  const resolved = resolveEgernNodeOptions(node);
  if (resolved.blockQuic !== undefined) target.block_quic = resolved.blockQuic;
  if (resolved.shadowTls !== undefined) {
    const shadowTls = {};
    setCredentialField(shadowTls, "password", resolved.shadowTls.password);
    if (resolved.shadowTls.sni !== undefined) shadowTls.sni = resolved.shadowTls.sni;
    target.shadow_tls = shadowTls;
  }
  if (resolved.ipVersion !== undefined) target.ip_version = resolved.ipVersion;
  return target;
}

function renderShadowsocks(node) {
  const fields = {
    ...commonFields(node),
    method: requiredString(node.cipher),
  };
  setCredentialField(fields, "password", requiredString(node.password));
  appendCommonTcpOptions(fields, node, { udp: true });
  const resolved = resolveEgernNodeOptions(node);
  if (resolved.udpPort !== undefined) fields.udp_port = resolved.udpPort;
  copyOptional(fields, "obfs", node);
  if (resolved.obfsHost !== undefined) fields.obfs_host = resolved.obfsHost;
  if (resolved.obfsUri !== undefined) fields.obfs_uri = resolved.obfsUri;
  return { shadowsocks: fields };
}

function renderSnell(node) {
  const fields = commonFields(node);
  setCredentialField(fields, "psk", requiredString(node.psk));
  fields.version = Number(node.version);
  appendCommonTcpOptions(fields, node, { udp: true });
  copyOptional(fields, "reuse", node);
  copyOptional(fields, "obfs", node);
  const obfsHost = resolveEgernNodeOptions(node).obfsHost;
  if (obfsHost !== undefined) fields.obfs_host = obfsHost;
  return { snell: fields };
}

function renderVmess(node) {
  const security = ["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"].includes(node.security)
    ? node.security
    : node.cipher ?? "auto";
  const fields = appendCommonTcpOptions({
    ...commonFields(node),
    user_id: requiredString(node.uuid),
    security,
  }, node, { udp: true });
  if (hasOwn(node, "legacy")) fields.legacy = node.legacy;
  else if (node["alter-id"] === 0 || node.alterId === 0) fields.legacy = false;
  const transport = renderVmessVlessTransport(node);
  if (transport !== undefined) fields.transport = transport;
  return { vmess: fields };
}

function renderVless(node) {
  const fields = appendCommonTcpOptions({
    ...commonFields(node),
    user_id: requiredString(node.uuid),
  }, node, { udp: true });
  copyOptional(fields, "flow", node);
  const transport = renderVmessVlessTransport(node);
  if (transport !== undefined) fields.transport = transport;
  return { vless: fields };
}

function websocketFields(node) {
  const options = node["ws-opts"];
  const fields = { path: normalizedPath(options.path) };
  if (hasOwn(options, "headers")) {
    const headers = normalizedHeaders(options.headers);
    if (hasOwn(headers, "Host")) fields.host = headers.Host;
  }
  return fields;
}

function renderTrojan(node) {
  const fields = commonFields(node);
  setCredentialField(fields, "password", requiredString(node.password));
  appendCommonTcpOptions(fields, node, { udp: true });
  appendTlsFields(fields, node);
  if (networkLabel(node) === "ws") fields.websocket = websocketFields(node);
  return { trojan: fields };
}

function renderAnytls(node) {
  assertSupportedFields(node, ANYTLS_FIELDS);
  const fields = commonFields(node);
  setCredentialField(fields, "password", requiredString(node.password));
  appendCommonTcpOptions(fields, node, { udp: true });
  appendTlsFields(fields, node);
  return { anytls: fields };
}

function renderHysteria2(node) {
  const fields = commonFields(node);
  setCredentialField(fields, "auth", requiredString(node.password));
  appendTlsFields(fields, node, { includeReality: false });
  copyOptional(fields, "obfs", node);
  const resolved = resolveEgernNodeOptions(node);
  const obfsPassword = firstOwn(node, ["obfs-password", "obfs_password"]);
  if (obfsPassword !== undefined) fields.obfs_password = obfsPassword;
  const hopping = resolved.portHopping;
  if (hopping !== undefined) fields.port_hopping = hopping;
  const hoppingInterval = resolved.portHoppingInterval;
  if (hoppingInterval !== undefined) fields.port_hopping_interval = hoppingInterval;
  const bandwidth = resolved.bandwidth;
  if (bandwidth !== undefined) fields.bandwidth = bandwidth;
  return { hysteria2: fields };
}

function renderTuic(node) {
  const fields = {
    ...commonFields(node),
    uuid: requiredString(node.uuid),
  };
  setCredentialField(fields, "password", requiredString(node.password));
  const udpRelayMode = firstOwn(node, ["udp-relay-mode", "udp_relay_mode"]);
  if (udpRelayMode !== undefined) fields.udp_relay_mode = udpRelayMode;
  if (hasOwn(node, "alpn")) fields.alpn = [...node.alpn];
  appendTlsFields(fields, node, { includeReality: false });
  const resolved = resolveEgernNodeOptions(node);
  if (resolved.portHopping !== undefined) fields.port_hopping = resolved.portHopping;
  if (resolved.portHoppingInterval !== undefined) fields.port_hopping_interval = resolved.portHoppingInterval;
  return { tuic: fields };
}

function renderSocks5(node) {
  const fields = appendCommonTcpOptions(commonFields(node), node, { udp: true });
  copyOptional(fields, "username", node);
  copyOptional(fields, "password", node);
  if (tlsRequested(node)) appendTlsFields(fields, node);
  return { [tlsRequested(node) ? "socks5_tls" : "socks5"]: fields };
}

function renderHttp(node) {
  const fields = appendCommonTcpOptions(commonFields(node), node);
  copyOptional(fields, "username", node);
  copyOptional(fields, "password", node);
  if (hasOwn(node, "headers")) fields.headers = normalizedHeaders(node.headers);
  if (tlsRequested(node)) appendTlsFields(fields, node);
  return { [tlsRequested(node) ? "https" : "http"]: fields };
}

function renderSsh(node) {
  const resolved = resolveEgernNodeOptions(node);
  const fields = commonFields(node);
  fields.username = node.username;
  if (node.password !== undefined) setCredentialField(fields, "password", node.password);
  if (resolved.sshPrivateKey !== undefined) setCredentialField(fields, "private_key", resolved.sshPrivateKey);
  if (resolved.sshHostKeys !== undefined) fields.host_keys = [...resolved.sshHostKeys];
  copyOptional(fields, "tfo", node);
  return { ssh: fields };
}

function wireGuardAddresses(node) {
  const values = [];
  for (const key of ["local_ipv4", "local-ipv4", "local_ipv6", "local-ipv6", "ip", "ipv6", "local-address"]) {
    if (!hasOwn(node, key)) continue;
    values.push(...(Array.isArray(node[key]) ? node[key] : [node[key]]));
  }
  return {
    ipv4: values.find((value) => !String(value).includes(":")),
    ipv6: values.find((value) => String(value).includes(":")),
  };
}

function renderWireGuard(node) {
  const peer = node.peers?.[0] ?? {};
  const fields = {
    ...commonFields(node),
  };
  setCredentialField(fields, "private_key", requiredString(node["private-key"]));
  fields.peer_public_key = requiredString(peer["public-key"] ?? node["public-key"]);
  const presharedKey = peer["pre-shared-key"] ?? node["pre-shared-key"];
  if (presharedKey !== undefined) fields.preshared_key = presharedKey;
  const reserved = peer.reserved ?? node.reserved;
  if (reserved !== undefined) fields.reserved = [...reserved];
  const { ipv4, ipv6 } = wireGuardAddresses(node);
  if (ipv4 !== undefined) fields.local_ipv4 = ipv4;
  if (ipv6 !== undefined) fields.local_ipv6 = ipv6;
  const dns = node.dns_servers ?? node.dns;
  if (dns !== undefined) fields.dns_servers = [...dns];
  copyOptional(fields, "mtu", node);
  copyOptional(fields, "keepalive", node);
  return { wireguard: fields };
}

function appendClientChain(proxy, node, clientChain) {
  const presentAliases = CHAIN_ALIASES.filter((key) => hasOwn(node, key)
    && node[key] !== undefined && node[key] !== null && node[key] !== "");
  const generated = presentAliases.length === 1
    && presentAliases[0] === "underlying-proxy"
    && node["underlying-proxy"] === EGERN_CHAIN_POLICY
    && node?._profile?.chained === true;
  if (presentAliases.length === 0) return proxy;
  if (!generated) throw new Error("Unsupported existing Egern proxy chain");
  if (clientChain === "off") throw new Error("Egern client chain is disabled");
  const fields = proxy[Object.keys(proxy)[0]];
  fields.prev_hop = EGERN_CHAIN_POLICY;
  return proxy;
}

function renderEgernProxy(node, { clientChain = "off" } = {}) {
  if (clientChain !== "off" && clientChain !== "on") {
    throw new Error("clientChain must be off or on");
  }
  const reason = egernNodeExclusionReason(node ?? {});
  if (reason) throw new Error(REASON_MESSAGES[reason] ?? "Unsupported Egern proxy shape");

  const protocol = normalizeProtocol(node?.type);
  let proxy;
  switch (protocol) {
    case "ss":
    case "shadowsocks": proxy = renderShadowsocks(node); break;
    case "snell": proxy = renderSnell(node); break;
    case "vmess": proxy = renderVmess(node); break;
    case "vless": proxy = renderVless(node); break;
    case "trojan": proxy = renderTrojan(node); break;
    case "anytls": proxy = renderAnytls(node); break;
    case "hysteria2":
    case "hy2": proxy = renderHysteria2(node); break;
    case "tuic": proxy = renderTuic(node); break;
    case "socks5": proxy = renderSocks5(node); break;
    case "http": proxy = renderHttp(node); break;
    case "ssh": proxy = renderSsh(node); break;
    case "wireguard": proxy = renderWireGuard(node); break;
    default: throw new Error("Unsupported Egern protocol");
  }
  const fields = proxy[Object.keys(proxy)[0]];
  appendLatestCommonOptions(fields, node);
  return appendClientChain(proxy, node, clientChain);
}

export function toEgernProxy(node, options = {}) {
  const protocol = protocolForError(node);
  try {
    return renderEgernProxy(node, options);
  } catch {
    throw new Error(`Egern cannot render protocol: ${protocol}`);
  }
}
