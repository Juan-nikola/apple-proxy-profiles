import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { parseV2rayNOptions } from "../src/options.js";
import { renderV2rayNProfile } from "../src/render-profile.js";
import { sourcesForRegion } from "../../../shared/rules/region-profiles.js";

test("renders importable macOS profile without requiring TUN privileges", () => {
  const options = parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "macos", region: "cn", channel: "current" });
  const profile = renderV2rayNProfile({ options, nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }] });
  assert.deepEqual(profile.inbounds[0], {
    tag: "socks-in",
    listen: "127.0.0.1",
    port: 10808,
    protocol: "socks",
    settings: { auth: "noauth", udp: true },
    sniffing: { enabled: true, destOverride: ["http", "tls"], routeOnly: true },
  });
  assert.equal(profile.outbounds.some(({ protocol }) => protocol === "selector"), false);
  assert.equal(profile.dns.servers[1].domains, undefined);
  assert.ok(profile.routing.rules.some(({ domain }) => domain?.some((value) => value.includes("cn"))));
  assert.equal(profile.routing.rules.at(-1).outboundTag, "ap-node-0");
  const matchers = profile.routing.rules.flatMap((rule) => [...(rule.domain ?? []), ...(rule.ip ?? [])]);
  assert.ok(matchers.includes("ext:AppleProxySiteCurrent.dat:APP-DOMESTICCORE"));
  assert.ok(matchers.includes("ext:AppleProxySiteCurrent.dat:APP-LOYALSOLDIER-RULES-DAT"));
  assert.equal(matchers.some((value) => value.includes("APP-REGION-CN")), false);
  assert.deepEqual(
    profile.routing.rules.filter(({ ruleTag }) => ruleTag?.startsWith("source-")).map(({ ruleTag }) => ruleTag.slice(7)),
    sourcesForRegion("cn"),
  );
  assert.equal(
    profile.routing.rules.filter(({ ruleTag }) => ruleTag === "source-OpenAI")[0].outboundTag,
    "ap-node-0",
  );
});

test("uses legal external GeoData references and validates exact assets", () => {
  const options = parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "macos", region: "cn", channel: "current" });
  const domain = Buffer.from("domain-fixture");
  const ip = Buffer.from("ip-fixture");
  const manifest = {
    schemaVersion: 1, region: "cn", channel: "current",
    names: { domain: "AppleProxySiteCurrent", ip: "AppleProxyIPCurrent" },
    hashes: { domain: requireHash(domain), ip: requireHash(ip) },
    domain: { name: "AppleProxySiteCurrent", byteLength: domain.length, sha256: requireHash(domain) },
    ip: { name: "AppleProxyIPCurrent", byteLength: ip.length, sha256: requireHash(ip) },
    sources: [{ id: "DomesticCore", code: "APP-DOMESTICCORE" }],
    sourceCodes: [{ id: "DomesticCore", code: "APP-DOMESTICCORE" }],
  };
  const profile = renderV2rayNProfile({ options, nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }], geoData: { geosite: domain, geoip: ip, manifest } });
  const matchers = profile.routing.rules.flatMap((rule) => [...(rule.domain ?? []), ...(rule.ip ?? [])]);
  assert.ok(matchers.includes("ext:AppleProxySiteCurrent.dat:APP-DOMESTICCORE"));
  assert.equal(matchers.some((value) => value.includes("geodata/") || value.startsWith("http")), false);
  assert.throws(() => renderV2rayNProfile({ options, nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }], geoData: { geosite: Buffer.from("changed"), geoip: ip, manifest } }), /hash|byteLength/u);
});

function requireHash(value) {
  return createHash("sha256").update(value).digest("hex");
}
