import assert from "node:assert/strict";
import test from "node:test";

import { renderHappSubscription } from "../src/render-subscription.js";

const encode = (value) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
const platforms = ["macos", "iphone", "ipad", "android", "windows", "linux"];

function node(name, id) {
  return {
    name, type: "vless", server: `${id}.example.invalid`, port: 443,
    uuid: "00000000-0000-4000-8000-000000000003", encryption: "none",
    network: "raw", tls: true, _profile: { id },
  };
}

function options(platform = "macos", overrides = {}) {
  return {
    platform, dnsMode: "stable", chinaDns: "alidns", globalDns: "cloudflare",
    blockMode: "balanced", quicMode: "proxy-block", ipv6Mode: "auto", adblockMode: "off",
    policyOverrides: encode(overrides),
  };
}

test("composes one complete config per eligible node with its own FOLLOW outbound", () => {
  const nodes = [node("东京", "node-tokyo"), node("大阪", "node-osaka")];
  const configs = renderHappSubscription({ nodes, allNodes: nodes, options: options() });

  assert.equal(configs.length, 2);
  for (const [index, config] of configs.entries()) {
    assert.equal(config.remarks, nodes[index].name);
    assert.equal(config.outbounds[0].tag, `happ-follow/${nodes[index]._profile.id}`);
    assert.equal(config.outbounds[0].settings.vnext[0].address, nodes[index].server);
    assert.equal(config.routing.rules.at(-1).ruleTag, "最终兜底");
  }
});

test("deduplicates fixed outbounds and renders every Happ platform", () => {
  const nodes = [node("当前", "node-current"), node("东京", "node-tokyo"), node("大阪", "node-osaka")];
  const overrides = { "🤖 AI 专用": "NODE:东京", "🐙 GitHub": "NODE:东京", "📺 YouTube": "NODE:大阪" };
  for (const platform of platforms) {
    const configs = renderHappSubscription({ nodes, allNodes: nodes, options: options(platform, overrides) });
    assert.equal(configs.length, nodes.length, platform);
    const fixed = configs[0].outbounds.filter(({ tag }) => tag.startsWith("happ-fixed/"));
    assert.equal(fixed.length, 2, platform);
    assert.equal(new Set(fixed.map(({ tag }) => tag)).size, 2, platform);
  }
});

test("rejects a subscription without eligible Happ nodes using the stable Chinese error", () => {
  assert.throws(
    () => renderHappSubscription({ nodes: [], allNodes: [], options: options() }),
    /没有可用于 Happ 的节点/u,
  );
});
