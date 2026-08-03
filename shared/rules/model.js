import { isIP } from "node:net";

export const RULE_KIND = Object.freeze({
  domain: "domain",
  domainSuffix: "domainSuffix",
  domainKeyword: "domainKeyword",
  ipv4Cidr: "ipv4Cidr",
  ipv6Cidr: "ipv6Cidr",
  geoip: "geoip",
  ipAsn: "ipAsn",
  urlRegex: "urlRegex",
  userAgent: "userAgent",
  processName: "processName",
  logicalAnd: "logicalAnd",
  logicalOr: "logicalOr",
  unsupported: "unsupported",
});

const RULE_KINDS = new Set(Object.values(RULE_KIND));
const DOMAIN_KINDS = new Set([
  RULE_KIND.domain,
  RULE_KIND.domainSuffix,
  RULE_KIND.domainKeyword,
]);

function requiredSourceId(sourceId) {
  if (typeof sourceId !== "string" || !sourceId.trim() || sourceId.trim() !== sourceId) {
    throw new TypeError("Rule sourceId must be a non-empty trimmed string");
  }
  if (/[,\r\n]/u.test(sourceId)) {
    throw new TypeError("Rule sourceId contains a forbidden character");
  }
  return sourceId;
}

function cleanValue(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError("Rule value must be a non-empty string");
  }
  const normalized = value.trim();
  if (/[,\r\n\0]/u.test(normalized)) {
    throw new TypeError("Rule value contains a forbidden character");
  }
  return normalized;
}

function normalizeDomain(kind, value) {
  let normalized = cleanValue(value).toLowerCase();
  if (kind === RULE_KIND.domainSuffix && normalized.startsWith(".")) {
    normalized = normalized.slice(1);
  }
  if (kind !== RULE_KIND.domainKeyword && normalized.endsWith(".")) {
    normalized = normalized.slice(0, -1);
  }
  if (!normalized || /\s/u.test(normalized)) {
    throw new TypeError("Rule domain value is malformed");
  }
  if (kind !== RULE_KIND.domainKeyword && normalized.split(".").some((label) => !label)) {
    throw new TypeError("Rule domain value is malformed");
  }
  return normalized;
}

function parseIPv4(address) {
  const octets = address.split(".").map(Number);
  let value = 0n;
  for (const octet of octets) value = (value << 8n) | BigInt(octet);
  return value;
}

function renderIPv4(value) {
  return [24n, 16n, 8n, 0n]
    .map((shift) => Number((value >> shift) & 255n))
    .join(".");
}

function expandIPv6(address) {
  const [leftText, rightText, extra] = address.toLowerCase().split("::");
  if (extra !== undefined) throw new TypeError("Rule CIDR address is malformed");
  const left = leftText ? leftText.split(":") : [];
  const right = rightText ? rightText.split(":") : [];
  const dottedSide = right.at(-1)?.includes(".") ? right : left.at(-1)?.includes(".") ? left : null;
  if (dottedSide) {
    const embedded = dottedSide.pop();
    if (isIP(embedded) !== 4 || left.some((part) => part.includes(".")) || right.some((part) => part.includes("."))) {
      throw new TypeError("Rule CIDR address is malformed");
    }
    const octets = embedded.split(".").map(Number);
    dottedSide.push(
      ((octets[0] << 8) | octets[1]).toString(16),
      ((octets[2] << 8) | octets[3]).toString(16),
    );
  }
  const missing = 8 - left.length - right.length;
  if ((address.includes("::") && missing < 1) || (!address.includes("::") && missing !== 0)) {
    throw new TypeError("Rule CIDR address is malformed");
  }
  return [...left, ...Array(missing).fill("0"), ...right].map((part) => {
    if (!/^[0-9a-f]{1,4}$/u.test(part)) throw new TypeError("Rule CIDR address is malformed");
    return Number.parseInt(part, 16);
  });
}

function parseIPv6(address) {
  let value = 0n;
  for (const group of expandIPv6(address)) value = (value << 16n) | BigInt(group);
  return value;
}

function renderIPv6(value) {
  const groups = [];
  for (let shift = 112n; shift >= 0n; shift -= 16n) {
    groups.push(Number((value >> shift) & 0xffffn).toString(16));
  }

  let bestStart = -1;
  let bestLength = 0;
  for (let start = 0; start < groups.length;) {
    if (groups[start] !== "0") {
      start += 1;
      continue;
    }
    let end = start;
    while (end < groups.length && groups[end] === "0") end += 1;
    if (end - start > bestLength && end - start >= 2) {
      bestStart = start;
      bestLength = end - start;
    }
    start = end;
  }

  if (bestStart === -1) return groups.join(":");
  const left = groups.slice(0, bestStart).join(":");
  const right = groups.slice(bestStart + bestLength).join(":");
  return `${left}::${right}`;
}

export function parseCanonicalCidr(rawValue, expectedVersion) {
  const value = cleanValue(rawValue).toLowerCase();
  const slash = value.indexOf("/");
  const address = slash === -1 ? value : value.slice(0, slash);
  const version = isIP(address);
  if (version !== expectedVersion) throw new TypeError("Rule CIDR address family is invalid");
  const width = version === 4 ? 32 : 128;
  const prefixText = slash === -1 ? String(width) : value.slice(slash + 1);
  if (!/^(0|[1-9][0-9]{0,2})$/u.test(prefixText)) {
    throw new TypeError("Rule CIDR prefix is invalid");
  }
  const prefix = Number(prefixText);
  if (prefix > width) throw new TypeError("Rule CIDR prefix is invalid");

  const addressValue = version === 4 ? parseIPv4(address) : parseIPv6(address);
  const hostBits = BigInt(width - prefix);
  const network = hostBits === 0n ? addressValue : (addressValue >> hostBits) << hostBits;
  return Object.freeze({
    version,
    prefix,
    network,
    value: `${version === 4 ? renderIPv4(network) : renderIPv6(network)}/${prefix}`,
  });
}

export function normalizeRuleEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new TypeError("Rule entry must be an object");
  }
  if (!RULE_KINDS.has(entry.kind)) throw new TypeError("Rule kind is unsupported");
  const sourceId = requiredSourceId(entry.sourceId);
  let value;
  if (DOMAIN_KINDS.has(entry.kind)) {
    value = normalizeDomain(entry.kind, entry.value);
  } else if (entry.kind === RULE_KIND.ipv4Cidr) {
    value = parseCanonicalCidr(entry.value, 4).value;
  } else if (entry.kind === RULE_KIND.ipv6Cidr) {
    value = parseCanonicalCidr(entry.value, 6).value;
  } else {
    value = cleanValue(entry.value);
  }
  return Object.freeze({
    kind: entry.kind,
    value,
    noResolve: entry.noResolve === true,
    sourceId,
  });
}
