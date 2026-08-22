import assert from "node:assert/strict";
import test from "node:test";
import { parseV2rayNOptions } from "../src/options.js";
import { renderV2rayNProfile } from "../src/render-profile.js";

test("renders importable Windows profile with region GeoData and fallback", () => {
  const profile = renderV2rayNProfile({ options: parseV2rayNOptions({ output: "config", type: "collection", name: "fixture", platform: "windows", region: "ru" }), nodes: [{ name: "fixture", type: "vless", server: "fixture.invalid", port: 443, uuid: "TEST_ONLY_UUID" }] });
  assert.equal(profile.inbounds[0].protocol, "tun");
  assert.ok(profile.routing.rules.some(({ domain }) => domain?.some((value) => value.includes("ru"))));
  assert.equal(profile.routing.rules.at(-1).outboundTag, "proxy");
});
