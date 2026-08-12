import assert from "node:assert/strict";
import test from "node:test";

import { buildOneXrayGeoDataArtifacts, renderOneXrayImportPage } from "../src/build-import-page.js";
import { lightweightFixtureSnapshots } from "../../../automation/test/lightweight-fixture.js";

const upstream = Object.freeze({
  repository: "https://github.com/blackmatrix7/ios_rule_script",
  branch: "master",
  commit: "a".repeat(40),
  committedAt: "2026-08-01T19:07:21Z",
  license: "GPL-2.0-only",
});

function build(channel) {
  return buildOneXrayGeoDataArtifacts({
    snapshot: lightweightFixtureSnapshots(),
    upstream,
    channel,
    publicBase: "https://juan-nikola.github.io/apple-proxy-profiles",
  });
}

test("renders distinct channel names, HTTPS assets, encoded OneXray links, and six-platform order", () => {
  const channels = ["current", "previous", "edge"].map(build);
  const names = channels.map(({ manifest }) => manifest.names.domain);
  assert.deepEqual(names, [
    "AppleProxySiteCurrent",
    "AppleProxySitePrevious",
    "AppleProxySiteEdge",
  ]);
  assert.equal(new Set(names).size, 3);

  const page = renderOneXrayImportPage(channels[2]);
  assert.match(page, /Apple Proxy GeoData · Edge/u);
  assert.match(page, /https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles\/edge\/onexray\/geodata\/geosite\.dat/u);
  assert.match(page, /onexray:\/\/onexray\.com\/dat\/add\?type=domain&amp;url=https%3A%2F%2Fjuan-nikola\.github\.io%2Fapple-proxy-profiles%2Fedge%2Fonexray%2Fgeodata%2Fgeosite\.dat#AppleProxySiteEdge/u);
  assert.match(page, /onexray:\/\/onexray\.com\/dat\/add\?type=ip&amp;url=/u);
  assert.match(page, /#AppleProxySiteEdge/u);
  for (const platform of ["macOS", "iPhone", "iPad", "Android", "Windows", "Linux"]) {
    assert.ok(page.includes(platform), platform);
  }
  assert.ok(page.indexOf("macOS") < page.indexOf("iPhone"));
  assert.ok(page.indexOf("iPhone") < page.indexOf("iPad"));
  assert.ok(page.indexOf("iPad") < page.indexOf("Android"));
  assert.ok(page.indexOf("Android") < page.indexOf("Windows"));
  assert.ok(page.indexOf("Windows") < page.indexOf("Linux"));
});

test("publishes manifest hashes, counts, schema and upstream version without private input paths", () => {
  const result = build("current");
  const page = renderOneXrayImportPage(result);
  assert.match(page, /apple-proxy-onexray-geodata-v1/u);
  assert.match(page, /domainRules/u);
  assert.match(page, /ipRules/u);
  assert.match(page, new RegExp(upstream.commit, "u"));
  assert.match(page, new RegExp(result.manifest.hashes.domain, "u"));
  assert.match(page, new RegExp(result.manifest.hashes.ip, "u"));
  assert.equal(page.includes("<script"), false);
  assert.equal(page.includes("<form"), false);
  assert.equal(page.includes("<input"), false);
  assert.equal(page.includes("localStorage"), false);
  assert.equal(page.includes("navigator.clipboard"), false);
  assert.equal(page.includes("fetch("), false);
  assert.equal(page.includes("XMLHttpRequest"), false);
  assert.equal(page.includes("profile/add"), false);
  assert.equal(page.includes("subscription"), true);
  assert.match(page, /Profile.*私有|私有.*Profile/u);
  assert.match(page, /不会创建 Profile/u);
  assert.doesNotMatch(page, /node(?:s)?\s*[:：]/iu);
  assert.doesNotMatch(page, /fixed\s+target/iu);
});

test("marks edge as canary-only and makes rollback dependencies explicit for current and previous", () => {
  const edge = renderOneXrayImportPage(build("edge"));
  const current = renderOneXrayImportPage(build("current"));
  const previous = renderOneXrayImportPage(build("previous"));
  assert.match(edge, /canary|候选|灰度/u);
  assert.match(edge, /不得作为 current|不可直接作为 current|仅.*edge/u);
  assert.match(current, /current|稳定/u);
  assert.match(previous, /previous|回滚/u);
  assert.match(previous, /current.*previous|previous.*current/u);
  assert.match(current, /[Ee]dge.*promotion|promotion.*[Ee]dge|晋级/u);
});

test("rejects non-HTTPS bases and malformed public manifests before rendering", () => {
  assert.throws(
    () => buildOneXrayGeoDataArtifacts({
      snapshot: lightweightFixtureSnapshots(),
      upstream,
      channel: "edge",
      publicBase: "http://example.invalid",
    }),
    /HTTPS/u,
  );
  assert.throws(
    () => renderOneXrayImportPage({
      channel: "edge",
      publicBase: "https://example.invalid",
      manifest: { schema: "bad" },
      assets: new Map(),
    }),
    /manifest|assets/u,
  );
  const valid = build("edge");
  assert.throws(
    () => renderOneXrayImportPage({
      manifest: valid.manifest,
      publicBase: valid.publicBase,
      assets: {
        ...valid.assets,
        domain: "https://attacker.example.invalid/geosite.dat",
      },
    }),
    /asset URLs|public channel/u,
  );
});
