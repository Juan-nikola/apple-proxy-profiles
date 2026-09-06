import { DEFAULT_RULE_SOURCE_IDS, FULL_ADBLOCK_SOURCE_IDS } from "./lightweight-policy.js";
import { parseRegion } from "./region-values.js";

const COMMON_EXTERNAL_IDS = Object.freeze(["v2fly-domain-list", "loyalsoldier-rules-dat"]);
const OVERLAY_IDS = Object.freeze({
  ru: Object.freeze(["russia-v2ray-rules"]),
  ir: Object.freeze(["iran-v2ray-rules"]),
});
const CHINA_LOCAL_IDS = new Set(["DomesticCore", "DomesticGame", "SteamCN", "ChinaTLD", "ChinaIP"]);
const GLOBAL_BASELINE_IDS = Object.freeze(DEFAULT_RULE_SOURCE_IDS.filter((id) => !CHINA_LOCAL_IDS.has(id)));

export const REGION_SOURCE_IDS = Object.freeze({
  cn: Object.freeze([...DEFAULT_RULE_SOURCE_IDS, ...COMMON_EXTERNAL_IDS]),
  global: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS]),
  ru: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS, ...OVERLAY_IDS.ru]),
  ir: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS, ...OVERLAY_IDS.ir]),
});

export function sourceIdsForRegion(region, { adblockMode = "off" } = {}) {
  if (adblockMode !== "off" && adblockMode !== "full") throw new TypeError("adblockMode must be either off or full");
  const ids = REGION_SOURCE_IDS[parseRegion(region)];
  return Object.freeze(adblockMode === "full" ? [...ids, ...FULL_ADBLOCK_SOURCE_IDS] : [...ids]);
}
