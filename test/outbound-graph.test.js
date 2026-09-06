import test from "node:test";
import assert from "node:assert/strict";
import { buildOutboundGraph } from "../shared/routing/outbound-graph.js";

const node = (id, name) => ({ name, _profile: { id } });

test("outbound graph uses stable IDs and business groups", () => {
  const graph = buildOutboundGraph({ nodes: [node("n1", "US")], options: { autoGroupMode: "auto" } });
  assert.equal(graph.physicalNodes[0].id, "n1");
  assert.ok(graph.businessGroups.ai.candidates.includes("ap-node-0"));
  assert.equal(graph.urlTests.length, 1);
});

test("duplicate stable IDs are rejected", () => {
  assert.throws(() => buildOutboundGraph({ nodes: [node("n1", "A"), node("n1", "B")] }), /Duplicate stable node ID/);
});
