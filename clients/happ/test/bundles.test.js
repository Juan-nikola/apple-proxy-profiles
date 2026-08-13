import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const bundles = ["../dist/happ-config-generator.js", "../dist/substore-config-generator.js"];
const arguments_ = { output: "config", type: "collection", name: "happ-config-macos", subscriptionName: "happ-config-macos", platform: "macos", policyOverrides: "e30" };
const nodes = [{ name: "Tokyo", type: "ss", server: "bundle.example.invalid", port: 443, cipher: "aes-256-gcm", password: "TEST_ONLY_BUNDLE_SECRET", udp: true }];

test("Happ browser bundles are self-contained aliases and run with only Sub-Store globals", async () => {
  const contents = await Promise.all(bundles.map((file) => readFile(new URL(file, import.meta.url), "utf8")));
  assert.equal(contents[0], contents[1]);
  for (const content of contents) {
    assert.match(content, /async function operator\(/u);
    assert.doesNotMatch(content, /^\s*(?:import|export)\s/mu);
    assert.doesNotMatch(content, /^\s*import\s.+?from\s+["']node:/mu);
    assert.doesNotMatch(content, /\brequire\s*\(/u);
    assert.doesNotMatch(content, /TODO|PLACEHOLDER/iu);
    const lines = [];
    const requests = [];
    const context = vm.createContext({ argumentsJson: JSON.stringify(arguments_), nodesJson: JSON.stringify(nodes), btoa, atob, TextEncoder, TextDecoder, logger: { info(line) { lines.push(line); } } });
    vm.runInContext("globalThis.$arguments = JSON.parse(argumentsJson); globalThis.__nodes = JSON.parse(nodesJson); globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value))", context);
    context.produceArtifact = async (request) => { requests.push({ ...request }); return context.__nodes; };
    vm.runInContext(content, context, { timeout: 2_000 });
    const result = await context.operator({}, "Happ");
    assert.equal(JSON.parse(result.$content).length, 1);
    assert.deepEqual(requests, [{ type: "collection", name: "happ-config-macos", platform: "JSON", produceType: "internal" }]);
    assert.equal(lines.length, 1);
  }
});
