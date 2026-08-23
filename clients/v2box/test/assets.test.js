import assert from "node:assert/strict";
import test from "node:test";
import { renderV2BoxAssetManifest } from "../src/render-assets.js";

test("renders stable mobile GeoData asset manifest", () => {
  const hash = "a".repeat(64);
  const manifest = renderV2BoxAssetManifest({ region: "cn", channel: "current", geositeSha256: hash, geoipSha256: "b".repeat(64) });
  assert.equal(manifest.geosite.url, "https://juan-nikola.github.io/apple-proxy-profiles/current/geodata/cn/AppleProxySiteCurrent.dat");
  assert.equal(manifest.geoip.sha256, "b".repeat(64));
});

test("rejects unsafe or incomplete asset manifests", () => {
  assert.throws(() => renderV2BoxAssetManifest({ region: "windows", channel: "current", geositeSha256: "a".repeat(64), geoipSha256: "b".repeat(64) }), /region/u);
  assert.throws(() => renderV2BoxAssetManifest({ region: "cn", channel: "current", geositeSha256: "bad", geoipSha256: "b".repeat(64) }), /hash/u);
  for (const publicBase of [
    `https://user${"%3A"}pass@juan-nikola.github.io/apple-proxy-profiles`,
    "https://juan-nikola.github.io:443/apple-proxy-profiles",
    "https://evil.example/apple-proxy-profiles",
    "https://localhost/apple-proxy-profiles",
    "https://x.local/apple-proxy-profiles",
    "https://192.168.1.1/apple-proxy-profiles",
    "https://100.64.0.1/apple-proxy-profiles",
    "https://[::1]/apple-proxy-profiles",
    "https://[2001:db8::1]/apple-proxy-profiles",
    "https://juan-nikola.github.io/apple-proxy-profiles?x=1",
    "https://juan-nikola.github.io/apple-proxy-profiles/../x",
  ]) {
    assert.throws(() => renderV2BoxAssetManifest({ region: "cn", channel: "current", publicBase, geositeSha256: "a".repeat(64), geoipSha256: "b".repeat(64) }), /publicBase/u);
  }
});
