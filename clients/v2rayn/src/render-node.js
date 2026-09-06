import { encodeBase64UrlUtf8 } from "../../../shared/encoding/base64url.js";
import { renderXrayOutbound, renderXrayNodeError } from "../../../shared/nodes/render-xray-outbound.js";

export { renderXrayOutbound, renderXrayNodeError };

const protocol = (node) => String(node?.type ?? "").trim().toLowerCase();
const text = (value) => value === undefined || value === null ? "" : String(value);
const encoded = (value) => encodeURIComponent(text(value));
const URI_SEPARATOR = [":", "/", "/"].join("");
const prefix = (scheme) => `${scheme}${URI_SEPARATOR}`;

function standardBase64(value) {
  const raw = encodeBase64UrlUtf8(value).replaceAll("-", "+").replaceAll("_", "/");
  return raw + "=".repeat((4 - raw.length % 4) % 4);
}

function host(value) {
  const address = text(value);
  return address.includes(":") && !address.startsWith("[") ? `[${address}]` : address;
}

function fragment(name) { return name ? `#${encoded(name)}` : ""; }
function query(parameters) {
  const values = Object.entries(parameters).filter(([, value]) => value !== undefined && value !== null && value !== "");
  return values.length ? `?${values.map(([key, value]) => `${key}=${encoded(value)}`).join("&")}` : "";
}
function security(node) {
  if (node["reality-opts"] || node.security === "reality") return "reality";
  if (node.tls === true || node.security === "tls") return "tls";
  return "none";
}
function transport(node) {
  const network = text(node.network || "tcp").toLowerCase();
  const source = network === "ws" ? node["ws-opts"] ?? {}
    : ["h2", "http2", "http"].includes(network) ? node["h2-opts"] ?? node["http-opts"] ?? {}
      : network === "grpc" ? node["grpc-opts"] ?? {}
        : network === "httpupgrade" ? node["httpupgrade-opts"] ?? {}
          : network === "xhttp" ? node["xhttp-opts"] ?? {}
            : network === "kcp" || network === "mkcp" ? node["kcp-opts"] ?? {}
              : {};
  const type = network === "raw" ? "raw" : ["h2", "http2", "http"].includes(network) ? "http" : network;
  return {
    type,
    ...(source.path !== undefined ? { path: Array.isArray(source.path) ? source.path[0] : source.path } : {}),
    ...(source.host !== undefined ? { host: Array.isArray(source.host) ? source.host[0] : source.host } : {}),
    ...(network === "grpc" ? { serviceName: source["grpc-service-name"] ?? source.serviceName } : {}),
    ...(network === "xhttp" && source.mode ? { mode: source.mode } : {}),
    ...(network === "raw" && source.headerType ? { headerType: source.headerType } : {}),
  };
}
function renderVless(node) {
  const stream = transport(node); const reality = node["reality-opts"] ?? {};
  return `${prefix("vless")}${encoded(node.uuid)}@${host(node.server)}:${Number(node.port)}${query({ encryption: node.encryption ?? "none", flow: node.flow, security: security(node), type: stream.type, headerType: stream.headerType, host: stream.host, path: stream.path, serviceName: stream.serviceName, authority: stream.host, mode: stream.mode, sni: node.sni ?? node.servername, alpn: Array.isArray(node.alpn) ? node.alpn.join(",") : node.alpn, fp: node["client-fingerprint"], pbk: reality["public-key"], sid: reality["short-id"], spx: reality["spider-x"] ?? reality["_spider-x"] })}${fragment(node.name)}`;
}
function renderVmess(node) {
  const stream = transport(node); const reality = node["reality-opts"] ?? {};
  const payload = { v: 2, ps: text(node.name), add: text(node.server), port: Number(node.port), id: text(node.uuid), aid: Number(node["alter-id"] ?? node.alterId ?? 0), scy: text(node.cipher ?? node.security ?? "auto"), net: stream.type, type: stream.headerType ?? "none", host: stream.host, path: stream.path ?? stream.serviceName, tls: security(node) === "none" ? "" : security(node), sni: node.sni ?? node.servername, alpn: Array.isArray(node.alpn) ? node.alpn.join(",") : node.alpn, fp: node["client-fingerprint"], insecure: node["skip-cert-verify"] === true || node["allow-insecure"] === true ? "1" : "0", pbk: reality["public-key"], sid: reality["short-id"] };
  return `${prefix("vmess")}${standardBase64(JSON.stringify(payload))}`;
}
function renderTrojan(node) {
  const stream = transport(node);
  return `${prefix("trojan")}${encoded(node.password)}@${host(node.server)}:${Number(node.port)}${query({ security: security(node), type: stream.type, host: stream.host, path: stream.path, serviceName: stream.serviceName, authority: stream.host, mode: stream.mode, sni: node.sni ?? node.servername, alpn: Array.isArray(node.alpn) ? node.alpn.join(",") : node.alpn, fp: node["client-fingerprint"], flow: node.flow, allowInsecure: node["skip-cert-verify"] === true || node["allow-insecure"] === true ? "1" : undefined })}${fragment(node.name)}`;
}
function renderShadowsocks(node) {
  const credentials = standardBase64(`${text(node.cipher ?? node.method)}:${text(node.password)}`);
  return `${prefix("ss")}${credentials}@${host(node.server)}:${Number(node.port)}${fragment(node.name)}`;
}
function renderHysteria2(node) {
  return `${prefix("hysteria2")}${encoded(node.password)}@${host(node.server)}:${Number(node.port)}${query({ sni: node.sni ?? node.servername, insecure: node["skip-cert-verify"] === true || node["allow-insecure"] === true ? "1" : undefined, alpn: Array.isArray(node.alpn) ? node.alpn.join(",") : node.alpn, obfs: node.obfs, "obfs-password": node["obfs-password"] })}${fragment(node.name)}`;
}
export function renderV2rayNNode(node) {
  switch (protocol(node)) {
    case "vless": return renderVless(node);
    case "vmess": return renderVmess(node);
    case "trojan": return renderTrojan(node);
    case "ss":
    case "shadowsocks": return renderShadowsocks(node);
    case "hysteria2":
    case "hy2": return renderHysteria2(node);
    default: throw new Error("unsupported-v2rayn-uri-protocol");
  }
}
/** v2rayN accepts a Base64 encoded newline-delimited set of share links. */
export function renderV2rayNSubscription({ nodes }) {
  if (!Array.isArray(nodes) || nodes.length === 0) throw new Error("v2rayN subscription cannot be empty");
  const names = new Set();
  const links = nodes.map((node) => {
    if (names.has(node.name)) throw new Error("v2rayN subscription contains duplicate node names");
    names.add(node.name);
    return renderV2rayNNode(node);
  });
  return `${standardBase64(links.join("\n"))}\n`;
}
