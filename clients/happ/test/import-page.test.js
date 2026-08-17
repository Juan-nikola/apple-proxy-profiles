import assert from "node:assert/strict";
import test from "node:test";

import {
  renderHappRoutingDeepLink,
  renderHappRoutingProfile,
  renderHappRoutingQrSvg,
} from "../src/render-routing-profile.js";
import { renderHappImportPage } from "../src/build-import-page.js";

const BASE_URL = "https://juan-nikola.github.io/apple-proxy-profiles/edge";
const GENERATED_AT = "2026-08-12T03:04:05.000Z";
const POLICY_KEYS = [
  "🤖 AI 专用", "🐙 GitHub", "📺 YouTube", "🎬 海外流媒体", "💬 海外社交",
  "🍎 Apple", "🪟 Microsoft", "🇨🇳 国内平台", "🌍 海外游戏", "⬇️ 下载/P2P",
  "🧭 DNS 与规则下载", "最终兜底",
];

test("renders the official Happ routing profile and its exact onadd Base64 payload", async () => {
  const profile = renderHappRoutingProfile({ baseUrl: BASE_URL, generatedAt: GENERATED_AT });

  assert.deepEqual(profile, {
    Name: "Apple Proxy Profiles Happ",
    GlobalProxy: "true",
    RouteOrder: "block-proxy-direct",
    RemoteDNSType: "DoH",
    RemoteDNSDomain: "https://cloudflare-dns.com/dns-query",
    RemoteDNSIP: "1.1.1.1",
    DomesticDNSType: "DoH",
    DomesticDNSDomain: "https://dns.alidns.com/dns-query",
    DomesticDNSIP: "223.5.5.5",
    Geoipurl: `${BASE_URL}/happ/geoip.dat`,
    Geositeurl: `${BASE_URL}/happ/geosite.dat`,
    LastUpdated: "1786503845",
    DnsHosts: { "cloudflare-dns.com": "1.1.1.1", "dns.alidns.com": "223.5.5.5" },
    DirectSites: [], DirectIp: [], ProxySites: [], ProxyIp: [], BlockSites: [], BlockIp: [],
    DomainStrategy: "IPIfNonMatch", FakeDNS: "false", UseChunkFiles: "true",
  });

  const deepLink = renderHappRoutingDeepLink(profile);
  assert.match(deepLink, /^happ:\/\/routing\/onadd\/[A-Za-z0-9+/]+={0,2}$/u);
  const payload = deepLink.slice("happ://routing/onadd/".length);
  assert.deepEqual(JSON.parse(Buffer.from(payload, "base64").toString("utf8")), profile);

  const svg = await renderHappRoutingQrSvg(deepLink);
  assert.match(svg, /^<svg[\s>]/u);
  assert.match(svg, /<path /u);
});

test("renders an offline Chinese policy helper without private or browser-persistent data", () => {
  const profile = renderHappRoutingProfile({ baseUrl: BASE_URL, generatedAt: GENERATED_AT });
  const deepLink = renderHappRoutingDeepLink(profile);
  const page = renderHappImportPage({ profile, deepLink, qrSvg: "<svg viewBox=\"0 0 1 1\"></svg>" });

  assert.match(page, /Content-Security-Policy/u);
  assert.match(page, new RegExp(`href="${deepLink}"`, "u"));
  assert.match(page, /<svg viewBox="0 0 1 1"><\/svg>/u);
  for (const key of POLICY_KEYS) assert.match(page, new RegExp(key, "u"));
  for (const control of ["DIRECT", "FOLLOW", "NODE:"]) assert.match(page, new RegExp(control, "u"));
  assert.match(page, /TextEncoder/u);
  assert.match(page, /TextDecoder/u);
  assert.match(page, /navigator\.clipboard\.writeText/u);
  assert.match(page, /点击生成/u);
  assert.match(page, /Base64URL[^<]{0,40}不是加密/u);
  for (const forbidden of ["fetch", "XMLHttpRequest", "sendBeacon", "document.cookie", "localStorage", "sessionStorage", "analytics", "<script src="]) {
    assert.equal(page.includes(forbidden), false, forbidden);
  }
});
