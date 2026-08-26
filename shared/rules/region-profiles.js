import { RULE_SOURCE_CATALOG } from "./catalog.js";
import { EXTERNAL_RULE_SOURCE_CATALOG } from "./external-sources.js";
import { FULL_ADBLOCK_SOURCE_IDS } from "./lightweight-policy.js";
import { parseRegion } from "./region-values.js";

const BASELINE_IDS = Object.freeze(RULE_SOURCE_CATALOG.map(({ id }) => id));
const CHINA_LOCAL_IDS = new Set(["DomesticCore", "DomesticGame", "SteamCN", "ChinaTLD", "ChinaIP", "ChinaMax", "ChinaMax_Domain"]);
const GLOBAL_BASELINE_IDS = Object.freeze(BASELINE_IDS.filter((id) => !CHINA_LOCAL_IDS.has(id)));
const COMMON_EXTERNAL_IDS = Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG
  .filter(({ region, auditOnly }) => region === "global" && !auditOnly)
  .map(({ id }) => id));
const OVERLAY_IDS = Object.freeze({
  ru: Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG.filter(({ region }) => region === "ru").map(({ id }) => id)),
  ir: Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG.filter(({ region }) => region === "ir").map(({ id }) => id)),
});

export const REGION_PROFILES = Object.freeze({
  cn: Object.freeze({ region: "cn", sourceIds: Object.freeze([...BASELINE_IDS, ...COMMON_EXTERNAL_IDS]), overlays: Object.freeze([]) }),
  global: Object.freeze({ region: "global", sourceIds: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS]), overlays: Object.freeze([]) }),
  ru: Object.freeze({ region: "ru", sourceIds: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS, ...OVERLAY_IDS.ru]), overlays: OVERLAY_IDS.ru }),
  ir: Object.freeze({ region: "ir", sourceIds: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS, ...OVERLAY_IDS.ir]), overlays: OVERLAY_IDS.ir }),
});

export { parseRegion };

export function sourcesForRegion(region, { adblockMode = "off" } = {}) {
  if (adblockMode !== "off" && adblockMode !== "full") throw new TypeError("adblockMode must be either off or full");
  const profile = REGION_PROFILES[parseRegion(region)];
  const sourceIds = adblockMode === "full"
    ? [...profile.sourceIds, ...FULL_ADBLOCK_SOURCE_IDS]
    : profile.sourceIds;
  const ids = sourceIds.filter((id) => adblockMode === "full" || !FULL_ADBLOCK_SOURCE_IDS.includes(id));
  return Object.freeze([...new Set(ids)]);
}

for (const profile of Object.values(REGION_PROFILES)) {
  if (new Set(profile.sourceIds).size !== profile.sourceIds.length) throw new TypeError(`Duplicate source in ${profile.region} profile`);
  if (profile.region === "cn" && profile.sourceIds.some((id) => OVERLAY_IDS.ru.includes(id) || OVERLAY_IDS.ir.includes(id))) {
    throw new TypeError("Default cn profile cannot include regional overlays");
  }
}
