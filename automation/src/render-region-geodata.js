import { oneXrayGeoCode, oneXrayGeoNames } from "../../clients/onexray/src/geodata-contract.js";
import { isIP } from "node:net";
import { renderXrayGeoData } from "./render-xray-geodata.js";
import { artifactSha256 } from "./artifact-content.js";

const REGIONS = new Set(["cn", "global", "ru", "ir"]);
const CHANNELS = new Set(["edge", "current", "previous"]);
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

function validate({ region, channel }) {
  if (!REGIONS.has(region)) throw new RangeError(`Unsupported GeoData region: ${region}`);
  if (!CHANNELS.has(channel)) throw new RangeError(`Unsupported GeoData channel: ${channel}`);
}

function sourceMap(ruleSets, provenance = []) {
  if (!(ruleSets instanceof Map)) throw new TypeError("Region GeoData ruleSets must be a Map");
  const map = new Map();
  for (const [id, value] of ruleSets) {
    if (!value || typeof value !== "object" || !Array.isArray(value.entries)) throw new TypeError(`Region GeoData rule set ${id} is malformed`);
    // Compiled rule sets may carry their input source IDs (for example
    // DomesticGame <- Game) while their normalized entries use the stable
    // output rule-set ID. Accept both identities and retain the output ID in
    // the GeoData category so transformed sets remain deterministic.
    const declared = new Set([id, ...(Array.isArray(value.sources) ? value.sources : [])]);
    const bySource = new Map();
    for (const entry of value.entries) {
      const sourceId = entry.sourceId;
      if (typeof sourceId !== "string" || !SAFE_ID.test(sourceId) || (declared.size > 0 && !declared.has(sourceId))) throw new Error(`Region GeoData entry/source identity mismatch: ${sourceId}`);
      const entries = bySource.get(sourceId) ?? [];
      entries.push({ ...entry, sourceId });
      bySource.set(sourceId, entries);
    }
    for (const [sourceId, entries] of bySource) {
      if (map.has(sourceId)) throw new Error(`Duplicate region GeoData source ID: ${sourceId}`);
      const audit = provenance.find((item) => item?.sourceId === sourceId);
      map.set(sourceId, { id: sourceId, entries, ...(audit?.sha256 ? { sourceSha256: audit.sha256 } : {}) });
    }
  }
  return map;
}

export function renderRegionGeoData({ ruleSets, region, channel, provenance = [] }) {
  validate({ region, channel });
  const rendered = renderXrayGeoData(sourceMap(ruleSets, provenance), channel);
  const sourceCodes = [...rendered.manifest.sources].map(({ id, code }) => ({ id, code }));
  return Object.freeze({
    ...rendered,
    geosite: rendered.domain,
    geoip: rendered.ip,
    region,
    sourceCodes: Object.freeze(sourceCodes),
    manifest: Object.freeze({ ...rendered.manifest, region, sourceCodes: Object.freeze(sourceCodes) }),
  });
}

export function buildRegionGeoDataArtifacts({ merged, region, channel, publicBase } = {}) {
  validate({ region, channel });
  if (!merged || !(merged.ruleSets instanceof Map)) throw new TypeError("Region GeoData merged.ruleSets must be a Map");
  if (publicBase !== undefined) validatePublicBase(publicBase);
  const rendered = renderRegionGeoData({ ruleSets: merged.ruleSets, region, channel, provenance: merged.provenance });
  const names = oneXrayGeoNames(channel);
  const manifest = Object.freeze({
    ...rendered.manifest,
    schemaVersion: 1,
    region,
    channel,
    names,
    hashes: Object.freeze({ domain: artifactSha256(rendered.domain), ip: artifactSha256(rendered.ip) }),
    sources: rendered.manifest.sources,
    provenance: Object.freeze({
      ...(rendered.manifest.provenance ?? {}),
      sources: Object.freeze((merged.provenance ?? []).map((item) => Object.freeze({ ...item }))),
      diagnostics: merged.diagnostics ?? {},
    }),
    ...(typeof publicBase === "string" && publicBase.length > 0 ? {
      urls: Object.freeze({
        domain: `${publicBase.replace(/\/$/u, "")}/${region}/${names.domain}.dat`,
        ip: `${publicBase.replace(/\/$/u, "")}/${region}/${names.ip}.dat`,
      }),
    } : {}),
  });
  return Object.freeze({ geosite: rendered.domain, geoip: rendered.ip, manifest });
}

function validatePublicBase(value) {
  if (typeof value !== "string" || !value || /[\x00-\x20\\]/u.test(value) || /(?:^|\/)\.\.(?:\/|$)/u.test(value)) throw new TypeError("publicBase must be a public HTTPS URL");
  let url;
  try { url = new URL(value); } catch { throw new TypeError("publicBase must be a public HTTPS URL"); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || /(?:localhost|\.local$|\.internal$|\.invalid$)/u.test(url.hostname) || /\.\./u.test(url.pathname)) throw new TypeError("publicBase must be a public HTTPS URL");
  const host = url.hostname.replace(/^\[|\]$/gu, "");
  if (isIP(host) && isPrivateAddress(host)) throw new TypeError("publicBase must be a public HTTPS URL");
  return url;
}

function isPrivateAddress(address) {
  const v4 = isIP(address) === 4;
  if (v4) {
    const n = address.split(".").reduce((value, part) => value * 256 + Number(part), 0) >>> 0;
    return [[0, 8], [167772160, 8], [1681915904, 10], [2130706432, 8], [2851995648, 16], [2886729728, 12], [3221225472, 24], [3221225984, 24], [3232235520, 16], [3323068416, 15], [3325256704, 24], [3405803776, 24], [4026531840, 4]].some(([base, bits]) => (n >>> (32 - bits)) === (base >>> (32 - bits)));
  }
  const mapped = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/iu);
  if (mapped && isIP(mapped[1]) === 4) return isPrivateAddress(mapped[1]);
  const pieces = address.toLowerCase().split("::");
  const left = pieces[0] ? pieces[0].split(":") : [];
  const right = pieces[1] ? pieces[1].split(":") : [];
  const groups = [...left, ...Array(8 - left.length - right.length).fill("0"), ...right].map((part) => parseInt(part || "0", 16));
  if (groups.length !== 8 || groups.some((part) => !Number.isInteger(part) || part < 0 || part > 0xffff)) return true;
  if (groups.slice(0, 5).every((part) => part === 0) && groups[5] === 0xffff) {
    return isPrivateAddress(`${groups[6] >> 8}.${groups[6] & 255}.${groups[7] >> 8}.${groups[7] & 255}`);
  }
  const first = groups[0];
  return groups.every((part) => part === 0) || address === "::1" || (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00 || (groups[0] === 0x2001 && groups[1] === 0x0db8);
}

export function regionGeoCode(sourceId) { return oneXrayGeoCode(sourceId); }
