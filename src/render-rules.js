import { CUSTOM_AI, CUSTOM_BLOCK, CUSTOM_DIRECT, CUSTOM_PROXY } from "./custom-rules.js";
import { RULE_CATALOG } from "./rule-catalog.js";
import { isValidRuleLine } from "./rule-validator.js";

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

const CUSTOM_RULES = Object.freeze([
  Object.freeze(["CUSTOM_BLOCK", CUSTOM_BLOCK, "REJECT"]),
  Object.freeze(["CUSTOM_DIRECT", CUSTOM_DIRECT, "DIRECT"]),
  Object.freeze(["CUSTOM_PROXY", CUSTOM_PROXY, "🚀 节点选择"]),
  Object.freeze(["CUSTOM_AI", CUSTOM_AI, "🤖 AI 专用"]),
]);

const PRE_GAME_RULE_IDS = Object.freeze([
  "Hijacking", "BlockHttpDNS", "AdvertisingLite", "Privacy", "BiliBili", "DouYin", "XiaoHongShu", "Weibo",
  "OpenAI", "Claude", "Gemini", "Copilot", "GitHub", "YouTube", "Netflix", "Disney", "Spotify", "GlobalMedia",
  "Telegram", "Facebook", "Instagram", "Twitter", "TikTok", "Apple", "Microsoft",
]);
const POST_GAME_RULE_IDS = Object.freeze(["Download", "PrivateTracker", "ChinaMax"]);
const REQUIRED_RULE_IDS = Object.freeze([...PRE_GAME_RULE_IDS, "Game", ...POST_GAME_RULE_IDS]);

function isSafeCustomField(value) {
  return typeof value === "string"
    && value.length > 0
    && value.trim() === value
    && !/[\r\n,=]/.test(value);
}

export function validateCustomRules(customRules) {
  if (!Array.isArray(customRules)) throw new Error("Invalid custom rule configuration");
  const seen = new Set();
  for (const entry of customRules) {
    if (!Array.isArray(entry) || entry.length !== 3 || !isSafeCustomField(entry[0]) || !Array.isArray(entry[1]) || !isSafeCustomField(entry[2])) {
      throw new Error("Invalid custom rule configuration");
    }
    for (const rule of entry[1]) {
      if (typeof rule !== "string" || /[\r\n]/.test(rule) || rule.trim() !== rule) {
        throw new Error("Invalid custom rule");
      }
      if (rule.split(",").length !== 2 || !isValidRuleLine(rule)) {
        throw new Error("Invalid custom rule");
      }
      if (seen.has(rule)) throw new Error("Duplicate custom rule");
      seen.add(rule);
    }
  }
}

function validatedCatalog() {
  const entriesById = new Map();
  for (const entry of RULE_CATALOG) {
    const entries = entriesById.get(entry.id) ?? [];
    entries.push(entry);
    entriesById.set(entry.id, entries);
  }
  for (const id of REQUIRED_RULE_IDS) {
    if (entriesById.get(id)?.length !== 1) throw new Error(`Invalid rule catalog entry: ${id}`);
  }
  return entriesById;
}

function catalogRule(entriesById, id) {
  return entriesById.get(id)[0];
}

function renderRuleSet(entry) {
  return `RULE-SET,${entry.url},${entry.policy},update-interval=86400`;
}

export function renderRules() {
  validateCustomRules(CUSTOM_RULES);
  const entriesById = validatedCatalog();
  const lines = [...LOCAL_RULES, "# Custom rules"];

  for (const [name, rules, policy] of CUSTOM_RULES) {
    lines.push(`# ${name}`);
    lines.push(...rules.map((rule) => `${rule},${policy}`));
  }

  lines.push(...PRE_GAME_RULE_IDS.map((id) => renderRuleSet(catalogRule(entriesById, id))));

  const game = catalogRule(entriesById, "Game");
  lines.push(`AND,((PROTOCOL,UDP),(RULE-SET,${game.url})),🎮 游戏连接`);
  lines.push(renderRuleSet(game));
  lines.push(...POST_GAME_RULE_IDS.map((id) => renderRuleSet(catalogRule(entriesById, id))));
  lines.push("GEOIP,CN,DIRECT", "FINAL,🚀 节点选择");
  return lines;
}

