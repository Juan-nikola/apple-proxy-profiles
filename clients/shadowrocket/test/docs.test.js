import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const shadowrocketRoot = resolve(import.meta.dirname, "..");

test("beginner docs contain every operational checkpoint and warning", async () => {
  const paths = ["README.md", "RELEASE_CHECKLIST.md", "docs/deployment.md", "docs/maintenance.md", "docs/troubleshooting.md", "docs/canary-checklist.md"];
  const files = await Promise.all(paths.map((file) => readFile(resolve(shadowrocketRoot, file), "utf8")));
  const docs = Object.fromEntries(paths.map((file, index) => [file, files[index]]));
  const text = files.join("\n");
  for (const phrase of [
    "shadowrocket-nodes", "shadowrocket-config-macos", "shadowrocket-config-iphone", "shadowrocket-config-ipad",
    "每 6 小时", "每天", "Intel Mac", "iPhone", "iPad", "回滚", "HTTPS 解密", "iCloud",
    "私密转送", "AirPlay", "HomeKit", "NAS", "打印机", "7 天", "clientChain",
    "dnsMode", "quicMode", "ipv6Mode", "blockMode", "autoGroupMode", "评论地区",
  ]) assert.ok(text.includes(phrase), `missing documentation phrase: ${phrase}`);

  const headingsInOrder = (file, headings) => {
    let previous = -1;
    for (const heading of headings) {
      const current = docs[file].indexOf(heading);
      assert.ok(current > previous, `${file}: missing or out-of-order heading: ${heading}`);
      previous = current;
    }
  };

  headingsInOrder("docs/deployment.md", [
    "## 0. 部署前备份",
    "## 1. 准备 Sub-Store 来源",
    "## 2. 创建节点 Script Operator",
    "## 3. 创建三个配置 File Script Operator",
    "## 灰度前的客户端设置（必须先完成）",
    "## 4. Intel Mac 灰度",
    "## 5. iPhone 与 iPad",
    "## 6. 必须手工设置的客户端选项",
    "## 7. 页面名称不完全相同时怎么找",
  ]);
  headingsInOrder("docs/maintenance.md", [
    "## 新增或修改来源",
    "## 打开客户端链式",
    "## 参数修改表",
    "## 创建版本化测试 Profile",
  ]);
  headingsInOrder("docs/troubleshooting.md", [
    "## 先回滚",
    "## 节点更新失败",
    "## 规则下载失败",
    "## DNS 污染或网站指向异常",
    "## AirPlay、HomeKit、NAS、打印机或路由器失效",
    "## IPv6 异常",
    "## QUIC 或游戏异常",
    "## AI 登录或风控",
    "## 评论地区没有变化",
    "## 可以分享什么",
  ]);

  const defaultParameters = "output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off";
  assert.ok(docs["docs/deployment.md"].includes(defaultParameters), "deployment: missing exact default parameter string");
  for (const phrase of [
    "subscriptionName",
    "完全一致",
    "Shadowrocket-Nodes,use=true",
    "policy-select-name=🚀 节点选择",
    "policy-select-name=DIRECT",
  ]) assert.ok(text.includes(phrase), `missing named-subscription guidance: ${phrase}`);
  assert.doesNotMatch(text, /兼容占位参数/);
  for (const phrase of [
    "macOS、iPhone、iPad 三个 Profile File Operator",
    "`SHADOWROCKET-NODES`",
    "三个 Profile File Operator 的 `subscriptionName` 都必须精确填写 `SHADOWROCKET-NODES`",
  ]) assert.ok(docs["docs/deployment.md"].includes(phrase), `deployment: missing exact subscription-name guidance: ${phrase}`);
  assert.ok(docs["README.md"].includes("`🚀 节点选择 = select,PROXY`"), "README.md: missing exact homepage-follow root group");
  for (const phrase of ["显式选择仍会出现", "不会显示该订阅的具体服务器"]) {
    assert.ok(docs["docs/troubleshooting.md"].includes(phrase), `troubleshooting: missing name-mismatch outcome: ${phrase}`);
  }
  for (const phrase of [
    "打开 `🐙 GitHub` 和 `🍎 Apple`",
    "所有显式选择及匹配订阅的具体服务器都存在",
    "在 Shadowrocket 首页切换节点后，`🐙 GitHub` 仍选择 `🚀 节点选择`",
  ]) assert.ok(docs["docs/canary-checklist.md"].includes(phrase), `canary: missing named-subscription validation: ${phrase}`);
  for (const phrase of ["Shadowrocket-Nodes,use=true", "PROXY", "ChinaMax_Domain", "问道手游"]) {
    assert.ok(text.includes(phrase), `missing enhanced-routing documentation phrase: ${phrase}`);
  }
  assert.doesNotMatch(text, /include-all-proxies=true/, "documentation must not describe legacy all-proxy dynamic groups");
  assert.doesNotMatch(text, /规则(?:和节点 Operator )?内容未改变/, "documentation must disclose the approved rule delta");
  for (const file of ["README.md", "RELEASE_CHECKLIST.md"]) {
    assert.ok(docs[file].includes("AdvertisingLite"), `${file}: missing legacy AdvertisingLite migration note`);
    assert.ok(docs[file].includes("Advertising"), `${file}: missing full Advertising migration note`);
    assert.ok(docs[file].includes("Advertising_Domain.list"), `${file}: missing split domain source guidance`);
  }
  const ruleCommand = "npm --workspace @apple-proxy-profiles/shadowrocket run check:rules";
  for (const file of ["README.md", "RELEASE_CHECKLIST.md", "docs/maintenance.md", "docs/troubleshooting.md"]) {
    assert.ok(docs[file].includes(ruleCommand), `${file}: missing repository-root rule-check command`);
  }
  assert.ok(
    docs["README.md"].includes("动态组只含与 `subscriptionName` 完全匹配的 `<subscriptionName>,use=true`"),
    "README.md: generated-profile check must use the named subscription source",
  );
  for (const phrase of [
    "`🚀 节点选择`只包含 `PROXY`",
    "境外业务分组默认跟随 `🚀 节点选择`",
    "国内业务分组默认 `DIRECT`",
    "自动测速和故障转移已移到境外业务分组",
  ]) assert.ok(docs["README.md"].includes(phrase), `README.md: missing homepage-follow phrase: ${phrase}`);

  for (const phrase of ["本项目不配置服务器端认证、TLS 或管理页面加固", "秘密 URL 不是访问控制"]) {
    assert.ok(docs["README.md"].includes(phrase), `README.md: missing public Sub-Store warning: ${phrase}`);
    assert.ok(docs["docs/deployment.md"].includes(phrase), `deployment: missing public Sub-Store warning: ${phrase}`);
  }
  for (const phrase of ["日期+参数后缀", "发布为新的 URL", "不要覆盖旧 File 或旧 URL"]) {
    assert.ok(docs["docs/maintenance.md"].includes(phrase), `maintenance: missing versioned Profile safety phrase: ${phrase}`);
  }
  const chainSection = docs["docs/maintenance.md"].split("## 打开客户端链式\n", 2)[1]?.split("\n## ", 1)[0] ?? "";
  const chainSubscriptionName = "Shadowrocket-Nodes-Chain-Test-YYYYMMDD";
  for (const phrase of [
    "shadowrocket-sources-chain-test-YYYYMMDD",
    "output=nodes&clientChain=off",
    "output=nodes&clientChain=on",
    "shadowrocket-nodes-chain-test-YYYYMMDD",
    "name=shadowrocket-sources-chain-test-YYYYMMDD",
    "原来的 `shadowrocket-nodes` 保持不变",
  ]) assert.ok(chainSection.includes(phrase), `maintenance chain procedure: missing isolated-stack phrase: ${phrase}`);
  assert.match(
    chainSection,
    new RegExp(`显示名准确填写 \`${chainSubscriptionName}\`[\\s\\S]*subscriptionName=${chainSubscriptionName}`),
    "maintenance chain procedure: test subscription display name must match subscriptionName",
  );
  for (const phrase of [
    "动态组只从 `subscriptionName` 精确指定的测试订阅读取",
    "无需因防混入而暂停生产订阅",
  ]) assert.ok(chainSection.includes(phrase), `maintenance chain procedure: missing named-subscription isolation: ${phrase}`);
  assert.doesNotMatch(chainSection, /同一正则匹配|筛选客户端全部当前代理|不会混入正式订阅节点/);
  assert.ok(chainSection.includes("[已有链]"), "maintenance: missing reserved existing-chain marker guidance");
  assert.ok(docs["docs/troubleshooting.md"].includes("[已有链]"), "troubleshooting: missing reserved existing-chain marker guidance");
  assert.doesNotMatch(chainSection, /将节点 Script Operator 参数改为/, "maintenance chain procedure must not mutate the shared node Script Operator");
  assert.ok(
    docs["docs/maintenance.md"].includes("`clientChain` 不使用这套仅复制 File 的流程"),
    "maintenance: generic versioned Profile workflow must exclude clientChain",
  );
  for (const phrase of ["页面能打开不是证明", "记录候选目标和测试日期", "GEOIP,CN,DIRECT", "FINAL,🚀 节点选择"]) {
    assert.ok(docs["docs/canary-checklist.md"].includes(phrase), `canary: missing executable unknown-route check: ${phrase}`);
  }
  for (const phrase of ["导入并排在旧 Profile 旁边", "不要覆盖回滚 File 或 URL"]) {
    assert.ok(docs["docs/troubleshooting.md"].includes(phrase), `troubleshooting: missing rollback-safe test Profile phrase: ${phrase}`);
  }

  for (const [file, markdown] of Object.entries(docs)) {
    for (const match of markdown.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].split("#", 1)[0];
      if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const linkedPath = resolve(shadowrocketRoot, dirname(file), target);
      await assert.doesNotReject(readFile(linkedPath), `${file}: broken local Markdown link: ${match[1]}`);
    }
  }
});

test("migration documentation keeps Sub-Store objects stable while using monorepo script paths", async () => {
  const paths = ["README.md", "docs/deployment.md", "docs/maintenance.md", "docs/troubleshooting.md", "docs/canary-checklist.md", "RELEASE_CHECKLIST.md"];
  const files = await Promise.all(paths.map((file) => readFile(resolve(shadowrocketRoot, file), "utf8")));
  const docs = Object.fromEntries(paths.map((file, index) => [file, files[index]]));

  const nodeOperatorPath = "clients/shadowrocket/dist/shadowrocket-node-operator.js";
  const profileGeneratorPath = "clients/shadowrocket/dist/shadowrocket-profile-generator.js";
  for (const scriptPath of [nodeOperatorPath, profileGeneratorPath]) {
    assert.ok(docs["README.md"].includes(scriptPath), `README.md: missing monorepo script path: ${scriptPath}`);
    const fileName = scriptPath.split("/").at(-1);
    assert.ok(docs["docs/deployment.md"].includes(fileName), `deployment: missing operator installation name: ${fileName}`);
  }
  assert.ok(docs["docs/maintenance.md"].includes("shadowrocket-node-operator.js"), "maintenance: missing isolated-chain node operator name");
  assert.ok(docs["docs/canary-checklist.md"].includes("shadowrocket-profile-generator.js"), "canary: missing current Profile generator name");
  assert.match(docs["docs/deployment.md"], /substore-node-operator\.js[\s\S]*兼容/u);
  assert.match(docs["docs/deployment.md"], /链接\/远程脚本[\s\S]*Pages URL[\s\S]*参数/u);
  assert.ok(docs["docs/canary-checklist.md"].includes("clients/shadowrocket/dist/"), "canary: missing current generated-output directory");
  assert.ok(docs["docs/canary-checklist.md"].includes("clients/shadowrocket/examples/"), "canary: missing current generated-example directory");
  for (const [file, markdown] of Object.entries(docs)) {
    assert.doesNotMatch(
      markdown,
      /(?<!clients\/shadowrocket\/)dist\/(?:substore-node-operator|substore-profile-generator)\.js/,
      `${file}: contains an obsolete root-level operator path`,
    );
  }
  assert.match(docs["docs/deployment.md"], /shadowrocket-sources[\s\S]*已发布 URL 都不要重命名/);
  assert.ok(docs["docs/deployment.md"].includes("HTTPS 解密保持关闭"), "deployment: HTTPS decryption must remain off");
  assert.ok(docs["docs/troubleshooting.md"].includes("旧 Profile"), "troubleshooting: missing old Profile rollback guidance");
});

test("README is independently copyable for the two-layer Sub-Store setup", async () => {
  const readme = await readFile(resolve(shadowrocketRoot, "README.md"), "utf8");
  const deployment = await readFile(resolve(shadowrocketRoot, "docs/deployment.md"), "utf8");
  for (const url of [
    "https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-operator.js",
    "https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js",
  ]) assert.ok(readme.includes(url), `README.md: missing canonical Pages URL: ${url}`);
  for (const task of [
    "shadowrocket-config-macos",
    "shadowrocket-config-iphone",
    "shadowrocket-config-ipad",
  ]) assert.ok(readme.includes(task), `README.md: missing task: ${task}`);
  for (const platform of ["macos", "iphone", "ipad"]) {
    assert.match(readme, new RegExp(`output=config[^\n]+platform=${platform}`, "u"), `README.md: ${platform} arguments`);
  }
  assert.match(readme, /Sub-Store 不需要先创建独立脚本记录/u);
  assert.match(readme, /JS_URL#arg1=value1&arg2=value2[^\n]+不能使用 `\?`/u);
  assert.match(deployment, /File\/文件[^\n]+Script\/脚本操作[^\n]+链接模式[^\n]+参数/u);
  assert.match(deployment, /subscriptionName[^\n]+百分号编码/u);
});
