import { BUSINESS_TARGETS, parseBusinessOverrides } from "../../../shared/policies/business-targets.js";
import { CLIENT, nodeMetadata } from "../../../shared/contracts.js";
import { resolveNodeReference } from "../../../shared/nodes/node-reference.js";

function metadata(node) {
  return node?._profile && typeof node._profile === "object" ? node._profile : {};
}

function nodeName(node) {
  return typeof node?.name === "string" ? node.name : "";
}

function hashTag(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `ap-fixed-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function fixedTargetError(target, name, reason) {
  return new Error(`OneXray fixed target ${target.label} ${reason}: ${name}`);
}

function uniqueByName(nodes, name) {
  return nodes.filter((node) => nodeName(node) === name);
}

function legacyResolution({ options, allNodes = [], eligibleNodes = [] } = {}) {
  if (!options || typeof options !== "object") throw new TypeError("OneXray options are required");
  if (!Array.isArray(allNodes) || !Array.isArray(eligibleNodes)) throw new TypeError("OneXray node inventories are required");
  if (eligibleNodes.length === 0) throw new Error("OneXray has no compatible nodes");

  const overrides = parseBusinessOverrides(options.policyOverrides ?? "");
  const fixedByName = new Map();
  const fixedNodes = [];
  const targets = {};
  const tagOwners = new Map();

  const resolveFixed = (target, configured) => {
    const wanted = configured.slice("NODE:".length);
    if (fixedByName.has(wanted)) return fixedByName.get(wanted);
    const matches = uniqueByName(eligibleNodes, wanted).filter((node) => metadata(node).chained !== true);
    if (matches.length > 1) throw fixedTargetError(target, wanted, "is ambiguous");
    if (matches.length === 0) {
      const incompatible = uniqueByName(allNodes, wanted);
      throw fixedTargetError(target, wanted, incompatible.length > 0 ? "is incompatible" : "is missing");
    }
    const node = matches[0];
    let tag = hashTag(`${wanted}\u0000${metadata(node).id ?? ""}`);
    if (tagOwners.has(tag) && tagOwners.get(tag) !== wanted) {
      tag = hashTag(`${wanted}\u0000${metadata(node).id ?? ""}\u0001${node.type ?? ""}`);
    }
    const record = { node, name: wanted, tag };
    fixedByName.set(wanted, record);
    tagOwners.set(tag, wanted);
    fixedNodes.push(record);
    return record;
  };

  for (const target of BUSINESS_TARGETS) {
    const configured = overrides[target.id] ?? target.defaultTarget;
    if (configured === "FOLLOW") {
      targets[target.id] = { configured, resolvedTag: "proxy", status: "follow" };
    } else if (configured === "DIRECT") {
      targets[target.id] = { configured, resolvedTag: "direct", status: "direct" };
    } else {
      const fixed = resolveFixed(target, configured);
      targets[target.id] = { configured, resolvedTag: fixed.tag, status: "fixed", nodeId: metadata(fixed.node).id ?? null };
    }
  }

  let homepageNodes = eligibleNodes.filter((node) => metadata(node).chained !== true);
  let chain = { enabled: false, landingTag: null, entryCount: homepageNodes.length };
  let finalOutbound = null;
  if (options.clientChain === "on") {
    const targetName = String(options.clientChainTarget).slice("NODE:".length);
    const landingMatches = uniqueByName(allNodes, targetName)
      .filter((node) => metadata(node).sourceKind === "landing" && metadata(node).chained !== true);
    if (landingMatches.length !== 1) throw new Error(`OneXray client chain landing is not unique: ${targetName}`);
    homepageNodes = eligibleNodes.filter((node) => metadata(node).entry === true && metadata(node).chained !== true);
    if (homepageNodes.length === 0) throw new Error("OneXray client chain requires at least one entry node");
    chain = { enabled: true, landingTag: "chainProxy", entryCount: homepageNodes.length };
    finalOutbound = { node: landingMatches[0], tag: "chainProxy" };
  }

  return freeze({
    homepageNodes: [...homepageNodes],
    fixedNodes: [...fixedNodes],
    finalOutbound,
    targets,
    chain,
  });
}

function unifiedTargetId(id) {
  if (id === "domesticCore" || id === "chinaIp") return "domesticPlatform";
  return id;
}

function unifiedResolution({ options, allNodes, eligibleNodes, policyResolution }) {
  if (!policyResolution || typeof policyResolution !== "object") {
    throw new TypeError("OneXray unified policy resolution is required");
  }
  if (eligibleNodes.length === 0) throw new Error("OneXray has no compatible nodes");

  const fixedNodes = (policyResolution.fixedNodes ?? []).map((fixed) => {
    const node = fixed.node ?? eligibleNodes.find((candidate) => nodeMetadata(candidate).id === fixed.nodeId);
    if (!node) throw new Error("OneXray fixed policy node is unavailable");
    const nodeId = fixed.nodeId ?? nodeMetadata(node).id;
    const name = fixed.name ?? node.name;
    return { node, name, nodeId, tag: hashTag(String(name) + "\u0000" + String(nodeId ?? "")) };
  });
  const fixedById = new Map(fixedNodes.map((fixed) => [fixed.nodeId, fixed]));
  const targets = {};
  for (const target of BUSINESS_TARGETS) {
    const record = policyResolution.targets?.[unifiedTargetId(target.id)];
    const configured = record?.configured ?? target.defaultTarget;
    if (record?.status === "fixed" || configured.startsWith("NODE:")) {
      const fixed = fixedById.get(record?.nodeId);
      if (!fixed) throw fixedTargetError(target, record?.resolved ?? configured, "is unavailable");
      targets[target.id] = { configured, resolvedTag: fixed.tag, status: "fixed", nodeId: fixed.nodeId };
    } else if (record?.resolved === "DIRECT" || configured === "DIRECT") {
      targets[target.id] = { configured, resolvedTag: "direct", status: "direct" };
    } else {
      targets[target.id] = { configured, resolvedTag: "proxy", status: "follow" };
    }
  }

  let homepageNodes = eligibleNodes.filter((node) => metadata(node).chained !== true);
  let chain = { enabled: false, landingTag: null, entryCount: homepageNodes.length };
  let finalOutbound = null;
  if (options.clientChain === "on") {
    const landing = resolveNodeReference({
      target: options.clientChainTarget,
      allNodes,
      eligibleNodes: allNodes,
      client: CLIENT.onexray,
    });
    if (metadata(landing).sourceKind !== "landing" || metadata(landing).chained === true) {
      throw new Error("OneXray client chain target must resolve to one landing node");
    }
    homepageNodes = eligibleNodes.filter((node) => metadata(node).entry === true && metadata(node).chained !== true);
    if (homepageNodes.length === 0) throw new Error("OneXray client chain requires at least one entry node");
    chain = { enabled: true, landingTag: "chainProxy", entryCount: homepageNodes.length };
    finalOutbound = { node: landing, tag: "chainProxy" };
  }

  return freeze({ homepageNodes: [...homepageNodes], fixedNodes, finalOutbound, targets, chain });
}

export function resolveOneXrayPolicy({ options, allNodes = [], eligibleNodes = [], policyResolution = null } = {}) {
  if (!options || typeof options !== "object") throw new TypeError("OneXray options are required");
  if (!Array.isArray(allNodes) || !Array.isArray(eligibleNodes)) throw new TypeError("OneXray node inventories are required");
  return policyResolution === null
    ? legacyResolution({ options, allNodes, eligibleNodes })
    : unifiedResolution({ options, allNodes, eligibleNodes, policyResolution });
}
