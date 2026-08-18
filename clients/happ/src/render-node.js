const SUPPORTED = new Set(["vless", "vmess", "trojan", "ss", "shadowsocks", "socks5", "hysteria2", "hy2"]);
const TRANSPORTS = new Set(["tcp", "raw", "ws", "grpc", "h2", "http2"]);
const has = (o, k) => Object.hasOwn(o, k);
const first = (o, keys) => keys.find((k) => has(o, k)) === undefined ? undefined : o[keys.find((k) => has(o, k))];
const required = (v, label) => { if (typeof v !== "string" || !v) throw new Error(`Happ node ${label} is required`); return v; };
const port = (v) => { const n = Number(v); if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error("Happ node port is invalid"); return n; };

function tlsSettings(node) {
  const security = String(node.security ?? (node.tls ? "tls" : "none")).toLowerCase();
  if (security === "none") return undefined;
  if (security !== "tls" && security !== "reality") throw new Error("Unsupported Happ TLS security");
  const settings = {};
  const serverName = first(node, ["sni", "servername"]);
  if (serverName !== undefined) settings.serverName = required(serverName, "SNI");
  if (node["skip-cert-verify"] !== undefined) settings.allowInsecure = node["skip-cert-verify"] === true;
  else if (node["allow-insecure"] !== undefined) settings.allowInsecure = node["allow-insecure"] === true;
  if (node.alpn !== undefined) settings.alpn = Array.isArray(node.alpn) ? [...node.alpn] : [node.alpn];
  if (node["client-fingerprint"] !== undefined || node.fingerprint !== undefined) settings.fingerprint = node["client-fingerprint"] ?? node.fingerprint;
  if (security === "reality") {
    const reality = node["reality-opts"] ?? node.reality ?? {};
    const publicKey = reality["public-key"] ?? reality.publicKey;
    if (!publicKey) throw new Error("Happ REALITY public key is required");
    settings.realitySettings = { publicKey, ...(reality["short-id"] || reality.shortId ? { shortId: reality["short-id"] ?? reality.shortId } : {}), ...(reality["spider-x"] || reality.spiderX || reality["_spider-x"] ? { spiderX: reality["spider-x"] ?? reality.spiderX ?? reality["_spider-x"] } : {}) };
  }
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
    stream.wsSettings = { path: opts.path ?? "/", ...(opts.headers ? { headers: { ...opts.headers } } : {}), ...(opts.maxEarlyData ? { maxEarlyData: opts.maxEarlyData } : {}) };
  } else if (network === "grpc") {
    const opts = node["grpc-opts"] ?? {};
    stream.grpcSettings = { serviceName: opts["grpc-service-name"] ?? opts.serviceName ?? "", ...(opts["grpc-mode"] || opts.mode ? { multiMode: (opts["grpc-mode"] ?? opts.mode) === "multi" } : {}) };
  } else if (network === "h2" || network === "http2") {
    const opts = node["h2-opts"] ?? node["http-opts"] ?? {};
    stream.httpSettings = { path: opts.path ?? "/", ...(opts.host ? { host: Array.isArray(opts.host) ? opts.host : [opts.host] } : {}) };
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
  const user = { id: required(node.uuid, "UUID"), alterId: Number(node.alterId ?? node["alter-id"] ?? 0), security: node.cipher ?? node.security ?? "auto" };
  return { protocol: "vmess", settings: { vnext: [{ ...common(node), users: [user] }] }, ...(streamSettings(node) ? { streamSettings: streamSettings(node) } : {}) };
}
function renderTrojan(node) {
  const server = { ...common(node), password: required(node.password, "password") };
  if (node.flow !== undefined) server.flow = node.flow;
  return { protocol: "trojan", settings: { servers: [server] }, ...(streamSettings(node) ? { streamSettings: streamSettings(node) } : {}) };
}
function renderShadowsocks(node) {
  const server = { ...common(node), method: required(node.cipher ?? node.method, "method"), password: required(node.password, "password") };
  if (node.udp !== undefined) server.ota = node.udp === true;
  return { protocol: "shadowsocks", settings: { servers: [server] }, ...(streamSettings(node) ? { streamSettings: streamSettings(node) } : {}) };
}
function renderSocks(node) {
  const server = { ...common(node) };
  if (node.username !== undefined || node.password !== undefined) server.users = [{ user: node.username ?? "", pass: node.password ?? "" }];
  return { protocol: "socks", settings: { servers: [server] } };
}
function renderHysteria2(node) {
  const tls = tlsSettings(node);
  if (!tls || !tls.serverName && !tls.realitySettings) throw new Error("Happ Hysteria2 requires TLS");
  const server = { ...common(node), ...(node.password !== undefined ? { auth: node.password } : {}) };
  const stream = { network: "hysteria", method: "hysteria", ...(tls.realitySettings ? { security: "reality", realitySettings: tls.realitySettings } : { security: "tls", tlsSettings: tls }), ...(node.obfs ? { hysteriaSettings: { obfs: node.obfs, ...(node["obfs-password"] ? { obfsPassword: node["obfs-password"] } : {}) } } : {}) };
  return { protocol: "hysteria", settings: { version: 2, ...server }, streamSettings: stream };
}

export function renderHappStreamSettings(node) { return streamSettings(node); }
export function renderHappOutbound(node, tag) {
  if (!node || typeof node !== "object") throw new TypeError("Happ node must be an object");
  const type = String(node.type ?? "").toLowerCase();
  if (!SUPPORTED.has(type)) throw new Error(`Unsupported Happ protocol '${type}'`);
  if (typeof tag !== "string" || !/^happ-[a-z0-9/_-]+$/u.test(tag)) throw new Error("Happ outbound tag must be opaque");
  const output = type === "vless" ? renderVless(node) : type === "vmess" ? renderVmess(node) : type === "trojan" ? renderTrojan(node) : type === "ss" || type === "shadowsocks" ? renderShadowsocks(node) : type === "socks5" ? renderSocks(node) : renderHysteria2(node);
  return Object.freeze({ tag, ...output });
}
