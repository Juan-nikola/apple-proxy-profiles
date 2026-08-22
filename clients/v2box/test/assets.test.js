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
  for (const publicBase of [`https://user${"%3A"}pass@example.com`, "https://example.com:443", "https://localhost", "https://x.local", "https://192.168.1.1", "https://example.com/rules?x=1", "https://example.com/rules/../x"]) {
    assert.throws(() => renderV2BoxAssetManifest({ region: "cn", channel: "current", publicBase, geositeSha256: "a".repeat(64), geoipSha256: "b".repeat(64) }), /publicBase/u);
  }
});
