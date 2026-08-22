import { RULE_SOURCE_CATALOG } from "./catalog.js";
import { EXTERNAL_RULE_SOURCE_CATALOG } from "./external-sources.js";

const VALID_REGIONS = Object.freeze(["cn", "global", "ru", "ir"]);
const BASELINE_IDS = Object.freeze(RULE_SOURCE_CATALOG.map(({ id }) => id));
const COMMON_EXTERNAL_IDS = Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG
  .filter(({ region }) => region === "global")
  .map(({ id }) => id));
const OVERLAY_IDS = Object.freeze({
  ru: Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG.filter(({ region }) => region === "ru").map(({ id }) => id)),
  ir: Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG.filter(({ region }) => region === "ir").map(({ id }) => id)),
});

export const REGION_PROFILES = Object.freeze({
  cn: Object.freeze({ region: "cn", sourceIds: Object.freeze([...BASELINE_IDS, ...COMMON_EXTERNAL_IDS]), overlays: Object.freeze([]) }),
  global: Object.freeze({ region: "global", sourceIds: Object.freeze([...BASELINE_IDS, ...COMMON_EXTERNAL_IDS]), overlays: Object.freeze([]) }),
  ru: Object.freeze({ region: "ru", sourceIds: Object.freeze([...BASELINE_IDS, ...COMMON_EXTERNAL_IDS, ...OVERLAY_IDS.ru]), overlays: OVERLAY_IDS.ru }),
  ir: Object.freeze({ region: "ir", sourceIds: Object.freeze([...BASELINE_IDS, ...COMMON_EXTERNAL_IDS, ...OVERLAY_IDS.ir]), overlays: OVERLAY_IDS.ir }),
});

export function parseRegion(value) {
  if (value === undefined || value === null || value === "") return "cn";
  if (!VALID_REGIONS.includes(value)) throw new RangeError(`Unsupported region: ${value}`);
  return value;
}

export function sourcesForRegion(region, { adblockMode = "off" } = {}) {
  const profile = REGION_PROFILES[parseRegion(region)];
  const ids = profile.sourceIds.filter((id) => adblockMode === "full" || !["Advertising", "Advertising_Domain"].includes(id));
  return Object.freeze([...new Set(ids)]);
}

for (const profile of Object.values(REGION_PROFILES)) {
  if (new Set(profile.sourceIds).size !== profile.sourceIds.length) throw new TypeError(`Duplicate source in ${profile.region} profile`);
  if (profile.region === "cn" && profile.sourceIds.some((id) => OVERLAY_IDS.ru.includes(id) || OVERLAY_IDS.ir.includes(id))) {
    throw new TypeError("Default cn profile cannot include regional overlays");
  }
}
