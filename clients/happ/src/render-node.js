import { happNodeExclusionReason } from "../../../shared/nodes/capabilities.js";
import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";

function optional(target, key, value) {
  if (value !== undefined && value !== null && value !== "") target[key] = value;
}

function requiredTag(node, tag) {
  if (typeof tag !== "string" || tag.length === 0 || tag.trim() !== tag) {
    throw new Error("Happ outbound tag is invalid");
  }
  const credentials = [
    node.uuid,
    node.password,
    node.username,
    node["obfs-password"],
    node.obfs_password,
    node["reality-opts"]?.["public-key"],
    node["reality-opts"]?.["short-id"],
  ];
  if (tag.includes(node.name) || tag.includes(node.server)
    || credentials.some((value) => typeof value === "string" && value.length > 0 && tag.includes(value))) {
    throw new Error("Happ outbound tag must be opaque");
  }
  return tag;
}

function supportedNode(node) {
  const reason = happNodeExclusionReason(node);
  if (reason) throw new Error(`Happ node cannot be rendered: ${reason}`);
}

function requestedTls(node) {
  return node.tls === true || node.security === "tls" || node.security === "reality";
}

function tlsSettings(node) {
  const settings = {};
  optional(settings, "serverName", node.sni ?? node.servername);
  if (node.alpn !== undefined) settings.alpn = [...node.alpn];
  optional(settings, "fingerprint", node["client-fingerprint"]);
  if (node["skip-cert-verify"] === true || node["allow-insecure"] === true) settings.allowInsecure = true;
  return settings;
}

function realitySettings(node) {
  const reality = node["reality-opts"];
  if (!reality || typeof reality !== "object" || Array.isArray(reality)) {
    throw new Error("Happ REALITY options cannot be rendered");
  }
  if (node.alpn !== undefined || node["skip-cert-verify"] !== undefined || node["allow-insecure"] !== undefined
    || node["client-fingerprint"] === undefined) {
    throw new Error("Happ REALITY options cannot be rendered");
  }
  const settings = {
    // Xray's current client-side name for the server's REALITY public key.
    password: reality["public-key"],
    fingerprint: node["client-fingerprint"],
  };
  optional(settings, "serverName", node.sni ?? node.servername);
  optional(settings, "shortId", reality["short-id"]);
  optional(settings, "spiderX", reality["spider-x"]);
  return settings;
}

function transportSettings(node) {
  const network = String(node.network ?? "tcp").trim().toLowerCase();
  if (network === "tcp" || network === "raw") return { method: "raw", rawSettings: {} };
  if (network === "ws") {
    const options = node["ws-opts"];
    if (!options || typeof options !== "object" || Array.isArray(options)) {
      throw new Error("Happ WebSocket options cannot be rendered");
    }
    const wsSettings = { path: Array.isArray(options.path) ? options.path[0] : options.path };
    if (options.headers !== undefined) {
      wsSettings.headers = Object.fromEntries(Object.entries(options.headers)
        .map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
    }
    return { method: "websocket", wsSettings };
  }
  if (network === "grpc") {
    const options = node["grpc-opts"] ?? {};
    const grpcSettings = {};
    optional(grpcSettings, "serviceName", options["grpc-service-name"]);
    return { method: "grpc", grpcSettings };
  }
  throw new Error("Happ transport cannot be rendered");
}

function hysteriaStreamSettings(node) {
  const settings = {
    method: "hysteria",
    hysteriaSettings: { version: 2, auth: node.password },
    security: "tls",
    tlsSettings: tlsSettings(node),
  };
  if (node.obfs === "salamander") {
    settings.finalmask = {
      udp: [{ type: "salamander", settings: { password: node["obfs-password"] ?? node.obfs_password } }],
    };
  } else if (node.obfs !== undefined || node["obfs-password"] !== undefined || node.obfs_password !== undefined) {
    throw new Error("Happ Hysteria obfuscation cannot be rendered");
  }
  return settings;
}

export function renderHappStreamSettings(node) {
  supportedNode(node);
  if (normalizeProtocol(node.type) === "hysteria2") return hysteriaStreamSettings(node);

  const stream = transportSettings(node);
  if (node.security === "reality") {
    stream.security = "reality";
    stream.realitySettings = realitySettings(node);
  } else if (requestedTls(node)) {
    stream.security = "tls";
    stream.tlsSettings = tlsSettings(node);
  } else {
    stream.security = "none";
  }
  if (node.tfo === true) stream.sockopt = { tcpFastOpen: true };
  return stream;
}

function vnext(node, user) {
  return [{ address: node.server, port: node.port, users: [user] }];
}

function renderVless(node, tag) {
  const user = { id: node.uuid, encryption: node.encryption ?? "none" };
  optional(user, "flow", node.flow);
  return { tag, protocol: "vless", settings: { vnext: vnext(node, user) }, streamSettings: renderHappStreamSettings(node) };
}

function renderVmess(node, tag) {
  const user = {
    id: node.uuid,
    alterId: node["alter-id"] ?? node.alterId ?? 0,
    security: node.encryption ?? node.cipher ?? "auto",
  };
  return { tag, protocol: "vmess", settings: { vnext: vnext(node, user) }, streamSettings: renderHappStreamSettings(node) };
}

function renderTrojan(node, tag) {
  return {
    tag,
    protocol: "trojan",
    settings: { servers: [{ address: node.server, port: node.port, password: node.password }] },
    streamSettings: renderHappStreamSettings(node),
  };
}

function renderShadowsocks(node, tag) {
  if (node.udp === false) throw new Error("Happ Shadowsocks UDP disablement cannot be rendered");
  const server = { address: node.server, port: node.port, method: node.cipher, password: node.password };
  return { tag, protocol: "shadowsocks", settings: { servers: [server] }, streamSettings: renderHappStreamSettings(node) };
}

function renderSocks(node, tag) {
  const server = { address: node.server, port: node.port };
  if (node.username !== undefined || node.password !== undefined) {
    server.users = [{ user: node.username, pass: node.password }];
  }
  return { tag, protocol: "socks", settings: { servers: [server] }, streamSettings: renderHappStreamSettings(node) };
}

function renderHysteria(node, tag) {
  return {
    tag,
    protocol: "hysteria",
    settings: { version: 2, address: node.server, port: node.port },
    streamSettings: renderHappStreamSettings(node),
  };
}

export function renderHappOutbound(node, opaqueTag) {
  supportedNode(node);
  const tag = requiredTag(node, opaqueTag);
  switch (normalizeProtocol(node.type)) {
    case "vless": return renderVless(node, tag);
    case "vmess": return renderVmess(node, tag);
    case "trojan": return renderTrojan(node, tag);
    case "ss": return renderShadowsocks(node, tag);
    case "socks5": return renderSocks(node, tag);
    case "hysteria2": return renderHysteria(node, tag);
    default: throw new Error("Happ protocol cannot be rendered");
  }
}
