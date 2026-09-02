import assert from "node:assert/strict";
import test from "node:test";

import { operator } from "../src/substore-nodes-entry.js";

test("Clash node operator accepts the canonical publication channel parameter", async () => {
  const result = await operator({}, "Clash", {
    arguments: {
      output: "nodes",
      type: "collection",
      name: "apple-proxy-clash",
      clientChain: "off",
      channel: "current",
    },
    async produceArtifact() {
      return [{
        name: "🇯🇵 Test",
        type: "ss",
        server: "198.51.100.10",
        port: 443,
        cipher: "aes-128-gcm",
        password: "TEST_ONLY_CLASH_PASSWORD",
      }];
    },
  });

  assert.match(result.$content, /^proxies:\n/u);
});
