import assert from "node:assert/strict";
import test from "node:test";
import { renderXrayNodeError, renderXrayOutbound, renderXraySubscription } from "../../../shared/nodes/render-xray-outbound.js";

const VLESS = { name: "shared", type: "vless", server: "shared.example", port: 443, uuid: "00000000-0000-4000-8000-000000000001" };

test("shared Xray primitive renders audited protocol mappings for clients", () => {
  const outbound = renderXrayOutbound(VLESS, { tag: "ap-shared", client: "v2rayn" });
  assert.equal(outbound.protocol, "vless");
  assert.equal(outbound.settings.vnext[0].address, "shared.example");
});

test("shared subscription is newline terminated and rejects duplicate names", () => {
  const text = renderXraySubscription({ nodes: [VLESS], client: "v2box" });
  assert.equal(text.endsWith("\n"), true);
  assert.equal(JSON.parse(text).outbounds.length, 1);
  assert.throws(() => renderXraySubscription({ nodes: [VLESS, VLESS], client: "v2box" }), /duplicate node names/u);
});

test("shared unsupported diagnostics contain no node values", () => {
  const diagnostic = renderXrayNodeError(new Error("unsupported-v2box-protocol secret"), "v2box");
  assert.deepEqual(diagnostic, { client: "v2box", excluded: { "unsupported-v2box-protocol": 1 } });
  assert.equal(JSON.stringify(diagnostic).includes("shared.example"), false);
});
