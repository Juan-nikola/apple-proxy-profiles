import { CONTINENT } from "../contracts.js";
import { continentForFlag } from "./country-regions.js";

const FLAG_PATTERN = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;

const RAW_REGIONS = [
  {
    flag: "🇨🇳",
    continent: CONTINENT.asiaPacific,
    terms: ["CN", "PEK", "PVG", "CAN", "China", "Beijing", "Shanghai", "Guangzhou", "Shenzhen", "中国", "北京", "上海", "广州", "深圳"],
  },
  { flag: "🇭🇰", continent: CONTINENT.asiaPacific, terms: ["HK", "HKG", "Hong Kong", "香港"] },
  { flag: "🇲🇴", continent: CONTINENT.asiaPacific, terms: ["MO", "MFM", "Macau", "Macao", "澳门"] },
  { flag: "🇹🇼", continent: CONTINENT.asiaPacific, terms: ["TW", "TPE", "Taiwan", "Taipei", "台湾", "台北"] },
  { flag: "🇯🇵", continent: CONTINENT.asiaPacific, terms: ["JP", "NRT", "HND", "KIX", "Japan", "Tokyo", "Osaka", "日本", "东京", "大阪"] },
  { flag: "🇰🇷", continent: CONTINENT.asiaPacific, terms: ["KR", "ICN", "Korea", "Seoul", "韩国", "首尔"] },
  { flag: "🇸🇬", continent: CONTINENT.asiaPacific, terms: ["SG", "SIN", "Singapore", "新加坡"] },
  { flag: "🇲🇾", continent: CONTINENT.asiaPacific, terms: ["MY", "KUL", "Malaysia", "Kuala Lumpur", "马来西亚", "吉隆坡"] },
  { flag: "🇹🇭", continent: CONTINENT.asiaPacific, terms: ["TH", "BKK", "Thailand", "Bangkok", "泰国", "曼谷"] },
  { flag: "🇵🇭", continent: CONTINENT.asiaPacific, terms: ["PH", "MNL", "Philippines", "Manila", "菲律宾", "马尼拉"] },
  { flag: "🇮🇩", continent: CONTINENT.asiaPacific, terms: ["ID", "CGK", "Indonesia", "Jakarta", "印度尼西亚", "雅加达"] },
  { flag: "🇦🇺", continent: CONTINENT.asiaPacific, terms: ["AU", "SYD", "MEL", "Australia", "Sydney", "Melbourne", "澳大利亚", "悉尼", "墨尔本"] },
  { flag: "🇮🇳", continent: CONTINENT.asiaPacific, terms: ["IN", "BOM", "DEL", "India", "Mumbai", "Delhi", "印度", "孟买", "德里"] },
  { flag: "🇩🇪", continent: CONTINENT.europe, terms: ["DE", "FRA", "Germany", "Frankfurt", "德国", "法兰克福"] },
  { flag: "🇬🇧", continent: CONTINENT.europe, terms: ["GB", "UK", "LHR", "Britain", "United Kingdom", "London", "英国", "伦敦"] },
  { flag: "🇫🇷", continent: CONTINENT.europe, terms: ["FR", "CDG", "France", "Paris", "法国", "巴黎"] },
  { flag: "🇳🇱", continent: CONTINENT.europe, terms: ["NL", "AMS", "Netherlands", "Amsterdam", "荷兰", "阿姆斯特丹"] },
  { flag: "🇨🇭", continent: CONTINENT.europe, terms: ["CH", "ZRH", "Switzerland", "Zurich", "瑞士", "苏黎世"] },
  { flag: "🇮🇹", continent: CONTINENT.europe, terms: ["IT", "MXP", "Italy", "Milan", "意大利", "米兰"] },
  { flag: "🇪🇸", continent: CONTINENT.europe, terms: ["ES", "MAD", "Spain", "Madrid", "西班牙", "马德里"] },
  { flag: "🇸🇪", continent: CONTINENT.europe, terms: ["SE", "ARN", "Sweden", "Stockholm", "瑞典", "斯德哥尔摩"] },
  { flag: "🇺🇸", continent: CONTINENT.americas, terms: ["US", "USA", "LAX", "SJC", "SEA", "IAD", "JFK", "America", "United States", "美国", "洛杉矶", "圣何塞", "西雅图", "华盛顿", "纽约"] },
  { flag: "🇨🇦", continent: CONTINENT.americas, terms: ["CA", "YVR", "YYZ", "Canada", "加拿大", "温哥华", "多伦多"] },
  { flag: "🇧🇷", continent: CONTINENT.americas, terms: ["BR", "GRU", "Brazil", "巴西", "圣保罗"] },
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function latinTermPattern(term) {
  const escaped = escapeRegex(term);
  if (/^[A-Z]{2,4}$/.test(term)) {
    return `(?:^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}]|\\d)`;
  }
  return `(?:^|[^\\p{L}\\p{N}])${escaped.replace(/ /g, "\\s*")}(?=$|[^\\p{L}\\p{N}])`;
}

const REGIONS = RAW_REGIONS.map((region) => {
  const latinTerms = region.terms.filter((term) => /^[\x00-\x7F]+$/.test(term));
  return {
    ...region,
    chineseTerms: region.terms.filter((term) => !/^[\x00-\x7F]+$/.test(term)),
    latinMatcher: new RegExp(latinTerms.map(latinTermPattern).join("|"), "iu"),
  };
});

function inferRegion(name) {
  return REGIONS.find((region) => (
    region.latinMatcher.test(name) || region.chineseTerms.some((term) => name.includes(term))
  )) ?? null;
}

export function removeFlags(name) {
  return String(name ?? "").replace(FLAG_PATTERN, " ").replace(/\s+/g, " ").trim();
}

export function classifyRegion(name) {
  const value = String(name ?? "");
  const flags = value.match(FLAG_PATTERN) ?? [];
  const inferred = inferRegion(removeFlags(value));

  if (flags.length > 0) {
    const continent = continentForFlag(flags[0]);
    return {
      flag: flags[0],
      continent: continent ?? CONTINENT.other,
      warning: flags.length > 1
        ? "multiple-flags"
        : inferred && flags[0] !== inferred.flag
          ? "flag-text-conflict"
          : null,
    };
  }

  if (inferred) {
    return { flag: inferred.flag, continent: inferred.continent, warning: null };
  }

  return { flag: "🌐", continent: CONTINENT.other, warning: null };
}
