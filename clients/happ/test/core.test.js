import test from "node:test";
import assert from "node:assert/strict";
import { parseHappOptions } from "../src/options.js";
import { encodeBase64UrlUtf8 } from "../../../shared/encoding/base64url.js";
import { decodePolicyOverrides, resolvePolicyOverrides, BUSINESS_KEYS } from "../src/policy-overrides.js";
import { renderHappOutbound } from "../src/render-node.js";
import { renderHappInbounds } from "../src/render-platform.js";
import { happProxyGeositeDomains, renderHappDns, renderHappDnsRoutes } from "../src/render-dns.js";
import { renderHappRouting } from "../src/render-routing.js";
import { renderHappSubscription } from "../src/render-subscription.js";
import { validateHappSubscription } from "../src/validate-subscription.js";
import { buildHappAudit } from "../src/audit.js";
import { buildHappDisplayTag } from "../src/tag-label.js";

const base = { output: "config", type: "collection", name: "TEST_ONLY_Happ", subscriptionName: "TEST_ONLY_Sub", platform: "macos" };
const node = (type, extra = {}) => ({ name: "TEST_ONLY_Node", type, server: "example.test", port: 443, ...extra });

test("Happ options are strict and platform scoped", () => {
  const parsed = parseHappOptions(base);
  assert.equal(parsed.platform, "macos");
  assert.equal(Object.hasOwn(parsed, "channel"), false);
  assert.equal(parsed.blockMode, "balanced");
  assert.throws(() => parseHappOptions({ ...base, platform: "all" }), /platform/);
  assert.equal(parseHappOptions({ ...base, output: "audit", platform: "all" }).output, "audit");
  assert.throws(() => parseHappOptions({ ...base, unknown: true }), /Unknown Happ option/);
  assert.throws(() => parseHappOptions({ ...base, channel: "current" }), /Unknown Happ option.*channel/u);
});

test("policy overrides decode, merge aliases and resolve exact nodes", () => {
  const encoded = encodeBase64UrlUtf8(JSON.stringify({ "AI 专用": "follow", "🤖 AI 专用": "FOLLOW", "🍎 Apple": "direct", "最终兜底": "NODE:TEST_ONLY_Node" }));
  const values = decodePolicyOverrides(encoded);
  assert.equal(values.ai, "FOLLOW");
  const resolution = resolvePolicyOverrides({ encoded, allNodes: [node("vless", { uuid: "TEST_ONLY_UUID" })], eligibleNodes: [node("vless", { uuid: "TEST_ONLY_UUID" })] });
  assert.equal(resolution.targets.ai.status, "follow");
  assert.equal(resolution.targets.final.status, "fixed");
  assert.throws(() => decodePolicyOverrides(encodeBase64UrlUtf8(JSON.stringify({ ai: "BAD" }))), /target/);
});

test("all approved protocols render Xray outbounds without raw names in tags", () => {
  const fixtures = [
    ["vless", { uuid: "TEST_ONLY_UUID", network: "ws", tls: true, sni: "example.test", "ws-opts": { path: "/x", headers: { Host: "example.test" } } }],
    ["vmess", { uuid: "TEST_ONLY_UUID", alterId: 0, cipher: "auto", network: "grpc", tls: true, "grpc-opts": { "grpc-service-name": "TEST_ONLY_SERVICE" } }],
    ["trojan", { password: "TEST_ONLY_PASSWORD", network: "tcp", tls: true, sni: "example.test" }],
    ["ss", { cipher: "aes-256-gcm", password: "TEST_ONLY_PASSWORD" }],
    ["socks5", { username: "TEST_ONLY_USER", password: "TEST_ONLY_PASSWORD" }],
    ["hysteria2", { password: "TEST_ONLY_PASSWORD", tls: true, sni: "example.test" }],
  ];
  for (const [type, extra] of fixtures) {
    const out = renderHappOutbound(node(type, extra), `happ-follow/${type}`);
    assert.equal(out.tag, `happ-follow/${type}`);
    assert.ok(out.protocol);
    assert.ok(!out.tag.includes("TEST_ONLY_UUID"));
    assert.ok(!out.tag.includes("TEST_ONLY_PASSWORD"));
    assert.ok(!out.tag.includes("example.test"));
  }
});

test("Happ follow tags retain readable Unicode node names and stable IDs", () => {
  const options = parseHappOptions(base);
  const configs = renderHappSubscription({
    nodes: [node("vless", { name: "🇺🇸 qqpw家宽 · VLESS｜自建·U", uuid: "TEST_ONLY_UUID", _profile: { id: "sr-0psum4z" } })],
    options,
  });
  const tag = configs[0].outbounds[0].tag;
  assert.equal(tag, "happ-follow/🇺🇸 qqpw家宽 · VLESS｜自建·U [sr-0psum4z]");
  assert.equal(validateHappSubscription(configs), true);
});

test("Happ display tags sanitize route separators and control characters", () => {
  const options = parseHappOptions(base);
  const configs = renderHappSubscription({
    nodes: [node("vless", { name: "测试/节点\nqqpw", uuid: "TEST_ONLY_UUID", _profile: { id: "sr-test" } })],
    options,
  });
  assert.equal(configs[0].outbounds[0].tag, "happ-follow/测试-节点qqpw [sr-test]");
});

test("Happ display tags remove C1 controls and sensitive name fragments", () => {
  const options = parseHappOptions(base);
  const configs = renderHappSubscription({
    nodes: [node("vless", {
      name: "测试\u0085节点 https://secret.example/00000000-0000-4000-8000-000000000001",
      uuid: "TEST_ONLY_UUID",
      _profile: { id: "sr-test" },
    })],
    options,
  });
  const tag = configs[0].outbounds[0].tag;
  assert.equal(tag, "happ-follow/测试节点 [sr-test]");
  assert.doesNotMatch(tag, /secret\.example|00000000-0000-4000-8000-000000000001/u);
});

test("Happ display tags reject unsafe stable IDs", () => {
  assert.throws(() => buildHappDisplayTag("happ-follow", "node", "bad/id"), /stable ID/u);
  assert.throws(() => buildHappDisplayTag("happ-follow", "node", "bad\u0085id"), /stable ID/u);
  assert.throws(() => buildHappDisplayTag("happ-follow", "node", "a".repeat(65)), /stable ID/u);
});

test("platform, DNS and routing preserve shared semantics", () => {
  const inbounds = renderHappInbounds("macos");
  assert.equal(inbounds.length, 2);
  assert.deepEqual(inbounds.map((x) => x.listen), ["127.0.0.1", "127.0.0.1"]);
  const dns = renderHappDns({ dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", ipv6Mode: "ipv4-only" });
  assert.equal(dns.queryStrategy, "UseIPv4");
  assert.ok(happProxyGeositeDomains().length > 0);
  assert.equal(JSON.stringify(dns).includes("HAPP-PROXY"), false);
  const dnsRules = renderHappDnsRoutes({});
  assert.ok(dnsRules.length >= 2);
  assert.equal(JSON.stringify(dnsRules).includes("HAPP-PROXY"), false);
  const routing = renderHappRouting({ policyResolution: { targets: {} }, followTag: "happ-follow/x", fixedNodes: [], options: {} });
  assert.equal(routing.routing.domainStrategy, "IPIfNonMatch");
  assert.equal(routing.routing.rules.at(-1).network, "tcp,udp");
});

test("Happ routing uses one standard Xray label scheme on every platform", () => {
  for (const platform of ["macos", "iphone", "ipad", "android", "windows", "linux"]) {
    const output = renderHappRouting({ policyResolution: { targets: {} }, followTag: `happ-follow/${platform}`, fixedNodes: [], options: { platform } });
    const serialized = JSON.stringify(output.routing);
    assert.match(serialized, /geosite:OPENAI/u);
    assert.match(serialized, /geoip:CN/u);
    assert.equal(serialized.includes("HAPP-"), false);
  }
});

test("Happ observatory includes the active follow outbound for ping results", () => {
  const followTag = "happ-follow/iphone";
  const output = renderHappRouting({
    policyResolution: { targets: {} },
    followTag,
    fixedNodes: [],
    options: { platform: "iphone" },
  });
  assert.deepEqual(output.observatory.subjectSelector, [followTag]);
});

test("subscription is one JSON object per eligible node and validates", () => {
  const options = parseHappOptions(base);
  const nodes = [node("vless", { uuid: "TEST_ONLY_UUID" }), node("trojan", { name: "TEST_ONLY_Node2", password: "TEST_ONLY_PASSWORD", tls: true })];
  const configs = renderHappSubscription({ nodes, options });
  assert.equal(configs.length, 2);
  assert.equal(configs[0].remarks, "TEST_ONLY_Node");
  assert.equal(validateHappSubscription(configs), true);
  assert.ok(Array.isArray(configs[0].routing.balancers));
  assert.equal(Object.hasOwn(configs[0], "balancers"), false);
  const audit = buildHappAudit({ options, policyResolution: { targets: {}, warnings: [] }, configs });
  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.counts.configs, 2);
  assert.doesNotMatch(JSON.stringify(audit), /password|uuid|server|port/i);
});

test("fixed-node balancer is nested under Xray routing", () => {
  const fixed = node("vless", { uuid: "TEST_ONLY_UUID", _profile: { id: "fixed-node" } });
  const follow = node("trojan", { name: "TEST_ONLY_Node2", password: "TEST_ONLY_PASSWORD", tls: true, _profile: { id: "follow-node" } });
  const options = parseHappOptions({ ...base, policyOverrides: encodeBase64UrlUtf8(JSON.stringify({ "最终兜底": "NODE:TEST_ONLY_Node" })) });
  const configs = renderHappSubscription({ nodes: [fixed, follow], options });
  const config = configs.find((item) => item.remarks === "TEST_ONLY_Node2");
  assert.ok(config);
  assert.ok(config.routing.rules.some((rule) => rule.balancerTag));
  assert.ok(config.routing.balancers.some((balancer) => balancer.tag));
  assert.match(config.routing.balancers[0].tag, /TEST_ONLY_Node/u);
  assert.match(config.routing.balancers[0].tag, /fixed-node/u);
  assert.equal(validateHappSubscription(configs), true);
});

test("Happ DNS uses one standard Xray label scheme on every platform", () => {
  for (const platform of ["macos", "iphone", "ipad", "android", "windows", "linux"]) {
    const output = renderHappDns({ platform, dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", ipv6Mode: "auto" });
    const serialized = JSON.stringify(output);
    assert.match(serialized, /geosite:OPENAI/u);
    assert.match(serialized, /geoip:CN/u);
    assert.equal(serialized.includes("HAPP-"), false);
  }
});
