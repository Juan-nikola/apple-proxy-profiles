import test from "node:test";
import assert from "node:assert/strict";
import { compileRoutePlan } from "../shared/routing/compile-route-plan.js";

test("sing-box keeps full semantics while Xray reports degradation", () => {
  const nodes = [{ name: "US", _profile: { id: "n1" } }];
  const singbox = compileRoutePlan({ nodes, options: { core: "singbox" } });
  const xray = compileRoutePlan({ nodes, options: { core: "xray" } });
  assert.equal(singbox.diagnostics.fullGroupSemantics, true);
  assert.equal(xray.diagnostics.fullGroupSemantics, false);
  assert.ok(xray.diagnostics.degraded.includes("runtime-selector"));
});
