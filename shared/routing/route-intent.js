import { semanticIntentForSource } from "../rules/semantic-intents.js";

export const ROUTE_ACTIONS = Object.freeze(["DIRECT", "PROXY", "REJECT"]);

const PRIORITY = Object.freeze({
  local: 10,
  security: 20,
  custom: 30,
  service: 40,
  domestic: 50,
  chinaTld: 60,
  chinaIp: 70,
  defaultProxy: 80,
  fallback: 90,
});

const SECURITY = new Set(["Hijacking", "BlockHttpDNS", "Advertising", "Advertising_Domain"]);
const DOMESTIC = new Set(["DomesticCore", "DomesticGame", "SteamCN", "BiliBili", "ByteDance", "XiaoHongShu", "Weibo", "Apple", "Microsoft", "Download", "PrivateTracker", "ChinaTLD", "ChinaIP"]);

function actionForSource(sourceId, policyResolution) {
  if (SECURITY.has(sourceId)) return "REJECT";
  const semantic = semanticIntentForSource(sourceId);
  const record = semantic ? policyResolution?.targets?.[semantic.id] : undefined;
  if (record?.resolved === "DIRECT") return "DIRECT";
  if (record?.resolved === "REJECT") return "REJECT";
  if (record?.resolved === "FOLLOW" || record?.resolved) return "PROXY";
  return DOMESTIC.has(sourceId) ? "DIRECT" : "PROXY";
}

function priorityForSource(sourceId, custom) {
  if (custom) return PRIORITY.custom;
  if (sourceId === "ChinaIP") return PRIORITY.chinaIp;
  if (sourceId === "ChinaTLD" || sourceId === "china-list") return PRIORITY.chinaTld;
  if (SECURITY.has(sourceId)) return PRIORITY.security;
  if (DOMESTIC.has(sourceId)) return PRIORITY.domestic;
  return PRIORITY.service;
}

function matcherOf(rule) {
  if (!rule || typeof rule !== "object") throw new TypeError("Route rule must be an object");
  if (rule.matcher && typeof rule.matcher === "object") return structuredClone(rule.matcher);
  if (typeof rule.kind === "string" && typeof rule.value === "string") return { type: rule.kind, value: rule.value };
  if (typeof rule.sourceId === "string") return { type: "rule-set", value: rule.sourceId };
  throw new Error("Route rule matcher is missing");
}

export function createRouteIntent({ matcher, businessId = null, action, priority, dnsClass = "none", sourceProvenance = [] } = {}) {
  if (!matcher || typeof matcher !== "object" || Array.isArray(matcher)) throw new TypeError("RouteIntent.matcher must be an object");
  if (!ROUTE_ACTIONS.includes(action)) throw new Error(`RouteIntent action is unsupported: ${String(action)}`);
  if (!Number.isInteger(priority)) throw new TypeError("RouteIntent priority must be an integer");
  if (businessId !== null && (typeof businessId !== "string" || !/^[a-z][a-zA-Z0-9_-]*$/u.test(businessId))) throw new Error("RouteIntent businessId is invalid");
  return Object.freeze({ matcher: Object.freeze(matcher), businessId, action, priority, dnsClass, sourceProvenance: Object.freeze([...sourceProvenance]) });
}

export function compileRouteIntents({ rules = [], policyResolution = null, customRules = [] } = {}) {
  if (!Array.isArray(rules) || !Array.isArray(customRules)) throw new TypeError("Route rules must be arrays");
  const entries = [];
  const seen = new Set();
  const add = (rule, custom = false) => {
    const sourceId = rule.sourceId ?? rule.source ?? rule.id ?? "custom";
    const semantic = semanticIntentForSource(sourceId);
    const key = `${sourceId}:${JSON.stringify(rule.matcher ?? { type: rule.kind, value: rule.value })}`;
    if (seen.has(key)) return;
    seen.add(key);
    entries.push(createRouteIntent({
      matcher: matcherOf(rule),
      businessId: rule.businessId ?? semantic?.id ?? null,
      action: rule.action ?? actionForSource(sourceId, policyResolution),
      priority: rule.priority ?? priorityForSource(sourceId, custom),
      dnsClass: rule.dnsClass ?? semantic?.dnsClass ?? (DOMESTIC.has(sourceId) ? "china" : "proxy"),
      sourceProvenance: rule.sourceProvenance ?? [sourceId],
    }));
  };
  rules.forEach((rule) => add(rule));
  customRules.forEach((rule) => add(rule, true));
  const fallback = [
    { sourceId: "ChinaTLD", matcher: { type: "rule-set", value: "ChinaTLD" } },
    { sourceId: "ChinaIP", matcher: { type: "rule-set", value: "ChinaIP" } },
    { sourceId: "defaultProxy", matcher: { type: "default", value: "*" }, action: "PROXY", priority: PRIORITY.defaultProxy, dnsClass: "proxy" },
    { sourceId: "fail-closed", matcher: { type: "fallback", value: "*" }, action: "REJECT", priority: PRIORITY.fallback, dnsClass: "none" },
  ];
  fallback.forEach((rule) => add(rule));
  return Object.freeze(entries.sort((a, b) => a.priority - b.priority || String(a.businessId).localeCompare(String(b.businessId))));
}
