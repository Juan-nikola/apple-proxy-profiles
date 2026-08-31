import assert from "node:assert/strict";
import test from "node:test";
import { parseV2BoxOptions } from "../src/options.js";
import { renderV2BoxProfile } from "../src/render-profile.js";
import { renderV2BoxAssetManifest } from "../src/render-assets.js";
import { parsePrivatePolicy } from "../../../shared/policies/private-policy.js";
import { resolveUnifiedPolicy } from "../../../shared/policies/resolve-unified.js";

test("renders importable iPhone profile with inline fallback", () => {
  const profile = renderV2BoxProfile({ options: parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", region: "ru" }), nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }] });
  assert.equal(profile.inbounds[0].protocol, "tun");
  assert.equal(Object.hasOwn(profile.outbounds.find(({ tag }) => tag === "ap-node-0"), "name"), false);
  assert.ok(profile.routing.rules.some(({ domain }) => domain?.some((value) => value.includes("ru"))));
  assert.ok(profile.routing.rules.some(({ domain }) => domain?.includes("domain:baidupcs.com")));
  assert.equal(profile.routing.rules.at(-1).outboundTag, "proxy");
});

test("applies final DIRECT and fixed-node policies to the V2Box catch-all", () => {
  const options = parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", region: "cn" });
  const fixed = { name: "TEST_ONLY_Fixed", type: "vless", server: "fixed.invalid", port: 443, uuid: "TEST_ONLY_FIXED_UUID", _profile: { id: "fixed-v2box" } };
  const follow = { name: "TEST_ONLY_Follow", type: "vless", server: "follow.invalid", port: 443, uuid: "TEST_ONLY_FOLLOW_UUID", _profile: { id: "follow-v2box" } };
  const directPolicy = parsePrivatePolicy(JSON.stringify({ schemaVersion: 2, targets: { final: "DIRECT" } }));
  const directResolution = resolveUnifiedPolicy({ policy: directPolicy, client: "v2box", allNodes: [fixed, follow], eligibleNodes: [fixed, follow] });
  const directProfile = renderV2BoxProfile({ nodes: [fixed, follow], options, policyResolution: directResolution });
  assert.equal(directProfile.routing.rules.at(-1).outboundTag, "direct");

  const fixedPolicy = parsePrivatePolicy(JSON.stringify({ schemaVersion: 2, targets: { final: "NODE~TEST_ONLY_Fixed" } }));
  const fixedResolution = resolveUnifiedPolicy({ policy: fixedPolicy, client: "v2box", allNodes: [fixed, follow], eligibleNodes: [fixed, follow] });
  const fixedProfile = renderV2BoxProfile({ nodes: [fixed, follow], options, policyResolution: fixedResolution });
  assert.equal(fixedProfile.routing.rules.at(-1).outboundTag, "ap-node-0");
});

test("uses published GeoData assets and routes AI when Sub-Store omits asset context", () => {
  const options = parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", region: "cn", channel: "current" });
  const fixed = { name: "🇺🇸qqpw家宽", type: "vless", server: "fixed.invalid", port: 443, uuid: "TEST_ONLY_FIXED_UUID", _profile: { id: "fixed-v2box" } };
  const policy = parsePrivatePolicy(JSON.stringify({ schemaVersion: 2, targets: { "🤖 AI 专用": "NODE~🇺🇸qqpw家宽|vless" } }));
  const resolution = resolveUnifiedPolicy({ policy, client: "v2box", allNodes: [fixed], eligibleNodes: [fixed] });
  const profile = renderV2BoxProfile({ options, nodes: [fixed], policyResolution: resolution });
  assert.equal(profile.assets.geosite.url, "https://juan-nikola.github.io/apple-proxy-profiles/current/geodata/cn/AppleProxySiteCurrent.dat");
  assert.equal(profile.assets.geoip.url, "https://juan-nikola.github.io/apple-proxy-profiles/current/geodata/cn/AppleProxyIPCurrent.dat");
  assert.equal(profile.routing.rules.find(({ ruleTag }) => ruleTag === "source-OpenAI").outboundTag, "ap-node-0");
});

test("binds asset-backed profile URLs to region and channel", () => {
  const options = parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "ipad", region: "ru", channel: "current" });
  const assets = renderV2BoxAssetManifest({ region: "ru", channel: "current", geositeSha256: "a".repeat(64), geoipSha256: "b".repeat(64) });
  const profile = renderV2BoxProfile({ options, nodes: [], assetManifest: assets });
  assert.equal(profile.assets.geosite.url.includes("/current/geodata/ru/"), true);
  assert.throws(() => renderV2BoxProfile({ options, nodes: [], assetManifest: { ...assets, region: "cn" } }), /region|channel|names/u);
});

test("rejects asset URLs that leave the trusted channel and origin", () => {
  const options = parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", region: "cn", channel: "current" });
  const assets = renderV2BoxAssetManifest({ region: "cn", channel: "current", geositeSha256: "a".repeat(64), geoipSha256: "b".repeat(64) });
  for (const url of [
    assets.geosite.url.replace("/current/", "/previous/"),
    assets.geosite.url.replace("juan-nikola.github.io", "evil.example"),
    assets.geosite.url.replace("https://", "https://user:pass@"),
    "https://100.64.0.1/apple-proxy-profiles/current/geodata/cn/AppleProxySiteCurrent.dat",
  ]) {
    assert.throws(() => renderV2BoxProfile({ options, nodes: [], assetManifest: { ...assets, geosite: { ...assets.geosite, url } } }), /asset URL|origin|channel|unbound/u);
  }
});
