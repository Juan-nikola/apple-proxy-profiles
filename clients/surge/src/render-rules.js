import { CUSTOM_RULES } from "../../../shared/rules/custom-rules.js";
import { RULE_CLIENT_CATALOG } from "../../../shared/rules/client-catalog.js";

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
const GAME_DIRECT_RULES = Object.freeze([
  "DOMAIN-SUFFIX,leiting.com,DIRECT",
  "DOMAIN-SUFFIX,leitingcn.com,DIRECT",
  "DOMAIN-SUFFIX,g-bits.com,DIRECT",
]);

function safeBaseUrl(value) {
  if (typeof value !== "string" || !/^https:\/\/[^\s]+$/u.test(value) || /[\r\n,]/u.test(value)) {
    throw new Error("Surge rule base URL must be an HTTPS URL without commas");
  }
  return value.replace(/\/+$/u, "");
}

export function renderSurgeRules({ ruleBaseUrl }) {
  const base = safeBaseUrl(ruleBaseUrl);
  const lines = [...LOCAL_RULES, "# Custom rules"];
  const custom = [
    ["CUSTOM_BLOCK", CUSTOM_RULES.block, "REJECT"],
    ["CUSTOM_DIRECT", CUSTOM_RULES.direct, "DIRECT"],
    ["CUSTOM_PROXY", CUSTOM_RULES.proxy, "🚀 节点选择"],
    ["CUSTOM_AI", CUSTOM_RULES.ai, "🤖 AI 专用"],
  ];
  for (const [name, rules, policy] of custom) {
    lines.push(`# ${name}`, ...rules.map((rule) => `${rule},${policy}`));
  }
  const assignments = RULE_CLIENT_CATALOG;
  const steamIndex = assignments.findIndex(({ id }) => id === "SteamCN");
  const gameIndex = assignments.findIndex(({ id }) => id === "Game");
  if (steamIndex < 0 || gameIndex <= steamIndex) throw new Error("Invalid Surge rule assignment order");
  const render = (source) => `${source.inputFormat},${base}/${source.id}.list,${source.policy},update-interval=86400`;
  lines.push(...assignments.slice(0, steamIndex).map(render));
  lines.push(...GAME_DIRECT_RULES);
  lines.push(...assignments.slice(steamIndex, gameIndex).map(render));
  const game = assignments[gameIndex];
  lines.push(`AND,((PROTOCOL,UDP),(${game.inputFormat},${base}/${game.id}.list)),${game.policy}`);
  lines.push(render(game));
  lines.push(...assignments.slice(gameIndex + 1).map(render));
  lines.push("GEOIP,CN,DIRECT", "FINAL,🚀 节点选择");
  return lines;
}
