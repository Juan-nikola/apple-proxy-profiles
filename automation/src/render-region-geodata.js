import { oneXrayGeoCode, oneXrayGeoNames } from "../../clients/onexray/src/geodata-contract.js";
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
    const declared = new Set(Array.isArray(value.sources) ? value.sources : []);
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
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.hostname === "localhost" || url.hostname.endsWith(".localhost") || url.hostname.endsWith(".local") || /\.\./u.test(url.pathname)) throw new TypeError("publicBase must be a public HTTPS URL");
  const ip = url.hostname;
  if (/^(?:127\.|10\.|192\.168\.|169\.254\.)/u.test(ip) || /^172\.(?:1[6-9]|2\d|3[01])\./u.test(ip) || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd")) throw new TypeError("publicBase must be a public HTTPS URL");
  return url;
}

export function regionGeoCode(sourceId) { return oneXrayGeoCode(sourceId); }
