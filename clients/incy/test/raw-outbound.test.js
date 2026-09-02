import assert from "node:assert/strict";
import test from "node:test";

import { assertIncyOutbound } from "../src/validate-subscription.js";
import { parseRawXrayOutbound, renderIncyOutbound } from "../src/render-node.js";

test("accepts a safe raw Xray outbound extension without filtering the node", () => {
  const node = {
    name: "future",
    type: "future-protocol",
    _incy: {
      xrayOutbound: {
        tag: "ap-incy-future",
        protocol: "vless",
        settings: { vnext: [] },
      },
    },
  };

  const output = renderIncyOutbound(node, { tag: "ap-incy-future" });
  assert.equal(output.protocol, "vless");
  assert.equal(output.tag, "ap-incy-future");
});

test("rejects raw outbounds that can inject routing or non-plain values", () => {
  assert.throws(() => parseRawXrayOutbound({
    xrayOutbound: {
      tag: "ap-incy-routed",
      protocol: "vless",
      settings: {},
      routing: {},
    },
  }), /forbidden|schema/i);

  assert.throws(() => parseRawXrayOutbound({
    xrayOutbound: {
      tag: "ap-incy-map",
      protocol: "vless",
      settings: new Map(),
    },
  }), /plain|schema/i);
});

test("validates subscription-level tags and rejects secret metadata", () => {
  const config = {
    outbounds: [
      { tag: "ap-incy-alpha", protocol: "vless", settings: { vnext: [] } },
      { tag: "ap-incy-beta", protocol: "trojan", settings: { servers: [] } },
    ],
  };

  assert.equal(assertIncyOutbound(config), true);
  assert.throws(() => assertIncyOutbound({
    outbounds: [
      { tag: "ap-incy-alpha", protocol: "vless", settings: { vnext: [] } },
      { tag: "ap-incy-alpha", protocol: "trojan", settings: { servers: [] } },
    ],
  }), /duplicate|tag/i);
  assert.throws(() => assertIncyOutbound({
    outbounds: [
      { tag: "ap-incy-alpha", protocol: "vless", settings: { vnext: [] }, password: "TEST_ONLY" },
    ],
  }), /secret|password|metadata/i);
});
