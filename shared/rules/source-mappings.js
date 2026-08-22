import { semanticIntentForSource } from "./semantic-intents.js";
import { policyForRuleSource } from "./lightweight-policy.js";

// Upstream category names are deliberately local to this table. Parsers only
// report facts; this is the policy boundary where those facts gain meaning.
const CATEGORY_MAPPINGS = Object.freeze({
  ads: { action: "REJECT", policyGroup: "Advertising" },
  advertising: { action: "REJECT", policyGroup: "Advertising" },
  malware: { action: "REJECT", policyGroup: "Security" },
  phishing: { action: "REJECT", policyGroup: "Security" },
  hijacking: { action: "REJECT", policyGroup: "Security" },
  security: { action: "REJECT", policyGroup: "Security" },
  blocked: { action: "REJECT", policyGroup: "Security" },
  local: { action: "DIRECT", policyGroup: "DomesticCore" },
  cn: { action: "DIRECT", policyGroup: "DomesticCore" },
  china: { action: "DIRECT", policyGroup: "DomesticCore" },
  ru: { action: "DIRECT", policyGroup: "RussiaOverlay" },
  russia: { action: "DIRECT", policyGroup: "RussiaOverlay" },
  ir: { action: "DIRECT", policyGroup: "IranOverlay" },
  iran: { action: "DIRECT", policyGroup: "IranOverlay" },
});

const BUSINESS = new Set(["DomesticCore", "DomesticGame", "SteamCN", "ChinaTLD", "ChinaIP", "Advertising", "Advertising_Domain"]);
const SECURITY = new Set(["Hijacking", "BlockHttpDNS", "Privacy"]);
const CHINA = new Set(["ChinaTLD", "ChinaIP"]);

function externalCategory(entry) {
  return String(entry.categoryId ?? entry.category ?? "").trim().toLowerCase().replace(/[._-]+/gu, "-");
}

export function mappingForEntry(entry, { sourceId = entry?.sourceId } = {}) {
  if (sourceId === "ChinaTLD") return { action: "DIRECT", policy: "DIRECT", policyGroup: "ChinaTLD", priority: 300, reason: "ChinaTLD domestic fallback", explicit: true, sourceId };
  if (sourceId === "ChinaIP") return { action: "DIRECT", policy: "DIRECT", policyGroup: "ChinaIP", priority: 200, reason: "ChinaIP resolved fallback", explicit: true, sourceId };
  const intent = semanticIntentForSource(sourceId);
  if (intent) {
    const action = intent.defaultTarget === "REJECT" ? "REJECT" : intent.defaultTarget === "DIRECT" ? "DIRECT" : "PROXY";
    return { action, policy: intent.policy, policyGroup: intent.ruleId, priority: BUSINESS.has(sourceId) ? 800 : SECURITY.has(sourceId) ? 700 : CHINA.has(sourceId) ? (sourceId === "ChinaTLD" ? 300 : 200) : 800, reason: `explicit business source ${sourceId}`, explicit: true, sourceId };
  }
  const category = externalCategory(entry);
  const mapped = CATEGORY_MAPPINGS[category] ?? CATEGORY_MAPPINGS[category.replace(/^(?:geosite|geoip)-/u, "")];
  if (mapped) return { ...mapped, policy: mapped.action, priority: mapped.policyGroup === "Security" ? 700 : 600, reason: `mapped source category ${entry.categoryId ?? entry.category}`, explicit: true, sourceId };
  if (/(?:security|malware|phish|hijack|block|ad)/u.test(category)) return { action: "REJECT", policy: "REJECT", policyGroup: "Security", priority: 700, reason: `security category ${entry.categoryId ?? entry.category}`, explicit: true, sourceId };
  if (/(?:local|domestic|china|cn)(?:-|$)/u.test(category)) return { action: "DIRECT", policy: "DIRECT", policyGroup: "DomesticCore", priority: 600, reason: `domestic category ${entry.categoryId ?? entry.category}`, explicit: true, sourceId };
  return { action: "PROXY", policyGroup: "GenericGeo", priority: 500, reason: "generic Geo classification", explicit: false, sourceId };
}

export function mappingForUserRule(rule) {
  const action = String(rule.action ?? rule.policyAction ?? "PROXY").toUpperCase();
  if (!["DIRECT", "PROXY", "REJECT"].includes(action)) throw new TypeError(`Unsupported user rule action: ${action}`);
  return { action, policyGroup: rule.policyGroup ?? "UserCustom", priority: 1000, reason: "user custom rule", explicit: true, sourceId: rule.sourceId ?? "user" };
}

export function policyGroupForSource(sourceId) {
  return policyForRuleSource(sourceId) ?? sourceId;
}

export const SOURCE_CATEGORY_MAPPINGS = CATEGORY_MAPPINGS;
