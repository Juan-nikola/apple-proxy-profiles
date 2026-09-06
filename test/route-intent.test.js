import test from "node:test";
import assert from "node:assert/strict";
import { compileRouteIntents } from "../shared/routing/route-intent.js";

test("business intent outranks ChinaIP fallback", () => {
  const intents = compileRouteIntents({
    rules: [{ kind: "domainSuffix", value: "openai.com", sourceId: "OpenAI" }],
  });
  assert.equal(intents[0].businessId, "ai");
  assert.ok(intents.find((it) => it.sourceProvenance.includes("ChinaIP")).priority > intents[0].priority);
});

test("custom rules keep explicit precedence and actions", () => {
  const [intent] = compileRouteIntents({ customRules: [{ kind: "domain", value: "intranet.test", action: "DIRECT", businessId: "custom" }] });
  assert.equal(intent.action, "DIRECT");
  assert.equal(intent.priority, 30);
});
