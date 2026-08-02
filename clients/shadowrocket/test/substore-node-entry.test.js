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

test("operator accepts only the documented node arguments", async () => {
  for (const arguments_ of [
    { output: "nodes" },
    { output: "nodes", clientChain: "off" },
    { output: "nodes", clientChain: "on" },
    { output: "nodes", _internal: "ignored" },
  ]) {
    const result = await operator(fakeNodes, "Shadowrocket", { arguments: arguments_ });
    assert.equal(Array.isArray(result), true);
  }

  for (const arguments_ of [
    { output: "config" },
    { output: "nodes", clientChain: "invalid" },
  ]) {
    await assert.rejects(
      operator(fakeNodes, "Shadowrocket", { arguments: arguments_ }),
      /output must be nodes|clientChain must be off or on/,
    );
  }
});

test("operator fails closed when there are no valid nodes", async () => {
  await assert.rejects(
    operator([], "Shadowrocket", { arguments: { output: "nodes" } }),
    /no valid nodes/i,
  );
});

test("operator rejects unknown non-internal options", async () => {
  await assert.rejects(
    operator(fakeNodes, "Shadowrocket", { arguments: { output: "nodes", unexpected: "x" } }),
    /Unknown option: unexpected/,
  );
});

test("operator retains its JavaScript function arity", () => {
  assert.equal(operator.length, 0);
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
