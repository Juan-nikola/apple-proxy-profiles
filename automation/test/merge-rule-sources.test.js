import assert from "node:assert/strict";
import test from "node:test";
import { RULE_KIND } from "../../shared/rules/model.js";
import { explainRoute, mergeRuleSources } from "../src/merge-rule-sources.js";

const entry = (value, sourceId, extra = {}) => ({ kind: RULE_KIND.domainSuffix, value, sourceId, ...extra });
const snapshot = (sourceId, entries, extra = {}) => ({ sourceId, entries, provenance: { sourceId, commit: "a".repeat(40), ...extra } });

test("user rules override explicit business rules", () => {
  const merged = mergeRuleSources({ snapshots: new Map([
    ["OpenAI", snapshot("OpenAI", [entry("example.com", "OpenAI")])],
  ]), userRules: [entry("example.com", "user", { action: "DIRECT" })] });
  assert.equal(explainRoute({ hostname: "www.example.com", merged }).action, "DIRECT");
});

test("security rules override a selected region overlay", () => {
  const merged = mergeRuleSources({ region: "ru", snapshots: new Map([
    ["russia-v2ray-rules", snapshot("russia-v2ray-rules", [entry("blocked.ru", "russia-v2ray-rules", { category: "local" })])],
    ["Hijacking", snapshot("Hijacking", [entry("blocked.ru", "Hijacking")])],
  ]) });
  assert.equal(explainRoute({ hostname: "blocked.ru", merged }).action, "REJECT");
});

test("duplicate cross-source entries retain provenance deterministically", () => {
  const merged = mergeRuleSources({ snapshots: new Map([
    ["v2fly-domain-list", snapshot("v2fly-domain-list", [entry("same.example", "v2fly-domain-list")])],
    ["loyalsoldier-rules-dat", snapshot("loyalsoldier-rules-dat", [entry("same.example", "loyalsoldier-rules-dat")])],
  ]) });
  const decision = merged.decisions.find(({ matcher }) => matcher.value === "same.example");
  assert.deepEqual(decision.matchedSources, ["loyalsoldier-rules-dat", "v2fly-domain-list"]);
});

test("ChinaTLD wins before ChinaIP fallback", () => {
  const merged = mergeRuleSources({ snapshots: new Map([
    ["ChinaTLD", snapshot("ChinaTLD", [entry("cn", "ChinaTLD")])],
    ["ChinaIP", { ...snapshot("ChinaIP", []), entries: [{ kind: RULE_KIND.ipv4Cidr, value: "1.0.1.0/24", sourceId: "ChinaIP", noResolve: true }] }],
  ]) });
  assert.equal(explainRoute({ hostname: "service.cn", ip: "1.0.1.1", merged }).matchedSources[0], "ChinaTLD");
  assert.equal(explainRoute({ hostname: "service.example", ip: "1.0.1.1", merged }).matchedSources[0], "ChinaIP");
});
