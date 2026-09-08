import { compileRouteIntents } from "./route-intent.js";
import { orderedRoutingPlan } from "../rules/lightweight-policy.js";
import { semanticIntentForSource } from "../rules/semantic-intents.js";

const ACTION_TO_OUTBOUND = Object.freeze({ DIRECT: "direct", PROXY: "proxy", REJECT: "block" });

/** Capabilities of the pinned Hiddify core when a full JSON runs unchanged. */
export function hiddifyCapabilityDiagnostics() {
  return Object.freeze({
    core: "hiddify",
    schemaVersion: 1,
    fullGroupSemantics: true,
    coreRawModeRequirement: "StartRequest.enable_raw_config=true",
    appImportPreservesFullConfig: false,
    appFullConfigSupport: "unavailable-in-v4.1.1",
    supported: Object.freeze(["business-routing", "china-ip", "fixed-node", "tun", "runtime-selector", "urltest", "detour"]),
    degraded: Object.freeze(["dns-response-routing"]),
    unsupported: Object.freeze(["dual-dns-answer-consensus", "transparent-retry"]),
  });
}

function terminalAction(target) {
  return target === "DIRECT" || target === "REJECT" ? target : "PROXY";
}

/**
 * Compile an audit of terminal actions while retaining the business identity.
 * The shared catalog supplies source order; a business selector is represented
 * by its default action here, and remains a selector in the runtime config.
 */
export function compileHiddifyDecisionPlan({ rules, policyResolution = null, customRules = [] } = {}) {
  const catalog = orderedRoutingPlan();
  const catalogById = new Map(catalog.map((entry, index) => [entry.id, { ...entry, index }]));
  const inputRules = rules ?? catalog.map(({ id }) => ({ sourceId: id }));
  if (!Array.isArray(inputRules)) throw new TypeError("Hiddify rules must be an array");
  const prepared = inputRules.map((rule) => {
    const sourceId = rule.sourceId ?? rule.source ?? rule.id;
    const source = catalogById.get(sourceId);
    if (!source) throw new TypeError(`Unknown Hiddify rule source: ${String(sourceId)}`);
    const semantic = semanticIntentForSource(sourceId);
    const resolved = policyResolution?.targets?.[semantic?.id]?.resolved;
    const action = rule.action ?? terminalAction(resolved ?? semantic?.defaultTarget ?? source.policy);
    return {
      ...rule,
      sourceId,
      action,
      dnsClass: action === "REJECT" ? "none" : action === "DIRECT" ? "china" : "proxy",
      // Leave space for custom rules after security and before all businesses.
      priority: source.phase === "security" ? 20 + source.index : 100 + source.index,
    };
  });
  const intents = compileRouteIntents({ rules: prepared, customRules, policyResolution });
  const present = new Set(inputRules.map((rule) => rule.sourceId ?? rule.source ?? rule.id));
  const emittedSources = new Set();
  return Object.freeze(intents.filter((intent) => {
    const sourceId = intent.sourceProvenance[0];
    // compileRouteIntents adds fallback rule sets; keep only one catalog entry.
    if (intent.matcher.type === "rule-set" && present.has(sourceId)) {
      if (emittedSources.has(sourceId)) return false;
      emittedSources.add(sourceId);
    }
    return true;
  }).map((intent) => {
    const sourceId = intent.sourceProvenance[0] ?? "custom";
    const source = catalogById.get(sourceId);
    const priority = source
      ? (source.phase === "security" ? 20 + source.index : 100 + source.index)
      : intent.matcher.type === "default" ? 1000 : intent.matcher.type === "fallback" ? 1010 : intent.priority;
    const action = sourceId === "defaultProxy"
      ? terminalAction(policyResolution?.targets?.final?.resolved ?? "FOLLOW")
      : intent.action;
    return Object.freeze({
      sourceId,
      matcher: intent.matcher,
      businessId: intent.businessId,
      phase: source?.phase ?? (intent.matcher.type === "default" ? "defaultProxy" : intent.matcher.type === "fallback" ? "fallback" : "custom"),
      action,
      outbound: ACTION_TO_OUTBOUND[action],
      priority,
      dnsClass: intent.dnsClass,
      sourceProvenance: intent.sourceProvenance,
    });
  }).sort((left, right) => left.priority - right.priority));
}

/**
 * One resolver per traffic class. Unknown names use proxy DNS and may then
 * match ChinaIP. An unavailable DNS server is an error, not a direct retry.
 */
export function hiddifyDnsPolicy() {
  return Object.freeze({
    explicitDomestic: "direct",
    explicitOverseas: "proxy",
    unknown: "proxy",
    classifyResolvedChinaIp: true,
    compareResolverAnswers: false,
    retryFailedConnections: false,
  });
}

export const HIDDIFY_RULESET_COMPATIBILITY = Object.freeze({
  maxVersion: 4,
  remoteSupportsHttpClient: false,
  remoteSupportsDefaultHttpClient: false,
  startupFetchBlocking: false,
  requireInlineCriticalRules: true,
});

