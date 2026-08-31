import { EXTERNAL_RULE_SOURCE_CATALOG } from "./external-sources.js";
import { DEFAULT_RULE_SOURCE_IDS } from "./lightweight-policy.js";

const CHINA_LOCAL_IDS = new Set(["DomesticCore", "DomesticGame", "SteamCN", "ChinaTLD", "ChinaIP"]);
const GLOBAL_BASELINE_IDS = Object.freeze(DEFAULT_RULE_SOURCE_IDS.filter((id) => !CHINA_LOCAL_IDS.has(id)));
const COMMON_EXTERNAL_IDS = Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG
  .filter(({ region, auditOnly }) => region === "global" && !auditOnly)
  .map(({ id }) => id));
const REGIONAL_EXTERNAL_IDS = Object.freeze({
  ru: Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG.filter(({ region }) => region === "ru").map(({ id }) => id)),
  ir: Object.freeze(EXTERNAL_RULE_SOURCE_CATALOG.filter(({ region }) => region === "ir").map(({ id }) => id)),
});

const SOURCE_IDS_BY_REGION = Object.freeze({
  cn: Object.freeze([...DEFAULT_RULE_SOURCE_IDS, ...COMMON_EXTERNAL_IDS]),
  global: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS]),
  ru: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS, ...REGIONAL_EXTERNAL_IDS.ru]),
  ir: Object.freeze([...GLOBAL_BASELINE_IDS, ...COMMON_EXTERNAL_IDS, ...REGIONAL_EXTERNAL_IDS.ir]),
});

for (const [region, ids] of Object.entries(SOURCE_IDS_BY_REGION)) {
  if (new Set(ids).size !== ids.length) throw new TypeError(`Duplicate published source ID in ${region} region`);
}

export function publishedSourceIdsForRegion(region) {
  const ids = SOURCE_IDS_BY_REGION[region];
  if (!ids) throw new RangeError(`Unsupported published source region: ${region}`);
  return ids;
}
