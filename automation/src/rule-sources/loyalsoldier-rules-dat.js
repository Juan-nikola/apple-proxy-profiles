import { readFileSync } from "node:fs";
import protobuf from "protobufjs";
import { RULE_KIND, normalizeRuleEntry } from "../../../shared/rules/model.js";

const ROOT = protobuf.parse(readFileSync(new URL("../../proto/xray-geodata.proto", import.meta.url), "utf8")).root;
const GeoSiteList = ROOT.lookupType("appleproxy.xray.geodata.GeoSiteList");
const GeoIPList = ROOT.lookupType("appleproxy.xray.geodata.GeoIPList");
const DOMAIN_TYPES = { Plain: RULE_KIND.domainKeyword, RootDomain: RULE_KIND.domainSuffix, Full: RULE_KIND.domain };
function bump(map, key) { map[key] = (map[key] ?? 0) + 1; }

function textParse(text, sourceId) {
  const entries = []; const categories = []; const unsupportedByReason = {};
  let candidateCount = 0; let comments = 0;
  for (const [index, raw] of text.replace(/\r\n?/gu, "\n").split("\n").entries()) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) { comments += 1; continue; }
    const [category, spec, ...rest] = line.split("|");
    if (!category || !spec || rest.length > 1) throw new Error(`External source ${sourceId}: malformed record ${index + 1}`);
    candidateCount += 1;
    if (!categories.some(({ id }) => id === category)) categories.push({ id: category, sourceId });
    const kinds = { domain: RULE_KIND.domain, "domain:suffix": RULE_KIND.domainSuffix, "domain:keyword": RULE_KIND.domainKeyword, cidr: RULE_KIND.ipv4Cidr, cidr6: RULE_KIND.ipv6Cidr };
    const kind = kinds[spec] ?? kinds[spec.split(":")[0]];
    const kindText = spec.split(":")[0];
    if (!kind) {
      bump(unsupportedByReason, `unsupported-${kindText.toLowerCase() === "regex" ? "domain-regex" : kindText.toLowerCase()}`);
      continue;
    }
    const content = rest[0] ?? (spec.includes(":") ? spec.slice(spec.indexOf(":") + 1) : undefined);
    try { entries.push({ ...normalizeRuleEntry({ kind, value: content, noResolve: kind.includes("Cidr"), sourceId }), category, categoryId: category }); }
    catch { throw new Error(`External source ${sourceId}: malformed record ${index + 1}`); }
  }
  return { entries, categories, diagnostics: { candidateCount, parsedCount: entries.length, unsupportedCount: Object.values(unsupportedByReason).reduce((a, b) => a + b, 0), unsupportedByReason, comments } };
}

function bytesToAddress(bytes) {
  if (bytes.length === 4) return [...bytes].join(".");
  if (bytes.length !== 16) throw new Error("unsupported CIDR address length");
  const groups = [];
  for (let i = 0; i < 16; i += 2) groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
  return groups.join(":");
}

function binaryParse(buffer, sourceId) {
  let site = null; let geoip = null;
  try { site = GeoSiteList.decode(buffer); } catch { /* try geoip */ }
  try { geoip = GeoIPList.decode(buffer); } catch { /* unsupported */ }
  const siteCount = site?.entry.reduce((n, group) => n + group.domain.length, 0) ?? 0;
  const ipCount = geoip?.entry.reduce((n, group) => n + group.cidr.length, 0) ?? 0;
  if (siteCount === 0 && ipCount === 0) throw new Error(`External source ${sourceId}: unsupported geodata payload`);
  if (ipCount > 0 && siteCount === 0) return binaryGeoip(geoip, sourceId);
  return binaryGeosite(site, sourceId);
}

function binaryGeosite(message, sourceId) {
  const entries = []; const categories = []; const categoryCandidateCounts = {}; const unsupportedByReason = {}; let candidateCount = 0; let unsupportedCount = 0;
  for (const group of message.entry) {
    const category = group.countryCode; categories.push({ id: category, sourceId });
    for (const domain of group.domain) {
      candidateCount += 1;
      categoryCandidateCounts[category] = (categoryCandidateCounts[category] ?? 0) + 1;
      const kind = DOMAIN_TYPES[domain.type] ?? ({ 0: RULE_KIND.domainKeyword, 2: RULE_KIND.domainSuffix, 3: RULE_KIND.domain }[domain.type]);
      if (!kind) {
        unsupportedCount += 1;
        unsupportedByReason["unsupported-domain-type"] = (unsupportedByReason["unsupported-domain-type"] ?? 0) + 1;
        continue;
      }
      try {
        entries.push({ ...normalizeRuleEntry({ kind, value: domain.value, sourceId }), category, categoryId: category });
      } catch {
        unsupportedCount += 1;
        unsupportedByReason["malformed-domain"] = (unsupportedByReason["malformed-domain"] ?? 0) + 1;
      }
    }
  }
  return { entries, categories, diagnostics: { candidateCount, categoryCandidateCounts, parsedCount: entries.length, unsupportedCount, unsupportedByReason } };
}

function binaryGeoip(message, sourceId) {
  const entries = []; const categories = []; let candidateCount = 0;
  for (const group of message.entry) {
    const category = group.countryCode; categories.push({ id: category, sourceId });
    for (const cidr of group.cidr) {
      candidateCount += 1;
      const bytes = Buffer.from(cidr.ip);
      const version = bytes.length === 4 ? 4 : bytes.length === 16 ? 6 : null;
      if (!version) throw new Error(`External source ${sourceId}: unsupported CIDR address length`);
      const kind = version === 4 ? RULE_KIND.ipv4Cidr : RULE_KIND.ipv6Cidr;
      entries.push({ ...normalizeRuleEntry({ kind, value: `${bytesToAddress(bytes)}/${cidr.prefix}`, noResolve: true, sourceId }), category, categoryId: category });
    }
  }
  return { entries, categories, diagnostics: { candidateCount, parsedCount: entries.length, unsupportedCount: 0, unsupportedByReason: {} } };
}

export function parseLoyalsoldierRulesDat({ text, sourceId }) {
  if (Buffer.isBuffer(text)) return binaryParse(text, sourceId);
  return textParse(text, sourceId);
}
