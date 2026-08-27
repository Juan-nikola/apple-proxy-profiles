import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { parseV2rayNOptions } from "../src/options.js";
import { renderV2rayNProfile } from "../src/render-profile.js";

test("renders a Windows Full Config Template with built-in GeoData fallback", () => {
  const profile = renderV2rayNProfile({ options: parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "windows", region: "cn" }), nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }] });
  assert.equal(profile.inbounds[0].protocol, "tun");
  assert.ok(profile.routing.rules.some(({ domain }) => domain?.includes("geosite:geolocation-!cn")));
  assert.ok(profile.routing.rules.some(({ domain }) => domain?.includes("geosite:cn")));
  assert.ok(profile.routing.rules.some(({ domain }) => domain?.includes("domain:baidupcs.com")));
  assert.deepEqual(profile.outbounds, []);
  assert.equal(profile.routing.rules.at(-1).outboundTag, "proxy");
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

test("renders macOS TUN system routes and protects the Xray uplink", () => {
  const options = parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "macos", region: "cn" });
  const profile = renderV2rayNProfile({
    options,
    nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }],
  });
  const tun = profile.inbounds.find(({ protocol }) => protocol === "tun");
  assert.deepEqual(tun.settings.gateway, ["169.254.10.1/30"]);
  assert.deepEqual(tun.settings.autoSystemRoutingTable, ["0.0.0.0/0", "::/0"]);
  assert.equal(tun.settings.autoOutboundsInterface, "auto");
});

test("does not emit a synthetic GeoData category when Sub-Store omits GeoData", () => {
  const options = parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "macos", region: "cn" });
  const profile = renderV2rayNProfile({
    options,
    nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }],
  });
  const matchers = profile.routing.rules.flatMap((rule) => [...(rule.domain ?? []), ...(rule.ip ?? [])]);
  assert.equal(matchers.some((value) => value.startsWith("ext:")), false);
  assert.equal(matchers.some((value) => value.includes("APP-REGION")), false);
  assert.equal(matchers.some((value) => value.includes("apple-proxy-overseas")), false);
  assert.equal(profile.dns.servers[1].domains.includes("geosite:geolocation-!cn"), true);
});

test("renders a Full Config Template that follows v2rayN's active node", () => {
  const options = parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "macos" });
  const template = renderV2rayNProfile({
    options,
    nodes: [
      { name: "first", type: "vless", server: "first.invalid", port: 443, uuid: "TEST_ONLY_FIRST_UUID" },
      { name: "second", type: "vless", server: "second.invalid", port: 443, uuid: "TEST_ONLY_SECOND_UUID" },
    ],
  });

  assert.deepEqual(template.outbounds, []);
  assert.equal(template.routing.rules.at(-1).outboundTag, "proxy");
});

test("keeps explicitly fixed policy nodes as template outbounds", () => {
  const options = parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "macos" });
  const node = { name: "fixed", type: "vless", server: "fixed.invalid", port: 443, uuid: "TEST_ONLY_FIXED_UUID", _profile: { id: "fixed-id" } };
  const template = renderV2rayNProfile({
    options,
    nodes: [node],
    policyResolution: {
      fixedNodes: [{ nodeId: "fixed-id", node, name: "fixed" }],
      targets: { final: { resolved: "fixed", nodeId: "fixed-id" } },
    },
  });

  assert.deepEqual(template.outbounds.map(({ tag }) => tag), ["ap-fixed-0"]);
  assert.equal(template.routing.rules.at(-1).outboundTag, "ap-fixed-0");
});

function requireHash(value) {
  return createHash("sha256").update(value).digest("hex");
}
