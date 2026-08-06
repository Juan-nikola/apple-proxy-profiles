import { addClientChainClones, hasExistingChain } from "./client-chain.js";
import { CONTINENT, SOURCE_KIND, nodeMetadata } from "../contracts.js";
import { createDiagnostics, increment } from "./diagnostics.js";
import { fingerprint, identityKey, isSemanticUnderscoreKey } from "./node-identity.js";
import { hasExplicitUdp, validateNode } from "./node-validation.js";
import { diagnosticProtocol } from "./protocol-registry.js";
import { classifyRegion, removeFlags } from "./regions.js";
import { classifySource, stripSourceMarkers } from "./source-labels.js";

const CONTINENT_ORDER = new Map([
  [CONTINENT.asiaPacific, 0],
  [CONTINENT.europe, 1],
  [CONTINENT.americas, 2],
  [CONTINENT.other, 3],
]);

const PROTOCOL_NAME_TOKENS = Object.freeze({
  ss: ["ss", "shadowsocks"],
  shadowsocks: ["ss", "shadowsocks"],
  ssr: ["ssr"],
  snell: ["snell"],
  vmess: ["vmess"],
  vless: ["vless"],
  trojan: ["trojan"],
  anytls: ["anytls"],
  hysteria2: ["hy2", "hysteria2", "hysteria 2"],
  hy2: ["hy2", "hysteria2", "hysteria 2"],
  tuic: ["tuic"],
  socks5: ["socks5", "socks"],
  http: ["http"],
  ssh: ["ssh"],
  wireguard: ["wireguard", "wg"],
});

function cleanDisplayName(name, type) {
  const withoutMarkers = removeFlags(name)
    .replace(/\[\s*未标记\s*\]/giu, " ")
    .replace(/\[\s*udp\s*\]/gi, " ")
    .replace(/\[\s*已有链\s*\]/g, " ");
  const stripped = stripSourceMarkers(withoutMarkers);
  const protocolTokens = PROTOCOL_NAME_TOKENS[type] ?? [type];
  const protocolPattern = protocolTokens
    .filter((token) => typeof token === "string" && token.length > 0)
    .join("|");
  const withoutProtocol = protocolPattern
    ? stripped.replace(new RegExp("(?:^|\\s)(?:" + protocolPattern + ")(?=\\s|$)", "giu"), " ")
    : stripped;
  const cleaned = withoutProtocol
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "未命名节点";
}

function sanitizeInternalMetadata(node) {
  for (const key of Object.keys(node)) {
    if (!key.startsWith("_") || key === "_profile") continue;
    if (isSemanticUnderscoreKey(key)) {
      Object.defineProperty(node, key, {
        value: node[key],
        writable: true,
        enumerable: false,
        configurable: true,
      });
    } else {
      Reflect.deleteProperty(node, key);
    }
  }
  return node;
}

function compareNodes(left, right) {
  const continent = (CONTINENT_ORDER.get(nodeMetadata(left).continent) ?? 99) - (CONTINENT_ORDER.get(nodeMetadata(right).continent) ?? 99);
  if (continent !== 0) return continent;
  const flag = nodeMetadata(left).flag.localeCompare(nodeMetadata(right).flag, "zh-Hans-CN");
  if (flag !== 0) return flag;
  const name = left.name.localeCompare(right.name, "zh-Hans-CN");
  if (name !== 0) return name;
  return nodeMetadata(left).id.localeCompare(nodeMetadata(right).id, "zh-Hans-CN");
}

function isP2pSource(kind) {
  return kind === SOURCE_KIND.selfHosted || kind === SOURCE_KIND.realm || kind === SOURCE_KIND.serverChain;
}

function isEntrySource(kind) {
  return kind === SOURCE_KIND.airport || kind === SOURCE_KIND.selfHosted || kind === SOURCE_KIND.realm;
}

function privilegeRank(sourceKind, existingChain) {
  const p2p = isP2pSource(sourceKind);
  const entry = isEntrySource(sourceKind) && !existingChain;
  const landing = sourceKind === SOURCE_KIND.landing && !existingChain;
  return [
    existingChain ? 0 : 1,
    Number(p2p) + Number(entry) + Number(landing),
    Number(p2p),
    Number(landing),
    Number(entry),
  ];
}

function compareRank(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

/**
 * Exact network identities collapse to one node. Selection is input-order
 * independent: restricted provenance wins, followed by the source granting
 * fewer P2P, client-entry, and client-landing privileges. Stable private
 * tie-breakers are used only in memory and are never added to diagnostics.
 */
function compareDuplicateCandidates(left, right) {
  const rank = compareRank(
    privilegeRank(left.source.kind, left.existingChain),
    privilegeRank(right.source.kind, right.existingChain),
  );
  if (rank !== 0) return rank;
  const sourceKind = left.source.kind.localeCompare(right.source.kind, "en");
  if (sourceKind !== 0) return sourceKind;
  const provenance = left.provenance.localeCompare(right.provenance, "zh-Hans-CN");
  if (provenance !== 0) return provenance;
  const name = String(left.original.name).localeCompare(String(right.original.name), "zh-Hans-CN");
  if (name !== 0) return name;
  return left.fullKey < right.fullKey ? -1 : left.fullKey > right.fullKey ? 1 : 0;
}

export function resolveNameCollisions(nodes, getIdentity = identityKey, getFingerprint = fingerprint) {
  const groups = new Map();
  for (const node of nodes) {
    const group = groups.get(node.name) ?? [];
    group.push(node);
    groups.set(node.name, group);
  }

  for (const [baseName, group] of groups) {
    if (group.length < 2) continue;
    const byIdentity = group
      .map((node) => ({ node, identity: getIdentity(node), suffix: getFingerprint(node).slice(-5) }))
      .sort((left, right) => left.identity < right.identity ? -1 : left.identity > right.identity ? 1 : 0);
    const suffixGroups = new Map();
    for (const record of byIdentity) {
      const suffixGroup = suffixGroups.get(record.suffix) ?? [];
      suffixGroup.push(record);
      suffixGroups.set(record.suffix, suffixGroup);
    }
    for (const records of suffixGroups.values()) {
      records.forEach((record, index) => {
        const suffix = records.length > 1 ? `${record.suffix}-${index + 1}` : record.suffix;
        record.node.name = `${baseName} #${suffix}`;
      });
    }
  }
  return nodes;
}

export function normalizeNodes(nodes, { clientChain = "off" } = {}) {
  const input = Array.isArray(nodes) ? nodes : [];
  const diagnostics = createDiagnostics();
  diagnostics.total = input.length;
  const candidatesByIdentity = new Map();
  const normalized = [];

  for (const original of input) {
    const validation = validateNode(original);
    if (!validation.valid) {
      increment(diagnostics.excluded, validation.reason);
      continue;
    }

    const cloned = structuredClone(original);
    cloned.type = original.type.trim().toLowerCase();
    cloned.port = Number(original.port);
    const identity = identityKey(cloned);
    const source = classifySource(original);
    const region = classifyRegion(original.name);
    const group = candidatesByIdentity.get(identity) ?? [];
    group.push({
      original,
      cloned,
      source,
      region,
      validation,
      existingChain: hasExistingChain(original),
      provenance: [
        original._subDisplayName,
        original._subName,
        original._collectionDisplayName,
        original._collectionName,
      ].filter((value) => typeof value === "string").join("\u0000"),
      fullKey: identityKey({ value: original }),
    });
    candidatesByIdentity.set(identity, group);
  }

  for (const group of candidatesByIdentity.values()) {
    group.sort(compareDuplicateCandidates);
    const { original, cloned, source, region, validation, existingChain } = group[0];
    if (group.length > 1) increment(diagnostics.excluded, "exact-duplicate", group.length - 1);
    increment(diagnostics.protocol, diagnosticProtocol(cloned.type));
    increment(diagnostics.source, source.kind);
    increment(diagnostics.region, region.continent);
    for (const warning of [...validation.warnings, source.warning, region.warning]) {
      if (warning) increment(diagnostics.warnings, warning);
    }

    const udp = hasExplicitUdp(original);
    const id = `sr-${fingerprint(cloned)}`;
    const sourceSuffix = source.kind === SOURCE_KIND.unknown ? "" : "｜" + source.label;
    const capabilitySuffix = [
      existingChain ? "链" : "",
      udp ? "U" : "",
    ].filter(Boolean).join("·");
    cloned.name = region.flag + " " + cleanDisplayName(original.name, cloned.type)
      + sourceSuffix + (capabilitySuffix ? "·" + capabilitySuffix : "");
    cloned._profile = {
      id,
      sourceKind: source.kind,
      continent: region.continent,
      flag: region.flag,
      udp,
      p2p: isP2pSource(source.kind),
      entry: isEntrySource(source.kind) && !existingChain,
      chained: false,
    };
    normalized.push(cloned);
  }

  diagnostics.accepted = normalized.length;
  if (normalized.length === 0) {
    throw new Error("No valid nodes; refusing to publish an empty subscription");
  }

  resolveNameCollisions(normalized);

  normalized.sort(compareNodes);
  const outputNodes = addClientChainClones(normalized, diagnostics, clientChain === "on")
    .map(sanitizeInternalMetadata);
  return {
    nodes: outputNodes,
    diagnostics,
  };
}
