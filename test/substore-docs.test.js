import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

test("central Sub-Store guide closes over all public scripts and private tasks", async () => {
  const readme = await text("README.md");
  const guide = await text("docs/substore-two-layer-setup.md");
  const maintenance = await text("docs/maintenance.md");
  const scripts = [
    "shadowrocket-node-operator.js",
    "shadowrocket-profile-generator.js",
    "egern-node-generator.js",
    "egern-profile-generator.js",
    "anywhere-node-generator.js",
    "surge-profile-generator.js",
    "sing-box-config-generator.js",
  ];
  for (const script of scripts) assert.match(guide, new RegExp(`current/.+/${script.replaceAll(".", "\\.")}`, "u"), script);
  for (const task of [
    "egern-nodes", "egern-macos", "egern-iphone", "egern-ipad", "anywhere-nodes",
    "shadowrocket-nodes", "shadowrocket-config-macos", "shadowrocket-config-iphone", "shadowrocket-config-ipad",
    "surge-config-macos", "surge-config-iphone", "surge-config-ipad",
    "singbox-config-macos", "singbox-config-iphone", "singbox-config-ipad", "singbox-config-android", "singbox-config-openwrt",
  ]) assert.ok(guide.includes(`\`${task}\``), `missing task ${task}`);
  assert.match(guide, /五客户端总数为 4\+1\+4\+3\+5=17 个任务/u);
  assert.match(guide, /#output=nodes[\s\S]*&/u);
  assert.match(guide, /#output=config[\s\S]*&/u);
  assert.match(guide, /channel=current[\s\S]*channel=edge/u);
  assert.match(readme, /apple-proxy-sources/u);
  assert.match(maintenance, /Node\.js 22/u);
  assert.match(maintenance, /sing-box.*\.srs/u);
  assert.match(guide, /`apple-proxy-sources`[\s\S]{0,240}(?:原始|raw)[\s\S]{0,240}`shadowrocket-nodes`/iu);
  assert.match(guide, /Shadowrocket[\s\S]{0,600}name=shadowrocket-nodes/iu);
});

test("public documentation never contains a private Sub-Store endpoint", async () => {
  const paths = ["README.md", "docs/substore-two-layer-setup.md", "docs/maintenance.md", "docs/implementation-status.md"];
  const content = (await Promise.all(paths.map((path) => text(path)))).join("\n");
  assert.doesNotMatch(content, /(?:substore|subs)[^\n]{0,120}(?:api|token|key)=/iu);
  assert.doesNotMatch(content, /(?:uuid|password|passwd|private_key)\s*[:=]\s*[^`\s]+/iu);
  assert.match(content, /example\.invalid/u);
});
