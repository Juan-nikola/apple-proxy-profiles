import assert from "node:assert/strict";
import test from "node:test";

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

test("parses all requested sing-box platforms and rejects unsupported values", () => {
  for (const platform of ["macos", "iphone", "ipad", "android", "openwrt"]) {
    assert.equal(parseSingBoxOptions({ ...baseOptions, platform }).platform, platform);
  }
  assert.throws(() => parseSingBoxOptions({ ...baseOptions, platform: "router-plugin" }), /platform/iu);
  assert.throws(() => parseSingBoxOptions({ ...baseOptions, channel: "beta" }), /channel/iu);
});

test("renders a validated OpenWrt transparent gateway config", () => {
  const config = renderSingBoxConfig(parseSingBoxOptions(baseOptions), [node], {
    ruleBaseUrl: "https://example.invalid/current/sing-box/rules",
    ruleSetFormat: "source",
  });
  assert.equal(config.inbounds[0].type, "tun");
  assert.equal(config.inbounds[0].auto_route, true);
  assert.equal(config.inbounds[0].auto_redirect, true);
  assert.equal(config.dns.final, "dns-proxy");
  assert.ok(config.route.rules.some((rule) => rule.rule_set?.includes("rule-Advertising")));
  assert.equal(config.route.final, "🚀 节点选择");
  assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
});

test("renders the latest sing-box HTTP client contract without removed fields", () => {
  const config = renderSingBoxConfig(parseSingBoxOptions(baseOptions), [node], {
    ruleBaseUrl: "https://example.invalid/current/sing-box/rules",
    ruleSetFormat: "source",
  });
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
  assert.ok(config.route.rules.some((rule) => (
    rule.rule_set?.includes("rule-ChinaMax") && rule.outbound === "DIRECT"
  )));
});

test("uses a dedicated health probe for rule downloads", () => {
  const ruleBaseUrl = "https://example.invalid/current/sing-box/rules";
  const config = renderSingBoxConfig(parseSingBoxOptions(baseOptions), [node], {
    ruleBaseUrl,
    ruleSetFormat: "source",
  });
  const failover = config.outbounds.find((outbound) => outbound.tag === "🧭 规则下载故障转移");
  assert.deepEqual(failover?.type, "urltest");
  assert.deepEqual(failover?.outbounds, [node.name, "DIRECT"]);
  assert.equal(failover?.url, `${ruleBaseUrl}/Hijacking.json`);
  assert.equal(failover?.interval, "30s");
  assert.equal(failover?.tolerance, 0);

  const ruleDownload = config.outbounds.find((outbound) => outbound.tag === "🧭 DNS 与规则下载");
  assert.deepEqual(ruleDownload?.type, "selector");
  assert.deepEqual(ruleDownload?.outbounds, ["🧭 规则下载故障转移", "🚀 节点选择", "DIRECT"]);
  assert.equal(ruleDownload?.default, "🧭 规则下载故障转移");
});

test("renders latest sing-box flat DNS rule actions", () => {
  const config = renderSingBoxConfig(parseSingBoxOptions(baseOptions), [node], {
    ruleBaseUrl: "https://example.invalid/current/sing-box/rules",
    ruleSetFormat: "source",
  });
  assert.deepEqual(
    config.dns.rules.map(({ action, server }) => ({ action, server })),
    [
      { action: "route", server: "dns-direct" },
      { action: "route", server: "dns-proxy" },
    ],
  );
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
  const config = renderSingBoxConfig(parseSingBoxOptions({ ...baseOptions, platform: "android" }), [node], {
    ruleBaseUrl: "https://example.invalid/current/sing-box/rules",
    ruleSetFormat: "source",
  });
  assert.equal(config.inbounds[0].type, "tun");
  assert.equal(Object.hasOwn(config.inbounds[0], "auto_redirect"), false);
  assert.equal(Object.hasOwn(config.inbounds[0], "iproute2_table_index"), false);
  assert.equal(Object.hasOwn(config.inbounds[0], "stack"), false);
  assert.deepEqual(validateSingBoxConfig(config), { valid: true, errors: [] });
});

test("keeps the mixed TUN stack only on OpenWrt", () => {
  const openwrt = renderSingBoxConfig(parseSingBoxOptions(baseOptions), [node], {
    ruleBaseUrl: "https://example.invalid/current/sing-box/rules",
    ruleSetFormat: "source",
  });
  assert.equal(openwrt.inbounds[0].stack, "mixed");
  for (const platform of ["macos", "iphone", "ipad"]) {
    const config = renderSingBoxConfig(parseSingBoxOptions({ ...baseOptions, platform }), [node], {
      ruleBaseUrl: "https://example.invalid/current/sing-box/rules",
      ruleSetFormat: "source",
    });
    assert.equal(Object.hasOwn(config.inbounds[0], "stack"), false, platform);
  }
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
