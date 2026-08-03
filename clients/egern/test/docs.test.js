import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { renderEgernProfile } from "../src/render-profile.js";
import { shadowsocks2022 } from "./fixtures/nodes.js";

const FILES = Object.freeze({
  readme: new URL("../README.md", import.meta.url),
  deployment: new URL("../docs/deployment.md", import.meta.url),
  canary: new URL("../docs/canary.md", import.meta.url),
  troubleshooting: new URL("../docs/troubleshooting.md", import.meta.url),
});

async function loadDocs() {
  return Object.fromEntries(await Promise.all(Object.entries(FILES).map(async ([name, url]) => (
    [name, await readFile(url, "utf8")]
  ))));
}

function ordered(text, values, label) {
  let previous = -1;
  for (const value of values) {
    const index = text.indexOf(value, previous + 1);
    assert.ok(index > previous, `${label}: ${value}`);
    previous = index;
  }
}

function codeArguments(text, output) {
  return [...text.matchAll(/`([^`\r\n]+)`/gu)]
    .map((match) => match[1])
    .filter((value) => value.startsWith(`output=${output}&`));
}

function markdownSection(text, heading, nextHeading) {
  const start = text.indexOf(heading);
  assert.notEqual(start, -1, heading);
  const end = nextHeading === undefined ? text.length : text.indexOf(nextHeading, start + heading.length);
  assert.notEqual(end, -1, nextHeading);
  return text.slice(start, end);
}

function generatedProfile(platform) {
  return renderEgernProfile({
    output: "config",
    type: "collection",
    name: "shadowrocket-sources",
    nodeSubscriptionUrl: "https://example.invalid/private/egern-nodes",
    platform,
  }, [shadowsocks2022]);
}

function strictProfileRootKeys(profile) {
  const keys = [];
  for (const line of profile.split("\n")) {
    if (line === "" || line.startsWith(" ")) continue;
    const match = line.match(/^([a-z][a-z0-9_]*):(?: |$)/u);
    assert.ok(match, `unexpected generated root line: ${line}`);
    keys.push(match[1]);
  }
  assert.ok(keys.length > 0, "generated Profile root must not be empty");
  assert.equal(new Set(keys).size, keys.length, "generated Profile root keys must be unique");
  return keys;
}

test("all beginner documents exist, use portable Markdown, and are linked from README", async () => {
  const docs = await loadDocs();
  for (const [name, text] of Object.entries(docs)) {
    assert.equal(text.endsWith("\n"), true, `${name} must end with LF`);
    assert.equal(text.includes("\r"), false, `${name} must use LF only`);
    assert.doesNotMatch(text, /\/Users\/|\/home\/|[A-Za-z]:\\/u, name);
  }
  for (const target of ["docs/deployment.md", "docs/canary.md", "docs/troubleshooting.md"]) {
    assert.match(docs.readme, new RegExp(`\\]\\(${target.replace(".", "\\.")}\\)`, "u"), target);
  }

  for (const [name, text] of Object.entries(docs)) {
    const sourcePath = fileURLToPath(FILES[name]);
    for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)) {
      const target = match[1].split("#", 1)[0];
      if (target === "" || /^(?:https?:|egern:)/u.test(target)) continue;
      await access(resolve(dirname(sourcePath), decodeURIComponent(target)));
    }
  }
});

test("documents define the four private Sub-Store tasks in dependency order", async () => {
  const docs = await loadDocs();
  ordered(docs.deployment, ["`egern-nodes`", "`egern-macos`", "`egern-iphone`", "`egern-ipad`"], "task order");
  assert.match(docs.deployment, /egern-nodes[\s\S]*egern-node-generator\.js/u);
  for (const name of ["egern-macos", "egern-iphone", "egern-ipad"]) {
    assert.match(docs.deployment, new RegExp(`${name}[\\s\\S]*egern-profile-generator\\.js`, "u"), name);
  }
  assert.match(docs.deployment, /substore-node-generator\.js[\s\S]*兼容/u);
  assert.match(docs.deployment, /链接\/远程脚本[\s\S]*Pages URL[\s\S]*参数/u);
  assert.match(docs.readme, /远程链接模式[\s\S]*URL[\s\S]*#\.\.\.[\s\S]*读取 `\$arguments`/u);
  for (const platform of ["macos", "iphone", "ipad"]) {
    assert.match(docs.readme, new RegExp(`examples/egern-${platform}\\.yaml`, "u"), platform);
  }
  assert.match(docs.deployment, /已有|现有/u);
  assert.match(docs.deployment, /`shadowrocket-sources`/u);
  assert.match(docs.deployment, /不要.{0,12}(?:重命名|改名).{0,20}shadowrocket-sources/u);
});

test("README is independently copyable for the two-layer Sub-Store setup", async () => {
  const docs = await loadDocs();
  for (const url of [
    "https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js",
    "https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js",
  ]) assert.ok(docs.readme.includes(url), `README missing canonical Pages URL: ${url}`);
  for (const task of ["egern-nodes", "egern-macos", "egern-iphone", "egern-ipad"]) {
    assert.ok(docs.readme.includes(task), `README missing task: ${task}`);
  }
  assert.ok(codeArguments(docs.readme, "nodes").includes(
    "output=nodes&type=collection&name=shadowrocket-sources&clientChain=off",
  ));
  assert.equal(codeArguments(docs.readme, "config").length, 3);
  assert.match(docs.readme, /Sub-Store 不需要先创建独立脚本记录/u);
  assert.match(docs.readme, /JS_URL#arg1=value1&arg2=value2[^\n]+不能使用 `\?`/u);
  assert.match(docs.deployment, /File `egern-nodes`[\s\S]*Script\/脚本操作[\s\S]*链接模式[\s\S]*参数/u);
  assert.match(docs.deployment, /nodeSubscriptionUrl[^\n]+百分号编码/u);
});

test("README contains a complete current-UI beginner deployment path", async () => {
  const { readme } = await loadDocs();
  ordered(readme, [
    "### 1. 确认公共节点来源",
    "### 2. 创建 `egern-nodes`",
    "### 3. 创建三个 Egern Profile File",
    "### 4. 导入、灰度与回滚",
  ], "README beginner order");
  for (const phrase of [
    "单条脚本右侧的“启用”和“预览”都要勾选",
    "只用于全部展开/收起，不是运行总开关",
    "“关闭缓存”和“不验证服务器证书”保持未勾选",
    "<EGERN_NODES_PRIVATE_URL>",
    "顶层不出现 `proxies:` 是正确结构",
    "Intel Mac → iPhone → iPad",
  ]) assert.ok(readme.includes(phrase), `README missing beginner phrase: ${phrase}`);
  for (const key of [
    "nodeSubscriptionUrl", "dnsMode", "chinaDns", "globalDns", "blockMode",
    "quicMode", "ipv6Mode", "autoGroupMode", "clientChain",
  ]) assert.ok(readme.includes(`| \`${key}\` |`), `README missing parameter row: ${key}`);
});

test("copy-safe arguments use the exact collection and three distinct platform contracts", async () => {
  const { deployment } = await loadDocs();
  assert.ok(codeArguments(deployment, "nodes").includes(
    "output=nodes&type=collection&name=shadowrocket-sources&clientChain=off",
  ));

  const profiles = codeArguments(deployment, "config");
  assert.equal(profiles.length, 3);
  const platforms = new Set();
  for (const line of profiles) {
    const values = new URLSearchParams(line);
    assert.equal(values.get("output"), "config");
    assert.equal(values.get("type"), "collection");
    assert.equal(values.get("name"), "shadowrocket-sources");
    assert.equal(values.get("nodeSubscriptionUrl"), "https://example.invalid/private/egern-nodes");
    for (const key of [
      "dnsMode", "chinaDns", "globalDns", "blockMode", "quicMode",
      "ipv6Mode", "autoGroupMode", "clientChain",
    ]) assert.equal(values.has(key), true, `${values.get("platform")}: ${key}`);
    platforms.add(values.get("platform"));
  }
  assert.deepEqual(platforms, new Set(["macos", "iphone", "ipad"]));
  assert.match(profiles.find((line) => line.includes("platform=macos")), /ipv6Mode=ipv4-only/u);
  for (const platform of ["iphone", "ipad"]) {
    assert.match(profiles.find((line) => line.includes(`platform=${platform}`)), /ipv6Mode=auto/u);
  }
});

test("deployment documents only the exact generated Profile root structure", async () => {
  const { deployment } = await loadDocs();
  const rootContract = deployment.match(/生成的 Profile 根结构[^：\n]*：([^。\n]+)。/u);
  assert.ok(rootContract, "generated Profile root contract");
  const documentedKeys = [...rootContract[1].matchAll(/`([^`]+)`/gu)].map((match) => match[1]);
  const generatedRoots = ["macos", "iphone", "ipad"].map((platform) => ({
    platform,
    keys: strictProfileRootKeys(generatedProfile(platform)),
  }));
  for (const { platform, keys } of generatedRoots.slice(1)) {
    assert.deepEqual(keys, generatedRoots[0].keys, `${platform} generated Profile root`);
  }
  assert.deepEqual(documentedKeys, generatedRoots[0].keys);
  assert.match(deployment, /(?:不含|不会生成|不存在).{0,24}`url_rewrites`/u);
  assert.doesNotMatch(
    deployment,
    /(?:输出|Profile\s*(?:的\s*)?根结构)[^。\n]{0,24}(?:含|包含|包括)[^。\n]{0,180}`url_rewrites`/u,
  );
  assert.match(deployment, /(?:URL )?重写.{0,40}(?:不需要|不依赖|不会生成)/u);
});

test("refresh, auto-update, stable, and beta behavior are stated without conflation", async () => {
  const docs = await loadDocs();
  const text = `${docs.readme}\n${docs.deployment}`;
  assert.match(text, /21600.{0,24}(?:6\s*小时|六小时)|(?:6\s*小时|六小时).{0,24}21600/u);
  assert.match(text, /86400.{0,24}(?:24\s*小时|二十四小时)|(?:24\s*小时|二十四小时).{0,24}86400/u);
  assert.match(text, /节点.{0,30}21600/u);
  assert.match(text, /规则.{0,30}86400/u);
  assert.match(text, /`auto_update`.{0,40}(?:空|`\{\}`)/u);
  assert.match(text, /(?:重新运行|重新生成|刷新).{0,30}(?:Profile|配置).{0,30}(?:任务|File)/u);
  assert.match(text, /稳定版.{0,30}(?:基线|默认)/u);
  assert.match(text, /(?:beta|Beta|TestFlight).{0,40}(?:主动选择|自愿|可选|opt-in)/u);
  assert.match(text, /(?:beta|Beta|TestFlight)[\s\S]{0,180}同一份\s*Profile/u);
  assert.match(text, /feature flag|功能开关/u);
});

test("imports are private, percent-encoded, structure-only, and do not require MITM", async () => {
  const docs = await loadDocs();
  const text = Object.values(docs).join("\n");
  assert.match(docs.deployment, /(?:界面|UI).{0,30}(?:导入|添加).{0,30}(?:Profile|配置)/u);
  assert.match(docs.deployment, /egern:\/profiles\/new\?name=/u);
  assert.match(docs.deployment, /url=https%3A%2F%2Fexample\.invalid%2Fprivate%2Fegern-/u);
  assert.match(docs.deployment, /(?:name|url).{0,40}(?:百分号编码|URL 编码|percent-encode)/u);
  assert.match(text, /example\.invalid.{0,80}(?:占位|保留域名)/u);
  assert.match(text, /(?:结构示例|只用于检查结构).{0,80}(?:不能|不可).{0,30}(?:实际|直接|在线|联网)/u);
  assert.match(text, /(?:可用|实际使用).{0,40}(?:私密|自己的).{0,40}Sub-Store/u);
  assert.doesNotMatch(text, /TEST_ONLY/u);
  assert.doesNotMatch(text, /[?&](?:token|key|auth|password|secret)=/iu);
  assert.doesNotMatch(text, /https?:\/\/[^\s/"'`@]+(?::[^\s/"'`@]+)?@/iu);
  for (const match of text.matchAll(/https:\/\/([^\s/)<>"'`]+)/gu)) {
    assert.ok(["example.invalid", "egernapp.com", "juan-nikola.github.io"].includes(match[1]), match[0]);
  }
  assert.match(text, /(?:HTTPS 解密|MITM).{0,28}(?:不需要|无需|保持关闭)/u);
  assert.match(text, /(?:CA 证书|解密证书).{0,28}(?:不要|不得|不安装)/u);
  assert.match(text, /(?:脚本|重写|抓包|捕获).{0,50}(?:不需要|不要|不得)/u);
  assert.match(text, /egernapp\.com\/zh-CN\/docs\/(?:configuration\/(?:url_rewrites|http_captures)|url-scheme)/u);
});

test("canary is an exact one-device-at-a-time Intel Mac to iPhone to iPad gate", async () => {
  const { canary } = await loadDocs();
  ordered(canary, ["Intel Mac", "iPhone", "iPad"], "canary order");
  assert.match(canary, /(?:一次只|每次只).{0,10}(?:一台|1 台)|不得同时.{0,20}(?:设备|更新)/u);
  assert.match(canary, /旧\s*Profile.{0,50}(?:保留|不要覆盖|不要删除)/u);
  assert.match(canary, /(?:记录|记下).{0,30}(?:当前|现在).{0,30}(?:策略|节点)/u);
  assert.match(canary, /iCloud|同步/u);
  assert.match(canary, /(?:节点 URL|私密节点).{0,30}(?:规则 URL|公开规则).{0,30}(?:分别|独立)/u);
  assert.match(canary, /(?:total|normalized|归一化).{0,40}(?:accepted|接受)/u);
  assert.match(canary, /accepted.{0,24}(?:至少为 1|不小于 1|>=\s*1|不是 0)/u);
  assert.match(canary, /后续设备.{0,30}(?:不变|不要更新|保持原样)|停止.{0,30}(?:iPhone|iPad|后续)/u);
});

test("canary covers policies, traffic families, DNS, refresh, network, IPv6, QUIC, and chain", async () => {
  const { canary } = await loadDocs();
  for (const pattern of [
    /🚀 节点选择/u,
    /境外.{0,24}(?:代理优先|🚀 节点选择)/u,
    /国内.{0,24}(?:直连优先|DIRECT)/u,
    /`blockMode`|blockMode/u,
    /🧭 DNS 与规则下载.{0,30}(?:代理优先|🚀 节点选择)/u,
    /(?:悬空|dangling).{0,18}(?:空|策略组)|(?:空|缺失).{0,18}(?:必需|必要).{0,12}策略组/u,
    /局域网|路由器/u,
    /中国.{0,20}(?:网站|应用).{0,20}DIRECT/u,
    /境外.{0,20}🚀 节点选择/u,
    /🤖 AI 专用/u,
    /广告|安全规则/u,
    /🎮 游戏连接/u,
    /⬇️ 下载\/P2P/u,
    /DNS.{0,30}(?:解析|bootstrap|upstream)/u,
    /规则.{0,16}刷新/u,
    /节点.{0,16}刷新/u,
    /Wi-Fi.{0,20}(?:蜂窝|移动网络)/u,
    /macOS.{0,30}ipv4-only/u,
    /iPhone.{0,30}auto/u,
    /iPad.{0,30}auto/u,
    /`allow`[\s\S]{0,120}`proxy-block`[\s\S]{0,120}`all-block`/u,
    /HTTP\/3.{0,30}(?:不保证|不假设|不一定)/u,
    /clientChain=off|`clientChain`.{0,20}`off`/u,
    /(?:生成的)?落地(?:节点|\s*clone).{0,40}`prev_hop`.{0,40}`🔗 入口节点`/u,
  ]) assert.match(canary, pattern);
  assert.doesNotMatch(canary, /入口(?:节点)?.{0,30}`prev_hop`.{0,30}(?:指向|引用).{0,20}落地/u);
});

test("canary proves both IPv4-only and available IPv6 paths on every device", async () => {
  const { canary } = await loadDocs();
  assert.match(canary, /每台(?:适用)?设备.{0,30}(?:分别|都).{0,30}`ipv4-only`.{0,50}(?:可用|真实|原生).{0,12}IPv6/u);
  assert.match(canary, /默认值.{0,30}(?:不是|不等于).{0,20}(?:测试结果|验证结果|通过)/u);
  assert.match(canary, /(?:ISP|运营商|当前网络).{0,30}(?:没有|无|不提供).{0,15}IPv6.{0,40}(?:未覆盖|不可验证)/u);
  assert.match(canary, /(?:未覆盖|不可验证).{0,40}(?:不能|不得).{0,20}(?:通过|算作通过|视为通过)/u);
  assert.match(canary, /(?:不得|不能).{0,30}假设.{0,20}(?:存在|具备|有).{0,10}IPv6/u);

  const deviceSections = [
    markdownSection(canary, "## 1. Intel Mac", "## 2. iPhone"),
    markdownSection(canary, "## 2. iPhone", "## 3. iPad"),
    markdownSection(canary, "## 3. iPad", "## 立即停止的条件"),
  ];
  for (const section of deviceSections) {
    assert.match(section, /`ipv4-only`/u);
    assert.match(section, /`auto`[^。\n]{0,100}(?:可用|真实|原生)[^。\n]{0,16}IPv6(?:\s*路径)?/u);
  }
});

test("every device performs a real old-Profile rollback drill before promotion", async () => {
  const { canary } = await loadDocs();
  assert.match(canary, /每台设备.{0,30}(?:实际|真的).{0,20}回滚/u);
  ordered(canary, ["断开新 Profile", "选择旧 Profile", "启动旧 Profile"], "rollback actions");
  assert.match(canary, /中国.{0,20}(?:直连|DIRECT)/u);
  assert.match(canary, /境外.{0,20}(?:代理|🚀 节点选择)/u);
  assert.match(canary, /回滚.{0,30}(?:成功|通过).{0,40}(?:才|方可).{0,30}(?:新 Profile|继续)/u);
});

test("troubleshooting is a safe decision tree covering every fixed failure family", async () => {
  const { troubleshooting } = await loadDocs();
  for (const pattern of [
    /produceArtifact|producer/u,
    /不可用|unavailable/u,
    /拒绝|rejected/u,
    /非数组|不是数组|non-array/u,
    /空数组|空结果|empty/u,
    /没有兼容|无兼容/u,
    /excluded|排除原因/u,
    /401/u, /403/u, /404/u, /TLS/u, /可达/u,
    /主组.{0,20}空|🚀 节点选择.{0,20}空/u,
    /名称冲突|重名/u,
    /fingerprint|指纹/u,
    /不支持.{0,20}协议|协议.{0,20}不支持/u,
    /字段.{0,20}(?:错误|畸形|不完整)/u,
    /规则.{0,30}(?:节点文件|节点订阅).{0,30}(?:分别|独立)/u,
    /bootstrap/u, /upstream/u, /rule.?set|规则集/iu,
    /QUIC/u, /UDP/u,
    /IPv6-only/u, /双栈/u,
    /入口/u, /落地/u, /SSH/u, /clone|克隆/iu,
    /6\s*小时/u, /24\s*小时/u,
    /立即回滚/u,
    /断开新 Profile/u,
    /选择旧 Profile/u,
  ]) assert.match(troubleshooting, pattern);
  assert.match(troubleshooting, /(?:生成的)?落地(?:节点|\s*clone).{0,40}`prev_hop`.{0,40}`🔗 入口节点`/u);
  assert.doesNotMatch(troubleshooting, /入口(?:节点)?.{0,30}`prev_hop`.{0,30}(?:指向|引用).{0,20}落地/u);
});

test("docs forbid unsafe recovery and distinguish private-node from public-rule refresh", async () => {
  const docs = await loadDocs();
  const text = Object.values(docs).join("\n");
  assert.doesNotMatch(text, /建议.{0,20}(?:关闭|跳过).{0,20}(?:证书验证|TLS 验证)/u);
  assert.match(text, /(?:不要|不得).{0,30}(?:关闭|跳过).{0,20}(?:证书验证|TLS 验证)/u);
  assert.match(text, /(?:不要|不得).{0,30}(?:公开|发布|粘贴|上传).{0,30}(?:私密 URL|订阅 URL|Profile URL)/u);
  assert.match(text, /(?:不要|不得).{0,20}(?:开启|启用).{0,20}(?:MITM|HTTPS 解密)/u);
  assert.match(text, /(?:不要|不得).{0,30}(?:删除|覆盖).{0,20}旧\s*Profile/u);
  assert.match(text, /(?:不要|不得).{0,30}(?:绕过|削弱|关闭).{0,20}(?:fail-closed|失败即停止|校验)/u);
  assert.match(text, /节点.{0,40}(?:21600|6\s*小时)[\s\S]{0,160}规则.{0,40}(?:86400|24\s*小时)/u);
  assert.doesNotMatch(text, /节点.{0,20}规则.{0,20}(?:同一|相同).{0,12}(?:刷新|更新)间隔/u);
});
