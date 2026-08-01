import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-node-entry.js";
import { fakeNodes } from "./fixtures/nodes.js";

test("operator returns normalized nodes for the Shadowrocket node output", async () => {
  const result = await operator(fakeNodes, "Shadowrocket", {
    arguments: { output: "nodes", clientChain: "off" },
  });

  assert.equal(Array.isArray(result), true);
  assert.equal(result.length, fakeNodes.length);
});

test("operator fails closed when there are no valid nodes", async () => {
  await assert.rejects(
    operator([], "Shadowrocket", { arguments: { output: "nodes" } }),
    /no valid nodes/i,
  );
});

test("operator rejects unknown options", async () => {
  await assert.rejects(
    operator(fakeNodes, "Shadowrocket", { arguments: { output: "nodes", extra: "x" } }),
    /extra/i,
  );
});

test("operator logs one aggregate diagnostics line without node values", async () => {
  const lines = [];
  await operator(fakeNodes, "Shadowrocket", {
    arguments: { output: "nodes", clientChain: "off" },
    logger: { info(line) { lines.push(line); } },
  });

  assert.equal(lines.length, 1);
  assert.match(lines[0], /^\[shadowrocket-profile\] \{/);
  for (const secret of ["198.51.100.10", "TEST_ONLY_NOT_A_SECRET", "00000000-0000-4000-8000-000000000001"]) {
    assert.equal(lines[0].includes(secret), false);
  }
});

