import assert from "node:assert/strict";
import test from "node:test";

import { containsSecretKey } from "../../../shared/nodes/node-identity.js";
import { buildHappAudit } from "../src/audit.js";
import { renderHappSubscription } from "../src/render-subscription.js";

const encode = (value) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
const node = (name, id) => ({ name, type: "vless", server: `${id}.example.invalid`, port: 443, uuid: "TEST_ONLY_UUID", encryption: "none", network: "raw", tls: true, _profile: { id } });
const options = (policyOverrides = "") => ({ platform: "macos", dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", blockMode: "balanced", quicMode: "proxy-block", ipv6Mode: "auto", adblockMode: "off", policyOverrides });

test("describes fixed-node fallback warnings in private config metadata", () => {
  const eligible = [node("当前", "node-current"), node("重复", "node-duplicate-one"), node("重复", "node-duplicate-two")];
  const config = renderHappSubscription({
    nodes: eligible,
    allNodes: [...eligible, node("旧节点", "node-legacy")],
    options: options(encode({ "🤖 AI 专用": "NODE:不存在", "🐙 GitHub": "NODE:旧节点", "📺 YouTube": "NODE:重复" })),
  })[0];

  assert.match(config.meta.serverDescription, /未找到.*不存在/u);
  assert.match(config.meta.serverDescription, /不兼容.*旧节点/u);
  assert.match(config.meta.serverDescription, /重复.*重复/u);
});

test("summarizes business mappings when no generation fallback is needed", () => {
  const nodes = [node("当前", "node-current"), node("东京", "node-tokyo")];
  const config = renderHappSubscription({
    nodes, allNodes: nodes, options: options(encode({ "🤖 AI 专用": "NODE:东京", "🍎 Apple": "DIRECT" })),
  })[0];

  assert.match(config.meta.serverDescription, /🤖 AI 专用.*东京/u);
  assert.match(config.meta.serverDescription, /🍎 Apple.*DIRECT/u);
});

test("builds a private credential-free audit with configured and resolved policy targets", () => {
  const nodes = [node("当前", "node-current"), node("东京", "node-tokyo")];
  const input = { nodes, allNodes: nodes, options: options(encode({ "🤖 AI 专用": "NODE:东京", "📺 YouTube": "NODE:不存在" })) };
  const audit = buildHappAudit(input);

  assert.equal(audit.schemaVersion, 1);
  assert.deepEqual(audit.counts, { eligibleNodes: 2, fixedNodes: 1, warnings: 1 });
  assert.deepEqual(audit.targets["🤖 AI 专用"], { configured: "NODE:东京", resolved: "NODE:东京", status: "fixed", warningCode: null, nodeName: "东京" });
  assert.deepEqual(audit.targets["📺 YouTube"], { configured: "NODE:不存在", resolved: "FOLLOW", status: "missing-node-fallback", warningCode: "missing-node-fallback", nodeName: null });
  assert.equal(containsSecretKey(audit), false);
  assert.equal(JSON.stringify(audit).includes("example.invalid"), false);
  assert.equal(JSON.stringify(audit).includes("TEST_ONLY_UUID"), false);
});
