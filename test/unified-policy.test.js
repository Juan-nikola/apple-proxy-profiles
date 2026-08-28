import assert from "node:assert/strict";
import test from "node:test";

import { normalizeNodes } from "../shared/nodes/normalize-nodes.js";
import {
  parseNodeReference,
  resolveNodeReference,
} from "../shared/nodes/node-reference.js";
import {
  loadSubstorePolicyArtifact,
  POLICY_ARTIFACT_NAME,
} from "../shared/substore/policy-artifact.js";
import {
  parsePrivatePolicy,
  resolvePrivatePolicy,
} from "../shared/policies/private-policy.js";
import {
  policyGroupDefaults,
  resolveUnifiedPolicy,
} from "../shared/policies/resolve-unified.js";
import { defaultUnifiedPolicyTargets } from "../shared/policies/unified-policy.js";
import { applyUnifiedPolicyDefaults, buildPolicyGroups } from "../shared/policies/catalog.js";

function rawNode(name, type = "vless", overrides = {}) {
  return {
    name,
    type,
    server: "example.invalid",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    ...overrides,
  };
}

function normalized(rawNodes) {
  return normalizeNodes(rawNodes).nodes;
}

test("preserves the Sub-Store original name separately from the generated display name", () => {
  const [node] = normalized([rawNode("🇺🇸大妈Fontana")]);

  assert.equal(node._profile.originalName, "🇺🇸大妈Fontana");
  assert.equal(node._profile.protocol, "vless");
  assert.notEqual(node.name, node._profile.originalName);
  assert.match(node.name, /VLESS/u);
});

test("resolves a unique node by exact original name and ignores generated display suffixes", () => {
  const [node] = normalized([rawNode("🇺🇸大妈Fontana")]);

  assert.equal(
    resolveNodeReference({ target: "NODE:🇺🇸大妈Fontana", eligibleNodes: [node], allNodes: [node] }),
    node,
  );
});

test("uses an explicit canonical protocol qualifier for same-name nodes", () => {
  const nodes = normalized([
    rawNode("🇺🇸qqpw家宽", "vless"),
    rawNode("🇺🇸qqpw家宽", "trojan", { password: "test-password" }),
  ]);

  assert.equal(
    resolveNodeReference({ target: "NODE:🇺🇸qqpw家宽|vless", eligibleNodes: nodes, allNodes: nodes }),
    nodes.find((node) => node._profile.protocol === "vless"),
  );
  assert.equal(
    parseNodeReference("NODE:🇺🇸qqpw家宽|hy2").protocol,
    "hysteria2",
  );
});

test("rejects ambiguous, missing, and incompatible exact references instead of falling back", () => {
  const sameProtocol = normalized([
    rawNode("🇺🇸重复", "vless", { address: "one.invalid" }),
    rawNode("🇺🇸重复", "vless", { address: "two.invalid" }),
  ]);
  assert.throws(
    () => resolveNodeReference({ target: "NODE:🇺🇸重复", eligibleNodes: sameProtocol, allNodes: sameProtocol }),
    /ambiguous/iu,
  );

  const missing = normalized([rawNode("🇯🇵东京节点-01")]);
  assert.throws(
    () => resolveNodeReference({ target: "NODE:🇯🇵东京节点", eligibleNodes: missing, allNodes: missing }),
    /missing/iu,
  );

  const incompatible = normalized([rawNode("🇺🇸仅支持节点", "vless")]);
  assert.throws(
    () => resolveNodeReference({
      target: "NODE:🇺🇸仅支持节点",
      eligibleNodes: [],
      allNodes: incompatible,
      client: "surge",
    }),
    /incompatible/iu,
  );
});

test("parses the simple schemaVersion 2 policy and applies built-in defaults", () => {
  const policy = parsePrivatePolicy(JSON.stringify({
    schemaVersion: 2,
    targets: {
      "🤖 AI 专用": "NODE:🇺🇸qqpw家宽|vless",
      "🎬 海外流媒体": "FOLLOW",
      "🍎 Apple": "DIRECT",
    },
  }));

  assert.equal(policy.schemaVersion, 2);
  assert.equal(policy.targets.ai, "NODE:🇺🇸qqpw家宽|vless");
  assert.equal(policy.targets.youtube, "FOLLOW");
  assert.equal(policy.targets.apple, "DIRECT");
  assert.equal(policy.targets.download, "DIRECT");

  const resolved = resolvePrivatePolicy({ policy, channel: "current", client: "surge" });
  assert.equal(resolved.targets.ai, "NODE:🇺🇸qqpw家宽|vless");
  assert.equal(resolved.targets.final, "FOLLOW");
});

test("exposes the complete 13-target unified policy defaults", () => {
  assert.deepEqual(defaultUnifiedPolicyTargets(), {
    ai: "FOLLOW",
    github: "FOLLOW",
    youtube: "FOLLOW",
    overseasMedia: "FOLLOW",
    globalSocial: "FOLLOW",
    apple: "DIRECT",
    microsoft: "DIRECT",
    domesticPlatform: "DIRECT",
    overseasGame: "FOLLOW",
    game: "DIRECT",
    download: "DIRECT",
    dnsAndRules: "FOLLOW",
    final: "FOLLOW",
  });
});

test("loads one private Sub-Store policy artifact and rejects an unavailable artifact", async () => {
  const calls = [];
  const policyText = JSON.stringify({ schemaVersion: 2, targets: { "🍎 Apple": "DIRECT" } });
  const policy = await loadSubstorePolicyArtifact({
    produceArtifact: async (request) => {
      calls.push(request);
      return { $content: policyText };
    },
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    type: "file",
    name: POLICY_ARTIFACT_NAME,
    platform: "JSON",
    produceType: "internal",
  });
  assert.equal(policy.targets.apple, "DIRECT");

  await assert.rejects(
    () => loadSubstorePolicyArtifact({ produceArtifact: async () => null }),
    /policy artifact|content|unavailable/iu,
  );
});

test("rejects a node collection accidentally returned for the policy file request", async () => {
  await assert.rejects(
    () => loadSubstorePolicyArtifact({ produceArtifact: async () => [] }),
    /policy artifact|content|unavailable/iu,
  );
});

test("resolves unified v2 NODE targets against original names and exposes display defaults", () => {
  const nodes = normalized([rawNode("🇺🇸qqpw家宽", "vless")]);
  const policy = parsePrivatePolicy(JSON.stringify({
    schemaVersion: 2,
    targets: {
      "🤖 AI 专用": "NODE:🇺🇸qqpw家宽|vless",
      "🎬 海外流媒体": "DIRECT",
    },
  }));
  const resolution = resolveUnifiedPolicy({
    policy,
    client: "surge",
    allNodes: nodes,
    eligibleNodes: nodes,
  });

  assert.equal(resolution.targets.ai.resolved, nodes[0].name);
  assert.equal(resolution.targets.overseasMedia.resolved, "DIRECT");
  assert.equal(policyGroupDefaults(resolution)["🤖 AI 专用"], nodes[0].name);
  assert.equal(policyGroupDefaults(resolution)["🎬 海外流媒体"], "DIRECT");
  assert.equal(resolution.fixedNodes.length, 1);
});

test("applies unified defaults while retaining interactive group candidates", () => {
  const nodes = normalized([rawNode("🇺🇸qqpw家宽", "vless")]);
  const policy = parsePrivatePolicy(JSON.stringify({
    schemaVersion: 2,
    targets: {
      "🤖 AI 专用": "NODE:🇺🇸qqpw家宽|vless",
      "🎬 海外流媒体": "DIRECT",
    },
  }));
  const resolution = resolveUnifiedPolicy({ policy, client: "singbox", allNodes: nodes, eligibleNodes: nodes });
  const groups = applyUnifiedPolicyDefaults(
    buildPolicyGroups({ platform: "iphone", autoGroupMode: "auto", blockMode: "balanced", clientChain: "off" }, nodes),
    resolution,
  );
  const ai = groups.find(({ name }) => name === "🤖 AI 专用");
  const media = groups.find(({ name }) => name === "🎬 海外流媒体");
  assert.equal(ai.defaultChoice, nodes[0].name);
  assert.equal(media.defaultChoice, "DIRECT");
  assert.ok(ai.nodeFilter);
  assert.ok(media.candidates.includes("DIRECT"));
});
