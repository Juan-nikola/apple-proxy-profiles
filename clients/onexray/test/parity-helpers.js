import assert from "node:assert/strict";

const DOMAIN_CODE = /^ext:([^./]+)\.dat:([A-Z0-9]+(?:-[A-Z0-9]+)*)$/u;
const PRIVATE_IPV4 = [
  ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.168.0.0", 16], ["224.0.0.0", 4],
];
const PRIVATE_IPV6 = ["::1/128", "fc00::/7", "fe80::/10", "ff00::/8"];

function normalizedDomain(value) {
  return String(value).trim().toLowerCase().replace(/\.$/u, "");
}

function ipv4ToBigInt(value) {
  const pieces = String(value).split(".").map(Number);
  if (pieces.length !== 4 || pieces.some((piece) => !Number.isInteger(piece) || piece < 0 || piece > 255)) return null;
  return pieces.reduce((result, piece) => (result << 8n) | BigInt(piece), 0n);
}

function ipv6ToBigInt(value) {
  const source = String(value).toLowerCase();
  const pieces = source.split("::");
  if (pieces.length > 2) return null;
  const left = pieces[0] ? pieces[0].split(":") : [];
  const right = pieces.length === 2 && pieces[1] ? pieces[1].split(":") : [];
  const groups = [...left, ...right];
  if (groups.length > 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/u.test(group))) return null;
  const expanded = pieces.length === 2
    ? [...left, ...Array(8 - groups.length).fill("0"), ...right]
    : groups;
  if (expanded.length !== 8) return null;
  return expanded.reduce((result, group) => (result << 16n) | BigInt(Number.parseInt(group, 16)), 0n);
}

function cidrContains(address, cidr) {
  const [network, prefixText] = String(cidr).split("/");
  const prefix = Number(prefixText);
  if (!Number.isInteger(prefix)) return false;
  const left4 = ipv4ToBigInt(address);
  const right4 = ipv4ToBigInt(network);
  if (left4 !== null && right4 !== null && prefix >= 0 && prefix <= 32) {
    const mask = prefix === 0 ? 0n : ((1n << BigInt(prefix)) - 1n) << BigInt(32 - prefix);
    return (left4 & mask) === (right4 & mask);
  }
  const left6 = ipv6ToBigInt(address);
  const right6 = ipv6ToBigInt(network);
  if (left6 === null || right6 === null || prefix < 0 || prefix > 128) return false;
  const mask = prefix === 0 ? 0n : ((1n << BigInt(prefix)) - 1n) << BigInt(128 - prefix);
  return (left6 & mask) === (right6 & mask);
}

function addressIsPrivate(address) {
  if (PRIVATE_IPV4.some(([network, prefix]) => cidrContains(address, `${network}/${prefix}`))) return true;
  return PRIVATE_IPV6.some((cidr) => cidrContains(address, cidr));
}

function categoryEntries(decoded, type, name, code) {
  const data = decoded?.[type];
  assert.ok(data && Array.isArray(data.entries), `OneXray decoded ${type} GeoData is required`);
  const category = data.entries.find((entry) => entry.code === code);
  assert.ok(category, `OneXray GeoData category ${code} is missing from ${name}`);
  return type === "domain" ? category.domains : category.cidrs;
}

function matchesDomainToken(domain, token, decoded) {
  const value = normalizedDomain(domain);
  if (token === "geosite:private") return value === "localhost" || value.endsWith(".local") || value.endsWith(".lan") || value.endsWith(".home.arpa");
  const ext = DOMAIN_CODE.exec(token);
  if (ext) {
    return categoryEntries(decoded, "domain", ext[1], ext[2]).some((entry) => {
      if (entry.type === 3) return value === normalizedDomain(entry.value);
      if (entry.type === 2) {
        const suffix = normalizedDomain(entry.value);
        return value === suffix || value.endsWith(`.${suffix}`);
      }
      if (entry.type === 0) return value.includes(normalizedDomain(entry.value));
      if (entry.type === 1) return new RegExp(entry.value, "u").test(value);
      return false;
    });
  }
  if (token.startsWith("full:")) return value === normalizedDomain(token.slice(5));
  if (token.startsWith("domain:")) {
    const suffix = normalizedDomain(token.slice(7));
    return value === suffix || value.endsWith(`.${suffix}`);
  }
  if (token.startsWith("keyword:")) return value.includes(normalizedDomain(token.slice(8)));
  return value === normalizedDomain(token);
}

function matchesIpToken(ip, token, decoded) {
  if (token === "geoip:private") return addressIsPrivate(ip);
  const ext = DOMAIN_CODE.exec(token);
  if (ext) return categoryEntries(decoded, "ip", ext[1], ext[2]).some(({ ip: network, prefix }) => cidrContains(ip, `${network}/${prefix}`));
  return cidrContains(ip, token.includes("/") ? token : `${token}/${String(ip).includes(":") ? 128 : 32}`);
}

function portMatches(value, expected) {
  if (expected === undefined) return true;
  const [start, end = start] = String(expected).split("-").map(Number);
  return Number.isInteger(value) && Number.isInteger(start) && Number.isInteger(end) && value >= start && value <= end;
}

function ruleMatches(rule, request, decoded) {
  if (rule.inboundTag !== undefined && (!request.inboundTag || !rule.inboundTag.includes(request.inboundTag))) return false;
  if (rule.network !== undefined && request.network !== undefined && !rule.network.split(",").includes(request.network)) return false;
  if (!portMatches(request.port, rule.port)) return false;
  const domainMatches = rule.domain?.some((token) => request.domain && matchesDomainToken(request.domain, token, decoded)) ?? false;
  const ipMatches = rule.ip?.some((token) => request.ip && matchesIpToken(request.ip, token, decoded)) ?? false;
  if (rule.domain !== undefined || rule.ip !== undefined) return domainMatches || ipMatches;
  return true;
}

/**
 * Interprets only the serialized Profile routing model. The matcher resolves
 * `ext:` references from decoded fixture GeoData instead of importing or
 * invoking OneXray's renderer internals.
 */
export function classifyOneXrayProfile(profile, request, decoded) {
  assert.ok(profile && typeof profile === "object" && profile.routing && Array.isArray(profile.routing.rules));
  for (const rule of profile.routing.rules) {
    if (ruleMatches(rule, request, decoded)) return rule.outboundTag;
  }
  throw new Error("OneXray Profile has no matching routing rule");
}

export function oneXrayPath(profile, tag, homepageTag = "proxy") {
  if (tag !== "proxy") return [tag];
  const chained = Array.isArray(profile.outbounds) && profile.outbounds.some(({ tag: outboundTag }) => outboundTag === "chainProxy");
  return chained ? [homepageTag, "chainProxy"] : [homepageTag];
}
