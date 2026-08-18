import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPublicAuditDashboard,
  renderPublicAuditDashboard,
  validatePublicAuditDashboard,
} from "../src/public-audit-dashboard.js";
import { canonicalJson } from "../src/render-anywhere-rules.js";

const baseInput = {
  generatedAt: "2026-08-18T03:23:00Z",
  upstream: { repository: "blackmatrix7", commit: "a".repeat(40), sha256: "b".repeat(64) },
  clientCatalog: [
    { id: "happ", state: "active", adapterSchema: "happ-v4" },
    { id: "surge", state: "active", adapterSchema: "surge-v1" },
  ],
  canaryState: { surge: { edge: "passed" } },
  chinaIpAudit: { schemaVersion: 1, reportOnly: true },
  v2flyDomainAudit: { schemaVersion: 1, reportOnly: true },
  routingPlanAudit: { schemaVersion: 1 },
  releaseState: { channels: { edge: {}, current: {}, previous: {} }, closure: {} },
};

test("builds a redacted dashboard with active Xray clients awaiting channel manifests", () => {
  const dashboard = buildPublicAuditDashboard(baseInput);
  assert.equal(validatePublicAuditDashboard(dashboard), true);
  assert.equal(dashboard.clients.happ.state, "active");
  assert.equal(dashboard.clients.happ.edge.manifestHash, null);
  assert.doesNotMatch(renderPublicAuditDashboard(dashboard), /password|uuid|subscription|NODE:/iu);
});

test("escapes HTML and rejects secret-shaped or open-channel dashboard data", () => {
  const dashboard = buildPublicAuditDashboard(baseInput);
  const html = renderPublicAuditDashboard({
    ...dashboard,
    upstream: { ...dashboard.upstream, repository: "<script>alert(1)</script>" },
  });
  assert.doesNotMatch(html, /<script>alert/u);
  assert.throws(
    () => validatePublicAuditDashboard({ ...dashboard, blockers: [{ key: "node:secret", severity: "blocker" }] }),
    /blocker|secret|key/u,
  );
  assert.throws(
    () => validatePublicAuditDashboard({ ...dashboard, channels: { edge: { closure: false }, current: {}, previous: {} } }),
    /closure|channel/u,
  );
});

test("renders the same HTML after canonical JSON round-tripping", () => {
  const dashboard = buildPublicAuditDashboard(baseInput);
  const roundTripped = JSON.parse(canonicalJson(dashboard));
  assert.equal(renderPublicAuditDashboard(dashboard), renderPublicAuditDashboard(roundTripped));
});
