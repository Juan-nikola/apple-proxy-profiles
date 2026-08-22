import assert from "node:assert/strict";
import test from "node:test";

import { parseSingBoxOptions } from "../src/options.js";
import { renderSingBoxConfig } from "../src/render-config.js";
import { renderSingBoxDns } from "../src/render-dns.js";
import { renderSingBoxNode, renderSingBoxOutbound } from "../src/render-node.js";
import { validateSingBoxConfig } from "../src/validate-config.js";
import {
  MOBILE_RULE_PLATFORMS,
  usesMobileRuleBundles,
} from "../../../shared/rules/lightweight-policy.js";

const baseOptions = {
  output: "config",
  type: "collection",
  name: "sing-box-sources",
  subscriptionName: "sing-box-Nodes",
  platform: "macos",
  channel: "edge",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "auto",
  autoGroupMode: "full",
  clientChain: "off",
};

function metadata(id, continent, sourceKind = "airport") {
  return { id, continent, sourceKind, flag: "🇯🇵", entry: true, chained: false, udp: true, p2p: false };
}

const nodes = [
  {
    name: "🇯🇵 Tokyo · SS｜机场·U",
    type: "ss",
    server: "198.51.100.10",
    port: 443,
    cipher: "aes-256-gcm",
    password: "TEST_ONLY_PASSWORD",
    udp: true,
    _profile: metadata("tokyo", "asiaPacific"),
  },
  {
    name: "🇩🇪 Frankfurt · VLESS｜机场·U",
    type: "vless",
    server: "198.51.100.20",
    port: 443,
    uuid: "00000000-0000-4000-8000-000000000001",
    tls: true,
    sni: "fixture.example.invalid",
    _profile: { ...metadata("frankfurt", "europe"), flag: "🇩🇪" },
  },
];

function render(overrides = {}) {
  const options = parseSingBoxOptions({ ...baseOptions, ...overrides });
  return renderSingBoxConfig(options, nodes, {
    ruleBaseUrl: `https://example.invalid/${options.channel}/sing-box/rule-sets`,
  });
}

test("accepts only the four terminal platforms and rejects deferred OpenWrt", () => {
  for (const platform of ["macos", "iphone", "ipad", "android"]) {
    assert.equal(parseSingBoxOptions({ ...baseOptions, platform }).platform, platform);
  }
  assert.deepEqual([...MOBILE_RULE_PLATFORMS], ["iphone", "ipad", "android"]);
  assert.equal(MOBILE_RULE_PLATFORMS.every((platform) => usesMobileRuleBundles(platform)), true);
  assert.equal(usesMobileRuleBundles("macos"), false);
  assert.throws(() => parseSingBoxOptions({ ...baseOptions, platform: "openwrt" }), /platform/iu);
  assert.equal(parseSingBoxOptions(baseOptions).channel, "edge");
  assert.equal(parseSingBoxOptions({ ...baseOptions, channel: "previous" }).channel, "previous");
});

test("renders the previous sing-box rule publication without mixing channels", () => {
  const config = render({ channel: "previous" });
  const urls = config.route.rule_set.map(({ url }) => url);
  assert.ok(urls.some((url) => url.includes("/previous/sing-box/")));
  assert.equal(urls.some((url) => /\/(?:edge|current)\/sing-box\//u.test(url)), false);
  assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
});

test("uses mobile rule bundles for Android while macOS keeps the full rule catalog", () => {
  const android = render({ platform: "android" });
  const macos = render({ platform: "macos" });
  assert.ok(android.route.rule_set.length > 0);
  assert.equal(android.route.rule_set.every(({ url }) => url.includes("/mobile-rule-sets/")), true);
  assert.equal(macos.route.rule_set.every(({ url }) => url.includes("/rule-sets/")), true);
  assert.equal(macos.route.rule_set.some(({ url }) => url.includes("/mobile-rule-sets/")), false);
});

test("rejects the full adblock pack on every mobile platform", () => {
  for (const platform of ["iphone", "ipad", "android"]) {
    assert.throws(
      () => parseSingBoxOptions({ ...baseOptions, platform, adblockMode: "full" }),
      /memory budget/iu,
      platform,
    );
  }
});

test("defaults Apple platforms to IPv4-only without changing Android defaults", () => {
  for (const platform of ["macos", "iphone", "ipad"]) {
    const { ipv6Mode } = parseSingBoxOptions({ ...baseOptions, platform, ipv6Mode: undefined });
    assert.equal(ipv6Mode, "ipv4-only", platform);
  }
  assert.equal(parseSingBoxOptions({ ...baseOptions, platform: "android", ipv6Mode: undefined }).ipv6Mode, "auto");
});

test("renders a complete latest-style config with response-based ChinaIP fallback", () => {
  const config = render();
  assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
  assert.equal(config.inbounds[0].type, "tun");
  assert.equal(config.route.final, "🚀 节点选择");
  assert.ok(config.route.rules.some((rule) => rule.action === "resolve" && rule.server === undefined));
  assert.ok(config.route.rules.some((rule) => rule.rule_set?.includes("rule-ChinaIP") && rule.outbound === "DIRECT"));
  assert.equal(config.route.rules.some((rule) => Object.hasOwn(rule, "geoip") || Object.hasOwn(rule, "geosite")), false);
  assert.ok(config.dns.rules.some((rule) => rule.action === "evaluate" && rule.server === "dns-direct"));
  assert.ok(config.dns.rules.some((rule) => rule.action === "evaluate" && rule.server === "dns-proxy"));
  assert.ok(config.dns.rules.some((rule) => rule.match_response === "direct-answer" && rule.rule_set?.includes("rule-ChinaIP")));
  assert.equal(config.dns.final, "dns-proxy");
  assert.equal(config.dns.servers.find(({ tag }) => tag === "dns-direct")?.detour, undefined);
  assert.equal(config.dns.servers.find(({ tag }) => tag === "dns-proxy")?.detour, "⚡ 全部自动");
});

test("routes mobile DNS classes through the compact mobile rule bundles", () => {
  const expectedProxy = [
    "rule-AI", "rule-GitHub", "rule-YouTube", "rule-OverseasMedia",
    "rule-OverseasSocial", "rule-OverseasGame",
  ];
  const expectedChina = [
    "rule-DomesticCore", "rule-DomesticPlatform", "rule-Apple",
    "rule-Microsoft", "rule-Download",
  ];

  for (const platform of ["iphone", "ipad", "android"]) {
    const config = render({ platform });
    assert.deepEqual(
      config.dns.rules.find((rule) => rule.action === "route" && rule.server === "dns-proxy" && rule.rule_set)?.rule_set,
      expectedProxy,
      platform,
    );
    assert.deepEqual(
      config.dns.rules.find((rule) => rule.action === "route" && rule.server === "dns-direct" && rule.rule_set)?.rule_set,
      expectedChina,
      platform,
    );
  }
});

test("renders Egern-like selectors without pretending urltest is request fallback", () => {
  const config = render();
  const tags = config.outbounds.map(({ tag }) => tag);
  assert.ok(tags.includes("🚀 节点选择"));
  assert.ok(tags.includes("⚡ 全部自动"));
  assert.ok(tags.includes("🌏 亚太"));
  assert.ok(tags.includes("🌍 欧洲"));
  assert.equal(tags.some((tag) => /故障转移/u.test(tag)), false);
  const primary = config.outbounds.find(({ tag }) => tag === "🚀 节点选择");
  assert.equal(primary.default, "⚡ 全部自动");
  assert.equal(primary.outbounds.includes(nodes[0].name), false);
  const auto = config.outbounds.find(({ tag }) => tag === "⚡ 全部自动");
  assert.equal(auto.type, "urltest");
  assert.equal(Object.hasOwn(auto, "timeout"), false);
  assert.equal(auto.url, "https://www.gstatic.com/generate_204");
});

test("keeps low-frequency iOS URLTests and the complete compact business catalog", () => {
  for (const platform of ["iphone", "ipad"]) {
    const config = render({ platform });
    const urltests = config.outbounds.filter(({ type }) => type === "urltest");
    assert.ok(urltests.some(({ tag }) => tag === "⚡ 全部自动"), platform);
    assert.ok(urltests.some(({ tag }) => tag === "⚡ 亚太自动"), platform);
    assert.ok(urltests.every(({ interval }) => interval === "1800s"), platform);
    assert.ok(config.outbounds.some(({ tag }) => tag === "🍎 Apple"), platform);
    assert.ok(config.outbounds.some(({ tag }) => tag === "🪟 Microsoft"), platform);
    for (const tag of ["📺 YouTube", "🎬 海外流媒体", "💬 海外社交", "🇨🇳 国内平台"]) {
      assert.ok(config.outbounds.some((outbound) => outbound.tag === tag), `${platform}/${tag}`);
    }
    assert.ok(config.outbounds.some(({ tag }) => tag === "🤖 AI 专用"), platform);
    assert.equal(config.log.level, "warn", platform);
    assert.equal(config.experimental.cache_file.enabled, false, platform);
    assert.equal(config.experimental.cache_file.store_dns, false, platform);
    assert.equal(config.route.rule_set.length, 14, platform);
    assert.deepEqual(
      config.route.rule_set.map(({ tag }) => tag),
      ["rule-Security", "rule-Privacy", "rule-DomesticCore", "rule-DomesticPlatform",
        "rule-AI", "rule-GitHub", "rule-YouTube", "rule-OverseasMedia", "rule-OverseasSocial",
        "rule-Apple", "rule-Microsoft", "rule-Download", "rule-OverseasGame", "rule-ChinaIP"],
      platform,
    );
    const lastManual = Math.max(...config.outbounds
      .filter(({ type, tag }) => type === "selector" && !/自动/u.test(tag))
      .map(({ tag }) => config.outbounds.findIndex((outbound) => outbound.tag === tag)));
    const firstHelper = Math.min(...config.outbounds
      .filter(({ type, tag }) => type === "urltest" && /自动/u.test(tag))
      .map(({ tag }) => config.outbounds.findIndex((outbound) => outbound.tag === tag)));
    assert.ok(firstHelper > lastManual, platform);
    assert.equal(config.dns.rules.some((rule) => Array.isArray(rule.rule_set) && rule.rule_set.length === 0), false, platform);
    assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] }, platform);
  }
});

test("retains Android's complete automatic URLTest graph", () => {
  const config = render({ platform: "android" });
  assert.deepEqual(config.outbounds.filter(({ type }) => type === "urltest").map(({ tag }) => tag), ["⚡ 全部自动", "⚡ 亚太自动", "⚡ 欧洲自动"]);
  assert.ok(config.outbounds.some(({ tag }) => tag === "📺 YouTube"));
  assert.ok(config.outbounds.some(({ tag }) => tag === "🤖 AI 专用"));
  assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
});

test("applies QUIC modes only to the selected traffic class", () => {
  const allow = render({ quicMode: "allow" });
  assert.equal(allow.route.rules.some(({ action, network }) => action === "reject" && network === "udp"), false);

  const proxyBlock = render({ quicMode: "proxy-block" });
  assert.ok(proxyBlock.route.rules.some((rule) => rule.action === "reject" && rule.rule_set?.includes("rule-OpenAI")));
  const chinaIp = proxyBlock.route.rules.findIndex((rule) => rule.rule_set?.includes("rule-ChinaIP"));
  const finalBlock = proxyBlock.route.rules.findIndex((rule) => rule.action === "reject" && rule.network === "udp" && !rule.rule_set && !rule.domain_suffix);
  assert.ok(finalBlock > chinaIp);

  const allBlock = render({ quicMode: "all-block" });
  assert.ok(allBlock.route.rules.findIndex(({ action, network }) => action === "reject" && network === "udp") < allBlock.route.rules.findIndex((rule) => rule.rule_set?.includes("rule-ChinaIP")));
});

test("makes blockMode an actual security policy switch", () => {
  const off = render({ blockMode: "off" });
  assert.equal(off.route.rules.some((rule) => rule.rule_set?.includes("rule-Hijacking")), false);
  const security = render({ blockMode: "security" });
  assert.equal(security.route.rules.some((rule) => rule.rule_set?.includes("rule-Hijacking")), true);
  assert.equal(security.route.rules.some((rule) => rule.rule_set?.includes("rule-Privacy")), false);
  const strict = render({ blockMode: "strict" });
  assert.equal(strict.route.rules.some((rule) => rule.rule_set?.includes("rule-Privacy")), true);
});

test("keeps adblock opt-in and compiles only binary remote rule sets", () => {
  const off = render();
  assert.equal(off.route.rule_set.some(({ tag }) => tag === "rule-Advertising"), false);
  assert.equal(off.route.rule_set.every(({ format, url }) => format === "binary" && url.endsWith(".srs")), true);
  const full = render({ adblockMode: "full" });
  assert.equal(full.route.rule_set.some(({ tag }) => tag === "rule-Advertising"), true);
  assert.equal(full.route.rule_set.some(({ tag }) => tag === "rule-Advertising_Domain"), true);
  assert.throws(() => render({ platform: "iphone", adblockMode: "full" }), /memory budget/iu);
});

test("renders WireGuard as a 1.14 endpoint instead of a removed outbound", () => {
  const node = {
    name: "🇯🇵 WireGuard · WireGuard｜自建·U",
    type: "wireguard",
    server: "198.51.100.30",
    port: 51820,
    "private-key": "TEST_ONLY_PRIVATE_KEY",
    "local-address": ["10.0.0.2/32"],
    peers: [{ "public-key": "TEST_ONLY_PUBLIC_KEY", "allowed-ips": ["0.0.0.0/0"] }],
    _profile: metadata("wg", "asiaPacific", "selfHosted"),
  };
  const endpoint = renderSingBoxNode(node).endpoint;
  assert.equal(endpoint.type, "wireguard");
  assert.deepEqual(endpoint.address, ["10.0.0.2/32"]);
  assert.throws(() => renderSingBoxOutbound(node), /endpoint/iu);
});

test("uses structured HTTPS DNS fields for every global provider", () => {
  for (const globalDns of ["cloudflare", "google", "quad9"]) {
    const dns = renderSingBoxDns({ ...baseOptions, globalDns });
    const proxy = dns.servers.find(({ tag }) => tag === "dns-proxy");
    assert.equal(proxy.type, "https");
    assert.doesNotMatch(proxy.server, /^https?:\/\//iu);
    assert.equal(proxy.path, "/dns-query");
  }
});

test("routes DNS provider IPs directly without a DNS detour to DIRECT", () => {
  const config = render({ dnsMode: "speed" });
  assert.equal(config.dns.servers.find(({ tag }) => tag === "dns-direct")?.detour, undefined);
  assert.equal(config.dns.servers.find(({ tag }) => tag === "dns-proxy")?.detour, undefined);
  for (const address of ["223.5.5.5/32", "1.1.1.1/32"]) {
    assert.ok(config.route.rules.some((rule) => rule.ip_cidr?.includes(address) && rule.outbound === "DIRECT"), address);
  }
  assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
});
