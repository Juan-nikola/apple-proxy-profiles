import assert from "node:assert/strict";
import test from "node:test";

import { validateSingBoxConfig } from "../src/validate-config.js";

function validConfig() {
  return {
    dns: {
      servers: [{ type: "https", tag: "dns-proxy", server: "https://1.1.1.1/dns-query" }],
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
