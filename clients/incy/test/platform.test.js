import assert from "node:assert/strict";
import test from "node:test";

import { INCY_PLATFORMS, incyPlatformPreset, renderIncyInbounds } from "../src/render-platform.js";

test("renders stable local inbounds for every platform", () => {
  for (const platform of INCY_PLATFORMS) {
    const ports = renderIncyInbounds(platform).map(({ port }) => port);
    assert.deepEqual(ports, [10808, 10809]);
  }
});

test("returns a frozen platform preset for androidtv", () => {
  const preset = incyPlatformPreset("androidtv");

  assert.equal(preset.ipv6Mode, "ipv4-only");
  assert.equal(preset.resourceProfile, "tv");
  assert.equal(typeof preset.testInterval, "number");
  assert.equal(typeof preset.timeout, "number");
  assert.equal(typeof preset.tolerance, "number");
  assert.equal(Object.isFrozen(preset), true);
});
