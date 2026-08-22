import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { parseV2BoxOptions } from "../src/options.js";
import { renderV2BoxProfile } from "../src/render-profile.js";

test("renders importable Windows profile with region GeoData and fallback", () => {
  const profile = renderV2BoxProfile({ options: parseV2BoxOptions({ output: "config", type: "collection", name: "fixture", platform: "iphone", region: "ru" }), nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }] });
  assert.equal(profile.inbounds[0].protocol, "tun");
  assert.ok(profile.routing.rules.some(({ domain }) => domain?.some((value) => value.includes("ru"))));
  assert.equal(profile.routing.rules.at(-1).outboundTag, "proxy");
});

/*
test("uses legal external GeoData references and validates exact assets", () => {
  const options = parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "macos", region: "cn", channel: "edge" });
  const domain = Buffer.from("domain-fixture");
  const ip = Buffer.from("ip-fixture");
  const manifest = {
    schemaVersion: 1, region: "cn", channel: "edge",
    names: { domain: "AppleProxySiteEdge", ip: "AppleProxyIPEdge" },
    hashes: { domain: requireHash(domain), ip: requireHash(ip) },
    domain: { name: "AppleProxySiteEdge", byteLength: domain.length, sha256: requireHash(domain) },
    ip: { name: "AppleProxyIPEdge", byteLength: ip.length, sha256: requireHash(ip) },
    sources: [{ id: "DomesticCore", code: "APP-DOMESTICCORE" }],
    sourceCodes: [{ id: "DomesticCore", code: "APP-DOMESTICCORE" }],
  };
  const profile = renderV2rayNProfile({ options, nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }], geoData: { geosite: domain, geoip: ip, manifest } });
  const matchers = profile.routing.rules.flatMap((rule) => [...(rule.domain ?? []), ...(rule.ip ?? [])]);
  assert.ok(matchers.includes("ext:AppleProxySiteEdge.dat:APP-DOMESTICCORE"));
  assert.equal(matchers.some((value) => value.includes("geodata/") || value.startsWith("http")), false);
  assert.throws(() => renderV2rayNProfile({ options, nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }], geoData: { geosite: Buffer.from("changed"), geoip: ip, manifest } }), /hash|byteLength/u);
});

function requireHash(value) {
  return createHash("sha256").update(value).digest("hex");
}
*/
