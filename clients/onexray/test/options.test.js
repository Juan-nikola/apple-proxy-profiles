import assert from "node:assert/strict";
import test from "node:test";

import { parseOneXrayOptions } from "../src/options.js";

const BASE = { output: "profile", type: "collection", name: "apple-proxy-onexray" };

test("parses OneXray profile defaults", () => {
  assert.deepEqual(parseOneXrayOptions(BASE), {
    output: "profile",
    type: "collection",
    name: "apple-proxy-onexray",
    channel: "edge",
    dnsMode: "stable",
    chinaDns: "alidns",
    globalDns: "cloudflare",
    blockMode: "balanced",
    quicMode: "proxy-block",
    ipv6Mode: "auto",
    clientChain: "off",
    clientChainTarget: "",
    policyOverrides: "",
  });
});

test("rejects invalid output, channel, and chain combinations", () => {
  assert.throws(() => parseOneXrayOptions({ ...BASE, output: "config" }), /output/u);
  assert.throws(() => parseOneXrayOptions({ ...BASE, channel: "beta" }), /channel/u);
  assert.throws(() => parseOneXrayOptions({ ...BASE, clientChain: "on" }), /clientChainTarget/u);
  assert.throws(() => parseOneXrayOptions({ ...BASE, clientChainTarget: "NODE:entry" }), /clientChain/u);
  assert.throws(() => parseOneXrayOptions({ ...BASE, unknown: true }), /unknown/u);
});
