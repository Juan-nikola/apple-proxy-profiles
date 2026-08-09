import assert from "node:assert/strict";
import test from "node:test";

import { orderedRoutingPlan } from "../../../shared/rules/lightweight-policy.js";
import { parseSingBoxOptions } from "../src/options.js";
import { renderSingBoxDns } from "../src/render-dns.js";
import { renderSingBoxOutbound } from "../src/render-node.js";
import { renderSingBoxConfig } from "../src/render-config.js";
import { validateSingBoxConfig } from "../src/validate-config.js";

const node = {
  name: "🇯🇵 [机场] Tokyo A",
  type: "ss",
  server: "198.51.100.10",
  port: 443,
  cipher: "aes-256-gcm",
  password: "TEST_ONLY_PASSWORD",
  udp: true,
  _profile: {
    id: "fixture",
    continent: "asiaPacific",
    sourceKind: "airport",
    flag: "🇯🇵",
    udp: true,
    p2p: false,
    entry: true,
    chained: false,
  },
};

const baseOptions = {
  output: "config",
  type: "collection",
  name: "sing-box-sources",
  subscriptionName: "sing-box-Nodes",
  platform: "openwrt",
  channel: "edge",
  dnsMode: "stable",
  chinaDns: "alidns",
  globalDns: "cloudflare",
  blockMode: "balanced",
  quicMode: "proxy-block",
  ipv6Mode: "auto",
  autoGroupMode: "auto",
  clientChain: "off",
};

function render(overrides = {}, rendererOptions = {}) {
  return renderSingBoxConfig(parseSingBoxOptions({ ...baseOptions, ...overrides }), [node], {
    ruleBaseUrl: "https://example.invalid/current/sing-box/rule-sets",
    ...rendererOptions,
  });
}

test("parses all requested sing-box platforms and rejects unsupported values", () => {
  for (const platform of ["macos", "iphone", "ipad", "android", "openwrt"]) {
    assert.equal(parseSingBoxOptions({ ...baseOptions, platform }).platform, platform);
  }
  assert.throws(() => parseSingBoxOptions({ ...baseOptions, platform: "router-plugin" }), /platform/iu);
  assert.throws(() => parseSingBoxOptions({ ...baseOptions, channel: "beta" }), /channel/iu);
  assert.equal(parseSingBoxOptions(baseOptions).profileMode, "light");
  assert.equal(parseSingBoxOptions(baseOptions).adblockMode, "off");
  assert.equal(parseSingBoxOptions({ ...baseOptions, profileMode: "diagnostic" }).profileMode, "diagnostic");
  assert.equal(parseSingBoxOptions({ ...baseOptions, adblockMode: "full" }).adblockMode, "full");
  assert.throws(() => parseSingBoxOptions({ ...baseOptions, profileMode: "debug" }), /profileMode/iu);
  assert.throws(() => parseSingBoxOptions({ ...baseOptions, adblockMode: "partial" }), /adblockMode/iu);
});

test("renders a validated OpenWrt transparent gateway config", () => {
  const config = render();
  assert.equal(config.inbounds[0].type, "tun");
  assert.equal(config.inbounds[0].auto_route, true);
  assert.equal(config.inbounds[0].auto_redirect, true);
  assert.equal(config.dns.final, "dns-direct");
  assert.equal(config.route.rules.some((rule) => rule.rule_set?.includes("rule-Advertising")), false);
  assert.equal(config.route.final, "🚀 节点选择");
  assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
});

test("renders the latest sing-box HTTP client contract without removed fields", () => {
  const config = render();
  assert.deepEqual(config.http_clients, [{
    tag: "🧭 规则下载 HTTP",
    version: 2,
    detour: "🧭 DNS 与规则下载",
  }]);
  assert.equal(config.route.default_http_client, "🧭 规则下载 HTTP");
  assert.equal(config.route.default_domain_resolver, "dns-direct");
  const ruleDownloadGroup = config.outbounds.find((outbound) => outbound.tag === "🧭 DNS 与规则下载");
  assert.deepEqual(ruleDownloadGroup?.outbounds, ["🧭 规则下载故障转移", "🚀 节点选择", "DIRECT"]);
  assert.equal(ruleDownloadGroup?.default, "🧭 规则下载故障转移");
  assert.equal(config.route.rule_set.every((rule) => rule.http_client === "🧭 规则下载 HTTP"), true);
  assert.equal(config.route.rules.some((rule) => Object.hasOwn(rule, "geoip") || Object.hasOwn(rule, "geosite")), false);
  assert.equal(config.route.rule_set.some((rule) => Object.hasOwn(rule, "download_detour")), false);
  assert.equal(Object.hasOwn(config.experimental.cache_file, "store_rdrc"), false);
  assert.equal(config.experimental.cache_file.store_dns, true);
  assert.ok(config.route.rules.some((rule) => rule.rule_set?.includes("rule-ChinaIP") && rule.outbound === "DIRECT"));
});

test("uses a dedicated health probe for rule downloads", () => {
  const ruleBaseUrl = "https://example.invalid/current/sing-box/rule-sets";
  const config = renderSingBoxConfig(parseSingBoxOptions(baseOptions), [node], { ruleBaseUrl });
  const failover = config.outbounds.find((outbound) => outbound.tag === "🧭 规则下载故障转移");
  assert.deepEqual(failover?.type, "urltest");
  assert.deepEqual(failover?.outbounds, [node.name, "DIRECT"]);
  assert.equal(failover?.url, `${ruleBaseUrl}/Hijacking.srs`);
  assert.equal(failover?.interval, "30s");
  assert.equal(failover?.tolerance, 0);

  const ruleDownload = config.outbounds.find((outbound) => outbound.tag === "🧭 DNS 与规则下载");
  assert.deepEqual(ruleDownload?.type, "selector");
  assert.deepEqual(ruleDownload?.outbounds, ["🧭 规则下载故障转移", "🚀 节点选择", "DIRECT"]);
  assert.equal(ruleDownload?.default, "🧭 规则下载故障转移");
});

test("keeps the primary selector compact with continent-level entries only", () => {
  const config = render();
  const primary = config.outbounds.find((outbound) => outbound.tag === "🚀 节点选择");
  assert.deepEqual(primary?.type, "selector");
  assert.deepEqual(primary?.outbounds, ["⚡ 全部自动", "🛟 全部故障转移", "🌏 亚太"]);
  const continent = config.outbounds.find((outbound) => outbound.tag === "🌏 亚太");
  assert.ok(continent?.outbounds.includes("🇯🇵 [机场] Tokyo A"));
  for (const nodeName of ["🇯🇵 [机场] Tokyo A"]) {
    assert.equal(primary?.outbounds.includes(nodeName), false, "primary selector must not list concrete nodes");
  }
});

test("renders latest sing-box flat DNS rule actions", () => {
  const config = render();
  const proxyDnsRuleSets = orderedRoutingPlan()
    .filter(({ dnsClass }) => dnsClass === "proxy")
    .map(({ id }) => `rule-${id}`);
  assert.deepEqual(
    config.dns.rules.map(({ action, server }) => ({ action, server })),
    [{ action: "route", server: "dns-proxy" }],
  );
  assert.equal(config.dns.final, "dns-direct");
  assert.deepEqual(config.dns.rules[0].rule_set, proxyDnsRuleSets);
  assert.equal(config.dns.rules[0].rule_set.includes("rule-ChinaTLD"), false);
});

test("renders every global DNS provider with the structured HTTPS contract", () => {
  for (const globalDns of ["cloudflare", "google", "quad9"]) {
    const dns = renderSingBoxDns({ ...baseOptions, globalDns });
    const proxyServer = dns.servers.find((server) => server.tag === "dns-proxy");
    assert.ok(proxyServer, globalDns);
    assert.equal(proxyServer.type, "https");
    assert.equal(proxyServer.server_port, 443);
    assert.equal(proxyServer.path, "/dns-query");
    assert.equal(proxyServer.tls?.enabled, true);
    assert.equal(typeof proxyServer.tls?.server_name, "string");
    assert.doesNotMatch(proxyServer.server, /^https?:\/\//iu);
    assert.doesNotMatch(proxyServer.server, /[/?#]/u);
  }
});

test("renders mobile TUN without Linux-only auto redirect fields", () => {
  const config = render({ platform: "android" });
  assert.equal(config.inbounds[0].type, "tun");
  assert.equal(Object.hasOwn(config.inbounds[0], "auto_redirect"), false);
  assert.equal(Object.hasOwn(config.inbounds[0], "iproute2_table_index"), false);
  assert.equal(Object.hasOwn(config.inbounds[0], "stack"), false);
  assert.deepEqual(config.inbounds[0].include_android_user, [0]);
  assert.equal(Object.hasOwn(config.inbounds[0].platform ?? {}, "include_android_user"), false);
  assert.equal(new Set(config.inbounds[0].route_exclude_address).size, config.inbounds[0].route_exclude_address.length);
  assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
});

test("keeps the mixed TUN stack only on OpenWrt", () => {
  const openwrt = render();
  assert.equal(openwrt.inbounds[0].stack, "mixed");
  for (const platform of ["macos", "iphone", "ipad"]) {
    const config = render({ platform });
    assert.equal(Object.hasOwn(config.inbounds[0], "stack"), false, platform);
  }
});

test("renders only binary lightweight rule sets and keeps full adblock opt-in", () => {
  const config = render();
  const serialized = JSON.stringify(config);
  const tags = config.route.rule_set.map(({ tag }) => tag);
  assert.equal(serialized.includes('"format":"source"'), false);
  assert.equal(serialized.includes(".json"), false);
  assert.equal(config.route.rule_set.every(({ format }) => format === "binary"), true);
  assert.equal(config.route.rule_set.every(({ url }) => url.endsWith(".srs")), true);
  assert.equal(tags.includes("rule-Advertising"), false);
  assert.equal(tags.includes("rule-Advertising_Domain"), false);
  assert.equal(tags.includes("rule-ChinaMax_Domain"), false);
  assert.equal(tags.includes("rule-DomesticCore"), true);
  assert.equal(tags.includes("rule-ChinaIP"), true);
  assert.equal(serialized.includes("optional/adblock-full"), false);

  const adblock = render({ adblockMode: "full" });
  const adRules = adblock.route.rule_set.filter(({ tag }) => ["rule-Advertising", "rule-Advertising_Domain"].includes(tag));
  assert.deepEqual(adRules.map(({ tag }) => tag), ["rule-Advertising", "rule-Advertising_Domain"]);
  assert.equal(adRules.every(({ url }) => /^https:\/\/example\.invalid\/current\/optional\/adblock-full\/sing-box\/(?:Advertising|Advertising_Domain)\.srs$/u.test(url)), true);
});

test("rejects the legacy source-format API with migration guidance", () => {
  assert.throws(() => render({}, { ruleSetFormat: "source" }), /ruleSetFormat.*removed|migrat/iu);
  assert.throws(() => parseSingBoxOptions({ ...baseOptions, ruleSetFormat: "source" }), /ruleSetFormat.*removed|migrat/iu);
});

test("orders deterministic fallback after explicit services and before ChinaIP", () => {
  const config = render();
  const rules = config.route.rules;
  const indexOfTag = (tag) => rules.findIndex((rule) => rule.rule_set?.includes(tag));
  const local = rules.findIndex((rule) => rule.ip_is_private === true);
  const security = indexOfTag("rule-Hijacking");
  const custom = rules.findIndex((rule) => rule.domain_suffix?.includes("perplexity.ai"));
  const domesticCore = indexOfTag("rule-DomesticCore");
  const domesticGame = indexOfTag("rule-DomesticGame");
  const steamCn = indexOfTag("rule-SteamCN");
  const overseas = indexOfTag("rule-OpenAI");
  const overseasGame = indexOfTag("rule-OverseasGame");
  const chinaTld = indexOfTag("rule-ChinaTLD");
  const resolve = rules.findIndex((rule) => rule.action === "resolve");
  const chinaIp = indexOfTag("rule-ChinaIP");
  assert.equal([local, security, custom, domesticCore, domesticGame, steamCn, overseas, overseasGame, chinaTld, resolve, chinaIp].every((index) => index >= 0), true);
  assert.equal(local < security && security < custom && custom < domesticCore, true);
  assert.equal(domesticCore < domesticGame && domesticGame < steamCn && steamCn < overseas, true);
  assert.equal(overseas < overseasGame && overseasGame < chinaTld, true);
  assert.equal(chinaTld < resolve && resolve < chinaIp, true);
  assert.equal(rules[chinaTld].outbound, "DIRECT");
  assert.deepEqual(rules[resolve], { action: "resolve", server: "dns-direct" });
  assert.equal(rules[chinaIp].outbound, "DIRECT");
  assert.equal(Object.hasOwn(rules[chinaIp], "rule_set_ip_cidr_accept_empty"), false);
  assert.equal(config.route.final, "🚀 节点选择");
});

test("sniffs TUN connections before domain rule-set routing", () => {
  const config = render({ platform: "macos" });
  const sniffIndexes = config.route.rules
    .map((rule, index) => (rule.action === "sniff" ? index : -1))
    .filter((index) => index >= 0);
  assert.deepEqual(sniffIndexes.length, 1);
  const sniff = config.route.rules[sniffIndexes[0]];
  assert.deepEqual(sniff, { inbound: "tun-in", action: "sniff" });
  const dnsHijackIndex = config.route.rules.findIndex((rule) => rule.action === "hijack-dns");
  assert.deepEqual(config.route.rules[dnsHijackIndex], { protocol: "dns", action: "hijack-dns" });
  const explicitDomain = config.route.rules.findIndex((rule) => rule.rule_set?.includes("rule-OpenAI"));
  const chinaIp = config.route.rules.findIndex((rule) => rule.rule_set?.includes("rule-ChinaIP"));
  const local = config.route.rules.findIndex((rule) => rule.ip_is_private === true);
  assert.equal(dnsHijackIndex < local, true);
  assert.equal(sniffIndexes[0] < explicitDomain, true);
  assert.equal(sniffIndexes[0] < chinaIp, true);
});

test("diagnostic profile uses zero remote rule sets without changing platform or nodes", () => {
  const light = render();
  const diagnostic = render({ profileMode: "diagnostic" });
  assert.deepEqual(diagnostic.route.rule_set, []);
  assert.equal(diagnostic.dns.rules.some((rule) => Array.isArray(rule.rule_set)), false);
  assert.deepEqual(diagnostic.dns.servers, light.dns.servers);
  assert.equal(diagnostic.dns.final, light.dns.final);
  assert.deepEqual(diagnostic.inbounds, light.inbounds);
  assert.deepEqual(diagnostic.outbounds, light.outbounds);
  assert.equal(diagnostic.route.final, "🚀 节点选择");
  assert.ok(diagnostic.outbounds.some((outbound) => outbound.tag === node.name));
});

test("rule-download bootstrap has no dependency on a remote rule-set tag", () => {
  const config = render();
  const download = config.outbounds.find(({ tag }) => tag === "🧭 DNS 与规则下载");
  const failover = config.outbounds.find(({ tag }) => tag === "🧭 规则下载故障转移");
  assert.equal(config.http_clients[0].detour, download.tag);
  assert.equal([...download.outbounds, ...failover.outbounds].some((tag) => tag.startsWith("rule-")), false);
  assert.equal(failover.outbounds.includes(node.name), true);
});

test("accepts common upstream transport metadata on Snell nodes", () => {
  const node = {
    name: "Snell with upstream metadata",
    type: "snell",
    server: "198.51.100.11",
    port: 443,
    psk: "TEST_ONLY_SNELL_PSK",
    version: 4,
    reuse: true,
    udp_relay: true,
    tfo: true,
  };
  assert.deepEqual(renderSingBoxOutbound(node), {
    type: "snell",
    tag: "Snell with upstream metadata",
    server: "198.51.100.11",
    server_port: 443,
    psk: "TEST_ONLY_SNELL_PSK",
    version: 4,
    reuse: true,
  });
});
