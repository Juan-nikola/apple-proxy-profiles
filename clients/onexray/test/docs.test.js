import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const repositoryRoot = new URL("../../../", import.meta.url);
const DOCS = Object.freeze({
  readme: new URL("README.md", root),
  deployment: new URL("docs/deployment.md", root),
  troubleshooting: new URL("docs/troubleshooting.md", root),
  canary: new URL("docs/canary.md", root),
});

async function text(url) {
  return readFile(url, "utf8");
}

test("OneXray docs name the three private tasks and public scripts", async () => {
  const readme = await text(DOCS.readme);
  const deployment = await text(DOCS.deployment);
  for (const task of ["onexray-nodes", "onexray-profile", "onexray-routing-audit"]) {
    assert.match(deployment, new RegExp(`\`${task}\``, "u"), task);
  }
  assert.match(deployment, /onexray-nodes-generator\.js/u);
  assert.match(deployment, /onexray-profile-generator\.js/u);
  assert.match(deployment, /https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles\/edge\/onexray\/scripts\/onexray-nodes-generator\.js/u);
  assert.match(deployment, /https:\/\/juan-nikola\.github\.io\/apple-proxy-profiles\/edge\/onexray\/scripts\/onexray-profile-generator\.js/u);
  assert.match(readme, /onexray:\/\/onexray\.com\/dat\/add/u);
  assert.match(readme, /edge[\s\S]{0,160}canary|Edge[\s\S]{0,160}候选/iu);
});

test("OneXray docs pin option enums and defaults", async () => {
  const readme = await text(DOCS.readme);
  const deployment = await text(DOCS.deployment);
  const combined = `${readme}\n${deployment}`;
  for (const token of [
    "output=nodes|profile|audit",
    "channel=edge|current|previous",
    "dnsMode=stable",
    "chinaDns=alidns",
    "globalDns=cloudflare",
    "blockMode=balanced",
    "quicMode=proxy-block",
    "ipv6Mode=auto",
    "clientChain=off",
    "policyOverrides",
    "logLevel",
    "dnsLog",
  ]) {
    assert.match(combined, new RegExp(token.replaceAll("|", "\\|"), "u"), token);
  }
  assert.match(combined, /Base64URL[\s\S]{0,180}不是加密/u);
  assert.match(combined, /32 KiB/u);
});

test("OneXray docs describe exact fixed-node failure semantics without automation", async () => {
  const troubleshooting = await text(DOCS.troubleshooting);
  assert.match(troubleshooting, /固定节点[\s\S]{0,220}(?:该业务|这一业务)/u);
  assert.match(troubleshooting, /不会自动(?:回退|切换)/u);
  assert.match(troubleshooting, /(?:不会|没有).{0,60}(?:通知|告警)/u);
  assert.match(troubleshooting, /(?:不提供|没有|不存在).{0,40}(?:应急 Profile|紧急 Profile)/u);
  assert.match(troubleshooting, /节点刷新[\s\S]{0,140}固定(?:节点|快照)/u);
});

test("OneXray deployment docs cover Rule mode, Profile versioning, and channel pairing", async () => {
  const deployment = await text(DOCS.deployment);
  assert.match(deployment, /Rule 模式/u);
  assert.match(deployment, /Profile[^\n]{0,6}(?:版本|名称)[\s\S]{0,140}(?:8 位|内容哈希|hash)/iu);
  assert.match(deployment, /current[\s\S]{0,240}previous[\s\S]{0,140}(?:配对|依赖|配套)/u);
  assert.match(deployment, /未晋级|不能直接(?:当|作为) current|只能.*edge/u);
});

test("OneXray troubleshooting covers macOS System Extension and Ping/status/log diagnosis", async () => {
  const troubleshooting = await text(DOCS.troubleshooting);
  assert.match(troubleshooting, /macOS[\s\S]{0,320}(?:系统扩展|System Extension)[\s\S]{0,220}日志/u);
  assert.match(troubleshooting, /Ping/u);
  assert.match(troubleshooting, /状态/u);
  assert.match(troubleshooting, /日志/u);
});

test("OneXray canary gates include per-platform TUN/IPv6 checklists", async () => {
  const canary = await text(DOCS.canary);
  for (const platform of ["macOS", "iPhone", "iPad", "Android", "Windows", "Linux"]) {
    const match = new RegExp(`## ${platform}\\n([\\s\\S]*?)(?=\\n## |$)`, "u").exec(canary);
    assert.ok(match, `missing ${platform} section`);
    assert.match(match[1], /TUN/u, `${platform} TUN`);
    assert.match(match[1], /IPv6/u, `${platform} IPv6`);
  }
  assert.doesNotMatch(canary, /- \[x\]/iu);
  assert.match(canary, /- \[ \]/u);
});

test("OneXray canary table starts with no platform marked passed", async () => {
  const canary = await text(DOCS.canary);
  const lines = canary.split("\n");
  const header = lines.findIndex((line) => line.startsWith("| 平台 "));
  assert.ok(header >= 0, "canary table header is missing");
  const firstRow = lines[header + 2];
  assert.match(firstRow, /\| macOS \|/u);
  assert.doesNotMatch(firstRow, /✅|✔|已通过/u);
  assert.match(firstRow, /未|待执行/u);
});

test("repository status and guides document the OneXray tasks as 19 total", async () => {
  const status = await text(new URL("docs/implementation-status.md", repositoryRoot));
  const guide = await text(new URL("docs/substore-two-layer-setup.md", repositoryRoot));
  const maintenance = await text(new URL("docs/maintenance.md", repositoryRoot));
  assert.match(status, /OneXray/u);
  assert.match(status, /19 个任务/u);
  for (const task of ["onexray-nodes", "onexray-profile", "onexray-routing-audit"]) {
    assert.match(guide, new RegExp(`\`${task}\``, "u"), task);
  }
  assert.match(guide, /4\+1\+3\+4\+4\+3=19 个任务/u);
  assert.match(maintenance, /clients\/onexray\//u);
  assert.match(maintenance, /onexray\/docs\//u);
  const rootReadme = await text(new URL("README.md", repositoryRoot));
  assert.match(rootReadme, /OneXray/u);
  assert.match(rootReadme, /clients\/onexray\/README\.md/u);
});
