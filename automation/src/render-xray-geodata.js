import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import protobuf from "protobufjs";

import {
  oneXrayGeoCode,
  oneXrayGeoNames,
  ONE_XRAY_GEO_CODE_PATTERN,
} from "../../clients/onexray/src/geodata-contract.js";
import { DEFAULT_RULE_SOURCE_IDS, FULL_ADBLOCK_SOURCE_IDS } from "../../shared/rules/lightweight-policy.js";
import { normalizeRuleEntry, RULE_KIND } from "../../shared/rules/model.js";

const SCHEMA = "apple-proxy-onexray-geodata-v1";
const DOMAIN_TYPES = new Map([
  [RULE_KIND.domain, 3],
  [RULE_KIND.domainSuffix, 2],
  [RULE_KIND.domainKeyword, 0],
]);
const DOMAIN_KINDS = new Set(DOMAIN_TYPES.keys());
const IP_KINDS = new Set([RULE_KIND.ipv4Cidr, RULE_KIND.ipv6Cidr]);
const OPTIONAL_IDS = new Set(FULL_ADBLOCK_SOURCE_IDS);
const OPTIONAL_CODES = new Set(FULL_ADBLOCK_SOURCE_IDS.map((sourceId) => oneXrayGeoCode(sourceId)));
const DEFAULT_ID_ORDER = new Map(DEFAULT_RULE_SOURCE_IDS.map((id, index) => [id, index]));
const SHA256 = /^[a-f0-9]{64}$/u;
const PROVENANCE_PATTERNS = Object.freeze({
  sourceCommit: /^[a-f0-9]{7,64}$/u,
  upstreamCommit: /^[a-f0-9]{7,64}$/u,
  releaseId: /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u,
  snapshotId: /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u,
  schema: /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u,
  version: /^[0-9]+(?:\.[0-9]+){1,3}(?:[-+][A-Za-z0-9.-]+)?$/u,
  retrievedAt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u,
});
const PROTO_PATH = fileURLToPath(new URL("../proto/xray-geodata.proto", import.meta.url));
const PROTO_SOURCE = readFileSync(PROTO_PATH, "utf8");
const ROOT = protobuf.parse(PROTO_SOURCE, { keepCase: true }).root;
const GeoSiteList = ROOT.lookupType("appleproxy.xray.geodata.GeoSiteList");
const GeoIPList = ROOT.lookupType("appleproxy.xray.geodata.GeoIPList");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function compareText(left, right) {
  return left === right ? 0 : left < right ? -1 : 1;
}

function assertBuffer(buffer) {
  if (!(Buffer.isBuffer(buffer) || buffer instanceof Uint8Array)) {
    throw new TypeError("OneXray GeoData buffer must be bytes");
  }
  return Buffer.from(buffer);
}

function sourceMapFrom(snapshot) {
  if (snapshot instanceof Map) return { map: snapshot, strictDefaults: false };
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new TypeError("OneXray GeoData snapshot must be a Map or compiled result");
  }
  const map = snapshot.defaultRuleSets;
  if (map instanceof Map) return { map, strictDefaults: true };
  if (map && typeof map === "object" && !Array.isArray(map)) {
    return { map: new Map(Object.entries(map)), strictDefaults: true };
  }
  throw new TypeError("OneXray GeoData snapshot.defaultRuleSets must be a Map");
}

function sourceEntries(value, sourceId) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && Array.isArray(value.entries)) return value.entries;
  throw new TypeError(`OneXray GeoData source ${sourceId} entries are missing`);
}

function sourceIdForKey(key, value) {
  const candidate = typeof key === "string" ? key : value?.id;
  if (typeof candidate !== "string" || candidate.trim() !== candidate || candidate.length === 0) {
    throw new TypeError("OneXray GeoData source ID is missing");
  }
  if (value?.id !== undefined && value.id !== candidate) {
    throw new Error(`OneXray GeoData source ${candidate}: source ID mismatch`);
  }
  return candidate;
}

function sourceSha256(value, sourceId) {
  const candidate = value?.sourceSha256 ?? value?.source?.sha256;
  if (candidate === undefined) return undefined;
  if (typeof candidate !== "string" || !SHA256.test(candidate)) {
    throw new Error(`OneXray GeoData source ${sourceId}: source hash must be lowercase SHA-256`);
  }
  return candidate;
}

function sortedSourceRecords(snapshot) {
  const { map, strictDefaults } = sourceMapFrom(snapshot);
  const records = [];
  const seenCodes = new Map();
  for (const [key, value] of map.entries()) {
    const sourceId = sourceIdForKey(key, value);
    const code = oneXrayGeoCode(sourceId);
    if (OPTIONAL_IDS.has(sourceId) || OPTIONAL_CODES.has(code)) continue;
    const prior = seenCodes.get(code);
    if (prior) throw new Error(`OneXray GeoData duplicate category code ${code} (${prior} and ${sourceId})`);
    seenCodes.set(code, sourceId);
    records.push({
      sourceId,
      code,
      entries: sourceEntries(value, sourceId),
      sourceSha256: sourceSha256(value, sourceId),
    });
  }
  if (strictDefaults) {
    const missing = DEFAULT_RULE_SOURCE_IDS.filter((sourceId) => !seenCodes.has(oneXrayGeoCode(sourceId)));
    if (missing.length > 0) {
      throw new Error(`OneXray GeoData missing source reference: ${missing.join(", ")}`);
    }
  }
  records.sort((left, right) => (
    (DEFAULT_ID_ORDER.get(left.sourceId) ?? Number.MAX_SAFE_INTEGER)
      - (DEFAULT_ID_ORDER.get(right.sourceId) ?? Number.MAX_SAFE_INTEGER)
    || compareText(left.code, right.code)
  ));
  return records;
}

function normalizedEntries(records) {
  return records.map((record) => {
    const domains = new Map();
    const cidrs = new Map();
    for (const raw of record.entries) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new TypeError(`OneXray GeoData source ${record.sourceId} contains an invalid entry`);
      }
      if (raw.sourceId !== undefined && raw.sourceId !== record.sourceId) {
        throw new Error(`OneXray GeoData source ${record.sourceId}: entry source reference is missing`);
      }
      if (DOMAIN_KINDS.has(raw.kind)) {
        const entry = normalizeRuleEntry({ ...raw, sourceId: record.sourceId });
        const key = `${entry.kind}\0${entry.value}`;
        const existing = domains.get(key);
        domains.set(key, existing && existing.noResolve
          ? existing
          : existing && entry.noResolve
            ? Object.freeze({ ...existing, noResolve: true })
            : entry);
      } else if (IP_KINDS.has(raw.kind)) {
        const entry = normalizeRuleEntry({ ...raw, sourceId: record.sourceId });
        const key = `${entry.kind}\0${entry.value}`;
        const existing = cidrs.get(key);
        cidrs.set(key, existing && existing.noResolve
          ? existing
          : existing && entry.noResolve
            ? Object.freeze({ ...existing, noResolve: true })
            : entry);
      } else if (!Object.values(RULE_KIND).includes(raw.kind)) {
        throw new TypeError(`OneXray GeoData source ${record.sourceId}: rule kind is invalid`);
      }
    }
    const sortEntry = (left, right) => (
      DOMAIN_TYPES.get(left.kind) - DOMAIN_TYPES.get(right.kind)
      || compareText(left.value, right.value)
      || Number(left.noResolve) - Number(right.noResolve)
    );
    const sortCidr = (left, right) => (
      compareText(left.kind, right.kind) || compareText(left.value, right.value)
    );
    const inputSha256 = sha256(Buffer.from(JSON.stringify({
      sourceId: record.sourceId,
      domains: [...domains.values()].sort(sortEntry).map((entry) => [entry.kind, entry.value, entry.noResolve]),
      cidrs: [...cidrs.values()].sort(sortCidr).map((entry) => [entry.kind, entry.value, entry.noResolve]),
    })));
    return {
      ...record,
      domains: [...domains.values()].sort(sortEntry),
      cidrs: [...cidrs.values()].sort(sortCidr),
      inputSha256,
    };
  });
}

function cidrBytes(entry) {
  const [network, prefixText] = entry.value.split("/");
  const prefix = Number(prefixText);
  if (entry.kind === RULE_KIND.ipv4Cidr) {
    const octets = network.split(".").map(Number);
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
      throw new Error(`OneXray GeoData invalid IPv4 prefix ${entry.value}`);
    }
    return { ip: Uint8Array.from(octets), prefix };
  }
  const groups = expandIPv6(network);
  const bytes = new Uint8Array(16);
  groups.forEach((group, index) => {
    bytes[index * 2] = group >> 8;
    bytes[index * 2 + 1] = group & 0xff;
  });
  return { ip: bytes, prefix };
}

function expandIPv6(address) {
  const pieces = address.toLowerCase().split("::");
  if (pieces.length > 2) throw new Error(`OneXray GeoData invalid IPv6 prefix ${address}`);
  const left = pieces[0] ? pieces[0].split(":") : [];
  const right = pieces.length === 2 && pieces[1] ? pieces[1].split(":") : [];
  const groups = [...left, ...right];
  if (groups.some((group) => !/^[0-9a-f]{1,4}$/u.test(group))) {
    throw new Error(`OneXray GeoData invalid IPv6 prefix ${address}`);
  }
  const missing = 8 - groups.length;
  if ((pieces.length === 1 && missing !== 0) || (pieces.length === 2 && missing < 1)) {
    throw new Error(`OneXray GeoData invalid IPv6 prefix ${address}`);
  }
  return [...left, ...Array(missing).fill("0"), ...right].map((group) => Number.parseInt(group, 16));
}

function renderDomainData(records) {
  return GeoSiteList.encode(GeoSiteList.create({
    entry: records.map((record) => ({
      country_code: record.code,
      domain: record.domains.map((entry) => ({
        type: DOMAIN_TYPES.get(entry.kind),
        value: entry.value,
      })),
    })),
  })).finish();
}

function renderIpData(records) {
  return GeoIPList.encode(GeoIPList.create({
    entry: records.map((record) => ({
      country_code: record.code,
      cidr: record.cidrs.map((entry) => cidrBytes(entry)),
    })),
  })).finish();
}

function typeName(type) {
  if (type === "domain" || type === "geosite" || type === "site") return "domain";
  if (type === "ip" || type === "geoip") return "ip";
  throw new TypeError("OneXray GeoData type must be domain or ip");
}

function decodeRaw(buffer, type) {
  const bytes = assertBuffer(buffer);
  const normalizedType = typeName(type);
  const Message = normalizedType === "domain" ? GeoSiteList : GeoIPList;
  let message;
  try {
    message = Message.decode(bytes);
  } catch (error) {
    throw new Error(`OneXray GeoData decode failed: ${error.message}`);
  }
  const verification = Message.verify(message);
  if (verification) throw new Error(`OneXray GeoData schema validation failed: ${verification}`);
  if (!Array.isArray(message.entry)) throw new Error("OneXray GeoData schema validation failed: entry is missing");

  const codes = new Set();
  const entries = message.entry.map((item) => {
    if (typeof item.country_code !== "string" || !ONE_XRAY_GEO_CODE_PATTERN.test(item.country_code)) {
      throw new Error("OneXray GeoData missing or invalid category code");
    }
    if (codes.has(item.country_code)) throw new Error(`OneXray GeoData duplicate category code ${item.country_code}`);
    codes.add(item.country_code);
    if (normalizedType === "domain") {
      if (!Array.isArray(item.domain)) throw new Error("OneXray GeoData domain list is missing");
      return {
        code: item.country_code,
        domains: item.domain.map((domain) => {
          if (![0, 1, 2, 3].includes(domain.type) || typeof domain.value !== "string" || domain.value.length === 0) {
            throw new Error("OneXray GeoData contains an invalid domain");
          }
          return { type: domain.type, value: domain.value };
        }),
      };
    }
    if (!Array.isArray(item.cidr)) throw new Error("OneXray GeoData CIDR list is missing");
    return {
      code: item.country_code,
      cidrs: item.cidr.map((cidr) => {
        const ip = Buffer.from(cidr.ip ?? []);
        if (![4, 16].includes(ip.length) || !Number.isInteger(cidr.prefix)
          || cidr.prefix < 0 || cidr.prefix > ip.length * 8) {
          throw new Error("OneXray GeoData contains an invalid CIDR prefix");
        }
        return { ip: renderIp(ip), prefix: cidr.prefix };
      }),
    };
  });
  const ruleCount = entries.reduce((total, item) => total + (item.domains ?? item.cidrs).length, 0);
  return Object.freeze({
    type: normalizedType,
    schema: normalizedType === "domain" ? "GeoSiteList" : "GeoIPList",
    entries: Object.freeze(entries.map((item) => Object.freeze(item))),
    categoryCount: entries.length,
    ruleCount,
    sourceCount: entries.length,
  });
}

function renderIp(ip) {
  if (ip.length === 4) return [...ip].join(".");
  const groups = [];
  for (let index = 0; index < 16; index += 2) groups.push(((ip[index] << 8) | ip[index + 1]).toString(16));
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
  if (bestStart < 0) return groups.join(":");
  const left = groups.slice(0, bestStart).join(":");
  const right = groups.slice(bestStart + bestLength).join(":");
  return `${left}::${right}`;
}

/** Decodes and validates one Xray GeoData binary into a stable test/manifest shape. */
export function decodeXrayGeoData(buffer, type) {
  return decodeRaw(buffer, type);
}

function manifestFor({ channel, names, records, domain, ip, provenance }) {
  const domains = decodeRaw(domain, "domain");
  const ips = decodeRaw(ip, "ip");
  const sourceCounts = records.map((record) => ({
    id: record.sourceId,
    code: record.code,
    domain: record.domains.length,
    ip: record.cidrs.length,
    inputSha256: record.inputSha256,
    ...(record.sourceSha256 ? { sourceSha256: record.sourceSha256 } : {}),
  }));
  const inputHashes = Object.fromEntries(records.map((record) => [record.sourceId, record.inputSha256]));
  const aggregateInputSha256 = sha256(Buffer.from(JSON.stringify(inputHashes)));
  const safeProvenance = provenance && typeof provenance === "object" && !Array.isArray(provenance)
    ? Object.fromEntries(Object.entries(provenance)
      .filter(([key, value]) => (
        Object.hasOwn(PROVENANCE_PATTERNS, key)
        && typeof value === "string"
        && PROVENANCE_PATTERNS[key].test(value)
      ))
      .sort(([left], [right]) => compareText(left, right)))
    : {};
  return Object.freeze({
    schema: SCHEMA,
    channel,
    names: Object.freeze({ ...names }),
    provenance: Object.freeze({
      source: "shared-lightweight-rule-snapshot",
      inputSha256: aggregateInputSha256,
      inputSourceCount: records.length,
      ...safeProvenance,
    }),
    sourceCount: records.length,
    sources: Object.freeze(sourceCounts.map((item) => Object.freeze(item))),
    inputHashes: Object.freeze(inputHashes),
    domain: Object.freeze({
      name: names.domain,
      sha256: sha256(domain),
      byteLength: domain.length,
      categoryCount: domains.categoryCount,
      ruleCount: domains.ruleCount,
    }),
    ip: Object.freeze({
      name: names.ip,
      sha256: sha256(ip),
      byteLength: ip.length,
      categoryCount: ips.categoryCount,
      ruleCount: ips.ruleCount,
    }),
    hashes: Object.freeze({ domain: sha256(domain), ip: sha256(ip) }),
    counts: Object.freeze({
      domainCategories: domains.categoryCount,
      domainRules: domains.ruleCount,
      ipCategories: ips.categoryCount,
      ipRules: ips.ruleCount,
    }),
  });
}

/** Compiles the shared rule snapshot to deterministic Xray geosite/geoip bytes. */
export function renderXrayGeoData(snapshot, channel) {
  const names = oneXrayGeoNames(channel);
  const records = normalizedEntries(sortedSourceRecords(snapshot));
  const domain = Buffer.from(renderDomainData(records));
  const ip = Buffer.from(renderIpData(records));

  // Decode immediately. This catches schema, duplicate-category, invalid-CIDR,
  // and count regressions before callers can publish a partially valid pair.
  const decodedDomain = decodeRaw(domain, "domain");
  const decodedIp = decodeRaw(ip, "ip");
  if (decodedDomain.categoryCount !== records.length || decodedIp.categoryCount !== records.length) {
    throw new Error("OneXray GeoData category count mismatch");
  }
  const expectedHashes = snapshot?.expectedHashes ?? snapshot?.manifest?.hashes;
  if (expectedHashes && typeof expectedHashes === "object") {
    if (expectedHashes.domain !== undefined && expectedHashes.domain !== sha256(domain)) {
      throw new Error("OneXray GeoData domain hash mismatch");
    }
    if (expectedHashes.ip !== undefined && expectedHashes.ip !== sha256(ip)) {
      throw new Error("OneXray GeoData IP hash mismatch");
    }
  }
  const result = {
    channel,
    names,
    domain,
    ip,
    manifest: manifestFor({
      channel,
      names,
      records,
      domain,
      ip,
      provenance: snapshot?.provenance ?? snapshot?.manifest?.provenance,
    }),
  };
  Object.defineProperties(result, {
    geosite: { value: domain, enumerable: false },
    geoip: { value: ip, enumerable: false },
    domainBuffer: { value: domain, enumerable: false },
    ipBuffer: { value: ip, enumerable: false },
  });
  return Object.freeze(result);
}

export const XRAY_GEODATA_SCHEMA = SCHEMA;
