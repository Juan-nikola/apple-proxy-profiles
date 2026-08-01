import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

test("beginner docs contain every operational checkpoint and warning", async () => {
  const paths = ["README.md", "docs/deployment.md", "docs/maintenance.md", "docs/troubleshooting.md", "docs/canary-checklist.md"];
  const files = await Promise.all(paths.map((file) => readFile(file, "utf8")));
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

  const defaultParameters = "output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=allow&ipv6Mode=auto&autoGroupMode=auto&clientChain=off";
  assert.ok(docs["docs/deployment.md"].includes(defaultParameters), "deployment: missing exact default parameter string");

  for (const phrase of ["本项目不配置服务器端认证、TLS 或管理页面加固", "秘密 URL 不是访问控制"]) {
    assert.ok(docs["README.md"].includes(phrase), `README.md: missing public Sub-Store warning: ${phrase}`);
    assert.ok(docs["docs/deployment.md"].includes(phrase), `deployment: missing public Sub-Store warning: ${phrase}`);
  }
  for (const phrase of ["日期+参数后缀", "发布为新的 URL", "不要覆盖旧 File 或旧 URL"]) {
    assert.ok(docs["docs/maintenance.md"].includes(phrase), `maintenance: missing versioned Profile safety phrase: ${phrase}`);
  }
  const chainSection = docs["docs/maintenance.md"].split("## 打开客户端链式\n", 2)[1]?.split("\n## ", 1)[0] ?? "";
  for (const phrase of [
    "shadowrocket-sources-chain-test-YYYYMMDD",
    "output=nodes&clientChain=off",
    "output=nodes&clientChain=on",
    "shadowrocket-nodes-chain-test-YYYYMMDD",
    "Shadowrocket-Nodes-Chain-Test-YYYYMMDD",
    "name=shadowrocket-sources-chain-test-YYYYMMDD",
    "subscriptionName=Shadowrocket-Nodes-Chain-Test-YYYYMMDD",
    "原来的 `shadowrocket-nodes` 保持不变",
    "三个值必须属于同一套隔离测试栈",
  ]) assert.ok(chainSection.includes(phrase), `maintenance chain procedure: missing isolated-stack phrase: ${phrase}`);
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
      const linkedPath = resolve(dirname(file), target);
      await assert.doesNotReject(readFile(linkedPath), `${file}: broken local Markdown link: ${match[1]}`);
    }
  }
});

