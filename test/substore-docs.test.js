import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { CLIENT } from "../shared/contracts.js";
import { activeClientIds, plannedClientIds } from "../shared/release/client-catalog.js";

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
});

const activeDocs = Object.freeze([
  "README.md",
  "docs/substore-two-layer-setup.md",
  "docs/implementation-status.md",
  "clients/anywhere/README.md",
  "clients/anywhere/docs/canary.md",
  "clients/anywhere/docs/deployment.md",
  "clients/anywhere/docs/troubleshooting.md",
]);

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
  const tasks = [
    "egern-nodes", "egern-macos", "egern-iphone", "egern-ipad", "anywhere-nodes",
    "shadowrocket-nodes",
    "shadowrocket-config-macos", "shadowrocket-config-iphone", "shadowrocket-config-ipad",
    "surge-nodes", "surge-config-macos", "surge-config-iphone", "surge-config-ipad",
     "singbox-config-macos", "singbox-config-iphone", "singbox-config-ipad", "singbox-config-android",
  ];
  for (const [index, task] of tasks.entries()) {
    const rowPattern = new RegExp("\\| " + (index + 1) + " \\| `" + task + "` \\|", "u");
    assert.match(guide, rowPattern, `missing task-table row ${task}`);
  }
  for (const [index, task] of [
    "apple-proxy-policy", "onexray-nodes", "onexray-profile", "onexray-routing-audit",
    "happ-macos", "happ-iphone", "happ-ipad", "happ-android", "happ-windows", "happ-linux",
    "happ-routing-audit",
  ].entries()) {
    const rowPattern = new RegExp("\\| " + (index + 18) + " \\| `" + task + "` \\|", "u");
    assert.match(guide, rowPattern, `missing private task-table row ${task}`);
  }
  assert.match(guide, /任务总数为 \*\*28 个\*\*/u);
  assert.match(guide, /通用任务总数为 `4\+1\+4\+4\+4=17` 个/u);
  assert.match(guide, /#output=nodes[\s\S]*&/u);
  assert.match(guide, /#output=config[\s\S]*&/u);
  assert.match(guide, /channel=current[\s\S]*channel=edge/u);
  assert.match(readme, /apple-proxy-sources/u);
  assert.match(readme, /HAPP：.*clients\/happ\/docs\/deployment\.md/iu);
  assert.match(readme, /OneXray：.*clients\/onexray\/docs\/deployment\.md/iu);
  assert.match(readme, /### 2\.6 HAPP[\s\S]*happ-routing-audit/u);
  assert.match(readme, /### 2\.7 OneXray[\s\S]*onexray-routing-audit/u);
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

test("active documentation follows the maintained client and Anywhere package contracts", async () => {
  const manifest = JSON.parse(await text("clients/anywhere/examples/rules/manifest.json"));
  const packageIds = manifest.logicalRuleSets.map(({ id }) => id).sort();
  const expectedCount = packageIds.length;
  const docs = await Promise.all(activeDocs.map(async (path) => [path, await text(path)]));

  assert.deepEqual([...activeClientIds()].sort(), ["anywhere", "egern", "happ", "onexray", "shadowrocket", "singbox", "surge"]);
  assert.deepEqual([...plannedClientIds()].sort(), []);
  assert.deepEqual(Object.keys(CLIENT).sort(), [
    "anywhere", "egern", "happ", "onexray", "shadowrocket", "singbox", "surge",
  ]);
  assert.equal(expectedCount, 14);
  for (const [path, content] of docs) {
    assert.doesNotMatch(content, /六个客户端|六个 client collection|31 个默认(?:规则)?分片|31 个默认 shard/u, path);
    if (path === "README.md" || path === "docs/substore-two-layer-setup.md" || path === "docs/implementation-status.md") {
      assert.match(content, /HAPP|OneXray/iu, path);
      assert.match(content, /active|canary/iu, path);
    }
  }

  const entry = docs.find(([path]) => path === "README.md")[1];
  assert.match(entry, new RegExp(`${expectedCount} 个稳定业务包`, "u"));
  for (const id of packageIds) assert.ok(entry.includes(`\`${id}\``), `README missing Anywhere package ${id}`);
});

test("HAPP user documentation exposes current as the only public channel", async () => {
  const paths = [
    "README.md",
    "clients/happ/README.md",
    "clients/happ/docs/deployment.md",
    "clients/happ/docs/troubleshooting.md",
  ];
  const docs = await Promise.all(paths.map(async (path) => [path, await text(path)]));
  const content = docs.map(([, value]) => value).join("\n");
  assert.match(content, /HAPP[\s\S]{0,260}current\/happ/u);
  assert.match(content, /edge[\s\S]{0,120}(?:内部|维护者|灰度)/iu);
  assert.doesNotMatch(content, /HAPP-[A-Z0-9_-]+/u);
  assert.doesNotMatch(content, /把 URL 中的 `current` 换成 `edge`/u);
  assert.match(content, /JSON 配置由 Xray JSON 自己负责 DNS、路由和固定节点/iu);
  assert.match(content, /HAPP 路由开关.*锁定.*JSON/iu);
  assert.match(content, /macos.*iphone.*ipad.*android.*windows.*linux.*routing/isu);
  assert.match(content, /删除旧.*订阅.*重新导入/isu);
});

test("beginner entry does not assume one private deployment already exists", async () => {
  const readme = await text("README.md");
  assert.doesNotMatch(readme, /substore\.sunyz\.uk|xiaov/u);
  assert.doesNotMatch(readme, /你的 Sub-Store 里已有|你自己的 Sub-Store 已经部署|已经全部建好|已经帮你建好/u);
});

test("canonical client pool guide defines seven mappings, migration, rollback, and fail-closed rendering", async () => {
  const guide = await optionalText("docs/substore-client-pools.md");
  for (const row of [
    "| Egern | `apple-proxy-egern` | 用户自行选择来源、AnyTLS 和字段形状 |",
    "| Anywhere | `apple-proxy-anywhere` | 用户自行选择 Anywhere 可导入的节点，远程输出只有节点列表 |",
    "| Shadowrocket | `apple-proxy-shadowrocket` | 用户自行选择节点；AnyTLS 等已实现类型可直接包含 |",
    "| Surge | `apple-proxy-surge` | 用户自行选择节点；renderer 无法表示的协议跳过并计入 renderFailures |",
    "| sing-box | `apple-proxy-singbox` | 默认 strict；任一已选节点无法完整表示时失败，迁移期可显式使用 compatible |",
    "| OneXray | `apple-proxy-onexray` | 用户自行选择节点；节点任务输出 Xray JSON，Profile/审计对不兼容和固定节点问题失败关闭 |",
    "| HAPP | `apple-proxy-happ` | 用户自行选择节点；六平台配置与审计共享同一策略覆盖，固定节点问题写入私密 warning |",
  ]) assert.ok(guide.includes(row), row);
  assert.match(guide, /`apple-proxy-all`[\s\S]{0,160}总池/u);
  assert.match(guide, /`apple-proxy-sources`[\s\S]{0,240}(?:兼容|回滚)/u);
  assert.match(guide, /sing-box 默认使用 `nodeErrorMode=strict`[\s\S]{0,220}renderFailures/u);
  assert.match(guide, /不(?:会|得)静默丢弃/u);

  const orderedSteps = [
    "保留旧 collection 和 tasks",
    "建立 `apple-proxy-all` 总池",
    "建立七个客户端组合",
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

test("sing-box documentation makes manual selection independent from sing-box-client labels", async () => {
  const paths = [
    "README.md",
    "docs/substore-client-pools.md",
    "docs/substore-two-layer-setup.md",
    "clients/sing-box/README.md",
    "clients/sing-box/docs/deployment.md",
  ];
  const content = (await Promise.all(paths.map((path) => text(path)))).join("\n");
  assert.match(content, /sing-box-client[\s\S]{0,180}(?:不是|无需|不要求|可删除)/iu);
  assert.match(content, /手动(?:选择|勾选)[\s\S]{0,220}apple-proxy-singbox/iu);
  assert.match(content, /name=apple-proxy-singbox/u);
  assert.match(content, /nodeErrorMode=strict[\s\S]{0,260}(?:失败|报错|不兼容)/iu);
  assert.doesNotMatch(content, /必须(?:带有|关联|包含)[^\n]{0,80}sing-box-client/iu);
});

test("operational docs use client-owned pools and point to the canonical guide", async () => {
  for (const [path, collection] of Object.entries(operationalDocs)) {
    const content = await text(path);
    assert.match(content, /substore-client-pools\.md/u, `${path} must link the canonical guide`);
    assert.doesNotMatch(content, /name=apple-proxy-sources(?:\b|&)/u, `${path} still configures the legacy pool`);
    if (collection !== null) assert.ok(content.includes(collection), `${path} missing ${collection}`);
  }
});
