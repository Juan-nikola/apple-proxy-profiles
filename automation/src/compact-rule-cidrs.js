import { normalizeRuleEntry, parseCanonicalCidr, RULE_KIND } from "../../shared/rules/model.js";

const CIDR_KINDS = new Set([RULE_KIND.ipv4Cidr, RULE_KIND.ipv6Cidr]);
const KIND_ORDER = new Map(Object.values(RULE_KIND).map((kind, index) => [kind, index]));

function ancestorNetwork(network, width, prefix) {
  const hostBits = BigInt(width - prefix);
  return hostBits === 0n ? network : (network >> hostBits) << hostBits;
}

function renderAddress(network, version) {
  if (version === 4) {
    return [24n, 16n, 8n, 0n]
      .map((shift) => Number((network >> shift) & 255n))
      .join(".");
  }
  const groups = [];
  for (let shift = 112n; shift >= 0n; shift -= 16n) {
    groups.push(((network >> shift) & 0xffffn).toString(16));
  }
  return groups.join(":");
}

function compactGroup(entries, kind, noResolve, sourceId) {
  const version = kind === RULE_KIND.ipv4Cidr ? 4 : 6;
  const width = version === 4 ? 32 : 128;
  const parsed = entries.map(({ value }) => parseCanonicalCidr(value, version))
    .sort((left, right) => left.prefix - right.prefix
      || (left.network < right.network ? -1 : left.network > right.network ? 1 : 0));
  const byPrefix = new Map();
  const bucket = (prefix) => {
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, new Set());
    return byPrefix.get(prefix);
  };

  for (const cidr of parsed) {
    let covered = false;
    for (let prefix = 0; prefix <= cidr.prefix; prefix += 1) {
      if (byPrefix.get(prefix)?.has(ancestorNetwork(cidr.network, width, prefix))) {
        covered = true;
        break;
      }
    }
    if (!covered) bucket(cidr.prefix).add(cidr.network);
  }

  for (let prefix = width; prefix > 0; prefix -= 1) {
    const networks = byPrefix.get(prefix);
    if (!networks || networks.size < 2) continue;
    const siblingBit = 1n << BigInt(width - prefix);
    for (const network of [...networks].sort((left, right) => left < right ? -1 : left > right ? 1 : 0)) {
      if (!networks.has(network)) continue;
      const sibling = network ^ siblingBit;
      if (!networks.has(sibling)) continue;
      networks.delete(network);
      networks.delete(sibling);
      bucket(prefix - 1).add(network < sibling ? network : sibling);
    }
  }

  const compacted = [];
  for (const [prefix, networks] of byPrefix) {
    for (const network of networks) {
      const value = parseCanonicalCidr(`${renderAddress(network, version)}/${prefix}`, version).value;
      compacted.push(normalizeRuleEntry({ kind, value, noResolve, sourceId }));
    }
  }
  return compacted;
}

function compareEntries(left, right) {
  const kind = KIND_ORDER.get(left.kind) - KIND_ORDER.get(right.kind);
  if (kind !== 0) return kind;
  if (left.value !== right.value) return left.value < right.value ? -1 : 1;
  return Number(left.noResolve) - Number(right.noResolve);
}

export function compactRuleCidrs(entries) {
  if (!Array.isArray(entries)) throw new TypeError("Rule entries must be an array");
  const unchanged = [];
  const groups = new Map();
  for (const entry of entries) {
    if (!CIDR_KINDS.has(entry.kind)) {
      unchanged.push(entry);
      continue;
    }
    const key = `${entry.kind}\0${entry.noResolve === true}\0${entry.sourceId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  const compacted = [...unchanged];
  for (const group of groups.values()) {
    const [{ kind, noResolve, sourceId }] = group;
    compacted.push(...compactGroup(group, kind, noResolve, sourceId));
  }
  compacted.sort(compareEntries);
  return Object.freeze({
    entries: Object.freeze(compacted),
    diagnostics: Object.freeze({
      input: entries.length,
      output: compacted.length,
      removed: entries.length - compacted.length,
    }),
  });
}
