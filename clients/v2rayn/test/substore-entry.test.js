import assert from "node:assert/strict";
import test from "node:test";
import { operator as nodesOperator } from "../src/substore-node-entry.js";

test("v2rayN node operator uses internal JSON artifact contract", async () => {
  const result = await nodesOperator({}, "JSON", { arguments: { output: "nodes", type: "collection", name: "fixture", platform: "windows" }, produceArtifact: async (request) => { assert.deepEqual(request, { type: "collection", name: "fixture", platform: "JSON", produceType: "internal" }); return [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }]; } });
  assert.equal(JSON.parse(result.$content).outbounds.length, 1);
  assert.match(result.$content, /\n$/u);
});
