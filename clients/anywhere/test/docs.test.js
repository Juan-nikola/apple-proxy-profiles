import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = {
  readme: new URL("../README.md", import.meta.url),
  deployment: new URL("../docs/deployment.md", import.meta.url),
  canary: new URL("../docs/canary.md", import.meta.url),
  troubleshooting: new URL("../docs/troubleshooting.md", import.meta.url),
};

async function docs() {
  return Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, url]) => [key, await readFile(url, "utf8")])));
}

test("documents the exact three-layer boundary and pinned compatibility", async () => {
  const content = await docs();
  for (const [name, text] of Object.entries(content)) assert.ok(text.length > 300, `${name} is incomplete`);
  for (const phrase of ["私密节点订阅", ".arrs", "设备设置", "Default", "并非停用"]) {
    assert.match(content.readme, new RegExp(phrase.replace(".", "\\."), "u"));
  }
  assert.match(content.readme, /e15518fde1f5d2652dfc1c234c89a68b87cecec0|上游兼容性/u);
  assert.match(content.readme, /32 个[\s\S]*34 个[\s\S]*375,265/u);
  assert.match(content.readme, /95,000.*100,000/u);
});

test("deployment pins private arguments, all import layers, and manual refresh", async () => {
  const { deployment } = await docs();
  for (const phrase of [
    "output=nodes&type=collection&name=shadowrocket-sources&clientChain=off",
    "https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html",
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
});

test("README is independently copyable for the two-layer Sub-Store node setup", async () => {
  const { readme, deployment } = await docs();
  for (const phrase of [
    "https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js",
    "output=nodes&type=collection&name=shadowrocket-sources&clientChain=off",
    "Sub-Store 不需要先创建独立脚本记录",
    "accepted",
  ]) assert.ok(readme.includes(phrase), `README missing ${phrase}`);
  assert.match(readme, /JS_URL#output=nodes[^\n]+不能使用 `\?`/u);
  assert.match(deployment, /File\/文件[^\n]+Script\/脚本操作[^\n]+链接模式[^\n]+参数/u);
  assert.match(readme, /不会创建[^\n]+`anywhere-profile-generator\.js`/u);
  assert.match(deployment, /不要创建 `anywhere-profile-generator\.js`/u);
});

test("canary and troubleshooting lock safe order, UUID risks, and real rollback", async () => {
  const { canary, troubleshooting } = await docs();
  assert.ok(canary.indexOf("iPhone") < canary.indexOf("iPad"));
  for (const phrase of ["stable", "Beta/TestFlight", "版本/build", "真实回滚", "/current/", "/previous/", "versions/<hash>", "现有规则集点 Update"]) {
    assert.ok(canary.includes(phrase), `canary missing ${phrase}`);
  }
  for (const phrase of ["UUID", "名称 + 同名序号", "不要反复删订阅", "iCloud", "不是完整备份", "100,000", "95,000"]) {
    assert.ok(troubleshooting.includes(phrase), `troubleshooting missing ${phrase}`);
  }
  assert.doesNotMatch(`${canary}\n${troubleshooting}`, /重新导入.{0,12}(?:无损|保留全部)/u);
});
