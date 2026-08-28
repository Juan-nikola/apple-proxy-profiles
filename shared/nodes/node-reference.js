import {
  canonicalProtocol,
  protocolSupportsClient,
} from "./protocol-registry.js";

const LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;
const PROTOCOL_QUALIFIER = /^[a-z][a-z0-9_-]*$/iu;
const EXACT_TARGET = /^NODE:(.*)$/iu;
const FUZZY_TARGET = /^NODE~(.*)$/iu;
const LABEL_SEPARATOR = /[\p{P}\p{S}]+/gu;
const DISPLAY_MARK = /[\p{Extended_Pictographic}\p{Regional_Indicator}]/gu;

function invalid(message) {
  const error = new Error(`Invalid node reference: ${message}`);
  error.code = "invalid-node-reference";
  return error;
}

function freeze(value) {
  return Object.freeze(value);
}

export function parseNodeReference(target) {
  if (typeof target !== "string") throw invalid("target must be NODE:<name> or NODE~<query>");
  const exact = EXACT_TARGET.exec(target);
  const fuzzy = FUZZY_TARGET.exec(target);
  if (!exact && !fuzzy) throw invalid("target must be NODE:<name> or NODE~<query>");
  const mode = exact ? "exact" : "fuzzy";
  const body = (exact ?? fuzzy)[1];
  if (body.length === 0 || LINE_TERMINATOR.test(body)) {
    throw invalid("node name or query is empty or contains a line break");
  }
  if (mode === "exact" && body.trim() !== body) throw invalid("node name has surrounding whitespace");
  const value = mode === "fuzzy" ? body.trim() : body;
  if (value.length === 0) throw invalid("node name or query is empty");

  const separator = value.lastIndexOf("|");
  let name = value;
  let protocol = null;
  if (separator > 0 && separator < value.length - 1) {
    const qualifier = value.slice(separator + 1);
    if (!PROTOCOL_QUALIFIER.test(qualifier)) throw invalid("protocol qualifier is invalid");
    protocol = canonicalProtocol(qualifier);
    if (!protocol) throw invalid("protocol qualifier is unsupported");
    name = value.slice(0, separator);
  }

  if (name.length === 0 || (mode === "exact" && name.trim() !== name) || LINE_TERMINATOR.test(name)) {
    throw invalid("node name is empty or contains a line break");
  }
  return freeze(mode === "fuzzy" ? { mode, query: name, protocol } : { mode, name, protocol });
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

function normalizedLabel(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(DISPLAY_MARK, "")
    .replace(LABEL_SEPARATOR, " ")
    .toLocaleLowerCase()
    .replace(/\s+/gu, " ")
    .trim();
}

function fuzzyMatches(node, query) {
  const candidate = normalizedLabel(originalName(node));
  const terms = normalizedLabel(query).split(" ").filter(Boolean);
  return terms.length > 0 && terms.every((term) => candidate.includes(term));
}

function referenceMatches(node, reference) {
  if (reference.protocol !== null && nodeProtocol(node) !== reference.protocol) return false;
  return reference.mode === "fuzzy"
    ? fuzzyMatches(node, reference.query)
    : originalName(node) === reference.name;
}

function resolutionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function resolveNodeReference({ target, allNodes = [], eligibleNodes = [], client } = {}) {
  const reference = parseNodeReference(target);
  const all = (Array.isArray(allNodes) ? allNodes : []).filter(selectable);
  const eligible = (Array.isArray(eligibleNodes) ? eligibleNodes : []).filter(selectable);
  const matchingAll = all.filter((node) => referenceMatches(node, reference));
  const matchingEligible = eligible.filter((node) => referenceMatches(node, reference));

  if (client && matchingEligible.length === 0 && matchingAll.length > 0) {
    const supported = matchingAll.filter((node) => protocolSupportsClient(nodeProtocol(node), client));
    if (supported.length === 0) {
      throw resolutionError("incompatible-node", "Node reference is incompatible with this client");
    }
  }

  if (matchingEligible.length === 1) return matchingEligible[0];
  if (matchingEligible.length > 1) throw resolutionError("ambiguous-node", "Node reference is ambiguous");
  if (matchingAll.length > 0) throw resolutionError("incompatible-node", "Node reference is incompatible with this client");
  throw resolutionError("missing-node", "Node reference is missing");
}
