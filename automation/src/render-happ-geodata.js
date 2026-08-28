import { readFileSync } from "node:fs";

import protobuf from "protobufjs";

import { parseCanonicalCidr, RULE_KIND } from "../../shared/rules/model.js";
import {
  HAPP_GEOSITE_ALIASES,
  HAPP_GEOIP_ALIASES,
  HAPP_PRIVATE_DOMAINS,
  HAPP_PRIVATE_IPV4,
  HAPP_PRIVATE_IPV6,
} from "../../shared/happ-geodata-contract.js";

const SCHEMA = protobuf.parse(readFileSync(new URL("../../clients/happ/proto/geodata.proto", import.meta.url), "utf8")).root;
const GeoSiteList = SCHEMA.lookupType("xray.app.router.GeoSiteList");
const GeoIPList = SCHEMA.lookupType("xray.app.router.GeoIPList");
const DOMAIN_TYPE = Object.freeze({
  [RULE_KIND.domainKeyword]: "Plain",
  [RULE_KIND.domainSuffix]: "Domain",
  [RULE_KIND.domain]: "Full",
});
const OMITTED_SOURCE_IDS = new Set(["Advertising", "Advertising_Domain"]);

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalIpBytes(value, version) {
  const { network } = parseCanonicalCidr(value, version);
  const bytes = Buffer.alloc(version === 4 ? 4 : 16);
  for (let index = bytes.length - 1, remaining = network; index >= 0; index -= 1, remaining >>= 8n) {
    bytes[index] = Number(remaining & 255n);
  }
  return bytes;
}

function sourceIdFor(mapId, ruleSet) {
  if (!ruleSet || typeof ruleSet !== "object" || !Array.isArray(ruleSet.entries)) {
    throw new TypeError(`Happ geodata rule set ${mapId} is malformed`);
  }
  if (typeof ruleSet.id !== "string" || ruleSet.id !== mapId) {
    throw new TypeError(`Happ geodata rule set ${mapId} has an invalid ID`);
  }
  return mapId;
}

function sourceEntries(ruleSets) {
  if (!(ruleSets instanceof Map)) throw new TypeError("Happ geodata rule sets must be a Map");
  return [...ruleSets]
    .map(([id, set]) => [sourceIdFor(id, set), set.entries])
    .filter(([id]) => !OMITTED_SOURCE_IDS.has(id))
    .sort(([left], [right]) => compareText(left, right));
}

function labelFor(id) {
  return HAPP_GEOSITE_ALIASES[id] ?? id.toUpperCase();
}

function ipLabelFor(id) {
  return HAPP_GEOIP_ALIASES[id] ?? labelFor(id);
}

function geoSiteEntry(id, entries) {
  const domain = [];
  for (const entry of entries) {
    const type = DOMAIN_TYPE[entry.kind];
    if (type) domain.push({ type, value: entry.value });
    else if (entry.kind !== RULE_KIND.ipv4Cidr && entry.kind !== RULE_KIND.ipv6Cidr) {
      throw new Error(`unsupported Happ geodata rule kind: ${entry.kind}`);
    }
  }
  if (domain.length === 0) return null;
  domain.sort((left, right) => GeoSiteList.root.lookupEnum("xray.app.router.Domain.Type").values[left.type]
    - GeoSiteList.root.lookupEnum("xray.app.router.Domain.Type").values[right.type]
    || compareText(left.value, right.value));
  return { countryCode: labelFor(id), domain };
}

function geoIpEntry(id, entries) {
  const cidr = [];
  for (const entry of entries) {
    if (entry.kind === RULE_KIND.ipv4Cidr) cidr.push({ ip: canonicalIpBytes(entry.value, 4), prefix: parseCanonicalCidr(entry.value, 4).prefix });
    else if (entry.kind === RULE_KIND.ipv6Cidr) cidr.push({ ip: canonicalIpBytes(entry.value, 6), prefix: parseCanonicalCidr(entry.value, 6).prefix });
    else if (!DOMAIN_TYPE[entry.kind]) throw new Error(`unsupported Happ geodata rule kind: ${entry.kind}`);
  }
  if (cidr.length === 0) return null;
  cidr.sort((left, right) => Buffer.compare(left.ip, right.ip) || left.prefix - right.prefix);
  return { countryCode: ipLabelFor(id), cidr, reverseMatch: false };
}

function mergeGeositeEntries(entries) {
  const merged = new Map();
  for (const entry of entries) {
    const current = merged.get(entry.countryCode) ?? { countryCode: entry.countryCode, domain: [] };
    for (const domain of entry.domain) current.domain.push(domain);
    merged.set(entry.countryCode, current);
  }
  return [...merged.values()].sort((left, right) => compareText(left.countryCode, right.countryCode)).map((entry) => ({
    ...entry,
    domain: [...new Map(entry.domain.map((item) => [`${item.type}\0${item.value}`, item])).values()]
      .sort((left, right) => GeoSiteList.root.lookupEnum("xray.app.router.Domain.Type").values[left.type]
        - GeoSiteList.root.lookupEnum("xray.app.router.Domain.Type").values[right.type]
        || compareText(left.value, right.value)),
  }));
}

function mergeGeoipEntries(entries) {
  const merged = new Map();
  for (const entry of entries) {
    const current = merged.get(entry.countryCode) ?? { countryCode: entry.countryCode, cidr: [], reverseMatch: false };
    for (const cidr of entry.cidr) current.cidr.push(cidr);
    merged.set(entry.countryCode, current);
  }
  return [...merged.values()].sort((left, right) => compareText(left.countryCode, right.countryCode)).map((entry) => ({
    ...entry,
    cidr: [...new Map(entry.cidr.map((item) => [`${item.ip.toString("hex")}\0${item.prefix}`, item])).values()]
      .sort((left, right) => Buffer.compare(left.ip, right.ip) || left.prefix - right.prefix),
  }));
}

function privateGeositeEntry() {
  return {
    countryCode: "PRIVATE",
    domain: HAPP_PRIVATE_DOMAINS.map((value) => ({ type: "Domain", value })),
  };
}

function privateGeoipEntry() {
  const cidr = [
    ...HAPP_PRIVATE_IPV4.map((value) => ({ ip: canonicalIpBytes(value, 4), prefix: parseCanonicalCidr(value, 4).prefix })),
    ...HAPP_PRIVATE_IPV6.map((value) => ({ ip: canonicalIpBytes(value, 6), prefix: parseCanonicalCidr(value, 6).prefix })),
  ];
  return { countryCode: "PRIVATE", cidr, reverseMatch: false };
}

function decodeList(type, buffer) {
  if (!Buffer.isBuffer(buffer)) throw new TypeError("Happ geodata file must be a Buffer");
  const message = type.decode(buffer);
  const error = type.verify(message);
  if (error) throw new Error(`Happ geodata validation failed: ${error}`);
  return type.toObject(message, { enums: String, bytes: Buffer, defaults: true, arrays: true });
}

function decodedEntries(list, key) {
  return list.entry.map((entry) => ({
    countryCode: entry.countryCode,
    [key]: entry[key].map((item) => key === "domain"
      ? { type: item.type, value: item.value }
      : { ip: Buffer.from(item.ip).toString("hex"), prefix: item.prefix }),
    ...(key === "cidr" ? { reverseMatch: entry.reverseMatch } : {}),
  }));
}

/** Decode the two deterministic Xray geodata buffers generated for Happ. */
export function decodeHappGeodata(files) {
  if (!(files instanceof Map)) throw new TypeError("Happ geodata files must be a Map");
  if (files.size !== 2 || !files.has("happ/geosite.dat") || !files.has("happ/geoip.dat")) {
    throw new Error("Happ geodata files must contain exactly geosite.dat and geoip.dat");
  }
  return {
    geosite: decodedEntries(decodeList(GeoSiteList, files.get("happ/geosite.dat")), "domain"),
    geoip: decodedEntries(decodeList(GeoIPList, files.get("happ/geoip.dat")), "cidr"),
  };
}

/** Compile compacted lightweight rules into the Xray geodata files used by Happ. */
export function renderHappGeodata(ruleSets) {
  const sources = sourceEntries(ruleSets);
  const geosite = mergeGeositeEntries([
    privateGeositeEntry(),
    ...sources.map(([id, entries]) => geoSiteEntry(id, entries)).filter(Boolean),
  ]);
  const geoip = mergeGeoipEntries([
    privateGeoipEntry(),
    ...sources.map(([id, entries]) => geoIpEntry(id, entries)).filter(Boolean),
  ]);
  const files = new Map([
    ["happ/geosite.dat", Buffer.from(GeoSiteList.encode(GeoSiteList.fromObject({ entry: geosite })).finish())],
    ["happ/geoip.dat", Buffer.from(GeoIPList.encode(GeoIPList.fromObject({ entry: geoip })).finish())],
  ]);
  decodeHappGeodata(files);
  return Object.freeze({
    files,
    counts: Object.freeze({
      geosite: geosite.length,
      geoip: geoip.length,
      domains: geosite.reduce((total, entry) => total + entry.domain.length, 0),
      cidrs: geoip.reduce((total, entry) => total + entry.cidr.length, 0),
    }),
  });
}
