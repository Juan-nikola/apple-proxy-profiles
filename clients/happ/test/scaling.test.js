import assert from "node:assert/strict";
import test from "node:test";

import { renderHappSubscription } from "../src/render-subscription.js";

const options = { platform: "macos", dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare", blockMode: "balanced", quicMode: "proxy-block", ipv6Mode: "auto", adblockMode: "off", policyOverrides: Buffer.from(JSON.stringify({ "🤖 AI 专用": "NODE:固定东京", "🐙 GitHub": "NODE:固定大阪" })).toString("base64url") };
function nodes(count) {
  return Array.from({ length: count }, (_, index) => ({ name: index === 0 ? "固定东京" : index === 1 ? "固定大阪" : `节点${index}`, type: "vless", server: `node-${index}.example.invalid`, port: 443, uuid: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`, encryption: "none", network: "raw", tls: true, _profile: { id: `node-${index}` } }));
}

test("keeps per-node JSON growth bounded with a fixed number of shared fixed targets", () => {
  const measurements = [30, 100, 1000].map((count) => {
    const input = nodes(count);
    const started = performance.now();
    const configs = renderHappSubscription({ nodes: input, allNodes: input, options });
    const elapsedMs = performance.now() - started;
    const bytes = Buffer.byteLength(JSON.stringify(configs));
    assert.equal(configs.length, count);
    assert.ok(elapsedMs >= 0);
    return { count, bytes, bytesPerNode: bytes / count };
  });
  const perNode = measurements.map(({ bytesPerNode }) => bytesPerNode);
  assert.ok(Math.max(...perNode) - Math.min(...perNode) < 800, JSON.stringify(measurements));
  assert.ok(measurements.at(-1).bytes < 12_000_000, JSON.stringify(measurements));
  assert.deepEqual(renderHappSubscription({ nodes: nodes(30), allNodes: nodes(30), options }), renderHappSubscription({ nodes: nodes(30), allNodes: nodes(30), options }));
});
