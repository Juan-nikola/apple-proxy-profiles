import assert from "node:assert/strict";
import test from "node:test";

import { operator as configOperator } from "../src/substore-config-entry.js";
import { operator as auditOperator } from "../src/substore-audit-entry.js";

const nodes = [
  { name: "TEST_ONLY_Happ", type: "vless", server: "example.test", port: 443, uuid: "TEST_ONLY_UUID", tls: true, sni: "example.test" },
  { name: "TEST_ONLY_Happ_2", type: "trojan", server: "example.test", port: 443, password: "TEST_ONLY_PASSWORD", tls: true, sni: "example.test" },
  { name: "TEST_ONLY_Snell", type: "snell", server: "example.test", port: 443, psk: "TEST_ONLY_PSK", version: 4 },
];
const POLICY = JSON.stringify({ schemaVersion: 2, targets: {} });

function context(argumentsValue, requestOptions) {
  return {
    arguments: argumentsValue,
    produceArtifact: async (request) => request.type === "file" ? { $content: POLICY } : nodes,
    requestOptions,
  };
}

test("HAPP Sub-Store config entry filters incompatible nodes and emits an Xray JSON array", async () => {
  const result = await configOperator({}, "JSON", context({
    output: "config",
    type: "collection",
    name: "TEST_ONLY_Happ_Collection",
    subscriptionName: "TEST_ONLY_Happ_Subscription",
    platform: "macos",
  }));
  const configs = JSON.parse(result.$content);
  assert.equal(configs.length, 2);
  assert.deepEqual(configs.map(({ remarks }) => remarks).sort(), ["🌐 TEST_ONLY_Happ · VLESS", "🌐 TEST_ONLY_Happ_2 · Trojan"].sort());
  assert.ok(configs.every((config) => config.outbounds.every((outbound) => outbound.tag !== "TEST_ONLY_Snell")));
});

test("HAPP audit entry emits only redacted counts and routing status", async () => {
  const result = await auditOperator({}, "JSON", context({
    output: "audit",
    type: "collection",
    name: "TEST_ONLY_Happ_Collection",
    subscriptionName: "TEST_ONLY_Happ_Subscription",
    platform: "all",
  }));
  const audit = JSON.parse(result.$content);
  assert.equal(audit.client, "happ");
  assert.equal(audit.counts.eligibleNodes, 2);
  assert.doesNotMatch(result.$content, /TEST_ONLY_PASSWORD|TEST_ONLY_UUID|example\.test/);
});

test("HAPP JSON file output binds the latest routing profile through response headers", async () => {
  const requestOptions = { _res: { headers: { "X-Test": "keep" } } };
  const result = await configOperator({ $options: requestOptions }, "JSON", context({
    output: "config",
    type: "collection",
    name: "TEST_ONLY_Happ_Collection",
    subscriptionName: "TEST_ONLY_Happ_Subscription",
    platform: "iphone",
  }, requestOptions));
  const routing = requestOptions._res.headers.routing;
  assert.match(routing, /^happ:\/\/routing\/onadd\/[A-Za-z0-9+/=]+$/u);
  assert.equal(requestOptions._res.headers["X-Test"], "keep");
  const encoded = routing.slice("happ://routing/onadd/".length);
  const profile = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  assert.equal(requestOptions._res.headers["content-type"], "application/json; charset=utf-8");
  assert.equal(requestOptions._res.headers["content-disposition"], 'attachment; filename="happ-iphone.json"');
  assert.equal(requestOptions._res.headers["no-limit-enabled"], "1");
  assert.equal(requestOptions._res.headers["routing-enable"], "1");
  assert.equal(requestOptions._res.headers["sniffing-enable"], "1");
  assert.equal(profile.Geositeurl, "https://juan-nikola.github.io/apple-proxy-profiles/current/happ/geosite.dat");
  assert.equal(profile.Geoipurl, "https://juan-nikola.github.io/apple-proxy-profiles/current/happ/geoip.dat");
  assert.ok(profile.DirectSites.includes("geosite:CN"));
  assert.ok(profile.ProxySites.includes("geosite:OPENAI"));
  assert.equal(JSON.parse(result.$content)[0].meta.platform, "iphone");
});

test("HAPP Preview without request options still emits JSON", async () => {
  const result = await configOperator({}, "JSON", context({
    output: "config",
    type: "collection",
    name: "TEST_ONLY_Happ_Collection",
    subscriptionName: "TEST_ONLY_Happ_Subscription",
    platform: "iphone",
  }));
  assert.equal(Array.isArray(JSON.parse(result.$content)), true);
});

test("HAPP JSON binds the same routing profile on the supported Apple platforms", async () => {
  for (const platform of ["macos", "iphone", "ipad"]) {
    const requestOptions = { _res: { headers: {} } };
    await configOperator({ $options: requestOptions }, "JSON", context({
      output: "config",
      type: "collection",
      name: "TEST_ONLY_Happ_Collection",
      subscriptionName: "TEST_ONLY_Happ_Subscription",
      platform,
    }, requestOptions));
    const routing = requestOptions._res.headers.routing;
    assert.match(routing, /^happ:\/\/routing\/onadd\/[A-Za-z0-9+/=]+$/u, platform);
    const encoded = routing.slice("happ://routing/onadd/".length);
    const profile = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    assert.equal(profile.Geoipurl, "https://juan-nikola.github.io/apple-proxy-profiles/current/happ/geoip.dat", platform);
    assert.ok(profile.DirectIp.includes("geoip:PRIVATE"), platform);
  }
});

test("HAPP macOS subscriptions request automatic desktop Proxy mode", async () => {
  const macosOptions = { _res: { headers: {} } };
  await configOperator({}, "JSON", context({
    output: "config",
    type: "collection",
    name: "TEST_ONLY_Happ_Collection",
    subscriptionName: "TEST_ONLY_Happ_Subscription",
    platform: "macos",
  }, macosOptions));
  assert.equal(macosOptions._res.headers["proxy-enable"], "1");
  assert.equal(macosOptions._res.headers["tun-enable"], undefined);

  for (const platform of ["iphone", "ipad"]) {
    const mobileOptions = { _res: { headers: {} } };
    await configOperator({}, "JSON", context({
      output: "config",
      type: "collection",
      name: "TEST_ONLY_Happ_Collection",
      subscriptionName: "TEST_ONLY_Happ_Subscription",
      platform,
    }, mobileOptions));
    assert.equal(mobileOptions._res.headers["proxy-enable"], undefined, platform);
    assert.equal(mobileOptions._res.headers["tun-enable"], undefined, platform);
  }
});
