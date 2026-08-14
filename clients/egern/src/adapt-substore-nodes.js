import { normalizeProtocol } from "../../../shared/nodes/protocol-registry.js";

const CERTIFICATE_FINGERPRINT = /^[0-9a-f]{64}$/iu;

function hasOwn(value, key) {
  return Object.hasOwn(value, key);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneForUpdate(node, cloned) {
  return cloned ?? structuredClone(node);
}

function adaptSnell(node) {
  const version = typeof node.version === "string" && /^\d+$/u.test(node.version)
    ? Number(node.version)
    : node.version;
  if (version !== 5) return { value: node };

  const cloned = structuredClone(node);
  // Egern documents Snell v5 as its v4 implementation. Using the concrete
  // implementation version also preserves the v4 UDP relay and reuse options.
  cloned.version = 4;
  return { value: cloned };
}

function adaptRealityVless(node) {
  if (!hasOwn(node, "reality-opts")) return { value: node };

  let cloned;
  if (hasOwn(node, "client-fingerprint")) {
    if (node["client-fingerprint"] !== "chrome") {
      return { reason: "unsupported-egern-tls-shape" };
    }
    cloned = cloneForUpdate(node, cloned);
    delete cloned["client-fingerprint"];
  }

  if (hasOwn(node, "encryption")) {
    if (node.encryption !== "none") return { reason: "unsupported-egern-security" };
    cloned = cloneForUpdate(node, cloned);
    delete cloned.encryption;
  }

  if (hasOwn(node, "packet-encoding")) {
    if (node["packet-encoding"] !== "xudp") return { reason: "unsupported-egern-option" };
    cloned = cloneForUpdate(node, cloned);
    delete cloned["packet-encoding"];
  }

  if (hasOwn(node, "_h2")) {
    if (node._h2 !== false) return { reason: "unsupported-egern-option" };
    cloned = cloneForUpdate(node, cloned);
    delete cloned._h2;
  }

  const reality = node["reality-opts"];
  if (isPlainObject(reality) && hasOwn(reality, "_spider-x")) {
    if (typeof reality["_spider-x"] !== "string" || reality["_spider-x"].length === 0) {
      return { reason: "unsupported-egern-tls-shape" };
    }
    cloned = cloneForUpdate(node, cloned);
    delete cloned["reality-opts"]["_spider-x"];
  }

  return { value: cloned ?? node };
}

function adaptHysteria2(node) {
  let cloned;
  if (hasOwn(node, "alpn")) {
    if (!Array.isArray(node.alpn) || node.alpn.length !== 1 || node.alpn[0] !== "h3") {
      return { reason: "unsupported-egern-tls-shape" };
    }
    cloned = cloneForUpdate(node, cloned);
    delete cloned.alpn;
  }

  const hasFingerprint = hasOwn(node, "fingerprint");
  const hasTlsFingerprint = hasOwn(node, "tls-fingerprint");
  if (hasFingerprint || hasTlsFingerprint) {
    if (!hasFingerprint || !hasTlsFingerprint
      || typeof node.fingerprint !== "string"
      || typeof node["tls-fingerprint"] !== "string"
      || !CERTIFICATE_FINGERPRINT.test(node.fingerprint)
      || !CERTIFICATE_FINGERPRINT.test(node["tls-fingerprint"])
      || node.fingerprint.toLowerCase() !== node["tls-fingerprint"].toLowerCase()) {
      return { reason: "unsupported-egern-tls-shape" };
    }

    const normalized = node.fingerprint.toLowerCase();
    for (const key of ["fingerprint-sha256", "fingerprint_sha256"]) {
      if (hasOwn(node, key)
        && (typeof node[key] !== "string" || node[key].toLowerCase() !== normalized)) {
        return { reason: "conflicting-egern-alias" };
      }
    }

    cloned = cloneForUpdate(node, cloned);
    delete cloned.fingerprint;
    delete cloned["tls-fingerprint"];
    delete cloned.fingerprint_sha256;
    cloned["fingerprint-sha256"] = normalized;
  }

  return { value: cloned ?? node };
}

function adaptAnytls(node) {
  const idleKeys = ["idle-session-check-interval", "idle-session-timeout", "min-idle-session"];
  if (!idleKeys.some((key) => hasOwn(node, key))) return { value: node };
  const cloned = structuredClone(node);
  for (const key of idleKeys) delete cloned[key];
  return { value: cloned };
}

function adaptNode(node) {
  if (!isPlainObject(node)) return { value: node };
  const protocol = normalizeProtocol(node.type);
  if (protocol === "snell") return adaptSnell(node);
  if (protocol === "vless") return adaptRealityVless(node);
  if (protocol === "hysteria2" || protocol === "hy2") return adaptHysteria2(node);
  if (protocol === "anytls") return adaptAnytls(node);
  return { value: node };
}

function failureProtocol(node) {
  try {
    return normalizeProtocol(node?.type);
  } catch {
    return "";
  }
}

export function adaptEgernSubStoreNodes(nodes) {
  const adapted = [];
  const failures = [];
  for (const node of Array.isArray(nodes) ? nodes : []) {
    let result;
    try {
      result = adaptNode(node);
    } catch {
      result = { reason: "invalid-egern-adaptation" };
    }
    if (result.reason) {
      failures.push(Object.freeze({
        type: failureProtocol(node),
        adaptationFailure: result.reason,
      }));
    }
    else adapted.push(result.value);
  }
  return { nodes: adapted, failures };
}
