import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function text(path) {
  return readFile(new URL(path, root), "utf8");
}

async function optionalText(path) {
  try {
    return await text(path);
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

const operationalDocs = Object.freeze({
  "README.md": null,
  "docs/substore-two-layer-setup.md": null,
  "docs/maintenance.md": null,
  "docs/implementation-status.md": null,
  "clients/egern/README.md": "apple-proxy-egern",
  "clients/egern/docs/deployment.md": "apple-proxy-egern",
  "clients/anywhere/README.md": "apple-proxy-anywhere",
  "clients/anywhere/docs/deployment.md": "apple-proxy-anywhere",
  "clients/shadowrocket/README.md": "apple-proxy-shadowrocket",
  "clients/shadowrocket/docs/deployment.md": "apple-proxy-shadowrocket",
  "clients/shadowrocket/docs/maintenance.md": "apple-proxy-shadowrocket",
  "clients/shadowrocket/docs/troubleshooting.md": "apple-proxy-shadowrocket",
  "clients/shadowrocket/docs/canary-checklist.md": "apple-proxy-shadowrocket",
  "clients/surge/README.md": "apple-proxy-surge",
  "clients/surge/docs/deployment.md": "apple-proxy-surge",
  "clients/sing-box/README.md": "apple-proxy-singbox",
  "clients/sing-box/docs/deployment.md": "apple-proxy-singbox",
  "clients/sing-box/docs/openwrt.md": "apple-proxy-singbox",
  "clients/onexray/README.md": "apple-proxy-onexray",
  "clients/onexray/docs/deployment.md": "apple-proxy-onexray",
});

test("central Sub-Store guide closes over all public scripts and private tasks", async () => {
  const readme = await text("README.md");
  const guide = await text("docs/substore-two-layer-setup.md");
  const maintenance = await text("docs/maintenance.md");
  const scripts = [
    "shadowrocket-node-subscription.js",
    "shadowrocket-profile-generator.js",
    "egern-node-generator.js",
    "egern-profile-generator.js",
    "anywhere-node-generator.js",
    "surge-nodes-generator.js",
    "surge-profile-generator.js",
    "sing-box-config-generator.js",
  ];
  for (const script of scripts) assert.match(guide, new RegExp(`current/.+/${script.replaceAll(".", "\\.")}`, "u"), script);
  for (const task of [
    "egern-nodes", "egern-macos", "egern-iphone", "egern-ipad", "anywhere-nodes",
    "shadowrocket-config-macos", "shadowrocket-config-iphone", "shadowrocket-config-ipad",
    "surge-nodes", "surge-config-macos", "surge-config-iphone", "surge-config-ipad",
    "singbox-config-macos", "singbox-config-iphone", "singbox-config-ipad", "singbox-config-android", "singbox-config-openwrt",
    "onexray-nodes", "onexray-profile", "onexray-routing-audit",
  ]) assert.ok(guide.includes(`\`${task}\``), `missing task ${task}`);
  assert.match(guide, /(?:五客户端|客户端)总数为 4\+1\+3\+4\+5\+3=20 个任务/u);
  assert.match(guide, /#output=nodes[\s\S]*&/u);
  assert.match(guide, /#output=config[\s\S]*&/u);
  assert.match(guide, /channel=current[\s\S]*channel=edge/u);
  assert.match(readme, /apple-proxy-sources/u);
  assert.match(maintenance, /Node\.js 22/u);
  assert.match(maintenance, /sing-box.*\.srs/u);
  assert.match(guide, /`apple-proxy-sources`[\s\S]{0,240}(?:兼容|回滚)/iu);
  assert.match(guide, /Shadowrocket[\s\S]{0,600}name=apple-proxy-shadowrocket/iu);
});

test("public documentation never contains a private Sub-Store endpoint", async () => {
  const paths = ["README.md", "docs/substore-two-layer-setup.md", "docs/maintenance.md", "docs/implementation-status.md"];
  const content = (await Promise.all(paths.map((path) => text(path)))).join("\n");
  assert.doesNotMatch(content, /(?:substore|subs)[^\n]{0,120}(?:api|token|key)=/iu);
  assert.doesNotMatch(content, /(?:uuid|password|passwd|private_key)\s*[:=]\s*[^`\s]+/iu);
  assert.match(content, /example\.invalid/u);
});

test("canonical client pool guide defines six mappings, migration, rollback, and fail-closed filtering", async () => {
  const guide = await optionalText("docs/substore-client-pools.md");
  for (const row of [
    "| Egern | `apple-proxy-egern` | 用户自行选择来源、AnyTLS 和字段形状 |",
    "| Anywhere | `apple-proxy-anywhere` | 用户自行选择 Anywhere 可导入的节点，远程输出只有节点列表 |",
    "| Shadowrocket | `apple-proxy-shadowrocket` | 可维护 AnyTLS 及其他已实现节点类型 |",
    "| Surge | `apple-proxy-surge` | 只加入当前 Surge renderer 已实现的类型 |",
    "| sing-box | `apple-proxy-singbox` | 可加入当前 sing-box renderer 已实现的类型和字段 |",
    "| OneXray | `apple-proxy-onexray` | 只加入当前 OneXray 原生 Profile 已实现的类型 |",
  ]) assert.ok(guide.includes(row), row);
  assert.match(guide, /`apple-proxy-all`[\s\S]{0,160}总池/u);
  assert.match(guide, /`apple-proxy-sources`[\s\S]{0,240}(?:兼容|回滚)/u);
  assert.match(guide, /不支持的已选协议[会将必须应当][\s\S]{0,80}(?:失败|报错)[\s\S]{0,80}不(?:会|得)静默丢弃/u);

  const orderedSteps = [
    "保留旧 collection 和 tasks",
    "建立 `apple-proxy-all` 总池",
    "建立六个客户端组合",
    "用户自行筛选",
    "preview",
    "只修改对应客户端的 `name=`",
    "refresh 并对比计数",
    "保留旧 URL 回滚",
  ];
  let position = -1;
  for (const step of orderedSteps) {
    const next = guide.indexOf(step, position + 1);
    assert.ok(next > position, `missing or out-of-order migration step: ${step}`);
    position = next;
  }
  assert.match(guide, /OneXray[\s\S]{0,500}`NODE:<name>`[\s\S]{0,500}外部 exact-name 引用[\s\S]{0,500}preview[\s\S]{0,500}`· <Protocol>`/u);
});

test("canonical client pool guide uses only synthetic, non-secret examples", async () => {
  const guide = await optionalText("docs/substore-client-pools.md");
  assert.match(guide, /example\.invalid/u);
  assert.doesNotMatch(guide, /https?:\/\/(?![^/\s`]*example\.invalid)[^\s`)]+/iu);
  assert.doesNotMatch(guide, /\b(?:\d{1,3}\.){3}\d{1,3}\b/u);
  assert.doesNotMatch(guide, /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu);
  assert.doesNotMatch(guide, /(?:server|port|uuid|password|passwd|psk|private[_ -]?key)\s*[:=]\s*\S+/iu);
  assert.doesNotMatch(guide, /NODE:(?!<name>)[^\s`]+/u);
});

test("operational docs use client-owned pools and point to the canonical guide", async () => {
  for (const [path, collection] of Object.entries(operationalDocs)) {
    const content = await text(path);
    assert.match(content, /substore-client-pools\.md/u, `${path} must link the canonical guide`);
    assert.doesNotMatch(content, /name=apple-proxy-sources(?:\b|&)/u, `${path} still configures the legacy pool`);
    if (collection !== null) assert.ok(content.includes(collection), `${path} missing ${collection}`);
  }
});
