import assert from "node:assert/strict";
import test from "node:test";

import { renderOneXraySubscription } from "../src/render-subscription.js";

test("renders deterministic OneXray homepage node subscription", () => {
  const json = renderOneXraySubscription({
    nodes: [
      { name: "🇯🇵 Tokyo", type: "ss", server: "ss.invalid", port: 8388, cipher: "aes-256-gcm", password: "p" },
    ],
  });
  const parsed = JSON.parse(json);
  assert.deepEqual(Object.keys(parsed), ["outbounds"]);
  assert.equal(parsed.outbounds.length, 1);
  assert.equal(parsed.outbounds[0].tag, "🇯🇵 Tokyo");
  assert.equal(parsed.outbounds[0].protocol, "shadowsocks");
  assert.equal(json.endsWith("\n"), true);
});

test("rejects empty and duplicate homepage node names", () => {
  assert.throws(() => renderOneXraySubscription({ nodes: [] }), /empty/u);
  const node = { name: "same", type: "socks5", server: "a.invalid", port: 1 };
  assert.throws(() => renderOneXraySubscription({ nodes: [node, { ...node, server: "b.invalid" }] }), /duplicate/u);
});
