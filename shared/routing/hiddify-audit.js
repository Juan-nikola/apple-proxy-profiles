import { isIP } from "node:net";
import { explainRoute } from "../../automation/src/routing-plan-audit.js";
import { compileHiddifyDecisionPlan, hiddifyDnsPolicy } from "./hiddify-decision.js";

/** Offline explanation, with the same shared matcher used by explain:route. */
export function diagnoseHiddifyRoute({
  domain,
  ip,
  dnsStatus = "ok",
  network = "tcp",
  port,
  plan = compileHiddifyDecisionPlan(),
  ruleSets,
} = {}) {
  if (!["tcp", "udp"].includes(network)) throw new TypeError("Hiddify network must be tcp or udp");
  if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
    throw new TypeError("Hiddify port must be an integer between 1 and 65535");
  }
  if (!["ok", "failed", "unresolved"].includes(dnsStatus)) throw new TypeError("Hiddify dnsStatus is invalid");
  if (!(ruleSets instanceof Map)) throw new TypeError("Hiddify ruleSets must be a Map");
  const hasDomain = domain !== undefined && domain !== null;
  if (!hasDomain && !isIP(ip)) throw new TypeError("Hiddify route needs a domain or an IP address");
  if (!Array.isArray(plan)) throw new TypeError("Hiddify plan must be an array");
  // Preserve custom matchers in the audit. compileRouteIntents deliberately
  // gives them the shared source id "custom"; split them into synthetic ids so
  // rules with different actions cannot accidentally match one another.
  const customIds = new Map();
  let customIndex = 0;
  const auditPlan = plan.filter(({ phase }) => !["defaultProxy", "fallback"].includes(phase)).map((entry) => {
    const isCustom = entry.sourceId === "custom";
    const id = isCustom ? `custom-${customIndex++}` : entry.sourceId;
    if (isCustom) customIds.set(id, entry.matcher);
    return {
      id,
      policy: entry.action,
      phase: entry.phase,
      dnsClass: entry.dnsClass,
    };
  });
  const auditRuleSets = new Map(ruleSets);
  for (const [id, matcher] of customIds) {
    if (!matcher || typeof matcher !== "object") continue;
    const kind = matcher.type;
    if (["domain", "domainSuffix", "domainKeyword", "ipv4Cidr", "ipv6Cidr"].includes(kind)
      && typeof matcher.value === "string") {
      auditRuleSets.set(id, { entries: [{ kind, value: matcher.value, sourceId: id }] });
    }
  }
  // Pure-IP requests have no domain available to sniff. Exclude every domain
  // matcher instead of pretending the address reveals a service identity.
  if (!hasDomain) {
    for (const [sourceId, value] of auditRuleSets) {
      auditRuleSets.set(sourceId, {
        entries: (value.entries ?? []).filter(({ kind }) => kind === "ipv4Cidr" || kind === "ipv6Cidr"),
      });
    }
  }
  const explanation = explainRoute({
    domain: hasDomain ? domain : "ip-only.invalid",
    ip: dnsStatus === "ok" ? ip : undefined,
    plan: auditPlan,
    ruleSets: auditRuleSets,
  });
  const fallback = plan.find(({ phase }) => phase === "defaultProxy");
  const action = explanation.matchedSource ? explanation.expectedPolicy : fallback?.action ?? "PROXY";
  const reason = explanation.matchedSource ? "matched-rule"
    : dnsStatus === "failed" ? "dns-failed-default-proxy"
      : explanation.needsResolution ? "unresolved-default-proxy" : "default-proxy";
  const matchedSource = explanation.matchedSource?.startsWith("custom-") ? "custom" : explanation.matchedSource;
  return Object.freeze({
    domain: hasDomain ? explanation.domain : null,
    ip: ip ?? null,
    matchedSource,
    phase: explanation.matchedPhase,
    dnsClass: explanation.dnsClass,
    action,
    reason,
    network,
    ...(port === undefined ? {} : { port }),
    dnsPolicy: hiddifyDnsPolicy(),
    retry: false,
    // Rule selection is determined before connection establishment. A matched
    // domestic rule remains DIRECT even if its resolver subsequently fails.
    connectionMayFail: dnsStatus === "failed",
  });
}
