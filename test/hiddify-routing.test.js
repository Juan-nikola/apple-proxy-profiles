import test from "node:test";
import assert from "node:assert/strict";

import {
  compileHiddifyDecisionPlan,
  hiddifyCapabilityDiagnostics,
} from "../shared/routing/hiddify-decision.js";
import { diagnoseHiddifyRoute } from "../shared/routing/hiddify-audit.js";

const rules = [
  { sourceId: "OpenAI", kind: "domainSuffix", value: "example.cn" },
  { sourceId: "ChinaTLD", kind: "domainSuffix", value: "cn" },
  { sourceId: "ChinaIP", kind: "ipv4Cidr", value: "1.2.0.0/16" },
];
const ruleSets = new Map([
  ["OpenAI", { entries: [{ kind: "domainSuffix", value: "example.cn", sourceId: "OpenAI" }] }],
  ["ChinaTLD", { entries: [{ kind: "domainSuffix", value: "cn", sourceId: "ChinaTLD" }] }],
  ["ChinaIP", { entries: [{ kind: "ipv4Cidr", value: "1.2.0.0/16", sourceId: "ChinaIP" }] }],
]);

test("Hiddify audit records business defaults without copying sing-box config", () => {
  const plan = compileHiddifyDecisionPlan({ rules });
  assert.equal(plan.find((entry) => entry.sourceId === "OpenAI").action, "PROXY");
  assert.equal(plan.find((entry) => entry.sourceId === "ChinaTLD").action, "DIRECT");
  assert.equal(plan.find((entry) => entry.sourceId === "ChinaIP").action, "DIRECT");
  assert.ok(plan.every((entry) => !("outbounds" in entry)));
});

test("Hiddify preserves explicit overseas .cn precedence over ChinaTLD", () => {
  const result = diagnoseHiddifyRoute({ domain: "api.example.cn", plan: compileHiddifyDecisionPlan({ rules }), ruleSets });
  assert.equal(result.action, "PROXY");
  assert.equal(result.matchedSource, "OpenAI");
  assert.equal(result.phase, "serviceIntent");
});

test("Hiddify uses ChinaIP for resolved domestic addresses and proxy for unknown DNS", () => {
  const plan = compileHiddifyDecisionPlan({ rules });
  const domestic = diagnoseHiddifyRoute({ domain: "unknown.example", ip: "1.2.3.4", plan, ruleSets });
  assert.equal(domestic.action, "DIRECT");
  assert.equal(domestic.matchedSource, "ChinaIP");
  const unresolved = diagnoseHiddifyRoute({ domain: "unknown.example", dnsStatus: "failed", plan, ruleSets });
  assert.equal(unresolved.action, "PROXY");
  assert.equal(unresolved.reason, "dns-failed-default-proxy");
});

test("Hiddify keeps QUIC protocol explicit and never silently retries failed traffic", () => {
  const result = diagnoseHiddifyRoute({
    domain: "unknown.example",
    network: "udp",
    port: 443,
    dnsStatus: "failed",
    plan: compileHiddifyDecisionPlan({ rules }),
    ruleSets,
  });
  assert.equal(result.action, "PROXY");
  assert.equal(result.network, "udp");
  assert.equal(result.port, 443);
  assert.equal(result.retry, false);
});

test("Hiddify capability diagnostics preserve groups and report DNS limits", () => {
  const diagnostics = hiddifyCapabilityDiagnostics();
  assert.equal(diagnostics.core, "hiddify");
  assert.equal(diagnostics.fullGroupSemantics, true);
  assert.ok(diagnostics.supported.includes("china-ip"));
  assert.equal(diagnostics.coreRawModeRequirement, "StartRequest.enable_raw_config=true");
  assert.equal(diagnostics.appImportPreservesFullConfig, false);
  assert.equal(diagnostics.appFullConfigSupport, "unavailable-in-v4.1.1");
  assert.ok(diagnostics.degraded.includes("dns-response-routing"));
});

test("Hiddify DNS policy is conservative and does not claim dual-answer consensus", async () => {
  const { hiddifyDnsPolicy } = await import("../shared/routing/hiddify-decision.js");
  assert.deepEqual(hiddifyDnsPolicy(), {
    explicitDomestic: "direct",
    explicitOverseas: "proxy",
    unknown: "proxy",
    classifyResolvedChinaIp: true,
    compareResolverAnswers: false,
    retryFailedConnections: false,
  });
});

test("Hiddify rule-set compatibility requires inline critical rules", async () => {
  const { HIDDIFY_RULESET_COMPATIBILITY } = await import("../shared/routing/hiddify-decision.js");
  assert.equal(HIDDIFY_RULESET_COMPATIBILITY.maxVersion, 4);
  assert.equal(HIDDIFY_RULESET_COMPATIBILITY.remoteSupportsHttpClient, false);
  assert.equal(HIDDIFY_RULESET_COMPATIBILITY.startupFetchBlocking, false);
  assert.equal(HIDDIFY_RULESET_COMPATIBILITY.requireInlineCriticalRules, true);
});

test("Hiddify audits IPv4 and IPv6 requests with no domain", () => {
  const ipRules = new Map(ruleSets);
  ipRules.set("ChinaIP", { entries: [
    ...ruleSets.get("ChinaIP").entries,
    { kind: "ipv6Cidr", value: "240e::/20", sourceId: "ChinaIP" },
  ] });
  const plan = compileHiddifyDecisionPlan({ rules });
  for (const ip of ["1.2.3.4", "240e::1"]) {
    const result = diagnoseHiddifyRoute({ ip, plan, ruleSets: ipRules });
    assert.equal(result.action, "DIRECT", ip);
    assert.equal(result.domain, null);
  }
  assert.equal(diagnoseHiddifyRoute({ ip: "8.8.8.8", plan, ruleSets: ipRules }).action, "PROXY");
});

test("Hiddify preserves domain business routing when its selected DNS fails", () => {
  const result = diagnoseHiddifyRoute({ domain: "plain.cn", dnsStatus: "failed", plan: compileHiddifyDecisionPlan({ rules }), ruleSets });
  assert.equal(result.action, "DIRECT");
  assert.equal(result.matchedSource, "ChinaTLD");
  assert.equal(result.connectionMayFail, true);
  assert.equal(result.retry, false);
});

test("Hiddify plan retains the shared phase order including overseas games before .cn", () => {
  const plan = compileHiddifyDecisionPlan();
  const position = (sourceId) => plan.findIndex((entry) => entry.sourceId === sourceId);
  assert.ok(position("Hijacking") < position("DomesticCore"));
  assert.ok(position("DomesticCore") < position("OpenAI"));
  assert.ok(position("OpenAI") < position("OverseasGame"));
  assert.ok(position("OverseasGame") < position("ChinaTLD"));
  assert.ok(position("ChinaTLD") < position("ChinaIP"));
  assert.ok(position("ChinaIP") < position("defaultProxy"));
});

test("Hiddify offline diagnostics reject malformed inputs", () => {
  const plan = compileHiddifyDecisionPlan({ rules });
  for (const input of [{}, { ip: "invalid" }, { domain: "https://example.cn" }, { domain: "example.cn", network: "sctp" }, { domain: "example.cn", port: 65536 }]) {
    assert.throws(() => diagnoseHiddifyRoute({ ...input, plan, ruleSets }));
  }
});

test("Hiddify audit evaluates custom matchers with their own actions", () => {
  const plan = compileHiddifyDecisionPlan({
    rules: [],
    customRules: [
      { matcher: { type: "domainSuffix", value: "direct.example" }, action: "DIRECT" },
      { matcher: { type: "domainSuffix", value: "blocked.example" }, action: "REJECT" },
    ],
  });
  assert.equal(diagnoseHiddifyRoute({ domain: "api.direct.example", plan, ruleSets }).action, "DIRECT");
  assert.equal(diagnoseHiddifyRoute({ domain: "api.blocked.example", plan, ruleSets }).action, "REJECT");
  assert.equal(diagnoseHiddifyRoute({ domain: "api.direct.example", plan, ruleSets }).matchedSource, "custom");
});
