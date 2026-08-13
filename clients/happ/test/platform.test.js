import assert from "node:assert/strict";
import test from "node:test";

import {
  HAPP_INBOUND_PORTS,
  HAPP_INBOUND_TAGS,
  renderHappInbounds,
} from "../src/render-platform.js";

const PLATFORMS = ["macos", "iphone", "ipad", "android", "windows", "linux"];

test("renders a deterministic loopback SOCKS and HTTP adapter for every supported Happ platform", () => {
  for (const platform of PLATFORMS) {
    assert.deepEqual(renderHappInbounds(platform), [
      {
        tag: "happ-in-socks",
        listen: "127.0.0.1",
        port: 10808,
        protocol: "socks",
        settings: { auth: "noauth", udp: true },
        sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], routeOnly: true },
      },
      {
        tag: "happ-in-http",
        listen: "127.0.0.1",
        port: 10809,
        protocol: "http",
        settings: { allowTransparent: false },
        sniffing: { enabled: true, destOverride: ["http", "tls", "quic"], routeOnly: true },
      },
    ], platform);
  }
});

test("keeps platform selection confined to the local adapter boundary", () => {
  const reference = renderHappInbounds("macos");
  for (const platform of PLATFORMS.slice(1)) assert.deepEqual(renderHappInbounds(platform), reference, platform);
  assert.deepEqual(HAPP_INBOUND_TAGS, { socks: "happ-in-socks", http: "happ-in-http" });
  assert.deepEqual(HAPP_INBOUND_PORTS, { socks: 10808, http: 10809 });
  assert.equal(new Set(Object.values(HAPP_INBOUND_TAGS)).size, 2);
  assert.equal(new Set(Object.values(HAPP_INBOUND_PORTS)).size, 2);
});

test("rejects non-Happ platforms rather than widening the adapter boundary", () => {
  for (const platform of ["all", "openwrt", "", null]) {
    assert.throws(() => renderHappInbounds(platform), /platform/u);
  }
});
