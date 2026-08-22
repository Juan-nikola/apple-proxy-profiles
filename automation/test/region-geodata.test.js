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
  const input = merged("ir");
  input.provenance.push({ sourceId: "IranOverlay", commit: "a".repeat(40), sha256: "b".repeat(64), license: "MIT" });
  input.diagnostics = { sourceCount: 1, matcherCount: 1 };
  const result = buildRegionGeoDataArtifacts({ merged: input, region: "ir", channel: "current", publicBase: "https://example.test/geodata" });
  assert.equal(result.manifest.hashes.domain, result.manifest.domain.sha256);
  assert.equal(result.manifest.hashes.ip, result.manifest.ip.sha256);
  assert.equal(result.manifest.domain.byteLength, result.geosite.length);
  assert.equal(result.manifest.ip.byteLength, result.geoip.length);
  assert.equal(result.manifest.region, "ir");
  assert.deepEqual(result.manifest.counts, { domainCategories: 2, domainRules: 2, ipCategories: 2, ipRules: 0 });
  for (const source of result.manifest.sources) {
    for (const field of ["id", "code", "domain", "ip", "inputSha256"]) assert.ok(field in source);
  }
  assert.deepEqual(result.manifest.provenance.sources[0], input.provenance[0]);
  assert.deepEqual(result.manifest.provenance.diagnostics, input.diagnostics);
});

test("splits multi-source rule sets into stable source categories", () => {
  const value = merged("cn");
  value.ruleSets.set("Security", { id: "Security", policy: "REJECT", phase: "security", dnsClass: "none", region: "cn", sources: ["Hijacking", "BlockHttpDNS"], entries: [
    { kind: "domainSuffix", value: "bad.example", sourceId: "Hijacking" },
    { kind: "domainSuffix", value: "dns.example", sourceId: "BlockHttpDNS" },
  ] });
  const result = renderRegionGeoData({ ruleSets: value.ruleSets, region: "cn", channel: "edge" });
  const codes = result.manifest.sources.map(({ code }) => code);
  assert.ok(codes.includes("APP-HIJACKING"));
  assert.ok(codes.includes("APP-BLOCKHTTPDNS"));
});

test("rejects unsafe public bases and emits stable public HTTPS URLs", () => {
  const input = { merged: merged("cn"), region: "cn", channel: "current" };
  for (const publicBase of ["http://example.com", "https://user:pass@example.com", "https://example.com/a?x=1", "https://localhost", "https://127.0.0.1", "vmess://node", "https://example.com/../secret", "https://0.1.2.3", "https://100.64.0.1", "https://192.0.2.1", "https://198.18.0.1", "https://203.0.113.1", "https://240.0.0.1", "https://[::1]", "https://[fc00::1]", "https://[fe80::1]", "https://[2001:db8::1]", "https://host.internal", "https://host.invalid"]) {
    assert.throws(() => buildRegionGeoDataArtifacts({ ...input, publicBase }), /publicBase|HTTPS|URL|host|path/u);
  }
  const result = buildRegionGeoDataArtifacts({ ...input, publicBase: "https://cdn.example.com/geodata" });
  assert.equal(result.manifest.urls.domain, "https://cdn.example.com/geodata/cn/AppleProxySiteCurrent.dat");
});
