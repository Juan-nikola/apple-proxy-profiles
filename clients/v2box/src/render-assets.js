import { oneXrayGeoNames } from "../../onexray/src/geodata-contract.js";
import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";
import { validatePublicBase, V2BOX_PUBLIC_ROOT } from "./asset-url.js";

const REGIONS = new Set(["cn", "global", "ru", "ir"]);
const HASH = /^[a-f0-9]{64}$/u;

export function renderV2BoxAssetManifest({ region, channel = "current", publicBase = V2BOX_PUBLIC_ROOT, geositeSha256, geoipSha256 } = {}) {
  if (!REGIONS.has(region) || !FRONTIER_CHANNELS.includes(channel)) throw new Error("V2Box asset region/channel is invalid");
  const parsed = validatePublicBase(publicBase);
  if (!HASH.test(geositeSha256) || !HASH.test(geoipSha256)) throw new Error("V2Box asset hash is invalid");
  const names = oneXrayGeoNames(channel);
  const base = `${parsed.origin}${parsed.root}`;
  return Object.freeze({ region, channel, names, hashes: Object.freeze({ geosite: geositeSha256, geoip: geoipSha256 }), geosite: Object.freeze({ name: names.domain, url: `${base}/${channel}/geodata/${region}/${names.domain}.dat`, sha256: geositeSha256 }), geoip: Object.freeze({ name: names.ip, url: `${base}/${channel}/geodata/${region}/${names.ip}.dat`, sha256: geoipSha256 }) });
}
