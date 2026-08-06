import assert from "node:assert/strict";
import test from "node:test";

import { validateSingBoxConfig } from "../src/validate-config.js";

function validConfig() {
  return {
    dns: {
      servers: [{
        type: "https",
        tag: "dns-proxy",
        server: "1.1.1.1",
        server_port: 443,
        path: "/dns-query",
        tls: { server_name: "cloudflare-dns.com" },
      }],
      final: "dns-proxy",
      rules: [],
    },
    inbounds: [{ type: "tun", tag: "tun-in", address: ["172.18.0.1/30"], auto_route: true }],
    outbounds: [
      { type: "direct", tag: "DIRECT" },
      { type: "block", tag: "REJECT" },
      { type: "selector", tag: "🚀 节点选择", outbounds: ["DIRECT"] },
    ],
    route: { rules: [], final: "🚀 节点选择" },
  };
}

test("rejects route references to missing outbound or rule-set tags", () => {
  const config = validConfig();
  config.route.rules = [{ rule_set: ["missing-rule"], action: { action: "route", outbound: "missing-outbound" } }];
  const result = validateSingBoxConfig(config);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /missing.*tag/iu);
});

test("rejects DNS server loops and missing platform gateway safeguards", () => {
  const config = validConfig();
  config.dns.servers[0].detour = "🚀 节点选择";
  config.dns.final = "missing-dns";
  config.inbounds[0].auto_redirect = false;
  const result = validateSingBoxConfig(config);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /DNS|OpenWrt|missing/iu);
});

test("rejects duplicate outbound tags", () => {
  const config = validConfig();
  config.outbounds.push({ type: "direct", tag: "DIRECT" });
  const result = validateSingBoxConfig(config);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /duplicate.*tag/iu);
});

test("rejects URL-shaped structured HTTPS DNS servers", () => {
  const withScheme = validConfig();
  withScheme.dns.servers[0].server = "https://1.1.1.1/dns-query";
  let result = validateSingBoxConfig(withScheme);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /HTTPS DNS server|server.*host/iu);

  const withPath = validConfig();
  withPath.dns.servers[0].server = "1.1.1.1/dns-query";
  result = validateSingBoxConfig(withPath);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /HTTPS DNS server|server.*host/iu);

  const withoutSlash = validConfig();
  withoutSlash.dns.servers[0].path = "dns-query";
  result = validateSingBoxConfig(withoutSlash);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /HTTPS DNS path/iu);
});

test("requires the latest flat DNS rule action shape", () => {
  const legacy = validConfig();
  legacy.dns.rules = [{ action: { action: "route", server: "dns-proxy" } }];
  const legacyResult = validateSingBoxConfig(legacy);
  assert.equal(legacyResult.valid, false);
  assert.match(legacyResult.errors.join("\n"), /DNS rule action/iu);

  const current = validConfig();
  current.dns.rules = [{ action: "route", server: "dns-proxy" }];
  assert.deepEqual(validateSingBoxConfig(current), { valid: true, errors: [] });
});

test("rejects removed fields and unresolved HTTP client references", () => {
  const config = validConfig();
  config.http_clients = [{ tag: "🧭 规则下载 HTTP", version: 2, detour: "DIRECT" }];
  config.route.default_http_client = "🧭 规则下载 HTTP";
  config.route.rule_set = [{
    type: "remote",
    tag: "rule-ChinaMax",
    format: "source",
    url: "https://example.invalid/rules/ChinaMax.json",
    http_client: "🧭 规则下载 HTTP",
  }];

  config.route.rules.push({ geoip: ["cn"], action: "route", outbound: "DIRECT" });
  let result = validateSingBoxConfig(config);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /geoip/iu);

  config.route.rules.pop();
  config.route.rule_set[0].download_detour = "DIRECT";
  result = validateSingBoxConfig(config);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /download_detour/iu);

  delete config.route.rule_set[0].download_detour;
  config.experimental = { cache_file: { enabled: true, store_rdrc: true } };
  result = validateSingBoxConfig(config);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /store_rdrc/iu);

  delete config.experimental.cache_file.store_rdrc;
  config.route.default_http_client = "missing-http-client";
  result = validateSingBoxConfig(config);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /HTTP client/iu);
});
