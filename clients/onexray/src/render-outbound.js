import { oneXrayNodeExclusionReason } from "../../../shared/nodes/capabilities.js";
import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";

const RESERVED_TAGS = new Set([
  "proxy", "chainProxy", "direct", "fragment", "block", "dnsOut", "tunIn", "pingIn",
]);

function optional(target, key, value) {
  if (value !== undefined && value !== null && value !== "") target[key] = value;
}

function supportedNode(node) {
  const reason = oneXrayNodeExclusionReason(node);
  if (reason) throw new Error(reason);
}

function requiredTag(node, { tag, tags } = {}) {
  if (typeof tag !== "string" || tag.length === 0 || tag.trim() !== tag || /[\r\n\u2028\u2029]/u.test(tag)) {
    throw new Error("invalid-onexray-tag");
  }
  if (RESERVED_TAGS.has(tag)) throw new Error("reserved-onexray-tag");
  if (tag.includes(node.name)) throw new Error("duplicate-onexray-tag");
  if (tags !== undefined) {
    if (!(tags instanceof Set)) throw new TypeError("OneXray tags must be a Set");
    if (tags.has(tag)) throw new Error("duplicate-onexray-tag");
    tags.add(tag);
  }
  return tag;
}

function tlsSettings(node) {
  if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) {
    throw new Error("unsupported-onexray-certificate-bypass");
  }
  const settings = {};
  optional(settings, "serverName", node.sni ?? node.servername);
  if (node.alpn !== undefined) settings.alpn = [...node.alpn];
  optional(settings, "fingerprint", node["client-fingerprint"]);
  return settings;
}

function realitySettings(node) {
  const reality = node["reality-opts"];
  if (!reality || typeof reality !== "object" || Array.isArray(reality)) {
    throw new Error("incomplete-onexray-reality");
  }
  const settings = {
    fingerprint: node["client-fingerprint"],
    publicKey: reality["public-key"],
  };
  optional(settings, "serverName", node.sni ?? node.servername);
  optional(settings, "shortId", reality["short-id"]);
  optional(settings, "spiderX", reality["spider-x"]);
  return settings;
}

function transportSettings(node) {
  const network = String(node.network ?? "tcp").trim().toLowerCase();
  if (network === "tcp" || network === "raw") return { network: "raw", rawSettings: {} };
  if (network === "ws") {
    const options = node["ws-opts"] ?? {};
    const wsSettings = {};
    optional(wsSettings, "path", options.path);
    optional(wsSettings, "host", options.headers?.Host ?? options.headers?.host);
    return { network: "ws", wsSettings };
  }
  if (network === "grpc") {
    const grpcSettings = {};
    optional(grpcSettings, "serviceName", node["grpc-opts"]?.["grpc-service-name"]);
    return { network: "grpc", grpcSettings };
  }
  if (network === "httpupgrade") {
    const options = node["httpupgrade-opts"] ?? {};
    const httpupgradeSettings = {};
    optional(httpupgradeSettings, "host", options.host);
    optional(httpupgradeSettings, "path", options.path);
    return { network: "httpupgrade", httpupgradeSettings };
  }
  if (network === "xhttp") {
    const options = node["xhttp-opts"] ?? {};
    const xhttpSettings = {};
    optional(xhttpSettings, "host", options.host);
    optional(xhttpSettings, "path", options.path);
    optional(xhttpSettings, "mode", options.mode);
    return { network: "xhttp", xhttpSettings };
  }
  if (network === "kcp") return { network: "kcp", kcpSettings: {} };
  throw new Error("unsupported-onexray-transport");
}

function streamSettings(node) {
  if (normalizeProtocol(node.type) === "hysteria2") {
    return {
      network: "hysteria",
      hysteriaSettings: { version: 2, auth: node.password },
      security: "tls",
      tlsSettings: tlsSettings(node),
    };
  }

  const stream = transportSettings(node);
  if (node.security === "reality") {
    stream.security = "reality";
    stream.realitySettings = realitySettings(node);
  } else if (node.tls === true || node.security === "tls") {
    stream.security = "tls";
    stream.tlsSettings = tlsSettings(node);
  } else {
    stream.security = "none";
  }
  return stream;
}

function endpoint(node) {
  return { address: node.server, port: node.port };
}

function renderVlessSettings(node) {
  const settings = { ...endpoint(node), id: node.uuid, encryption: node.encryption ?? "none" };
  optional(settings, "flow", node.flow);
  if (node.reverse !== undefined) settings.reverse = { tag: node.reverse.tag };
  return settings;
}

function renderVmessSettings(node) {
  return { ...endpoint(node), id: node.uuid, security: node.security ?? node.cipher ?? "auto" };
}

function renderShadowsocksSettings(node) {
  return { ...endpoint(node), method: node.cipher, password: node.password };
}

function renderTrojanSettings(node) {
  return { ...endpoint(node), password: node.password };
}

function renderSocksSettings(node) {
  const settings = endpoint(node);
  optional(settings, "user", node.username);
  optional(settings, "pass", node.password);
  return settings;
}

function renderHttpSettings(node) {
  const settings = renderSocksSettings(node);
  if (node.headers !== undefined) settings.headers = { ...node.headers };
  return settings;
}

function renderHysteriaSettings(node) {
  return { version: 2, ...endpoint(node) };
}

function protocolSettings(node) {
  switch (normalizeProtocol(node.type)) {
    case "vless": return ["vless", renderVlessSettings(node)];
    case "vmess": return ["vmess", renderVmessSettings(node)];
    case "ss": return ["shadowsocks", renderShadowsocksSettings(node)];
    case "trojan": return ["trojan", renderTrojanSettings(node)];
    case "socks5": return ["socks", renderSocksSettings(node)];
    case "http": return ["http", renderHttpSettings(node)];
    case "hysteria2": return ["hysteria", renderHysteriaSettings(node)];
    default: throw new Error("unsupported-onexray-protocol");
  }
}

export function renderOneXrayOutbound(node, options) {
  supportedNode(node);
  const tag = requiredTag(node, options);
  const [protocol, settings] = protocolSettings(node);
  return {
    name: node.name,
    protocol,
    settings,
    tag,
    streamSettings: streamSettings(node),
    mux: { enabled: false },
  };
}
