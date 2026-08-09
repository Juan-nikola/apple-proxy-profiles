import assert from "node:assert/strict";
import test from "node:test";

import { compileLightweightRules } from "../src/compile-lightweight-rules.js";
import { artifactSha256 } from "../src/artifact-content.js";
import { canonicalJson } from "../src/render-anywhere-rules.js";
import {
  buildRoutingPlanAudit,
  validateRoutingPlanAudit,
} from "../src/routing-plan-audit.js";
import {
  orderedRoutingPlan,
  ROUTING_PHASES,
  ruleClientCatalog,
} from "../../shared/rules/lightweight-policy.js";
import { lightweightFixtureSnapshots } from "./lightweight-fixture.js";

function fixtureAuditInputs() {
  const plan = orderedRoutingPlan({ adblockMode: "off" });
  const compiled = compileLightweightRules({ snapshots: lightweightFixtureSnapshots() });
  return { plan, ruleSets: compiled.defaultRuleSets };
}

test("builds a canonical v1 routing plan audit with ordered phases", () => {
  const { plan, ruleSets } = fixtureAuditInputs();
  const audit = buildRoutingPlanAudit({ plan, ruleSets });

  assert.equal(validateRoutingPlanAudit(audit), true);
  assert.equal(audit.schemaVersion, 1);
  assert.deepEqual(audit.phases.map(({ phase }) => phase), ROUTING_PHASES);
  assert.deepEqual(
    audit.phases.flatMap(({ sources }) => sources.map(({ id }) => id)),
    ruleClientCatalog({ adblockMode: "off" }).map(({ id }) => id),
  );
  for (const phase of audit.phases) {
    for (const source of phase.sources) {
      assert.equal(typeof source.policy, "string");
      assert.equal(typeof source.dnsClass, "string");
      assert.equal(Number.isSafeInteger(source.entries), true);
      assert.equal(source.entries, ruleSets.get(source.id).entries.length);
    }
  }
  const expectedTotals = {
    sources: ruleClientCatalog({ adblockMode: "off" }).length,
    entries: [...ruleSets.values()].reduce((sum, set) => sum + set.entries.length, 0),
  };
  assert.deepEqual(audit.totals, expectedTotals);
  assert.equal(
    audit.sha256,
    artifactSha256(canonicalJson({
      schemaVersion: 1,
      phases: audit.phases,
      totals: audit.totals,
    })),
  );
});

test("is byte deterministic for identical inputs", () => {
  const inputs = fixtureAuditInputs();
  const first = canonicalJson(buildRoutingPlanAudit(inputs));
  const second = canonicalJson(buildRoutingPlanAudit(inputs));
  assert.equal(first, second);
});

test("rejects forbidden node, URL query, password, UUID, and subscription fields", () => {
  const { plan, ruleSets } = fixtureAuditInputs();
  const forbidden = ["node", "urlQuery", "password", "uuid", "subscription"];
  for (const field of forbidden) {
    const poisoned = plan.map((record, index) => index === 0
      ? Object.freeze({ ...record, [field]: field === "urlQuery" ? "?a=1" : "secret" })
      : record);
    assert.throws(
      () => buildRoutingPlanAudit({ plan: poisoned, ruleSets }),
      /forbidden field/u,
      field,
    );
  }

  const audit = buildRoutingPlanAudit({ plan, ruleSets });
  for (const field of forbidden) {
    assert.throws(
      () => validateRoutingPlanAudit({ ...audit, [field]: "secret" }),
      /forbidden field/u,
      field,
    );
  }
});

test("rejects malformed plans and rule sets", () => {
  const { plan, ruleSets } = fixtureAuditInputs();
  const missingSet = new Map(ruleSets);
  missingSet.delete(plan[0].id);
  assert.throws(
    () => buildRoutingPlanAudit({ plan, ruleSets: missingSet }),
    /missing its rule set/u,
  );

  const duplicate = [...plan, plan[0]];
  assert.throws(
    () => buildRoutingPlanAudit({ plan: duplicate, ruleSets }),
    /duplicate source/u,
  );

  const badPhase = plan.map((record, index) => index === 0
    ? Object.freeze({ ...record, phase: "not-a-phase" })
    : record);
  assert.throws(
    () => buildRoutingPlanAudit({ plan: badPhase, ruleSets }),
    /unknown phase/u,
  );

  assert.throws(() => buildRoutingPlanAudit({ plan: "nope", ruleSets }), /must be an array/u);
  assert.throws(() => buildRoutingPlanAudit({ plan, ruleSets: [] }), /must be a Map/u);
});

test("rejects audits with wrong order, totals, or digest", () => {
  const { plan, ruleSets } = fixtureAuditInputs();
  const audit = buildRoutingPlanAudit({ plan, ruleSets });
  const reordered = {
    ...audit,
    phases: [...audit.phases].reverse(),
  };
  assert.throws(() => validateRoutingPlanAudit(reordered), /phase order mismatch/u);

  const wrongTotals = {
    ...audit,
    totals: { sources: audit.totals.sources, entries: audit.totals.entries + 1 },
  };
  assert.throws(() => validateRoutingPlanAudit(wrongTotals), /totals do not match/u);

  const wrongDigest = { ...audit, sha256: "0".repeat(64) };
  assert.throws(() => validateRoutingPlanAudit(wrongDigest), /does not match/u);
});
