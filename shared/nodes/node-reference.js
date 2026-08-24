import {
  canonicalProtocol,
  protocolSupportsClient,
} from "./protocol-registry.js";

const LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;
const PROTOCOL_QUALIFIER = /^[a-z][a-z0-9_-]*$/iu;

function invalid(message) {
  return new Error(`Invalid node reference: ${message}`);
}

function freeze(value) {
  return Object.freeze(value);
}

export function parseNodeReference(target) {
  if (typeof target !== "string" || !target.startsWith("NODE:")) {
    throw invalid("target must be NODE:<name> or NODE:<name>|<protocol>");
  }

  const body = target.slice("NODE:".length);
  if (body.length === 0 || body.trim() !== body || LINE_TERMINATOR.test(body)) {
    throw invalid("node name is empty or contains a line break");
  }

  const separator = body.lastIndexOf("|");
  let name = body;
  let protocol = null;
  if (separator > 0 && separator < body.length - 1) {
    const qualifier = body.slice(separator + 1);
    if (!PROTOCOL_QUALIFIER.test(qualifier)) throw invalid("protocol qualifier is invalid");
    protocol = canonicalProtocol(qualifier);
    if (!protocol) throw invalid("protocol qualifier is unsupported");
    name = body.slice(0, separator);
  }

  if (name.length === 0 || name.trim() !== name || LINE_TERMINATOR.test(name)) {
    throw invalid("node name is empty or contains a line break");
  }
  return freeze({ name, protocol });
}

function metadata(node) {
  return node?._profile && typeof node._profile === "object" ? node._profile : {};
}

function originalName(node) {
  return typeof metadata(node).originalName === "string" ? metadata(node).originalName : node?.name;
}

function nodeProtocol(node) {
  return canonicalProtocol(metadata(node).protocol ?? node?.type);
}

function selectable(node) {
  return Boolean(node) && metadata(node).chained !== true;
}

export function resolveNodeReference({ target, allNodes = [], eligibleNodes = [], client } = {}) {
  const reference = parseNodeReference(target);
  const all = (Array.isArray(allNodes) ? allNodes : []).filter(selectable);
  const eligible = (Array.isArray(eligibleNodes) ? eligibleNodes : []).filter(selectable);
  const matchingAll = all.filter((node) => (
    originalName(node) === reference.name
    && (reference.protocol === null || nodeProtocol(node) === reference.protocol)
  ));
  const matchingEligible = eligible.filter((node) => (
    originalName(node) === reference.name
    && (reference.protocol === null || nodeProtocol(node) === reference.protocol)
  ));

  if (client && matchingEligible.length === 0 && matchingAll.length > 0) {
    const supported = matchingAll.filter((node) => protocolSupportsClient(nodeProtocol(node), client));
    if (supported.length === 0) {
      throw new Error("Node reference is incompatible with this client");
    }
  }

  if (matchingEligible.length === 1) return matchingEligible[0];
  if (matchingEligible.length > 1) throw new Error("Node reference is ambiguous");
  if (matchingAll.length > 0) throw new Error("Node reference is incompatible with this client");
  throw new Error("Node reference is missing");
}
