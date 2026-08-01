import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-profile-entry.js";

const argumentsForProfile = Object.freeze({
  output: "config",
  type: "collection",
  name: "shadowrocket-sources",
  subscriptionName: "Shadowrocket-Nodes",
  platform: "macos",
});

const nodes = Object.freeze([{
  name: "node",
  _sr: { continent: "asiaPacific", sourceKind: "airport", udp: true, p2p: false, entry: true, chained: false },
}]);

test("file operator produces a Profile artifact and preserves the input", async () => {
  const input = { url: "https://example.invalid/sub", unchanged: true };
  const calls = [];
  const result = await operator(input, "Shadowrocket", {
    arguments: argumentsForProfile,
    async produceArtifact(request) {
      calls.push(request);
      return nodes;
    },
  });

  assert.deepEqual(calls, [{ type: "collection", name: "shadowrocket-sources", platform: "JSON", produceType: "internal" }]);
  assert.deepEqual({ url: result.url, unchanged: result.unchanged }, input);
  assert.equal(typeof result.$content, "string");
  assert.deepEqual(Object.keys(result).sort(), ["$content", "unchanged", "url"]);
  assert.match(result.$content, /\[Proxy Group\]/);
});

test("file operator fails closed for invalid integration input", async () => {
  await assert.rejects(operator({}, "Shadowrocket", { arguments: argumentsForProfile }), /produceArtifact/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { ...argumentsForProfile, output: "nodes" },
    async produceArtifact() { return nodes; },
  }), /output.*config/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: argumentsForProfile,
    async produceArtifact() { return []; },
  }), /non-empty|nodes/i);
  await assert.rejects(operator({}, "Shadowrocket", {
    arguments: { ...argumentsForProfile, quicMode: "invalid" },
    async produceArtifact() { return nodes; },
  }), /quicMode/i);
});

