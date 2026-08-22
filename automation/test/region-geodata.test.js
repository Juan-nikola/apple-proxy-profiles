import assert from "node:assert/strict";
import test from "node:test";
import { buildRegionGeoDataArtifacts, renderRegionGeoData } from "../src/render-region-geodata.js";
import { decodeXrayGeoData } from "../src/render-xray-geodata.js";

function merged(region) {
  const ruleSets = new Map([["DomesticCore", { id: "DomesticCore", policy: "DIRECT", phase: "earlyDomestic", dnsClass: "china", region, sources: ["DomesticCore"], entries: [{ kind: "domainSuffix", value: "cn", sourceId: "DomesticCore" }] }]]);
  if (region === "ru") ruleSets.set("RussiaOverlay", { id: "RussiaOverlay", policy: "PROXY", phase: "serviceIntent", dnsClass: "proxy", region, sources: ["russia-v2ray-rules"], entries: [{ kind: "domainSuffix", value: "ru", sourceId: "russia-v2ray-rules" }] });
  if (region === "ir") ruleSets.set("IranOverlay", { id: "IranOverlay", policy: "PROXY", phase: "serviceIntent", dnsClass: "proxy", region, sources: ["iran-v2ray-rules"], entries: [{ kind: "domainSuffix", value: "ir", sourceId: "iran-v2ray-rules" }] });
  return { ruleSets, provenance: [], diagnostics: {} };
}

test("renders deterministic region GeoData and excludes unrelated overlays", () => {
  const cn = renderRegionGeoData({ ruleSets: merged("cn").ruleSets, region: "cn", channel: "edge" });
  const global = renderRegionGeoData({ ruleSets: merged("global").ruleSets, region: "global", channel: "edge" });
  const ru = renderRegionGeoData({ ruleSets: merged("ru").ruleSets, region: "ru", channel: "edge" });
  const ir = renderRegionGeoData({ ruleSets: merged("ir").ruleSets, region: "ir", channel: "edge" });
  assert.deepEqual(cn.geosite, renderRegionGeoData({ ruleSets: merged("cn").ruleSets, region: "cn", channel: "edge" }).geosite);
  assert.deepEqual(decodeXrayGeoData(cn.geosite, "domain").entries.map(({ code }) => code), ["APP-DOMESTICCORE"]);
  assert.ok(decodeXrayGeoData(ru.geosite, "domain").entries.some(({ code }) => code === "APP-RUSSIA-V2RAY-RULES"));
  assert.ok(decodeXrayGeoData(ir.geosite, "domain").entries.some(({ code }) => code === "APP-IRAN-V2RAY-RULES"));
  assert.equal(decodeXrayGeoData(global.geosite, "domain").entries.some(({ code }) => code.includes("RUSSIA") || code.includes("IRAN")), false);
  assert.equal(decodeXrayGeoData(cn.geosite, "domain").entries.some(({ code }) => code.includes("RUSSIA") || code.includes("IRAN")), false);
});

test("builds a manifest whose hashes close over exact buffers", () => {
  const result = buildRegionGeoDataArtifacts({ merged: merged("ir"), region: "ir", channel: "current", publicBase: "https://example.test/geodata" });
  assert.equal(result.manifest.hashes.domain, result.manifest.domain.sha256);
  assert.equal(result.manifest.hashes.ip, result.manifest.ip.sha256);
  assert.equal(result.manifest.domain.byteLength, result.geosite.length);
  assert.equal(result.manifest.ip.byteLength, result.geoip.length);
  assert.equal(result.manifest.region, "ir");
});
