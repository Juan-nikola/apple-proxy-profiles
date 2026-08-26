import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";

const CHAIN_KEYS = ["underlying-proxy", "chain", "dialer-proxy", "detour", "prev_hop"];

function own(source, key) { return Object.hasOwn(source, key); }
function copy(target, source, key, output = key) { if (own(source, key) && source[key] !== undefined) target[output] = structuredClone(source[key]); }
function common(node, type) {
  if (!node || typeof node !== "object" || typeof node.name !== "string" || !node.name
    || typeof node.server !== "string" || !node.server || !Number.isInteger(Number(node.port))) {
    throw new Error("Invalid Clash node shape");
  }
  return { name: node.name, type, server: node.server, port: Number(node.port) };
}
function tls(target, node) {
  if (node.tls === true || node.security === "tls" || own(node, "reality-opts")) target.tls = true;
  copy(target, node, "servername");
  if (own(node, "sni") && !own(node, "servername")) copy(target, node, "sni", "servername");
  copy(target, node, "alpn");
  copy(target, node, "skip-cert-verify");
  copy(target, node, "client-fingerprint");
  if (own(node, "reality-opts")) {
    target["reality-opts"] = {};
    copy(target["reality-opts"], node["reality-opts"], "public-key");
    copy(target["reality-opts"], node["reality-opts"], "short-id");
  }
}
function transport(target, node) {
  const network = String(node.network || "tcp").toLowerCase();
  if (network !== "tcp" && network !== "raw") target.network = network;
  if (network === "ws" && node["ws-opts"]) target["ws-opts"] = structuredClone(node["ws-opts"]);
  if (network === "grpc" && node["grpc-opts"]) target["grpc-opts"] = structuredClone(node["grpc-opts"]);
  if ((network === "h2" || network === "http2") && node["h2-opts"]) target["h2-opts"] = structuredClone(node["h2-opts"]);
  if ((network === "http" || network === "http1") && node["http-opts"]) target["http-opts"] = structuredClone(node["http-opts"]);
}

function render(node) {
  const protocol = normalizeProtocol(node.type);
  let result;
  switch (protocol) {
    case "ss":
    case "shadowsocks":
      result = common(node, "ss"); copy(result, node, "cipher"); copy(result, node, "password"); copy(result, node, "udp"); break;
    case "ssr":
      result = common(node, "ssr"); for (const key of ["cipher", "password", "protocol", "obfs", "obfs-param", "protocol-param"]) copy(result, node, key); copy(result, node, "udp"); break;
    case "snell":
      result = common(node, "snell"); for (const key of ["psk", "version", "reuse", "obfs", "obfs-host"]) copy(result, node, key); copy(result, node, "udp"); break;
    case "vmess":
      result = common(node, "vmess"); for (const key of ["uuid", "alterId", "cipher", "udp", "packet-encoding"]) copy(result, node, key); if (own(node, "alter-id") && !own(node, "alterId")) copy(result, node, "alter-id", "alterId"); tls(result, node); transport(result, node); break;
    case "vless":
      result = common(node, "vless"); for (const key of ["uuid", "flow", "encryption", "udp", "packet-encoding"]) copy(result, node, key); tls(result, node); transport(result, node); break;
    case "trojan":
      result = common(node, "trojan"); copy(result, node, "password"); copy(result, node, "udp"); tls(result, node); transport(result, node); break;
    case "anytls":
      result = common(node, "anytls"); copy(result, node, "password"); copy(result, node, "udp"); tls(result, node); break;
    case "hysteria2":
    case "hy2":
      result = common(node, "hysteria2"); copy(result, node, "password"); for (const key of ["obfs", "obfs-password", "ports", "hop-interval", "up", "down"]) copy(result, node, key); tls(result, node); break;
    case "tuic":
      result = common(node, "tuic"); for (const key of ["uuid", "password", "congestion-controller", "udp-relay-mode", "alpn", "port-hopping", "port-hopping-interval"]) copy(result, node, key); tls(result, node); break;
    case "socks5":
      result = common(node, "socks5"); for (const key of ["username", "password", "udp"]) copy(result, node, key); tls(result, node); break;
    case "http":
      result = common(node, node.tls === true ? "https" : "http"); for (const key of ["username", "password", "headers", "udp"]) copy(result, node, key); tls(result, node); break;
    case "ssh":
      result = common(node, "ssh"); for (const key of ["username", "password", "private-key", "host-keys", "tfo"]) copy(result, node, key); break;
    case "wireguard":
      result = common(node, "wireguard"); for (const key of ["private-key", "public-key", "pre-shared-key", "reserved", "ip", "ipv6", "dns", "mtu", "keepalive"]) copy(result, node, key); break;
    default: throw new Error("Unsupported Clash protocol: " + protocol);
  }
  if (CHAIN_KEYS.some((key) => own(node, key) && node[key] !== undefined && node[key] !== null && node[key] !== "")) {
    throw new Error("Clash does not accept an existing proxy chain");
  }
  return result;
}

export function toClashProxy(node) {
  try { return render(node); } catch { throw new Error("Clash cannot render protocol: " + normalizeProtocol(node?.type)); }
}

