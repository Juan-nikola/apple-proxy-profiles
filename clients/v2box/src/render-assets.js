import { oneXrayGeoNames } from "../../onexray/src/geodata-contract.js";
import { FRONTIER_CHANNELS } from "../../../shared/release/frontier-manifest.js";

const ROOT = "https://juan-nikola.github.io/apple-proxy-profiles";
const REGIONS = new Set(["cn", "global", "ru", "ir"]);
const HASH = /^[a-f0-9]{64}$/u;

export function renderV2BoxAssetManifest({ region, channel = "current", publicBase = ROOT, geositeSha256, geoipSha256 } = {}) {
  if (!REGIONS.has(region) || !FRONTIER_CHANNELS.includes(channel)) throw new Error("V2Box asset region/channel is invalid");
  let parsed; try { parsed = new URL(publicBase); } catch { throw new Error("V2Box asset publicBase is invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port || /^https:\/\/[^/]*:/u.test(publicBase) || parsed.search || parsed.hash || /[\s\\]/u.test(publicBase) || /(?:localhost|\.local$|\.internal$|\.invalid$)/u.test(parsed.hostname) || parsed.hostname.includes(":") || /^\d+(?:\.\d+){0,3}$/u.test(parsed.hostname) || /(?:^|\/)\.\.(?:\/|$)/u.test(publicBase)) throw new Error("V2Box asset publicBase is invalid");
  if (!HASH.test(geositeSha256) || !HASH.test(geoipSha256)) throw new Error("V2Box asset hash is invalid");
  const names = oneXrayGeoNames(channel);
  const base = publicBase.replace(/\/$/u, "");
  return Object.freeze({ region, channel, names, hashes: Object.freeze({ geosite: geositeSha256, geoip: geoipSha256 }), geosite: Object.freeze({ name: names.domain, url: `${base}/${channel}/geodata/${region}/${names.domain}.dat`, sha256: geositeSha256 }), geoip: Object.freeze({ name: names.ip, url: `${base}/${channel}/geodata/${region}/${names.ip}.dat`, sha256: geoipSha256 }) });
}
