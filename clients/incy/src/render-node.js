import { renderXrayOutbound } from "../../../shared/nodes/render-xray-outbound.js";
import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";

const TAG_PATTERN = /^ap-incy-[a-z0-9/_-]{1,120}$/u;
const FORBIDDEN_RAW_KEYS = new Set([
  "inbounds",
  "routing",
  "dns",
  "api",
  "policy",
  "stats",
  "observatory",
  "reverse",
  "transport",
  "__proto__",
  "constructor",
  "prototype",
]);

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function clonePlainValue(value, path = "value", seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) throw new Error(`INCY raw outbound contains a circular ${path}`);
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item, index) => clonePlainValue(item, `${path}[${index}]`, seen));
  }
  if (!isPlainObject(value)) {
    throw new TypeError("INCY raw outbound must be a plain object");
  }
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_RAW_KEYS.has(key)) {
      throw new Error(`INCY raw outbound contains forbidden key '${key}'`);
    }
    output[key] = clonePlainValue(child, `${path}.${key}`, seen);
  }
  return output;
}

function rawSource(node) {
  return node?._incy?.xrayOutbound ?? node?.xrayOutbound ?? null;
}

function requiredTag(tag) {
  if (typeof tag !== "string" || !TAG_PATTERN.test(tag)) {
    throw new Error("INCY outbound tag is invalid");
  }
  return tag;
}

function validateRequiredFields(node) {
  const protocol = normalizeProtocol(node?.type);
  switch (protocol) {
    case "vless":
    case "vmess":
      if (typeof node?.uuid !== "string" || node.uuid.length === 0 || node.uuid.trim() !== node.uuid) {
        throw new Error("INCY node field 'uuid' is invalid");
      }
      break;
    case "trojan":
    case "hy2":
    case "hysteria2":
      if (typeof node?.password !== "string" || node.password.length === 0 || node.password.trim() !== node.password) {
        throw new Error("INCY node field 'password' is invalid");
      }
      break;
    case "ss":
    case "shadowsocks":
      if (typeof node?.cipher !== "string" || node.cipher.length === 0 || node.cipher.trim() !== node.cipher) {
        throw new Error("INCY node field 'cipher' is invalid");
      }
      if (typeof node?.password !== "string" || node.password.length === 0 || node.password.trim() !== node.password) {
        throw new Error("INCY node field 'password' is invalid");
      }
      break;
    default:
      break;
  }
}

function validateRawOutboundShape(raw) {
  if (!isPlainObject(raw)) throw new TypeError("INCY raw outbound must be a plain object");
  requiredTag(raw.tag);
  if (typeof raw.protocol !== "string" || raw.protocol.trim().length === 0) {
    throw new Error("INCY raw outbound protocol is invalid");
  }
  if (!isPlainObject(raw.settings)) {
    throw new TypeError("INCY raw outbound settings must be a plain object");
  }
  return raw;
}

export function parseRawXrayOutbound(node) {
  const source = rawSource(node);
  if (source === null) return null;
  return validateRawOutboundShape(clonePlainValue(source));
}

export function renderIncyOutbound(node, { tag, rawOutbound = null } = {}) {
  const raw = rawOutbound === null ? parseRawXrayOutbound(node) : validateRawOutboundShape(clonePlainValue(rawOutbound));
  if (raw !== null) {
    requiredTag(tag);
    if (raw.tag !== tag) {
      throw new Error("INCY raw outbound tag does not match the caller-supplied tag");
    }
    return Object.freeze({ ...raw });
  }
  validateRequiredFields(node);
  requiredTag(tag);
  return renderXrayOutbound({ ...node, name: node?.name ?? tag }, { tag, client: "incy" });
}
