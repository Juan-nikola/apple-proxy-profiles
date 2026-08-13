import { CONTINENT } from "../contracts.js";
import { continentForFlag, isCountryFlag } from "./country-regions.js";

const FLAG_PATTERN = /[\u{1F1E6}-\u{1F1FF}]{2}/gu;

const RAW_REGIONS = [
  {
    flag: "🇨🇳",
    label: "中国",
    continent: CONTINENT.asiaPacific,
    terms: ["CN", "PEK", "PVG", "CAN", "China", "Beijing", "Shanghai", "Guangzhou", "Shenzhen", "中国", "北京", "上海", "广州", "深圳"],
  },
  { flag: "🇭🇰", label: "香港", continent: CONTINENT.asiaPacific, terms: ["HK", "HKG", "Hong Kong", "香港"] },
  { flag: "🇲🇴", label: "澳门", continent: CONTINENT.asiaPacific, terms: ["MO", "MFM", "Macau", "Macao", "澳门"] },
  { flag: "🇹🇼", label: "台湾", continent: CONTINENT.asiaPacific, terms: ["TW", "TPE", "Taiwan", "Taipei", "台湾", "台北"] },
  { flag: "🇯🇵", label: "日本", continent: CONTINENT.asiaPacific, terms: ["JP", "NRT", "HND", "KIX", "Japan", "Tokyo", "Osaka", "日本", "东京", "大阪"] },
  { flag: "🇰🇷", label: "韩国", continent: CONTINENT.asiaPacific, terms: ["KR", "ICN", "Korea", "Seoul", "韩国", "首尔"] },
  { flag: "🇸🇬", label: "新加坡", continent: CONTINENT.asiaPacific, terms: ["SG", "SIN", "Singapore", "新加坡"] },
  { flag: "🇲🇾", label: "马来西亚", continent: CONTINENT.asiaPacific, terms: ["MY", "KUL", "Malaysia", "Kuala Lumpur", "马来西亚", "吉隆坡"] },
  { flag: "🇹🇭", label: "泰国", continent: CONTINENT.asiaPacific, terms: ["TH", "BKK", "Thailand", "Bangkok", "泰国", "曼谷"] },
  { flag: "🇵🇭", label: "菲律宾", continent: CONTINENT.asiaPacific, terms: ["PH", "MNL", "Philippines", "Manila", "菲律宾", "马尼拉"] },
  { flag: "🇮🇩", label: "印度尼西亚", continent: CONTINENT.asiaPacific, terms: ["ID", "CGK", "Indonesia", "Jakarta", "印度尼西亚", "雅加达"] },
  { flag: "🇦🇺", label: "澳大利亚", continent: CONTINENT.asiaPacific, terms: ["AU", "SYD", "MEL", "Australia", "Sydney", "Melbourne", "澳大利亚", "悉尼", "墨尔本"] },
  { flag: "🇮🇳", label: "印度", continent: CONTINENT.asiaPacific, terms: ["IN", "BOM", "DEL", "India", "Mumbai", "Delhi", "印度", "孟买", "德里"] },
  { flag: "🇩🇪", label: "德国", continent: CONTINENT.europe, terms: ["DE", "FRA", "Germany", "Frankfurt", "德国", "法兰克福"] },
  { flag: "🇬🇧", label: "英国", continent: CONTINENT.europe, terms: ["GB", "UK", "LHR", "Britain", "United Kingdom", "London", "英国", "伦敦"] },
  { flag: "🇫🇷", label: "法国", continent: CONTINENT.europe, terms: ["FR", "CDG", "France", "Paris", "法国", "巴黎"] },
  { flag: "🇳🇱", label: "荷兰", continent: CONTINENT.europe, terms: ["NL", "AMS", "Netherlands", "Amsterdam", "荷兰", "阿姆斯特丹"] },
  { flag: "🇨🇭", label: "瑞士", continent: CONTINENT.europe, terms: ["CH", "ZRH", "Switzerland", "Zurich", "瑞士", "苏黎世"] },
  { flag: "🇮🇹", label: "意大利", continent: CONTINENT.europe, terms: ["IT", "MXP", "Italy", "Milan", "意大利", "米兰"] },
  { flag: "🇪🇸", label: "西班牙", continent: CONTINENT.europe, terms: ["ES", "MAD", "Spain", "Madrid", "西班牙", "马德里"] },
  { flag: "🇸🇪", label: "瑞典", continent: CONTINENT.europe, terms: ["SE", "ARN", "Sweden", "Stockholm", "瑞典", "斯德哥尔摩"] },
  { flag: "🇺🇸", label: "美国", continent: CONTINENT.americas, terms: ["US", "USA", "LAX", "SJC", "SEA", "IAD", "JFK", "America", "United States", "Los Angeles", "美国", "洛杉矶", "圣何塞", "西雅图", "华盛顿", "纽约"] },
  { flag: "🇨🇦", label: "加拿大", continent: CONTINENT.americas, terms: ["CA", "YVR", "YYZ", "Canada", "加拿大", "温哥华", "多伦多"] },
  { flag: "🇧🇷", label: "巴西", continent: CONTINENT.americas, terms: ["BR", "GRU", "Brazil", "巴西", "圣保罗"] },
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

const REGION_LABELS = new Map(RAW_REGIONS.map(({ flag, label }) => [flag, label]));

function inferRegion(name) {
  return REGIONS.find((region) => (
    region.latinMatcher.test(name) || region.chineseTerms.some((term) => name.includes(term))
  )) ?? null;
}

export function removeFlags(name) {
  return String(name ?? "").replace(FLAG_PATTERN, " ").replace(/\s+/g, " ").trim();
}

export function countryLabelForFlag(flag) {
  const value = String(flag ?? "").trim();
  if (value === "🌐") return "🌐 未分类";
  return REGION_LABELS.get(value) ?? (isCountryFlag(value) ? value : "🌐 未分类");
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
