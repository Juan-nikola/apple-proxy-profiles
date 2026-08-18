import { normalizeProtocol, protocolSupportsClient } from "../../../shared/nodes/protocol-registry.js";

const TAG = /^ap-[a-z0-9][a-z0-9/_-]{0,127}$/u;

function requiredString(node, key) {
  const value = node[key];
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) throw new Error(`OneXray node field '${key}' is invalid`);
  return value;
}

function port(node) {
  const value = Number(node.port);
  if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error("OneXray node port is invalid");
  return value;
}

function transport(node) {
  const network = String(node.network ?? "tcp").trim().toLowerCase();
  if (["tcp", "raw"].includes(network)) return network === "raw" ? { network: "raw", rawSettings: {} } : undefined;
  if (network === "ws") {
    const source = node["ws-opts"] ?? {};
    return { network: "ws", wsSettings: { path: Array.isArray(source.path) ? source.path[0] : source.path ?? "/", ...(source.headers ? { headers: { ...source.headers } } : {}) } };
  }
  if (network === "grpc") {
    const source = node["grpc-opts"] ?? {};
    return { network: "grpc", grpcSettings: { serviceName: source["grpc-service-name"] ?? source.service_name ?? "" } };
  }
  if (["h2", "http2", "http"].includes(network)) {
    const source = node["h2-opts"] ?? node["http-opts"] ?? {};
    return { network: "http", httpSettings: { path: Array.isArray(source.path) ? source.path[0] : source.path ?? "/", ...(source.host ? { host: Array.isArray(source.host) ? source.host : [source.host] } : {}) } };
  }
  if (network === "httpupgrade") {
    const source = node["httpupgrade-opts"] ?? {};
    return { network: "httpupgrade", httpupgradeSettings: { path: source.path ?? "/", ...(source.host ? { host: source.host } : {}) } };
  }
  if (network === "xhttp") {
    const source = node["xhttp-opts"] ?? {};
    return { network: "xhttp", xhttpSettings: { path: source.path ?? "/", ...(source.mode ? { mode: source.mode } : {}) } };
  }
  if (["kcp", "mkcp"].includes(network)) {
    return { network: "kcp", kcpSettings: { ...(node["kcp-opts"] ?? {}) } };
  }
  if (network === "hysteria") return { network: "hysteria", hysteriaSettings: { ...(node["hysteria-opts"] ?? {}) } };
  throw new Error("unsupported-onexray-transport");
}

function security(node, result) {
  const reality = node["reality-opts"];
  const securityName = node.security === "reality" || reality ? "reality" : node.tls === true || node.security === "tls" ? "tls" : "none";
  if (securityName === "none") return;
  result.security = securityName;
  if (securityName === "reality") {
    if (!reality || typeof reality["public-key"] !== "string" || reality["public-key"].length === 0) throw new Error("incomplete-onexray-reality");
    result.realitySettings = {
      serverName: node.sni ?? node.servername ?? "",
      fingerprint: node["client-fingerprint"] ?? "chrome",
      publicKey: reality["public-key"],
      ...(reality["short-id"] ? { shortId: reality["short-id"] } : {}),
      ...(reality["spider-x"] || reality["_spider-x"] ? { spiderX: reality["spider-x"] ?? reality["_spider-x"] } : {}),
    };
  } else {
    result.tlsSettings = {
      serverName: node.sni ?? node.servername ?? "",
      allowInsecure: node["skip-cert-verify"] === true || node["allow-insecure"] === true,
      ...(node.alpn ? { alpn: [...node.alpn] } : {}),
      ...(node["client-fingerprint"] ? { fingerprint: node["client-fingerprint"] } : {}),
    };
  }
}

function base(node, tag, protocol) {
  if (!node || typeof node !== "object" || Array.isArray(node)) throw new TypeError("OneXray node is invalid");
  if (typeof node.name !== "string" || node.name.length === 0 || /[\r\n]/u.test(node.name)) throw new Error("OneXray node name is invalid");
  if (typeof tag !== "string" || !TAG.test(tag)) throw new Error("OneXray outbound tag is invalid");
  if (!protocolSupportsClient(protocol, "onexray")) throw new Error("unsupported-onexray-protocol");
  return { name: node.name, protocol, tag, settings: {} };
}

function server(node) {
  return { address: requiredString(node, "server"), port: port(node) };
}

export function renderOneXrayOutbound(node, { tag } = {}) {
  const protocol = normalizeProtocol(node?.type);
  const common = base(node, tag, protocol);
  switch (protocol) {
    case "vless": {
      const user = { id: requiredString(node, "uuid"), encryption: node.encryption ?? "none" };
      if (node.flow) user.flow = node.flow;
      common.settings.vnext = [{ ...server(node), users: [user] }];
      break;
    }
    case "vmess": {
      common.settings.vnext = [{ ...server(node), users: [{ id: requiredString(node, "uuid"), alterId: Number(node["alter-id"] ?? node.alterId ?? 0), security: node.security ?? node.cipher ?? "auto" }] }];
      break;
    }
    case "ss":
    case "shadowsocks":
      common.protocol = "shadowsocks";
      common.settings.servers = [{ ...server(node), method: requiredString(node, "cipher"), password: requiredString(node, "password") }];
      break;
    case "trojan":
      common.settings.servers = [{ ...server(node), password: requiredString(node, "password"), ...(node.flow ? { flow: node.flow } : {}) }];
      break;
    case "socks5":
      common.protocol = "socks";
      common.settings.servers = [{ ...server(node), ...(node.username ? { users: [{ user: node.username, pass: node.password ?? "" }] } : {}) }];
      break;
    case "http":
      common.settings.servers = [{ ...server(node), ...(node.username ? { users: [{ user: node.username, pass: node.password ?? "" }] } : {}), ...(node["http-opts"] ? { headers: node["http-opts"].headers ?? {} } : {}) }];
      break;
    case "hysteria2":
    case "hy2":
      common.protocol = "hysteria";
      common.settings = { version: 2, ...server(node), ...(node.password ? { auth: node.password } : {}) };
      break;
    default:
      throw new Error("unsupported-onexray-protocol");
  }
  const stream = transport(node);
  if (stream) Object.assign(common, { streamSettings: stream });
  security(node, common.streamSettings ?? (common.streamSettings = {}));
  if (common.streamSettings && Object.keys(common.streamSettings).length === 0) delete common.streamSettings;
  return common;
}
