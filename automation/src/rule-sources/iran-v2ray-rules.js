import { parseLoyalsoldierRulesDat } from "./loyalsoldier-rules-dat.js";

export const IRAN_ALL_DOMAIN_ENTRY_BUDGET = 100_000;

function annotate(parsed, sourceId) {
  const categories = parsed.categories.map((category) => ({ ...category, region: "ir", categoryId: category.id }));
  const entries = parsed.entries.map((entry) => ({ ...entry, region: "ir", categoryId: entry.categoryId ?? entry.category }));
  const allDomainCount = entries.filter(({ categoryId }) => categoryId === "TEST_ONLY_ALL_DOMAIN"
    || categoryId === "all"
    || categoryId === "geolocation-!cn").length;
  if (allDomainCount > IRAN_ALL_DOMAIN_ENTRY_BUDGET) {
    throw new Error(`External source ${sourceId}: all-domain category exceeds entry budget`);
  }
  return { ...parsed, entries, categories };
}

export function parseIranV2rayRules({ text, sourceId }) {
  if (!Buffer.isBuffer(text)) throw new Error(`External source ${sourceId}: unsupported format; expected geosite.dat or geoip.dat`);
  return annotate(parseLoyalsoldierRulesDat({ text, sourceId }), sourceId);
}
