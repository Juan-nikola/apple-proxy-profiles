import test from "node:test";
import assert from "node:assert/strict";
import { parseHappOptions } from "../src/options.js";
import { renderHappOutbound } from "../src/render-node.js";
import { renderHappInbounds } from "../src/render-platform.js";
import { happProxyGeositeDomains, renderHappDns, renderHappDnsRoutes } from "../src/render-dns.js";
import { renderHappRouting } from "../src/render-routing.js";
import { renderHappSubscription } from "../src/render-subscription.js";
import { validateHappSubscription } from "../src/validate-subscription.js";
import { buildHappAudit } from "../src/audit.js";
import { parsePrivatePolicy } from "../../../shared/policies/private-policy.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";

const base = { output: "config", type: "collection", name: "TEST_ONLY_Happ", subscriptionName: "TEST_ONLY_Sub", platform: "macos" };
const node = (type, extra = {}) => ({ name: "TEST_ONLY_Node", type, server: "example.test", port: 443, ...extra });

test("Happ options are strict and platform scoped", () => {
  const parsed = parseHappOptions(base);
  assert.equal(parsed.platform, "macos");
  assert.equal(parsed.channel, "current");
  assert.equal(parsed.blockMode, "balanced");
  assert.throws(() => parseHappOptions({ ...base, platform: "all" }), /platform/);
  for (const platform of ["android", "windows", "linux"]) {
    assert.throws(() => parseHappOptions({ ...base, platform }), /unsupported value/u);
  }
  assert.equal(parseHappOptions({ ...base, output: "audit", platform: "all" }).output, "audit");
  assert.throws(() => parseHappOptions({ ...base, unknown: true }), /Unknown Happ option/);
  assert.equal(parseHappOptions({ ...base, channel: "edge" }).channel, "edge");
  assert.throws(() => parseHappOptions({ ...base, policyOverrides: "e30" }), /Unknown Happ option.*policyOverrides/u);
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
    assert.ok(!out.tag.includes("TEST_ONLY_Node"));
  }
});

test("Happ does not reinterpret Shadowsocks UDP as Xray OTA", () => {
  const out = renderHappOutbound(node("ss", {
    cipher: "aes-256-gcm",
    password: "TEST_ONLY_PASSWORD",
    udp: true,
  }), "happ-follow/ss-udp");
  assert.equal(Object.hasOwn(out.settings.servers[0], "ota"), false);
});

test("Happ preserves Reality when the source uses tls plus reality-opts", () => {
  const out = renderHappOutbound(node("vless", {
    uuid: "TEST_ONLY_UUID",
    network: "tcp",
    tls: true,
    sni: "www.example.com",
    "client-fingerprint": "chrome",
    "reality-opts": { "public-key": "TEST_ONLY_REALITY_KEY", "short-id": "0123abcd" },
  }), "happ-follow/reality");
  assert.equal(out.streamSettings.security, "reality");
  assert.equal(out.streamSettings.realitySettings.publicKey, "TEST_ONLY_REALITY_KEY");
  assert.equal(out.streamSettings.realitySettings.serverName, "www.example.com");
  assert.equal(out.streamSettings.realitySettings.fingerprint, "chrome");
});

test("Happ treats VMess security cipher separately from transport TLS", () => {
  const out = renderHappOutbound(node("vmess", {
    uuid: "TEST_ONLY_UUID",
    security: "auto",
    tls: true,
    sni: "www.example.com",
  }), "happ-follow/vmess-tls");
  assert.equal(out.streamSettings.security, "tls");
  assert.equal(out.streamSettings.tlsSettings.serverName, "www.example.com");
});

test("Happ preserves Xray transport-specific settings and normalizes HTTP/2", () => {
  const cases = [
    ["vless", { network: "ws", tls: true, sni: "example.test", "ws-opts": { path: "/ws", headers: { Host: "example.test" } } }, "ws", "wsSettings"],
    ["vmess", { uuid: "TEST_ONLY_UUID", network: "grpc", tls: true, sni: "example.test", "grpc-opts": { "grpc-service-name": "svc" } }, "grpc", "grpcSettings"],
    ["trojan", { password: "TEST_ONLY_PASSWORD", network: "h2", tls: true, sni: "example.test", "h2-opts": { path: "/h2", host: ["example.test"] } }, "http", "httpSettings"],
    ["vless", { network: "http2", tls: true, sni: "example.test", "http-opts": { path: "/http2", host: "example.test" } }, "http", "httpSettings"],
    ["vless", { network: "httpupgrade", tls: true, sni: "example.test", "httpupgrade-opts": { path: "/upgrade", host: "example.test" } }, "httpupgrade", "httpupgradeSettings"],
    ["vmess", { uuid: "TEST_ONLY_UUID", network: "xhttp", tls: true, sni: "example.test", "xhttp-opts": { path: "/xhttp", mode: "stream-up" } }, "xhttp", "xhttpSettings"],
    ["vless", { network: "kcp", tls: false, "kcp-opts": { mtu: 1350, tti: 50 } }, "kcp", "kcpSettings"],
  ];
  for (const [type, extra, expectedNetwork, settingsKey] of cases) {
    const out = renderHappOutbound(node(type, { uuid: "TEST_ONLY_UUID", ...extra }), `happ-transport/${expectedNetwork}`);
    assert.equal(out.streamSettings.network, expectedNetwork);
    assert.ok(Object.hasOwn(out.streamSettings, settingsKey), `${type}/${expectedNetwork}`);
    assert.equal(out.streamSettings.security, extra.tls ? "tls" : undefined);
  }
});

test("Happ rejects contradictory TLS fields instead of silently downgrading", () => {
  assert.throws(() => renderHappOutbound(node("vless", {
    uuid: "TEST_ONLY_UUID",
    tls: true,
    security: "none",
  }), "happ-transport/conflict"), /Unsupported Happ TLS security|contradictory/u);
});

test("platform, DNS and routing preserve shared semantics", () => {
  const inbounds = renderHappInbounds("macos");
  assert.equal(inbounds.length, 2);
  assert.deepEqual(inbounds.map((x) => x.listen), ["127.0.0.1", "127.0.0.1"]);
  assert.ok(inbounds.every((entry) => entry.sniffing.destOverride.includes("quic")));
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

test("Happ blocks or bypasses proxy QUIC using Xray UDP/443 matching", () => {
  const output = renderHappRouting({
    policyResolution: { targets: {} },
    followTag: "happ-follow/quic",
    fixedNodes: [],
    options: { platform: "iphone", quicMode: "proxy-block" },
  });
  const quicRule = output.routing.rules.find((rule) => rule.port === 443 && rule.network === "udp");
  assert.deepEqual(quicRule, { type: "field", network: "udp", port: 443, outboundTag: "happ-direct" });
  assert.equal(output.routing.rules.some((rule) => rule.network === "quic"), false);

  const allBlock = renderHappRouting({
    policyResolution: { targets: {} },
    followTag: "happ-follow/quic-block",
    fixedNodes: [],
    options: { platform: "iphone", quicMode: "all-block" },
  });
  assert.deepEqual(
    allBlock.routing.rules.find((rule) => rule.port === 443 && rule.network === "udp"),
    { type: "field", network: "udp", port: 443, outboundTag: "happ-block" },
  );

  const allow = renderHappRouting({
    policyResolution: { targets: {} },
    followTag: "happ-follow/quic-allow",
    fixedNodes: [],
    options: { platform: "iphone", quicMode: "allow" },
  });
  assert.equal(allow.routing.rules.some((rule) => rule.port === 443 && rule.network === "udp"), false);
});

test("Happ routing uses one standard Xray label scheme on every supported platform", () => {
  for (const platform of ["macos", "iphone", "ipad"]) {
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
  assert.equal(audit.schemaVersion, 2);
  assert.equal(audit.counts.configs, 2);
  assert.doesNotMatch(JSON.stringify(audit), /password|uuid|server|port/i);
});

test("fixed-node balancer is nested under Xray routing", () => {
  const fixed = node("vless", { uuid: "TEST_ONLY_UUID", _profile: { id: "fixed-node" } });
  const follow = node("trojan", { name: "TEST_ONLY_Node2", password: "TEST_ONLY_PASSWORD", tls: true, _profile: { id: "follow-node" } });
  const options = parseHappOptions(base);
  const policy = parsePrivatePolicy(JSON.stringify({ schemaVersion: 2, targets: { "最终兜底": "NODE:TEST_ONLY_Node" } }));
  const policyResolution = resolveUnifiedPolicy({ policy, channel: "current", client: "happ", allNodes: [fixed, follow], eligibleNodes: [fixed, follow] });
  const configs = renderHappSubscription({ nodes: [fixed, follow], options, policyResolution });
  const config = configs.find((item) => item.remarks === "TEST_ONLY_Node2");
  assert.ok(config);
  assert.ok(config.routing.rules.some((rule) => rule.balancerTag?.includes("/balancer")));
  assert.ok(config.routing.balancers.some((balancer) => balancer.tag));
  assert.equal(validateHappSubscription(configs), true);
});

test("specific business routing wins over the generic proxy DNS route", () => {
  const fixed = node("vless", { name: "🌐 qqpw家宽 · VLESS", uuid: "TEST_ONLY_QQPW_UUID", _profile: { id: "qqpw" } });
  const follow = node("vless", { name: "🇭🇰 香港 · VLESS", uuid: "TEST_ONLY_HK_UUID", _profile: { id: "hong-kong" } });
  const policy = parsePrivatePolicy(JSON.stringify({ schemaVersion: 2, targets: { ai: "NODE~qqpw家宽|vless" } }));
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: "current",
    client: "happ",
    allNodes: [fixed, follow],
    eligibleNodes: [fixed, follow],
  });
  const options = parseHappOptions(base);
  const config = renderHappSubscription({ nodes: [follow], options, policyResolution })[0];
  const matching = config.routing.rules.filter((rule) => rule.domain?.includes("geosite:OPENAI"));
  assert.ok(matching.length >= 2);
  assert.equal(matching[0].balancerTag, config.routing.balancers[0].tag);
  assert.equal(Object.hasOwn(matching[0], "outboundTag"), false);
});

test("fixed DNS routing uses the balancer instead of bypassing its fallback", () => {
  const fixed = node("vless", { name: "🌐 qqpw家宽 · VLESS", uuid: "TEST_ONLY_QQPW_DNS_UUID", _profile: { id: "qqpw-dns" } });
  const follow = node("vless", { name: "🇭🇰 香港 · VLESS", uuid: "TEST_ONLY_HK_DNS_UUID", _profile: { id: "hong-kong-dns" } });
  const policy = parsePrivatePolicy(JSON.stringify({ schemaVersion: 2, targets: { dnsAndRules: "NODE~qqpw家宽|vless" } }));
  const policyResolution = resolveUnifiedPolicy({
    policy,
    channel: "current",
    client: "happ",
    allNodes: [fixed, follow],
    eligibleNodes: [fixed, follow],
  });
  const options = parseHappOptions(base);
  const config = renderHappSubscription({ nodes: [follow], options, policyResolution })[0];
  const dnsRule = config.routing.rules.find((rule) => rule.server === "happ-dns" && rule.domain?.includes("geosite:OPENAI"));
  assert.equal(dnsRule.balancerTag, config.routing.balancers[0].tag);
  assert.equal(Object.hasOwn(dnsRule, "outboundTag"), false);
});

test("Happ DNS uses one standard Xray label scheme on every supported platform", () => {
  for (const platform of ["macos", "iphone", "ipad"]) {
    const output = renderHappDns({ platform, dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", ipv6Mode: "auto" });
    const serialized = JSON.stringify(output);
    assert.match(serialized, /geosite:OPENAI/u);
    assert.match(serialized, /geoip:CN/u);
    assert.equal(serialized.includes("HAPP-"), false);
  }
});
