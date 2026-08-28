import assert from "node:assert/strict";
import test from "node:test";

import {
  renderHappRoutingDeepLink,
  renderHappRoutingProfile,
} from "../src/render-routing-profile.js";
import { renderHappSubscription } from "../src/render-subscription.js";
import { parseHappOptions } from "../src/options.js";

function geoReferences(value, output = new Set()) {
  if (typeof value === "string" && /^(?:geoip|geosite):/u.test(value)) output.add(value);
  else if (Array.isArray(value)) value.forEach((item) => geoReferences(item, output));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => geoReferences(item, output));
  return output;
}

test("routing profile carries the node-subscription rule sets", () => {
  const profile = renderHappRoutingProfile({
    baseUrl: "https://example.invalid/apple-proxy-profiles/edge",
    generatedAt: "2026-08-20T00:00:00Z",
  });

  assert.equal(profile.Name, "Apple Proxy Profiles HAPP v2");
  assert.deepEqual(profile.DirectSites, [
    "geosite:PRIVATE",
    "geosite:CN",
    "geosite:CATEGORY-GAMES-CN",
    "geosite:STEAM",
    "geosite:BILIBILI",
    "geosite:BYTEDANCE",
    "geosite:XIAOHONGSHU",
    "geosite:CATEGORY-SOCIAL-MEDIA-CN",
    "geosite:APPLE",
    "geosite:MICROSOFT",
    "geosite:CATEGORY-NETDISK-!CN",
    "geosite:CATEGORY-PT",
  ]);
  assert.deepEqual(profile.ProxySites, [
    "geosite:OPENAI",
    "geosite:CATEGORY-AI-!CN",
    "geosite:GOOGLE-GEMINI",
    "geosite:GITHUB-COPILOT",
    "geosite:GITHUB",
    "geosite:YOUTUBE",
    "geosite:NETFLIX",
    "geosite:DISNEY",
    "geosite:SPOTIFY",
    "geosite:CATEGORY-MEDIA",
    "geosite:TELEGRAM",
    "geosite:FACEBOOK",
    "geosite:INSTAGRAM",
    "geosite:TWITTER",
    "geosite:TIKTOK",
    "geosite:CATEGORY-GAMES-!CN",
  ]);
  assert.deepEqual(profile.BlockSites, [
    "geosite:CATEGORY-ADS-ALL",
    "geosite:CATEGORY-HTTPDNS-CN",
  ]);
  assert.deepEqual(profile.DirectIp, [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "169.254.0.0/16",
    "224.0.0.0/4",
    "255.255.255.255",
    "geoip:PRIVATE",
    "geoip:CN",
  ]);
  assert.deepEqual(profile.ProxyIp, []);
  assert.deepEqual(profile.BlockIp, []);

  const deepLink = renderHappRoutingDeepLink(profile);
  const encoded = deepLink.slice("happ://routing/onadd/".length);
  const decoded = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  assert.deepEqual(decoded, profile);
});

test("routing profile retains every GeoData label referenced by HAPP JSON", () => {
  const profile = renderHappRoutingProfile({
    baseUrl: "https://example.invalid/apple-proxy-profiles/edge",
    generatedAt: "2026-08-20T00:00:00Z",
  });
  const configs = renderHappSubscription({
    nodes: [{ name: "TEST_ONLY_Happ", type: "vless", server: "example.test", port: 443, uuid: "TEST_ONLY_UUID", tls: true, sni: "example.test" }],
    options: parseHappOptions({ output: "config", type: "collection", name: "TEST_ONLY_Happ", subscriptionName: "TEST_ONLY_Happ", platform: "macos" }),
  });
  const retained = new Set([
    ...profile.DirectSites, ...profile.ProxySites, ...profile.BlockSites,
    ...profile.DirectIp, ...profile.ProxyIp, ...profile.BlockIp,
  ].filter((value) => /^(?:geoip|geosite):/u.test(value)));
  const missing = [...geoReferences(configs)].filter((value) => !retained.has(value)).sort();
  assert.deepEqual(missing, []);
});
