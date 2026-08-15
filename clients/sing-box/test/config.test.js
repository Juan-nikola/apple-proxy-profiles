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

test("renders the latest sing-box rule-set download contract without removed fields", () => {
  const config = render();
  assert.deepEqual(config.http_clients, [{
    tag: "🧭 规则下载 HTTP",
    version: 2,
    detour: "🧭 DNS 与规则下载",
  }]);
  assert.equal(config.route.default_http_client, "🧭 规则下载 HTTP");
  assert.equal(config.route.default_domain_resolver, "dns-direct");
  const ruleDownloadGroup = config.outbounds.find((outbound) => outbound.tag === "🧭 DNS 与规则下载");
  assert.deepEqual(ruleDownloadGroup?.outbounds, ["🚀 节点选择", "DIRECT"]);
  assert.equal(ruleDownloadGroup?.default, "🚀 节点选择");
  assert.equal(config.outbounds.some((outbound) => outbound.tag === "🧭 规则下载故障转移"), false);
  assert.equal(config.route.rule_set.every((rule) => rule.http_client === "🧭 规则下载 HTTP"), true);
  assert.equal(config.route.rules.some((rule) => Object.hasOwn(rule, "geoip") || Object.hasOwn(rule, "geosite")), false);
  assert.equal(config.route.rule_set.some((rule) => Object.hasOwn(rule, "download_detour")), false);
  assert.equal(Object.hasOwn(config.experimental.cache_file, "store_rdrc"), false);
  assert.equal(config.experimental.cache_file.store_dns, true);
  assert.ok(config.route.rules.some((rule) => rule.rule_set?.includes("rule-ChinaIP") && rule.outbound === "DIRECT"));
});

test("does not probe every node for rule downloads", () => {
  const config = render();
  const ruleDownload = config.outbounds.find((outbound) => outbound.tag === "🧭 DNS 与规则下载");
  assert.deepEqual(ruleDownload?.type, "selector");
  assert.deepEqual(ruleDownload?.outbounds, ["🚀 节点选择", "DIRECT"]);
  assert.equal(ruleDownload?.default, "🚀 节点选择");
  assert.equal(config.outbounds.some((outbound) => outbound.tag === "🧭 规则下载故障转移"), false);
});

test("keeps latency probing to the two global groups and pauses it when idle", () => {
  const config = render();
  const urltests = config.outbounds.filter((outbound) => outbound.type === "urltest");
  assert.deepEqual(urltests.map((outbound) => outbound.tag), ["⚡ 全部自动", "🛟 全部故障转移"]);
  assert.equal(urltests.every((outbound) => outbound.idle_timeout === "30m"), true);

  const asiaAuto = config.outbounds.find((outbound) => outbound.tag === "⚡ 亚太自动");
  assert.deepEqual(asiaAuto?.type, "selector");
  assert.deepEqual(asiaAuto?.outbounds, ["⚡ 全部自动", node.name]);
  assert.equal(asiaAuto?.default, "⚡ 全部自动");

  const asiaFallback = config.outbounds.find((outbound) => outbound.tag === "🛟 亚太故障转移");
  assert.deepEqual(asiaFallback?.type, "selector");
  assert.deepEqual(asiaFallback?.outbounds, ["🛟 全部故障转移", node.name]);
  assert.equal(asiaFallback?.default, "🛟 全部故障转移");

  const minimal = render({ autoGroupMode: "minimal" });
  assert.equal(minimal.outbounds.some((outbound) => outbound.tag === "🛟 亚太故障转移"), false);
  assert.deepEqual(minimal.outbounds.filter((outbound) => outbound.type === "urltest").map((outbound) => outbound.tag), ["⚡ 全部自动", "🛟 全部故障转移"]);
});

test("keeps the primary selector compact with continent-level entries only", () => {
  const config = render();
  const primary = config.outbounds.find((outbound) => outbound.tag === "🚀 节点选择");
  assert.deepEqual(primary?.type, "selector");
  assert.deepEqual(primary?.outbounds, ["⚡ 全部自动", "🛟 全部故障转移", "🌏 亚太"]);
  const continent = config.outbounds.find((outbound) => outbound.tag === "🌏 亚太");
  assert.deepEqual(continent?.outbounds, ["⚡ 亚太自动", "🛟 亚太故障转移", "🇯🇵 [机场] Tokyo A"]);
  assert.equal(config.outbounds.some((outbound) => outbound.tag === "🇯🇵 日本"), false);
  for (const nodeName of ["🇯🇵 [机场] Tokyo A"]) {
    assert.equal(primary?.outbounds.includes(nodeName), false, "primary selector must not list concrete nodes");
  }
});

test("renders latest sing-box DNS rules with evaluate and response matching", () => {
  const config = render();
  const proxyDnsRuleSets = orderedRoutingPlan()
    .filter(({ dnsClass }) => dnsClass === "proxy")
    .map(({ id }) => `rule-${id}`);
  assert.deepEqual(
    config.dns.rules.map(({ action, server }) => ({ action, server })),
    [
      { action: "evaluate", server: "dns-proxy" },
      { action: "respond", server: undefined },
      { action: "route", server: "dns-direct" },
    ],
  );
  assert.equal(config.dns.final, "dns-direct");
  assert.deepEqual(config.dns.rules[0].rule_set, proxyDnsRuleSets);
  assert.equal(config.dns.rules[1].match_response, true);
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

test("ipv4-only removes the TUN IPv6 address and DNS hijack address", () => {
  for (const platform of ["macos", "iphone", "ipad", "android", "openwrt"]) {
    const v4 = render({ platform, ipv6Mode: "ipv4-only" });
    assert.deepEqual(v4.inbounds[0].address, ["172.18.0.1/30"], `${platform} address`);
    assert.equal(v4.inbounds[0].dns_address.includes("fdfe:dcba:9876::2"), false, `${platform} dns_address`);
    assert.equal(v4.dns.strategy, "ipv4_only", `${platform} dns strategy`);
  }
  const auto = render({ platform: "iphone", ipv6Mode: "auto" });
  assert.deepEqual(auto.inbounds[0].address, ["172.18.0.1/30", "fdfe:dcba:9876::1/126"]);
  assert.deepEqual(auto.inbounds[0].dns_address, ["172.18.0.2", "fdfe:dcba:9876::2"]);
  assert.equal(auto.dns.strategy, "prefer_ipv4");
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

test("applies quicMode allow, proxy-block, and all-block to route rules", () => {
  const quicRule = (extra = {}) => ({ network: "udp", port: 443, action: "reject", ...extra });

  const allow = render({ quicMode: "allow" });
  assert.equal(
    allow.route.rules.some((rule) => rule.network === "udp" && rule.port === 443 && rule.action === "reject"),
    false,
  );

  const proxyBlock = render({ quicMode: "proxy-block" });
  const pbRules = proxyBlock.route.rules;
  const chinaIp = pbRules.findIndex((rule) => rule.rule_set?.includes("rule-ChinaIP"));
  const lateBlock = pbRules.findIndex((rule) => (
    rule.network === "udp" && rule.port === 443 && rule.action === "reject" && rule.rule_set === undefined
  ));
  assert.ok(lateBlock > chinaIp, "proxy-block must reject QUIC on the final proxy path after ChinaIP");

  const youtubeReject = pbRules.findIndex((rule) => (
    rule.rule_set?.includes("rule-YouTube") && rule.action === "reject"
  ));
  const youtubeRoute = pbRules.findIndex((rule) => (
    rule.rule_set?.includes("rule-YouTube") && rule.outbound === "📺 YouTube"
  ));
  assert.ok(youtubeReject >= 0 && youtubeReject < youtubeRoute, "proxy-block must reject explicit overseas QUIC before routing");
  assert.equal(
    pbRules.some((rule) => rule.rule_set?.includes("rule-DomesticCore") && rule.action === "reject"),
    false,
    "proxy-block must keep domestic direct QUIC allowed",
  );
  assert.deepEqual(validateSingBoxConfig(proxyBlock), { valid: true, errors: [] });

  const allBlock = render({ quicMode: "all-block" });
  const abRules = allBlock.route.rules;
  const allBlockIndex = abRules.findIndex((rule) => (
    rule.network === "udp" && rule.port === 443 && rule.action === "reject"
  ));
  const domesticCore = abRules.findIndex((rule) => rule.rule_set?.includes("rule-DomesticCore"));
  assert.ok(allBlockIndex >= 0 && allBlockIndex < domesticCore, "all-block must reject QUIC before domestic routing");
  assert.deepEqual(validateSingBoxConfig(allBlock), { valid: true, errors: [] });
});

test("puts visible groups first, hidden helper groups last, and node outbounds at the end", () => {
  const nodes = [
    {
      name: "🇯🇵 东京节点",
      type: "ss",
      server: "198.51.100.10",
      port: 443,
      cipher: "aes-256-gcm",
      password: "TEST_ONLY_PASSWORD",
      udp: true,
      _profile: { id: "tokyo", continent: "asiaPacific", flag: "🇯🇵", sourceKind: "airport", entry: true, chained: false },
    },
    {
      name: "🇩🇪 法兰克福节点",
      type: "ss",
      server: "198.51.100.20",
      port: 443,
      cipher: "aes-256-gcm",
      password: "TEST_ONLY_PASSWORD",
      udp: true,
      _profile: { id: "frankfurt", continent: "europe", flag: "🇩🇪", sourceKind: "airport", entry: true, chained: false },
    },
    {
      name: "🇺🇸 纽约节点",
      type: "ss",
      server: "198.51.100.30",
      port: 443,
      cipher: "aes-256-gcm",
      password: "TEST_ONLY_PASSWORD",
      udp: true,
      _profile: { id: "newyork", continent: "americas", flag: "🇺🇸", sourceKind: "airport", entry: true, chained: false },
    },
  ];
  const config = renderSingBoxConfig(parseSingBoxOptions({ ...baseOptions, platform: "iphone" }), nodes, {
    ruleBaseUrl: "https://example.invalid/current/sing-box/rule-sets",
  });
  const tags = config.outbounds.map(({ tag }) => tag);
  const expectedVisible = [
    "🚀 节点选择",
    "🌏 亚太",
    "🌍 欧洲",
    "🌎 美洲",
    "🏢 机场节点",
    "🤖 AI 专用",
    "🐙 GitHub",
    "📺 YouTube",
    "🎬 海外流媒体",
    "💬 海外社交",
    "🍎 Apple",
    "🪟 Microsoft",
    "🇨🇳 国内平台",
    "🌍 海外游戏",
    "🎮 游戏连接",
    "⬇️ 下载/P2P",
    "🧭 DNS 与规则下载",
    "☣️ 安全威胁",
    "🧱 常见广告",
    "🕵️ 严格跟踪",
  ];
  const expectedHidden = [
    "⚡ 全部自动",
    "🛟 全部故障转移",
    "⚡ 亚太自动",
    "🛟 亚太故障转移",
    "⚡ 欧洲自动",
    "🛟 欧洲故障转移",
    "⚡ 美洲自动",
    "🛟 美洲故障转移",
  ];
  const expectedOrder = ["DIRECT", "REJECT", ...expectedVisible, ...expectedHidden];
  const head = tags.slice(0, expectedOrder.length);
  assert.deepEqual(head, expectedOrder, "visible groups must precede hidden helper groups");
  const firstNodeIndex = tags.indexOf("🇯🇵 东京节点");
  const lastHiddenIndex = tags.indexOf("🛟 美洲故障转移");
  assert.ok(firstNodeIndex > lastHiddenIndex, "node outbounds must be emitted after every group");
  for (const tag of ["🤖 AI 亚太", "🤖 AI 欧洲", "🤖 AI 美洲"]) {
    assert.equal(tags.includes(tag), false, tag);
  }
  assert.deepEqual(tags.slice(expectedOrder.length), ["🇯🇵 东京节点", "🇩🇪 法兰克福节点", "🇺🇸 纽约节点"]);
  assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
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
  assert.equal(config.route.rule_set.every((rule) => rule.http_client === config.route.default_http_client), true);
  assert.equal(failover, undefined);
  assert.equal(download.outbounds.some((tag) => tag.startsWith("rule-")), false);
  assert.deepEqual(download.outbounds, ["🚀 节点选择", "DIRECT"]);
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
