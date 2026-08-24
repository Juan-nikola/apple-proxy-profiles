import assert from "node:assert/strict";
import test from "node:test";

import { encodeBase64UrlUtf8 } from "../../../shared/encoding/base64url.js";
import { parseOneXrayOptions } from "../src/options.js";
import { resolveOneXrayPolicy } from "../src/resolve-policy.js";

const entry = (name, extra = {}) => ({
  name,
  type: "vless",
  server: "example.test",
  port: 443,
  uuid: `TEST_ONLY_${name}`,
  _profile: { id: `id-${name}`, entry: true, sourceKind: "airport", chained: false },
  ...extra,
});

const landing = (name, extra = {}) => entry(name, {
  _profile: { id: `id-${name}`, entry: false, sourceKind: "landing", chained: false },
  ...extra,
});

function options(overrides = {}) {
  return parseOneXrayOptions({
    output: "profile",
    type: "collection",
    name: "TEST_ONLY_OneXray",
    ...overrides,
  });
}

function expectedTag(value) {
  let hash = 0x811c9dc5;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `ap-fixed-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

test("resolves exact fixed business nodes and stable proxy tags", () => {
  const nodes = [entry("TEST_ONLY_Entry"), entry("TEST_ONLY_Tokyo")];
  const encoded = encodeBase64UrlUtf8(JSON.stringify({ "🤖 AI 专用": "NODE:TEST_ONLY_Tokyo", github: "DIRECT" }));
  const result = resolveOneXrayPolicy({
    options: options({ policyOverrides: encoded }),
    allNodes: nodes,
    eligibleNodes: nodes,
  });
  assert.equal(result.homepageNodes.length, 2);
  assert.equal(result.targets.ai.status, "fixed");
  assert.match(result.targets.ai.resolvedTag, /^ap-fixed-[a-f0-9]{8}$/u);
  assert.equal(result.targets.github.resolvedTag, "direct");
  assert.equal(result.fixedNodes.length, 1);
});

test("unified fixed-node tags use a NUL separator between display name and node id", () => {
  const node = entry("TEST_ONLY_Fixed");
  const result = resolveOneXrayPolicy({
    options: options(),
    allNodes: [node],
    eligibleNodes: [node],
    policyResolution: {
      fixedNodes: [{ node, nodeId: node._profile.id, name: node.name }],
      targets: {
        ai: { configured: "NODE:TEST_ONLY_Fixed", resolved: node.name, status: "fixed", nodeId: node._profile.id },
      },
    },
  });
  assert.equal(result.targets.ai.resolvedTag, expectedTag(`${node.name}\u0000${node._profile.id}`));
});

test("rejects missing, duplicate, and incompatible fixed nodes before emitting a profile", () => {
  const nodes = [entry("TEST_ONLY_Entry"), { ...entry("TEST_ONLY_Fixed"), _profile: { ...entry("TEST_ONLY_Fixed")._profile, chained: true } }];
  const encoded = encodeBase64UrlUtf8(JSON.stringify({ ai: "NODE:TEST_ONLY_Fixed" }));
  assert.throws(() => resolveOneXrayPolicy({ options: options({ policyOverrides: encoded }), allNodes: nodes, eligibleNodes: [nodes[0]] }), /AI 专用|fixed/i);
  assert.throws(() => resolveOneXrayPolicy({ options: options({ policyOverrides: encodeBase64UrlUtf8(JSON.stringify({ ai: "NODE:TEST_ONLY_Missing" })) }), allNodes: nodes, eligibleNodes: nodes }), /AI 专用|fixed/i);
});

test("chain-on selects one landing and excludes it from homepage nodes", () => {
  const nodes = [entry("TEST_ONLY_Entry"), landing("TEST_ONLY_Landing")];
  const result = resolveOneXrayPolicy({
    options: options({ clientChain: "on", clientChainTarget: "NODE:TEST_ONLY_Landing" }),
    allNodes: nodes,
    eligibleNodes: nodes,
  });
  assert.equal(result.chain.enabled, true);
  assert.equal(result.chain.landingTag, "chainProxy");
  assert.deepEqual(result.homepageNodes.map(({ name }) => name), ["TEST_ONLY_Entry"]);
  assert.equal(result.finalOutbound.node.name, "TEST_ONLY_Landing");
});
