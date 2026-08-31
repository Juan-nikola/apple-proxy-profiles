import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  readme: new URL("../README.md", import.meta.url),
  deployment: new URL("../docs/deployment.md", import.meta.url),
  canary: new URL("../docs/canary.md", import.meta.url),
  troubleshooting: new URL("../docs/troubleshooting.md", import.meta.url),
};

const manifestUrl = new URL("../examples/rules/manifest.json", import.meta.url);

async function docs() {
  return Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, url]) => [key, await readFile(url, "utf8")])));
}

test("documents the exact three-layer boundary and pinned compatibility", async () => {
  const content = await docs();
  const manifest = JSON.parse(await readFile(manifestUrl, "utf8"));
  const packageIds = manifest.logicalRuleSets.map(({ id }) => id);
  for (const [name, text] of Object.entries(content)) assert.ok(text.length > 300, `${name} is incomplete`);
  for (const phrase of ["私密节点订阅", ".arrs", "设备设置", "Default", "并非停用"]) {
    assert.match(content.readme, new RegExp(phrase.replace(".", "\\."), "u"));
  }
  assert.match(content.readme, /e15518fde1f5d2652dfc1c234c89a68b87cecec0|上游兼容性/u);
  assert.equal(packageIds.length, 14);
  assert.match(content.readme, /14 个稳定.*业务包/u);
  assert.match(content.readme, /localAssignments\.importable[\s\S]*false[\s\S]*不能.*自动.*绑定/u);
  for (const id of packageIds) assert.ok(content.readme.includes(`\`${id}\``), `README missing package ${id}`);
  assert.match(content.readme, /Advertising[\s\S]*Advertising_Domain[\s\S]*可选/u);
  assert.match(content.readme, /95,000.*100,000/u);
});

test("deployment pins private arguments, all import layers, and manual refresh", async () => {
  const { deployment } = await docs();
  for (const phrase of [
    "https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-strategy-generator.js",
    "output=nodes&type=collection&name=apple-proxy-anywhere&clientChain=off",
    "https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html",
    "https://juan-nikola.github.io/apple-proxy-profiles/optional/adblock-full/current/anywhere/import.html",
    "anywhere://add-proxy?link=",
    "anywhere://add-rule-set",
    "Subscriptions DNS", "IP Rules DNS", "Proxies DNS", "ECH DNS", "Fallback DNS",
    "Advertise IPv6 to Apps", "Hide VPN Icon", "Blocked", "Automatic", "Unblocked", "Block UDP",
  ]) assert.ok(deployment.includes(phrase), `deployment missing ${phrase}`);
  assert.match(deployment, /Sub-Store.*6 小时[\s\S]*Anywhere.*手动 Refresh/u);
  assert.match(deployment, /anywhere-node-generator\.js/u);
  assert.match(deployment, /substore-node-generator\.js[\s\S]*兼容/u);
  assert.match(deployment, /链接模式[\s\S]*规范 Pages URL[\s\S]*参数/u);
  assert.match(deployment, /MITM\/HTTPS 解密.*Allow Insecure.*关闭/u);
  for (const ai of ["OpenAI", "Claude", "Gemini", "Copilot"]) assert.ok(deployment.includes(ai));
  assert.match(deployment, /`Security`[^\n]*REJECT/u);
  assert.match(deployment, /`AI` 业务包[\s\S]*OpenAI[\s\S]*Claude[\s\S]*Gemini[\s\S]*Copilot/u);
  assert.doesNotMatch(deployment, /默认的 Hijacking、BlockHttpDNS|四个 AI (?:规则集|分片)/u);
  assert.match(deployment, /Advertising[\s\S]*Advertising_Domain[\s\S]*删除或禁用/u);
  assert.match(deployment, /OverseasGame[\s\S]*海外游戏/u);
  assert.match(deployment, /localAssignments\.importable[\s\S]*false[\s\S]*手动/u);
});

test("README is independently copyable for the two-layer Sub-Store node setup", async () => {
  const { readme, deployment } = await docs();
  for (const phrase of [
    "https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-strategy-generator.js",
    "https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js",
    "output=nodes&type=collection&name=apple-proxy-anywhere&clientChain=off",
    "Sub-Store 不需要先创建独立脚本记录",
    "accepted",
  ]) assert.ok(readme.includes(phrase), `README missing ${phrase}`);
  assert.match(readme, /JS_URL#output=nodes[^\n]+不能使用 `\?`/u);
  assert.match(readme, /远程链接[\s\S]*URL[\s\S]*#\.\.\.[\s\S]*读取 `\$arguments`/u);
  assert.match(deployment, /File\/文件[^\n]+Script\/脚本操作[^\n]+链接模式[^\n]+参数/u);
  assert.match(readme, /不会创建[^\n]+`anywhere-profile-generator\.js`/u);
  assert.match(deployment, /不要创建 `anywhere-profile-generator\.js`/u);
});

test("README contains the complete current-UI beginner deployment path", async () => {
  const { readme } = await docs();
  for (const phrase of [
    "## 新手部署：从节点 File 到规则导入",
    "单条脚本的“启用”和“预览”都勾选",
    "只是全部展开/收起，不是运行总开关",
    "“关闭缓存”和“不验证服务器证书”都不勾选",
    "确认 14 个稳定业务包全部出现",
    "iPhone 全部通过后才在 iPad",
  ]) assert.ok(readme.includes(phrase), `README missing beginner phrase: ${phrase}`);
  for (const key of ["output", "type", "name", "clientChain"]) {
    assert.ok(readme.includes(`| \`${key}\` |`), `README missing parameter row: ${key}`);
  }
  const ruleImportSection = readme.split("### 4. 导入公开 `.arrs` 规则\n", 2)[1]?.split("\n### 5. ", 1)[0] ?? "";
  assert.deepEqual(
    [...ruleImportSection.matchAll(/^(\d+)\. /gmu)].map((match) => Number(match[1])),
    [1, 2, 3, 4, 5, 6],
    "README rule import steps must be sequential",
  );
});

test("canary and troubleshooting lock safe order, UUID risks, and real rollback", async () => {
  const { canary, troubleshooting } = await docs();
  assert.ok(canary.indexOf("iPhone") < canary.indexOf("iPad"));
  for (const phrase of ["stable", "Beta/TestFlight", "版本/build", "真实回滚", "Manifest hash", "现有规则集点 Update"]) {
    assert.ok(canary.includes(phrase), `canary missing ${phrase}`);
  }
  for (const phrase of ["UUID", "名称 + 同名序号", "不要反复删订阅", "iCloud", "不是完整备份", "100,000", "95,000"]) {
    assert.ok(troubleshooting.includes(phrase), `troubleshooting missing ${phrase}`);
  }
  assert.match(troubleshooting, /广告包[\s\S]*内存/u);
  assert.doesNotMatch(`${canary}\n${troubleshooting}`, /重新导入.{0,12}(?:无损|保留全部)/u);
});

test("canary, deployment, and troubleshooting document the ChinaTLD order and offline explain", async () => {
  const { canary, deployment, troubleshooting } = await docs();
  const routingOrder = /DomesticCore[\s\S]*OverseasGame[\s\S]*ChinaTLD[\s\S]*ChinaIP/u;
  assert.match(canary, routingOrder);
  assert.match(deployment, routingOrder);
  assert.match(troubleshooting, routingOrder);
  for (const [name, text] of Object.entries({ canary, deployment, troubleshooting })) {
    for (const phrase of ["explain:route", "只读取本地已发布规则"]) {
      assert.ok(text.includes(phrase), `${name} missing ${phrase}`);
    }
  }
  for (const [name, text] of Object.entries({ canary, troubleshooting })) {
    for (const phrase of ["HTTPDNS", "硬编码 IP"]) {
      assert.ok(text.includes(phrase), `${name} missing ${phrase}`);
    }
  }
  assert.ok(troubleshooting.includes("本地 assignment"), "troubleshooting missing Anywhere assignment note");
});
