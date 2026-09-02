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

test("README tutorial keeps the eight-client and current-only contracts visible", async () => {
  const readme = await readFile(new URL("README.md", root), "utf8");
  assert.match(readme, /八个 active 客户端/u);
  assert.match(readme, /10 个手动 collection、38 个 File task/u);
  assert.match(readme, /apple-proxy-incy/u);
  assert.match(readme, /所有 30 个配置任务均为 `ipv4-only`/u);
  assert.doesNotMatch(readme, /所有 22 个配置任务均为 `ipv4-only`/u);
  assert.match(readme, /current\/surge\/scripts\/surge-profile-generator\.js/u);
  assert.match(readme, /ChinaTLD -> ChinaIP -> 漏网之鱼/u);
  assert.doesNotMatch(readme, /https?:\/\/[^\s`]+(?:api|token|uuid|password)=/iu);
});

test("catalog docs keep the updated 10 collection and 38 task counts", async () => {
  const status = await readFile(new URL("docs/implementation-status.md", root), "utf8");
  assert.match(status, /10 个手动 collection、38 个 canonical task/u);
  assert.doesNotMatch(status, /9 个手动 collection、30 个 canonical task/u);

  const pools = await readFile(new URL("docs/substore-client-pools.md", root), "utf8");
  assert.match(pools, /当前维护 10 个手动 collection/u);
  assert.doesNotMatch(pools, /当前维护 9 个手动 collection/u);

  const setup = await readFile(new URL("docs/substore-two-layer-setup.md", root), "utf8");
  assert.match(setup, /canonical catalog 共 38 个 File task/u);
  assert.doesNotMatch(setup, /canonical catalog 共 30 个 File task/u);
  assert.match(setup, /当前私密 Sub-Store 的 30 个配置任务已统一设置为 `ipv6Mode=ipv4-only`/u);
  assert.match(setup, /所有 30 个配置任务 `ipv4-only`/u);
  assert.doesNotMatch(setup, /所有 22 个配置任务 `ipv4-only`/u);
});
