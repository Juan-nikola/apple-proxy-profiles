import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("README quick-start guide links to maintained screenshot-style diagrams", async () => {
  const readme = await readFile(new URL("README.md", root), "utf8");
  for (const asset of [
    "docs/assets/substore-to-surge.svg",
    "docs/assets/routing-order.svg",
    "docs/assets/rollback-flow.svg",
    "docs/assets/happ-import-guide.svg",
  ]) {
    assert.match(readme, new RegExp(asset.replaceAll("/", "\\/"), "u"), asset);
    await access(new URL(asset, root));
    const svg = await readFile(new URL(asset, root), "utf8");
    assert.match(svg, /^<svg[\s\S]*<\/svg>\s*$/u, asset);
    assert.match(svg, /role="img"/u, asset);
  }
});

test("README tutorial keeps the eleven-client and current-only contracts visible", async () => {
  const readme = await readFile(new URL("README.md", root), "utf8");
  assert.match(readme, /十一个 active 客户端/u);
  assert.match(readme, /12 个手动 collection、49 个 File task/u);
  assert.match(readme, /apple-proxy-incy/u);
  assert.match(readme, /androidtv/u);
  assert.match(readme, /windows/u);
  assert.match(readme, /linux/u);
  assert.match(readme, /所有 40 个配置任务均为 `ipv4-only`/u);
  assert.doesNotMatch(readme, /所有 30 个配置任务均为 `ipv4-only`/u);
  assert.match(readme, /current\/surge\/scripts\/surge-profile-generator\.js/u);
  assert.match(readme, /ChinaTLD -> ChinaIP -> 漏网之鱼/u);
  assert.doesNotMatch(readme, /https?:\/\/[^\s`]+(?:api|token|uuid|password)=/iu);
});

test("Sub-Store policy examples use the Chinese business-group labels", async () => {
  const paths = ["README.md", "docs/substore-two-layer-setup.md"];
  const expectedLabels = [
    "🤖 AI 专用", "🐙 GitHub", "📺 YouTube", "🎬 海外流媒体", "💬 海外社交",
    "🍎 Apple", "🪟 Microsoft", "🇨🇳 国内平台", "🌍 海外游戏", "🎮 游戏连接",
    "⬇️ 下载/P2P", "🧭 DNS 与规则下载", "漏网之鱼",
  ];

  for (const path of paths) {
    const document = await readFile(new URL(path, root), "utf8");
    const examples = [...document.matchAll(/```json\n([\s\S]*?)\n```/gu)]
      .map(([, source]) => JSON.parse(source))
      .filter((value) => value.schemaVersion === 3);
    assert.ok(examples.length > 0, `${path} should include a schema v3 policy example`);
    for (const example of examples) {
      for (const layer of Object.values(example.clients)) {
        assert.deepEqual(Object.keys(layer.targets), expectedLabels, `${path} policy targets`);
      }
    }
  }
});

test("catalog docs keep the updated 12 collection and 49 task counts", async () => {
  const status = await readFile(new URL("docs/implementation-status.md", root), "utf8");
  assert.match(status, /12 个手动 collection、49 个 canonical task/u);
  assert.doesNotMatch(status, /10 个手动 collection、38 个 canonical task/u);

  const pools = await readFile(new URL("docs/substore-client-pools.md", root), "utf8");
  assert.match(pools, /当前维护 12 个手动 collection/u);
  assert.doesNotMatch(pools, /当前维护 10 个手动 collection/u);

  const setup = await readFile(new URL("docs/substore-two-layer-setup.md", root), "utf8");
  assert.match(setup, /canonical catalog 共 49 个 File task/u);
  assert.doesNotMatch(setup, /canonical catalog 共 38 个 File task/u);
  assert.match(setup, /canonical catalog 的 40 个配置任务默认设置为 `ipv6Mode=ipv4-only`/u);
  assert.match(setup, /所有 40 个配置任务 `ipv4-only`/u);
  assert.match(setup, /十一客户端指南/u);
  assert.match(setup, /顶层包含 11 个客户端层/u);
  assert.match(setup, /`v2rayn`、`v2box`、`clash`、`incy` 八层/u);
  assert.doesNotMatch(setup, /所有 30 个配置任务 `ipv4-only`/u);
});


test("Hiddify documentation separates generator support from device acceptance", async () => {
  const readme = await readFile(new URL("README.md", root), "utf8");
  const maintenance = await readFile(new URL("docs/maintenance.md", root), "utf8");
  assert.match(readme, /apple-proxy-hiddify/u);
  assert.match(readme, /raw config/u);
  assert.match(readme, /未完成六平台真实设备/u);
  assert.match(readme, /没有国内\/国外两套 DNS 答案比较/u);
  assert.match(maintenance, /c9d6f0f00b2eda34e4fb71863e4e0a62b3e931a0/u);
  assert.match(maintenance, /0a02b7729f6a211436bb8bdcd8696c283eb27767/u);
  assert.match(maintenance, /rule-set version 1–4/u);
});
