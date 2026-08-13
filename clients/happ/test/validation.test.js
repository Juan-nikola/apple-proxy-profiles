import assert from "node:assert/strict";
import test from "node:test";

import { renderHappSubscription } from "../src/render-subscription.js";
import { validateHappSubscription } from "../src/validate-subscription.js";

const node = (name, id) => ({ name, type: "vless", server: `${id}.example.invalid`, port: 443, uuid: "TEST_ONLY_UUID", encryption: "none", network: "raw", tls: true, _profile: { id } });
const options = { platform: "macos", dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", blockMode: "balanced", quicMode: "proxy-block", ipv6Mode: "auto", adblockMode: "off", policyOverrides: "" };
function valid() {
  const nodes = [node("当前节点", "node-current"), node("东京节点", "node-tokyo")];
  return structuredClone(renderHappSubscription({ nodes, allNodes: nodes, options })[0]);
}

test("accepts a composed subscription", () => assert.equal(validateHappSubscription([valid()]), true));

test("rejects duplicate internal tags and dangling route references", () => {
  for (const [label, mutate] of [
    ["outbound", (config) => { config.outbounds.push({ ...config.outbounds[0] }); }],
    ["inbound", (config) => { config.inbounds.push({ ...config.inbounds[0] }); }],
    ["balancer", (config) => { config.routing.balancers.push({ tag: "same", selector: [config.outbounds[0].tag], fallbackTag: config.outbounds[0].tag }); config.routing.balancers.push({ tag: "same", selector: [config.outbounds[0].tag], fallbackTag: config.outbounds[0].tag }); }],
    ["route", (config) => { config.routing.rules[0].outboundTag = "missing-outbound"; }],
  ]) {
    const config = valid();
    mutate(config);
    assert.throws(() => validateHappSubscription([config]), new RegExp(label, "u"));
  }
});

test("rejects invalid fixed failover topology and unsafe internal tags", () => {
  const nodes = [node("当前节点", "node-current"), node("东京节点", "node-tokyo")];
  const fixed = structuredClone(renderHappSubscription({ nodes, allNodes: nodes, options: { ...options, policyOverrides: Buffer.from(JSON.stringify({ "🤖 AI 专用": "NODE:东京节点" })).toString("base64url") } })[0]);
  const balancer = fixed.routing.balancers[0];
  for (const [label, mutate] of [
    ["selector", (config) => { config.routing.balancers[0].selector.push(config.outbounds[0].tag); }],
    ["fallback", (config) => { config.routing.balancers[0].fallbackTag = "missing-outbound"; }],
    ["observatory", (config) => { config.observatory.subjectSelector = []; }],
    ["opaque", (config) => { config.outbounds.find(({ tag }) => tag.startsWith("happ-fixed/")).tag = "happ-fixed/东京节点/candidate"; }],
    ["final", (config) => { config.routing.rules.unshift(config.routing.rules.pop()); }],
  ]) {
    const config = structuredClone(fixed);
    mutate(config);
    assert.throws(() => validateHappSubscription([config]), new RegExp(label, "u"));
  }
  assert.ok(balancer);
});

test("rejects fixed tags that embed a raw ASCII node name", () => {
  const nodes = [node("当前节点", "node-current"), node("东京节点", "node-tokyo")];
  const fixed = structuredClone(renderHappSubscription({
    nodes,
    allNodes: nodes,
    options: { ...options, policyOverrides: Buffer.from(JSON.stringify({ "🤖 AI 专用": "NODE:东京节点" })).toString("base64url") },
  })[0]);
  const candidate = fixed.outbounds.find(({ tag }) => tag.startsWith("happ-fixed/"));
  const candidateTag = candidate.tag;
  candidate.tag = "happ-fixed/tokyo/candidate";
  fixed.routing.balancers[0].selector = [candidate.tag];
  fixed.observatory.subjectSelector = [candidate.tag];
  assert.throws(() => validateHappSubscription([fixed]), /opaque/u);

  const balancerConfig = structuredClone(fixed);
  balancerConfig.outbounds.find(({ tag }) => tag.startsWith("happ-fixed/")).tag = candidateTag;
  balancerConfig.routing.balancers[0].selector = [candidateTag];
  balancerConfig.observatory.subjectSelector = [candidateTag];
  const balancerTag = balancerConfig.routing.balancers[0].tag;
  const rawBalancerTag = "happ-fixed/tokyo/balancer";
  balancerConfig.routing.balancers[0].tag = rawBalancerTag;
  for (const rule of balancerConfig.routing.rules) {
    if (rule.balancerTag === balancerTag) rule.balancerTag = rawBalancerTag;
  }
  assert.throws(() => validateHappSubscription([balancerConfig]), /opaque/u);
});

test("rejects unsupported Snell outbounds", () => {
  const config = valid();
  config.outbounds.push({ tag: "happ-sn", protocol: "snell" });
  assert.throws(() => validateHappSubscription([config]), /Snell/u);
});
