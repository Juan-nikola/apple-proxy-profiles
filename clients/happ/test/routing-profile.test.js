import assert from "node:assert/strict";
import test from "node:test";

import {
  renderHappRoutingDeepLink,
  renderHappRoutingProfile,
} from "../src/render-routing-profile.js";

test("routing profile carries the node-subscription rule sets", () => {
  const profile = renderHappRoutingProfile({
    baseUrl: "https://example.invalid/apple-proxy-profiles/edge",
    generatedAt: "2026-08-20T00:00:00Z",
  });

  assert.deepEqual(profile.DirectSites, [
    "geosite:HAPP-PRIVACY",
    "geosite:HAPP-DOMESTICCORE",
    "geosite:HAPP-DOMESTICGAME",
    "geosite:HAPP-STEAMCN",
    "geosite:HAPP-BILIBILI",
    "geosite:HAPP-BYTEDANCE",
    "geosite:HAPP-XIAOHONGSHU",
    "geosite:HAPP-WEIBO",
    "geosite:HAPP-APPLE",
    "geosite:HAPP-MICROSOFT",
    "geosite:HAPP-DOWNLOAD",
    "geosite:HAPP-PRIVATETRACKER",
    "geosite:HAPP-CHINATLD",
  ]);
  assert.deepEqual(profile.ProxySites, [
    "geosite:HAPP-OPENAI",
    "geosite:HAPP-CLAUDE",
    "geosite:HAPP-GEMINI",
    "geosite:HAPP-COPILOT",
    "geosite:HAPP-GITHUB",
    "geosite:HAPP-YOUTUBE",
    "geosite:HAPP-NETFLIX",
    "geosite:HAPP-DISNEY",
    "geosite:HAPP-SPOTIFY",
    "geosite:HAPP-GLOBALMEDIA",
    "geosite:HAPP-TELEGRAM",
    "geosite:HAPP-FACEBOOK",
    "geosite:HAPP-INSTAGRAM",
    "geosite:HAPP-TWITTER",
    "geosite:HAPP-TIKTOK",
    "geosite:HAPP-OVERSEASGAME",
  ]);
  assert.deepEqual(profile.BlockSites, [
    "geosite:HAPP-HIJACKING",
    "geosite:HAPP-BLOCKHTTPDNS",
  ]);
  assert.deepEqual(profile.DirectIp, [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "169.254.0.0/16",
    "224.0.0.0/4",
    "255.255.255.255",
    "geoip:HAPP-CHINAIP",
  ]);
  assert.deepEqual(profile.ProxyIp, []);
  assert.deepEqual(profile.BlockIp, []);

  const deepLink = renderHappRoutingDeepLink(profile);
  const encoded = deepLink.slice("happ://routing/onadd/".length);
  const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  assert.deepEqual(decoded, profile);
});
