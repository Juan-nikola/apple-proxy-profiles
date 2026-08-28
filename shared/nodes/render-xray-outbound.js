import { normalizeProtocol, protocolSupportsClient } from "../nodes/protocol-registry.js";

const TAG = /^ap-[a-z0-9][a-z0-9/_-]{0,127}$/u;
const label = (client) => String(client ?? "Xray");
function required(node, key, client) { const value = node[key]; if (typeof value !== "string" || !value || value.trim() !== value) throw new Error(`${label(client)} node field '${key}' is invalid`); return value; }
function port(node, client) { const value = Number(node.port); if (!Number.isInteger(value) || value < 1 || value > 65535) throw new Error(`${label(client)} node port is invalid`); return value; }
function transport(node, client) {
  const network = String(node.network ?? "tcp").trim().toLowerCase();
  if (["tcp", "raw"].includes(network)) return network === "raw" ? { network: "raw", rawSettings: {} } : undefined;
  if (network === "ws") { const source = node["ws-opts"] ?? {}; return { network: "ws", wsSettings: { path: Array.isArray(source.path) ? source.path[0] : source.path ?? "/", ...(source.headers ? { headers: { ...source.headers } } : {}) } }; }
  if (network === "grpc") { const source = node["grpc-opts"] ?? {}; return { network: "grpc", grpcSettings: { serviceName: source["grpc-service-name"] ?? source.service_name ?? "" } }; }
  if (["h2", "http2", "http"].includes(network)) { const source = node["h2-opts"] ?? node["http-opts"] ?? {}; return { network: "http", httpSettings: { path: Array.isArray(source.path) ? source.path[0] : source.path ?? "/", ...(source.host ? { host: Array.isArray(source.host) ? source.host : [source.host] } : {}) } }; }
  if (network === "httpupgrade") { const source = node["httpupgrade-opts"] ?? {}; return { network, httpupgradeSettings: { path: source.path ?? "/", ...(source.host ? { host: source.host } : {}) } }; }
  if (network === "xhttp") { const source = node["xhttp-opts"] ?? {}; return { network, xhttpSettings: { path: source.path ?? "/", ...(source.mode ? { mode: source.mode } : {}) } }; }
  if (["kcp", "mkcp"].includes(network)) return { network: "kcp", kcpSettings: { ...(node["kcp-opts"] ?? {}) } };
  if (network === "hysteria") return { network, hysteriaSettings: { ...(node["hysteria-opts"] ?? {}) } };
  throw new Error(`unsupported-${client}-transport`);
}
function security(node, result, client) { const reality = node["reality-opts"]; const name = node.security === "reality" || reality ? "reality" : node.tls === true || node.security === "tls" ? "tls" : "none"; if (name === "none") return; result.security = name; if (name === "reality") { if (!reality || typeof reality["public-key"] !== "string" || !reality["public-key"]) throw new Error(`incomplete-${client}-reality`); result.realitySettings = { serverName: node.sni ?? node.servername ?? "", fingerprint: node["client-fingerprint"] ?? "chrome", publicKey: reality["public-key"], ...(reality["short-id"] ? { shortId: reality["short-id"] } : {}), ...(reality["spider-x"] || reality["_spider-x"] ? { spiderX: reality["spider-x"] ?? reality["_spider-x"] } : {}) }; } else result.tlsSettings = { serverName: node.sni ?? node.servername ?? "", allowInsecure: node["skip-cert-verify"] === true || node["allow-insecure"] === true, ...(node.alpn ? { alpn: [...node.alpn] } : {}), ...(node["client-fingerprint"] ? { fingerprint: node["client-fingerprint"] } : {}) }; }
export function renderXrayOutbound(node, { tag, client = "v2box" } = {}) {
  if (!node || typeof node !== "object" || Array.isArray(node)) throw new TypeError(`${label(client)} node is invalid`);
  if (typeof node.name !== "string" || !node.name || /[\r\n]/u.test(node.name)) throw new Error(`${label(client)} node name is invalid`);
  if (typeof tag !== "string" || !TAG.test(tag)) throw new Error(`${label(client)} outbound tag is invalid`);
  const protocol = normalizeProtocol(node.type); if (!protocolSupportsClient(protocol, client)) throw new Error(`unsupported-${client}-protocol`);
  const out = { name: node.name, protocol, tag, settings: {} }; const server = { address: required(node, "server", client), port: port(node, client) };
  if (protocol === "vless") out.settings.vnext = [{ ...server, users: [{ id: required(node, "uuid", client), encryption: node.encryption ?? "none", ...(node.flow ? { flow: node.flow } : {}) }] }];
  else if (protocol === "vmess") out.settings.vnext = [{ ...server, users: [{ id: required(node, "uuid", client), alterId: Number(node["alter-id"] ?? node.alterId ?? 0), security: node.security ?? node.cipher ?? "auto" }] }];
  else if (["ss", "shadowsocks"].includes(protocol)) { out.protocol = "shadowsocks"; out.settings.servers = [{ ...server, method: required(node, "cipher", client), password: required(node, "password", client) }]; }
  else if (protocol === "trojan") out.settings.servers = [{ ...server, password: required(node, "password", client), ...(node.flow ? { flow: node.flow } : {}) }];
  else if (protocol === "socks5") { out.protocol = "socks"; out.settings.servers = [{ ...server, ...(node.username ? { users: [{ user: node.username, pass: node.password ?? "" }] } : {}) }]; }
  else if (protocol === "http") out.settings.servers = [{ ...server, ...(node.username ? { users: [{ user: node.username, pass: node.password ?? "" }] } : {}), ...(node["http-opts"] ? { headers: node["http-opts"].headers ?? {} } : {}) }];
  else if (["hysteria2", "hy2"].includes(protocol)) { out.protocol = "hysteria"; out.settings = { version: 2, ...server, ...(node.password ? { auth: node.password } : {}) }; }
  else throw new Error(`unsupported-${client}-protocol`);
  const stream = transport(node, client); if (stream) out.streamSettings = stream; security(node, out.streamSettings ?? (out.streamSettings = {}), client); if (out.streamSettings && Object.keys(out.streamSettings).length === 0) delete out.streamSettings; return out;
}
export function renderXraySubscription({ nodes, client = "v2box" } = {}) { if (!Array.isArray(nodes) || nodes.length === 0) throw new Error(`${label(client)} subscription cannot be empty`); const names = new Set(); const outbounds = nodes.map((node, index) => { if (names.has(node.name)) throw new Error(`${label(client)} subscription contains duplicate node names`); names.add(node.name); return { ...renderXrayOutbound(node, { tag: `ap-node-${index.toString(36)}`, client }), tag: node.name }; }); return `${JSON.stringify({ outbounds })}\n`; }
export function renderXrayNodeError(error, client = "v2box") { const reason = error?.message?.match(/^unsupported-[a-z0-9-]+/u)?.[0] ?? `render-failure-${client}`; return Object.freeze({ client, excluded: Object.freeze({ [reason]: 1 }) }); }
