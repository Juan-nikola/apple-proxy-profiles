import { protocolDefinition } from "./protocol-registry.js";

const PSEUDO_NODE_PATTERN = /剩余|流量|到期|套餐|官网|公告|通知|traffic|expire|website/i;

function isNonblankString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidPort(value) {
  const port = typeof value === "string" && /^\d+$/.test(value)
    ? Number(value)
    : value;
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function isValidAuthField(field, value) {
  if (field === "version") {
    const version = typeof value === "string" && /^\d+$/.test(value)
      ? Number(value)
      : value;
    return Number.isInteger(version) && version >= 1;
  }
  return isNonblankString(value);
}

function hasTlsIdentity(node) {
  return Boolean(
    isNonblankString(node.sni) ||
    isNonblankString(node.servername) ||
    node["skip-cert-verify"] === true ||
    node["allow-insecure"] === true ||
    isNonblankString(node["reality-opts"]?.["public-key"]),
  );
}

function wireGuardPublicKey(node) {
  if (isNonblankString(node["public-key"])) return node["public-key"];
  if (!Array.isArray(node.peers) || node.peers.length !== 1) return undefined;
  const peer = node.peers[0];
  return peer && typeof peer === "object" && !Array.isArray(peer)
    ? peer["public-key"]
    : undefined;
}

function hasSshAuthentication(node) {
  return isNonblankString(node.password)
    || isNonblankString(node["private-key"])
    || isNonblankString(node.private_key);
}

export function hasExplicitUdp(node) {
  return node?.udp === true;
}

export function validateNode(node) {
  if (!node || typeof node !== "object" || Array.isArray(node)) {
    return { valid: false, reason: "not-object", warnings: [] };
  }

  if (typeof node.name !== "string" || !node.name.trim() || PSEUDO_NODE_PATTERN.test(node.name)) {
    return { valid: false, reason: "pseudo-node", warnings: [] };
  }

  if (
    typeof node.type !== "string" ||
    !node.type.trim() ||
    !isNonblankString(node.server) ||
    !isValidPort(node.port)
  ) {
    return { valid: false, reason: "missing-endpoint", warnings: [] };
  }

  const type = node.type.trim().toLowerCase();
  const definition = protocolDefinition(type);
  if (definition?.requiredFields.some((field) => {
    const value = type === "wireguard" && field === "public-key"
      ? wireGuardPublicKey(node)
      : node[field];
    return !isValidAuthField(field, value);
  }) || type === "ssh" && !hasSshAuthentication(node)) {
    return { valid: false, reason: "missing-auth", warnings: [] };
  }

  const tls = node.tls === true || definition?.tls === true;
  const warnings = tls && !hasTlsIdentity(node) ? ["tls-verification-unclear"] : [];
  return { valid: true, reason: null, warnings };
}
