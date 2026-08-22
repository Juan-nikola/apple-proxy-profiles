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

function sourceMap(ruleSets) {
  if (!(ruleSets instanceof Map)) throw new TypeError("Region GeoData ruleSets must be a Map");
  const map = new Map();
  for (const [id, value] of ruleSets) {
    if (!value || typeof value !== "object" || !Array.isArray(value.entries)) throw new TypeError(`Region GeoData rule set ${id} is malformed`);
    const sourceId = Array.isArray(value.sources) && value.sources.length > 0 ? value.sources[0] : id;
    if (typeof sourceId !== "string" || !SAFE_ID.test(sourceId)) throw new TypeError(`Region GeoData source ID is invalid: ${sourceId}`);
    const entries = value.entries.map((entry) => ({ ...entry, sourceId }));
    if (map.has(sourceId)) throw new Error(`Duplicate region GeoData source ID: ${sourceId}`);
    map.set(sourceId, { id: sourceId, entries });
  }
  return map;
}

export function renderRegionGeoData({ ruleSets, region, channel }) {
  validate({ region, channel });
  const rendered = renderXrayGeoData(sourceMap(ruleSets), channel);
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
  const rendered = renderRegionGeoData({ ruleSets: merged.ruleSets, region, channel });
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

export function regionGeoCode(sourceId) { return oneXrayGeoCode(sourceId); }
