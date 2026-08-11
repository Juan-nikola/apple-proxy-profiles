import { businessTargetByKey, BUSINESS_TARGETS, parseBusinessOverrides } from "../../../shared/policies/business-targets.js";
import { nodeMetadata } from "../../../shared/contracts.js";
import { hasExistingChain } from "../../../shared/nodes/client-chain.js";
import { identityKey } from "../../../shared/nodes/node-identity.js";

const RESERVED_TAGS = new Set([
  "proxy", "chainProxy", "direct", "fragment", "block", "dnsOut", "tunIn", "pingIn",
]);
const GENERATED_TAG_PREFIXES = ["ap-fixed-"];
const NODE_TARGET = /^NODE:(.*)$/u;
const LINE_TERMINATOR = /[\r\n\u2028\u2029]/u;
const STABLE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

function freezeTarget(target) {
  return Object.freeze(target);
}

function freezeFixedNode(fixed) {
  return Object.freeze(fixed);
}

function policyError(message) {
  return new Error(`Invalid OneXray business policy: ${message}`);
}

function fixedTargetError(target, name, reason) {
  return policyError(`${target.label}: ${name}: ${reason}`);
}

function chainError(name, reason) {
  return policyError(`全局客户端链: ${name}: ${reason}`);
}

function nodeTargetName(value) {
  if (typeof value !== "string") return null;
  const match = NODE_TARGET.exec(value);
  if (!match || match[1].trim().length === 0 || LINE_TERMINATOR.test(match[1])) return null;
  return match[1];
}

function malformedTargetError(encoded) {
  if (typeof encoded !== "string" || !/^[A-Za-z0-9_-]+$/u.test(encoded)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    for (const [key, value] of Object.entries(parsed)) {
      const target = businessTargetByKey(key);
      if (!target || typeof value !== "string" || !/^NODE:/iu.test(value)) continue;
      const name = value.slice("NODE:".length).split(/[\r\n\u2028\u2029]/u, 1)[0];
      if (name.trim().length > 0) return fixedTargetError(target, name, "malformed fixed target");
    }
  } catch {
    // The shared parser owns malformed encoded/JSON policy errors.
  }
  return null;
}

function parseOverrides(options) {
  try {
    return parseBusinessOverrides(options.policyOverrides);
  } catch (error) {
    const descriptive = malformedTargetError(options.policyOverrides);
    if (descriptive) throw descriptive;
    throw error;
  }
}

function inputNodes(value, label) {
  if (!Array.isArray(value)) throw new TypeError(`OneXray ${label} must be an array`);
  return [...value];
}

function inspectNodes(allNodes, eligibleNodes) {
  const allIdentities = new Set();
  for (const node of allNodes) {
    nodeMetadata(node);
    allIdentities.add(identityKey(node));
  }
  for (const node of eligibleNodes) {
    nodeMetadata(node);
    if (!allIdentities.has(identityKey(node))) {
      throw policyError("compatible nodes must come from normalized nodes");
    }
  }
}

function candidatesByExactName(nodes, name) {
  return nodes.filter((node) => node.name === name);
}

function reservedNodeTag(name) {
  return RESERVED_TAGS.has(name) || GENERATED_TAG_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function fixedTag(node, target, name, assigned) {
  const id = nodeMetadata(node).id;
  if (typeof id !== "string" || !STABLE_ID.test(id)) {
    throw fixedTargetError(target, name, "missing stable normalized identity");
  }
  const tag = `ap-fixed-${id}`;
  if (RESERVED_TAGS.has(tag)) throw fixedTargetError(target, name, "uses a reserved outbound tag");
  const prior = assigned.get(tag);
  if (prior && identityKey(prior) !== identityKey(node)) {
    throw fixedTargetError(target, name, "has a colliding stable outbound tag");
  }
  assigned.set(tag, node);
  return tag;
}

function resolveFixedTarget(target, configured, allNodes, eligibleNodes, assigned) {
  const name = nodeTargetName(configured);
  if (name === null) throw fixedTargetError(target, "", "malformed fixed target");
  if (reservedNodeTag(name)) throw fixedTargetError(target, name, "uses a reserved outbound tag");

  const allMatches = candidatesByExactName(allNodes, name);
  if (allMatches.length === 0) throw fixedTargetError(target, name, "normalized target is missing");
  if (allMatches.length !== 1) throw fixedTargetError(target, name, "normalized target is duplicated");
  const compatible = candidatesByExactName(eligibleNodes, name);
  if (compatible.length === 0) throw fixedTargetError(target, name, "normalized target is incompatible");
  if (compatible.length !== 1) throw fixedTargetError(target, name, "normalized target is duplicated");

  const node = compatible[0];
  const tag = fixedTag(node, target, name, assigned);
  return { node, tag };
}

function targetResolution(target, configured, allNodes, eligibleNodes, assigned, fixedByTag) {
  if (configured === "FOLLOW") return freezeTarget({ configured, resolvedTag: "proxy", status: "follow" });
  if (configured === "DIRECT") return freezeTarget({ configured, resolvedTag: "direct", status: "direct" });

  const fixed = resolveFixedTarget(target, configured, allNodes, eligibleNodes, assigned);
  if (!fixedByTag.has(fixed.tag)) fixedByTag.set(fixed.tag, freezeFixedNode(fixed));
  return freezeTarget({ configured, resolvedTag: fixed.tag, status: "fixed" });
}

function landingResolution(options, allNodes, eligibleNodes, homepageNodes) {
  if (options.clientChain === "off") {
    return { finalOutbound: null, chain: { enabled: false, landingTag: null, entryCount: homepageNodes.length } };
  }
  if (options.clientChain !== "on") throw policyError("clientChain must be on or off");
  if (homepageNodes.length === 0) throw chainError("", "no compatible entry nodes");

  const name = nodeTargetName(options.clientChainTarget);
  if (name === null) throw chainError("", "malformed landing target");
  const allMatches = candidatesByExactName(allNodes, name);
  if (allMatches.length === 0) throw chainError(name, "normalized landing target is missing");
  const compatible = candidatesByExactName(eligibleNodes, name);
  if (compatible.length === 0) throw chainError(name, "normalized landing target is incompatible");
  if (compatible.length !== 1) throw chainError(name, "normalized landing target is duplicated");

  const node = compatible[0];
  const metadata = nodeMetadata(node);
  if (metadata.landing !== true && metadata.sourceKind !== "landing") {
    throw chainError(name, "normalized target is not a landing node");
  }
  if (metadata.chained === true || hasExistingChain(node)) {
    throw chainError(name, "landing target already has a chain");
  }
  if (homepageNodes.includes(node)) throw chainError(name, "landing target cannot be a homepage entry");

  return {
    finalOutbound: freezeFixedNode({ node, tag: "chainProxy" }),
    chain: { enabled: true, landingTag: "chainProxy", entryCount: homepageNodes.length },
  };
}

/**
 * Resolves OneXray's business and global-chain policy without rendering any
 * outbound. Every validation is completed before the frozen result is exposed.
 */
export function resolveOneXrayPolicy({ options, allNodes, eligibleNodes } = {}) {
  if (!options || typeof options !== "object") throw new TypeError("OneXray options must be an object");
  const normalizedNodes = inputNodes(allNodes, "normalized nodes");
  const compatibleNodes = inputNodes(eligibleNodes, "compatible nodes");
  inspectNodes(normalizedNodes, compatibleNodes);
  const overrides = parseOverrides(options);

  const homepageNodes = options.clientChain === "on"
    ? compatibleNodes.filter((node) => nodeMetadata(node).entry === true)
    : compatibleNodes;
  const landing = landingResolution(options, normalizedNodes, compatibleNodes, homepageNodes);

  const assigned = new Map();
  const fixedByTag = new Map();
  const targets = {};
  for (const target of BUSINESS_TARGETS) {
    const configured = overrides[target.id] ?? target.defaultTarget;
    targets[target.id] = targetResolution(target, configured, normalizedNodes, compatibleNodes, assigned, fixedByTag);
  }

  return Object.freeze({
    homepageNodes: Object.freeze([...homepageNodes]),
    fixedNodes: Object.freeze([...fixedByTag.values()]),
    finalOutbound: landing.finalOutbound,
    targets: Object.freeze(targets),
    chain: Object.freeze(landing.chain),
  });
}
