const SUPPORTED = new Set(["vless", "vmess", "trojan", "ss", "shadowsocks", "socks5", "hysteria2", "hy2"]);
const TRANSPORTS = new Set(["tcp", "raw", "ws", "grpc"]);
const VMESS_SECURITY = new Set(["auto", "aes-128-gcm", "chacha20-poly1305", "none", "zero"]);
const has = (o, k) => Object.hasOwn(o, k);
const first = (o, keys) => keys.find((k) => has(o, k)) === undefined ? undefined : o[keys.find((k) => has(o, k))];
const required = (v, label) => { if (typeof v !== "string" || !v) throw new Error(`Happ node ${label} is required`); return v; };
const port = (v) => { const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error("Happ node port is invalid"); return n; };
function isIpAddress(value) {
  const text = String(value ?? "");
  if (text.includes(":")) return true;
  const parts = text.split(".");
  return parts.length === 4 && parts.every((part) => /^\d+$/u.test(part) && Number(part) <= 255);
}

function tlsSettings(node, { defaultServerName = false } = {}) {
  const reality = node["reality-opts"];
  const vmessCipherSecurity = String(node.type ?? "").toLowerCase() === "vmess"
    && typeof node.security === "string"
    && VMESS_SECURITY.has(node.security.toLowerCase());
  const security = String(vmessCipherSecurity
    ? (reality ? "reality" : (node.tls ? "tls" : "none"))
    : (node.security ?? (reality ? "reality" : (node.tls ? "tls" : "none")))).toLowerCase();
  if (security === "none") return undefined;
  if (security !== "tls" && security !== "reality") throw new Error("Unsupported Happ TLS security");
  if (security !== "reality" && reality !== undefined) throw new Error("Happ TLS conflicts with Reality options");
  const settings = {};
  const serverName = first(node, ["sni", "servername"]);
  if (serverName !== undefined) settings.serverName = required(serverName, "SNI");
  else if (defaultServerName && !isIpAddress(node.server)) settings.serverName = required(node.server, "server");
  if (security === "reality") {
    const realitySettings = {};
    if (settings.serverName !== undefined) realitySettings.serverName = settings.serverName;
    const fingerprint = node["client-fingerprint"] ?? node.fingerprint;
    if (fingerprint !== undefined) realitySettings.fingerprint = fingerprint;
    const realityOptions = reality ?? {};
    const publicKey = realityOptions["public-key"] ?? realityOptions.publicKey;
    if (!publicKey) throw new Error("Happ REALITY public key is required");
    settings.realitySettings = { ...realitySettings, publicKey, ...(realityOptions["short-id"] || realityOptions.shortId ? { shortId: realityOptions["short-id"] ?? realityOptions.shortId } : {}), ...(realityOptions["spider-x"] || realityOptions.spiderX || realityOptions["_spider-x"] ? { spiderX: realityOptions["spider-x"] ?? realityOptions.spiderX ?? realityOptions["_spider-x"] } : {}) };
    return settings;
  }
  if (node["skip-cert-verify"] !== undefined) settings.allowInsecure = node["skip-cert-verify"] === true;
  else if (node["allow-insecure"] !== undefined) settings.allowInsecure = node["allow-insecure"] === true;
  if (node.alpn !== undefined) settings.alpn = Array.isArray(node.alpn) ? [...node.alpn] : [node.alpn];
  if (node["client-fingerprint"] !== undefined || node.fingerprint !== undefined) settings.fingerprint = node["client-fingerprint"] ?? node.fingerprint;
  return settings;
}

function streamSettings(node) {
  const network = String(node.network ?? node._network ?? "tcp").toLowerCase();
  if (!TRANSPORTS.has(network)) throw new Error(`Unsupported Happ transport '${network}'`);
  const stream = { network: network === "raw" ? "tcp" : network };
  const tls = tlsSettings(node);
  if (tls) {
    if (tls.realitySettings) { stream.security = "reality"; stream.realitySettings = tls.realitySettings; delete tls.realitySettings; }
    else { stream.security = "tls"; stream.tlsSettings = tls; }
  }
  if (network === "ws") {
    const opts = node["ws-opts"] ?? {};
    const path = Array.isArray(opts.path) ? opts.path[0] : opts.path ?? "/";
    const earlyData = opts["max-early-data"] ?? opts.maxEarlyData;
    const earlyDataHeader = opts["early-data-header-name"];
    if (earlyDataHeader !== undefined && String(earlyDataHeader).toLowerCase() !== "sec-websocket-protocol") {
      throw new Error("Happ WebSocket early-data header is unsupported");
    }
    let wsPath = path;
    if (earlyData !== undefined) {
      if (!Number.isInteger(earlyData) || earlyData < 0) throw new Error("Happ WebSocket max early data is invalid");
      if (earlyData > 0) {
        const separator = String(wsPath).includes("?") ? (String(wsPath).endsWith("?") || String(wsPath).endsWith("&") ? "" : "&") : "?";
        wsPath = `${wsPath}${separator}ed=${earlyData}`;
      }
    }
    const headers = opts.headers ? { ...opts.headers } : undefined;
    const host = headers?.Host ?? headers?.host;
    if (headers) {
      delete headers.Host;
      delete headers.host;
    }
    stream.wsSettings = {
      path: wsPath,
      ...(host !== undefined ? { host: Array.isArray(host) ? host[0] : host } : {}),
      ...(headers && Object.keys(headers).length > 0 ? { headers } : {}),
    };
  } else if (network === "grpc") {
    const opts = node["grpc-opts"] ?? {};
    stream.grpcSettings = {
      serviceName: opts["grpc-service-name"] ?? opts.serviceName ?? "",
      ...(opts["grpc-mode"] || opts.mode ? { multiMode: (opts["grpc-mode"] ?? opts.mode) === "multi" } : {}),
      ...(opts.authority ? { authority: opts.authority } : {}),
      ...(opts["user-agent"] ? { user_agent: opts["user-agent"] } : {}),
    };
  }
  return Object.keys(stream).length > 1 ? stream : undefined;
}

function common(node) { return { address: required(node.server, "server"), port: port(node.port) }; }

function renderVless(node) {
  const user = { id: required(node.uuid, "UUID"), encryption: node.encryption ?? "none" };
  if (node.flow !== undefined) user.flow = node.flow;
  return { protocol: "vless", settings: { vnext: [{ ...common(node), users: [user] }] }, ...(streamSettings(node) ? { streamSettings: streamSettings(node) } : {}) };
}
function renderVmess(node) {
  const cipher = node.cipher ?? (VMESS_SECURITY.has(String(node.security ?? "").toLowerCase()) ? String(node.security).toLowerCase() : "auto");
  if (!VMESS_SECURITY.has(String(cipher).toLowerCase())) throw new Error("Unsupported Happ VMess security");
  const user = { id: required(node.uuid, "UUID"), alterId: Number(node.alterId ?? node["alter-id"] ?? 0), security: String(cipher).toLowerCase() };
  return { protocol: "vmess", settings: { vnext: [{ ...common(node), users: [user] }] }, ...(streamSettings(node) ? { streamSettings: streamSettings(node) } : {}) };
}
function renderTrojan(node) {
  const server = { ...common(node), password: required(node.password, "password") };
  if (node.flow !== undefined) server.flow = node.flow;
  return { protocol: "trojan", settings: { servers: [server] }, ...(streamSettings(node) ? { streamSettings: streamSettings(node) } : {}) };
}
function renderShadowsocks(node) {
  const server = { ...common(node), method: required(node.cipher ?? node.method, "method"), password: required(node.password, "password") };
  return { protocol: "shadowsocks", settings: { servers: [server] }, ...(streamSettings(node) ? { streamSettings: streamSettings(node) } : {}) };
}
function renderSocks(node) {
  const server = { ...common(node) };
  if (node.username !== undefined || node.password !== undefined) server.users = [{ user: node.username ?? "", pass: node.password ?? "" }];
  return { protocol: "socks", settings: { servers: [server] } };
}
function hysteriaSettings(node) {
  const settings = { version: 2, ...(node.password !== undefined ? { auth: required(node.password, "password") } : {}) };
  if (node.up !== undefined) settings.up = String(node.up);
  if (node.down !== undefined) settings.down = String(node.down);
  const ports = node["port-hopping"] ?? node.port_hopping ?? node.ports;
  const interval = node["port-hopping-interval"] ?? node.port_hopping_interval ?? node["hop-interval"];
  if (ports !== undefined) {
    settings.udphop = { port: ports, ...(interval !== undefined ? { interval: Number(interval) } : {}) };
  }
  return settings;
}

function hysteriaMasks(node) {
  const obfs = node.obfs === undefined ? undefined : String(node.obfs).toLowerCase();
  const obfsPassword = node["obfs-password"] ?? node.obfs_password;
  if (obfs === undefined) {
    if (obfsPassword !== undefined) throw new Error("Happ Hysteria2 obfs password requires salamander obfs");
    return undefined;
  }
  if (obfs !== "salamander" || typeof obfsPassword !== "string" || obfsPassword.length === 0) {
    throw new Error("Happ Hysteria2 supports only salamander obfs with a password");
  }
  return [{ type: "salamander", settings: { password: obfsPassword } }];
}

function hysteriaStreamSettings(node) {
  const tls = tlsSettings(node, { defaultServerName: true });
  if (!tls || !tls.serverName && !tls.realitySettings) throw new Error("Happ Hysteria2 requires TLS");
  return {
    network: "hysteria",
    ...(tls.realitySettings ? { security: "reality", realitySettings: tls.realitySettings } : { security: "tls", tlsSettings: tls }),
    hysteriaSettings: hysteriaSettings(node),
    ...(hysteriaMasks(node) ? { udpmasks: hysteriaMasks(node) } : {}),
  };
}

function renderHysteria2(node) {
  return { protocol: "hysteria", settings: { version: 2, ...common(node) }, streamSettings: hysteriaStreamSettings(node) };
}

export function renderHappStreamSettings(node) {
  const type = String(node?.type ?? "").toLowerCase();
  if (type === "hysteria2" || type === "hy2") {
    return hysteriaStreamSettings(node);
  }
  return streamSettings(node);
}
export function renderHappOutbound(node, tag) {
  if (!node || typeof node !== "object") throw new TypeError("Happ node must be an object");
  const type = String(node.type ?? "").toLowerCase();
  if (!SUPPORTED.has(type)) throw new Error(`Unsupported Happ protocol '${type}'`);
  if (typeof tag !== "string" || !/^happ-[a-z0-9/_-]+$/u.test(tag)) throw new Error("Happ outbound tag must be opaque");
  const output = type === "vless" ? renderVless(node) : type === "vmess" ? renderVmess(node) : type === "trojan" ? renderTrojan(node) : type === "ss" || type === "shadowsocks" ? renderShadowsocks(node) : type === "socks5" ? renderSocks(node) : renderHysteria2(node);
  return Object.freeze({ tag, ...output });
}
