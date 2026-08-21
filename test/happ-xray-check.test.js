import assert from "node:assert/strict";
import test from "node:test";

import { assertGeoDataClosure, collectGeoDataReferences, xrayEnvironment } from "../scripts/check-happ-xray.mjs";

test("HAPP Xray checker points the core at its temporary GeoData directory", () => {
  const environment = xrayEnvironment("/tmp/happ-xray-check", { KEEP_ME: "1" });
  assert.equal(environment["xray.location.asset"], "/tmp/happ-xray-check");
  assert.equal(environment.KEEP_ME, "1");
});

test("HAPP Xray checker collects nested GeoData references", () => {
  assert.deepEqual(
    [...collectGeoDataReferences({ dns: { domains: ["geosite:CN", "geoip:PRIVATE"] }, nested: [{ value: "geosite:OPENAI" }] })].sort(),
    ["geoip:PRIVATE", "geosite:CN", "geosite:OPENAI"],
  );
});

test("HAPP Xray checker rejects a profile that would trim a JSON GeoData label", () => {
  assert.throws(() => assertGeoDataClosure({
    configs: [{ routing: { rules: [{ ip: ["geoip:PRIVATE"] }] } }],
    profile: { DirectSites: [], ProxySites: [], BlockSites: [], DirectIp: [], ProxyIp: [], BlockIp: [] },
    geositeCodes: new Set(),
    geoipCodes: new Set(["PRIVATE"]),
  }), /geoip:PRIVATE/u);
});

test("HAPP Xray checker accepts the current profile label closure", () => {
  assert.doesNotThrow(() => assertGeoDataClosure({
    configs: [{ routing: { rules: [{ ip: ["geoip:PRIVATE"], domain: ["geosite:CN"] }] } }],
    profile: { DirectSites: ["geosite:CN"], ProxySites: [], BlockSites: [], DirectIp: ["geoip:PRIVATE"], ProxyIp: [], BlockIp: [] },
    geositeCodes: new Set(["CN"]),
    geoipCodes: new Set(["PRIVATE"]),
  }));
});
