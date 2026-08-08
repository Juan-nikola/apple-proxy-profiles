import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import { ruleClientCatalog } from "../../../shared/rules/lightweight-policy.js";

const LOCAL_RULES = Object.freeze([
  "DOMAIN-SUFFIX,local,DIRECT",
  "DOMAIN-SUFFIX,home.arpa,DIRECT",
  "DOMAIN-SUFFIX,lan,DIRECT",
  "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
  "IP-CIDR,100.64.0.0/10,DIRECT,no-resolve",
  "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
  "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
  "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
  "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
  "IP-CIDR,224.0.0.0/4,DIRECT,no-resolve",
  "IP-CIDR6,::1/128,DIRECT,no-resolve",
  "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
  "IP-CIDR6,fe80::/10,DIRECT,no-resolve",
  "IP-CIDR6,ff00::/8,DIRECT,no-resolve",
]);
const SECURITY_IDS = new Set(["Hijacking", "BlockHttpDNS", "Privacy", "Advertising", "Advertising_Domain"]);
const DOMESTIC_IDS = Object.freeze(["DomesticCore", "DomesticGame", "SteamCN"]);
const OVERSEAS_GAME_ID = "OverseasGame";
const CHINA_IP_ID = "ChinaIP";
const RULE_DOWNLOAD_POLICY = "🧭 DNS 与规则下载";

function safeBaseUrl(value) {
  if (typeof value !== "string" || !/^https:\/\/[^\s]+$/u.test(value) || /[\r\n,]/u.test(value)) {
    throw new Error("Surge rule base URL must be an HTTPS URL without commas");
  }
  return value.replace(/\/+$/u, "");
}

function optionalAdblockBase(defaultBase) {
  const optional = defaultBase.replace(/\/surge\/rules$/u, "/optional/adblock-full/surge/rules");
  if (optional === defaultBase) throw new Error("Surge adblock rule base URL must end in /surge/rules");
  return optional;
}

function sourceUrl(source, base, optionalBase) {
  const selectedBase = source.id === "Advertising" || source.id === "Advertising_Domain" ? optionalBase : base;
  if (!selectedBase) throw new Error("Surge optional rule URL is unavailable");
  return `${selectedBase}/${source.id}.list`;
}

function selectedSources(ruleBaseUrl, adblockMode) {
  const base = safeBaseUrl(ruleBaseUrl);
  const catalog = ruleClientCatalog({ adblockMode });
  const optionalBase = adblockMode === "full" ? optionalAdblockBase(base) : null;
  return { base, catalog, optionalBase };
}

export function renderSurgeRules({ ruleBaseUrl, adblockMode = "off" }) {
  const { base, catalog, optionalBase } = selectedSources(ruleBaseUrl, adblockMode);
  const render = (source) => (
    `${source.inputFormat},${sourceUrl(source, base, optionalBase)},${source.policy},update-interval=86400`
  );
  const lines = [
    ...LOCAL_RULES,
    "# Security rules",
    ...catalog.filter(({ id }) => SECURITY_IDS.has(id)).map(render),
    "# Custom rules",
  ];
  const custom = [
    ["CUSTOM_BLOCK", CUSTOM_RULES.block, "REJECT"],
    ["CUSTOM_DIRECT", CUSTOM_RULES.direct, "DIRECT"],
    ["CUSTOM_PROXY", CUSTOM_RULES.proxy, "🚀 节点选择"],
    ["CUSTOM_AI", CUSTOM_RULES.ai, "🤖 AI 专用"],
  ];
  for (const [name, rules, policy] of custom) {
    lines.push(`# ${name}`, ...rules.map((rule) => `${rule},${policy}`));
  }
  const ruleHost = new URL(base).hostname;
  lines.push(
    "# Rule-download fallback transport",
    `DOMAIN,${ruleHost},${RULE_DOWNLOAD_POLICY}`,
  );
  const byId = new Map(catalog.map((source) => [source.id, source]));
  for (const id of DOMESTIC_IDS) {
    const source = byId.get(id);
    if (!source) throw new Error(`Missing Surge lightweight rule source: ${id}`);
    lines.push(render(source));
  }
  for (const source of catalog) {
    if (SECURITY_IDS.has(source.id) || DOMESTIC_IDS.includes(source.id) || [OVERSEAS_GAME_ID, CHINA_IP_ID].includes(source.id)) continue;
    lines.push(render(source));
  }
  for (const id of [OVERSEAS_GAME_ID, CHINA_IP_ID]) {
    const source = byId.get(id);
    if (!source) throw new Error(`Missing Surge lightweight rule source: ${id}`);
    lines.push(render(source));
  }
  lines.push("GEOIP,CN,DIRECT", "FINAL,🚀 节点选择,dns-failed");
  return lines;
}
