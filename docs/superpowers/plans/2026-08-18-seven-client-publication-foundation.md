# 七客户端共享发布基础 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不实现 OneXray/HAPP 原生 renderer 的前提下，把七客户端注册、共享业务策略、严格私密策略文件、`edge/current/previous` 发布闭合、Blackmatrix7 唯一生产源、外部对照审计、中文看板和阻断 Issue 生命周期落成可独立测试、提升、回滚的共享基础。

**Architecture:** 以稳定客户端注册表为唯一能力来源；五个已有客户端保持 `active`，OneXray 与 HAPP 先注册为 `planned`，不生成伪造的原生配置。规则编译和公开发布只消费 Blackmatrix7 固定快照，gaoyifan、v2fly 与 dnsmasq 只产生脱敏审计；私密 Sub-Store 策略通过严格 JSON、频道快照和公开 Manifest/GeoData 摘要绑定。发布层统一由 `edge` 候选、单客户端人工提升、不可变版本和频道闭合扫描器保护。

**Tech Stack:** Node.js 22 ESM、Node 内置 `node:test`、npm workspaces、esbuild、protobufjs、GitHub Actions、GitHub REST API、GitHub Pages 静态文件、Sub-Store File 任务。

**Spec:** `docs/superpowers/specs/2026-08-18-seven-client-publication-foundation-design.md`

## Global Constraints

- 稳定客户端 ID 必须是 `anywhere`、`egern`、`shadowrocket`、`surge`、`singbox`、`onexray`、`happ`；ID 是 Manifest、发布目录、审计和 Sub-Store 映射的唯一键。
- 本阶段只激活现有五客户端；`onexray` 与 `happ` 只能作为 `planned` 适配器出现在注册表、审计和任务契约中，不能生成伪造的 Profile、JSON 订阅或 GeoData。
- 公开目录必须使用 `public/edge/<client>/`、`public/current/<client>/`、`public/previous/<client>/` 与 `public/versions/<manifest-hash>/<client>/`；现有五客户端的三个频道都必须闭合。
- `edge` 只能由每日北京时间 11:23（UTC 03:23）构建；任何自动任务都不得写入任一客户端 `current`。
- 人工提升必须输入精确客户端 ID、已测试 edge client Manifest SHA-256、canary 证据和 `canary-approval` 环境批准；提升不能移动其他客户端。
- Blackmatrix7 是唯一生产规则源；gaoyifan ChinaIP、v2fly domain-list-community 和 dnsmasq-china-list 只做审计，不自动合并。
- 生产源必须记录仓库、路径、完整 commit、抓取时间、原始摘要、许可证和来源说明；禁止生产使用第三方 `latest` URL。
- 十二个业务 ID 和默认目标固定为：`ai/FOLLOW`、`github/FOLLOW`、`youtube/FOLLOW`、`overseasMedia/FOLLOW`、`globalSocial/FOLLOW`、`overseasGame/FOLLOW`、`domesticCore/DIRECT`、`domesticPlatform/DIRECT`、`chinaIp/DIRECT`、`apple/DIRECT`、`microsoft/DIRECT`、`download/DIRECT`。
- 业务目标只允许 `FOLLOW`、`DIRECT`、`NODE:<完整规范化节点名>`；安全、HTTPDNS、严格隐私、系统内部流量不接受业务覆盖。
- 路由优先级固定为：本地与局域网 → 安全与隐私 → 明确服务业务 → 国内核心/国内平台 → 国内游戏 → 海外游戏 → 中国域名 → 解析后的中国 IP → 最终 FOLLOW。
- `DIRECT` 使用中国 DNS；`FOLLOW` 与固定节点使用代理侧 DNS；`BLOCK` 不触发外部解析；规则必须保留防 DNS 回环和内部 DNS 优先级。
- 私密 File 名为 `apple-proxy-policy`，顶层严格包含 `schemaVersion: 1` 和完整 `channels.edge/current/previous`；频道不得依赖另一个频道。
- 私密策略默认 `adblockMode=off`、`clientChain=off`；开启链必须同时有合法链目标并单独 canary；策略文件不得包含 UUID、密码、密钥、订阅 URL、节点 URI 或完整节点凭据。
- 任何跨频道 URL、JSON/YAML 字段、脚本参数或 HTML 深链都属于发布阻断；错误消息、日志、Manifest 和公开看板不得回显秘密。
- `v2fly` 对照审计固定调研基线 commit `9e582e167ca113188c1758bde9806aa260ba8c87`，递归展开 `data/cn` 的 include closure，并执行路径、循环、深度、文件数和总大小限制。
- 阻断 Issue 使用稳定审计键和 `audit-blocker` 标签；同一键只能有一个开放 Issue，恢复后自动关闭；普通差异只进入看板和 JSON。
- 全程 TDD：每个行为先写可执行失败测试，再写最小实现，再运行 focused GREEN、全量验证和 `git diff --check`；每个任务独立提交。

## File Structure and Responsibilities

- `shared/contracts.js`：稳定客户端 ID、既有选项枚举和节点元数据入口。
- `shared/release/client-catalog.js`：七客户端能力、平台、格式、适配器 schema、公开目录和 `active/planned` 状态。
- `shared/release/frontier-manifest.js`：频道、平台候选和客户端 Manifest 的结构化契约。
- `shared/serialization/strict-json.js`：重复键、原型污染键、未知根类型和深度/大小限制的通用 JSON 解析器。
- `shared/policies/business-targets.js`：十二业务目标、中文/英文兼容别名、默认目标和 `FOLLOW/DIRECT/NODE` 语法。
- `shared/policies/private-policy.js`：`apple-proxy-policy` 三频道严格解析、默认值和客户端覆盖合并。
- `shared/release/private-task-binding.js`：私密任务的频道、policy revision、公开 client Manifest 和 GeoData 摘要绑定。
- `shared/release/channel-closure.js`：文本、JSON、YAML、脚本和 HTML 的同频道引用扫描及不可变版本例外。
- `automation/src/build-artifacts.js`：Blackmatrix7 快照到共享五客户端公开产物、Manifest 和审计资产的拼装。
- `automation/src/build-site.js`、`automation/src/refresh-current.js`：原子 Pages 树、频道目录、不可变版本和单客户端提升。
- `scripts/update-rules.mjs`、`scripts/stage-rule-artifacts.mjs`：edge 构建、当前检查、previous 封存、单客户端提升和规则审计 stage。
- `automation/src/fetch-v2fly-domain-audit.js`、`automation/src/v2fly-domain-audit.js`：v2fly 固定快照、include closure、差异统计和严格报告。
- `automation/src/public-audit-dashboard.js`：脱敏中文看板 JSON/HTML，汇总来源、规则、频道、客户端、canary、闭合和 blocker。
- `automation/src/sync-audit-blocker-issues.js`、`scripts/sync-audit-blocker-issues.mjs`：稳定审计键的 Issue 创建、更新、去重和恢复关闭。
- `.github/workflows/update-rules.yml`、`scripts/check-actions.mjs`：最小 `issues: write` 权限、每日 edge 和手工提升顺序。
- `docs/substore-two-layer-setup.md`、`docs/substore-client-pools.md`、`docs/maintenance.md`：23 个 File 任务、频道回滚、审计查看和故障排查说明。
- 相关 `test/*.test.js`、`automation/test/*.test.js`、客户端测试和 regenerated `public/**`：契约、语义、来源、闭合、发布原子性和公开证据。

---

### Task 1: 建立七客户端注册表与 active/planned 发布状态

**Files:**
- Create: `shared/release/client-catalog.js`
- Modify: `shared/contracts.js`
- Modify: `shared/release/frontier-manifest.js`
- Modify: `test/client-set.test.js`
- Create: `test/client-catalog.test.js`
- Modify: `test/frontier-contract.test.js`

**Interfaces:**
- Produces `clientAdapter(client): ClientAdapter | undefined`、`activeClientIds(): readonly string[]`、`plannedClientIds(): readonly string[]`、`publicDirectoryForClient(client): string`。
- `ClientAdapter` 固定字段为 `{ id, displayName, state, platforms, configFormat, ruleFormat, nodeValidator, separatesProfile, supportsPolicyOverrides, adapterSchema, publicDirectory }`。
- 五个既有适配器的 `state` 为 `active`；`onexray` 与 `happ` 的 `state` 为 `planned`，`adapterSchema` 使用非空稳定字符串但不产生公开配置。

- [ ] **Step 1: 写失败测试，锁定七客户端顺序和能力字段**

```js
assert.deepEqual(allClientIds(), [
  "anywhere", "egern", "shadowrocket", "surge", "singbox", "onexray", "happ",
]);
assert.deepEqual(activeClientIds(), ["anywhere", "egern", "shadowrocket", "surge", "singbox"]);
assert.deepEqual(plannedClientIds(), ["onexray", "happ"]);
assert.equal(clientAdapter("happ").state, "planned");
assert.equal(publicDirectoryForClient("singbox"), "sing-box");
assert.throws(() => clientAdapter("unknown"), /unknown client/i);
```

同时验证所有数组和每个适配器深冻结；未知能力默认是 `false`，不能从客户端显示名称推断。

- [ ] **Step 2: 运行 focused 测试确认 RED**

运行：`node --test test/client-set.test.js test/client-catalog.test.js test/frontier-contract.test.js`

预期：失败，因为当前 `CLIENT` 只有五个客户端，且没有状态/目录/能力注册表。

- [ ] **Step 3: 实现最小注册表和 Contracts 扩展**

在 `shared/contracts.js` 增加：

```js
export const CLIENT = Object.freeze({
  anywhere: "anywhere", egern: "egern", shadowrocket: "shadowrocket",
  surge: "surge", singbox: "singbox", onexray: "onexray", happ: "happ",
});
```

在 `client-catalog.js` 以字面量表建立七条完整记录；`activeClientIds()` 只能返回 `state === "active"` 的记录，`plannedClientIds()` 只能返回 `state === "planned"` 的记录。`frontier-manifest.js` 使用注册表验证客户端 ID 和平台，但只有 active renderer 生成候选。

- [ ] **Step 4: 运行 focused 测试确认 GREEN**

运行同一命令；预期所有七客户端、状态、平台、目录和冻结检查通过，既有 Frontier 行为不变。

- [ ] **Step 5: 提交**

```bash
git add shared/contracts.js shared/release/client-catalog.js shared/release/frontier-manifest.js test/client-set.test.js test/client-catalog.test.js test/frontier-contract.test.js
git commit -m "feat: register seven client release states"
```

---

### Task 2: 提取严格 JSON 并对齐十二业务目标

**Files:**
- Create: `shared/serialization/strict-json.js`
- Modify: `shared/policies/business-targets.js`
- Modify: `shared/rules/semantic-intents.js`
- Modify: `shared/rules/lightweight-policy.js`
- Modify: `test/business-targets.test.js`
- Modify: `test/semantic-intents.test.js`
- Modify: `test/cross-client-routing.test.js`
- Create: `test/strict-json.test.js`

**Interfaces:**
- Produces `parseStrictJson(text, { label, maxBytes, maxDepth }): unknown`，对重复 JSON 键、`__proto__`/`prototype`/`constructor`、超限 UTF-8、过深对象和非 JSON 文本失败。
- `BUSINESS_TARGETS` 的稳定顺序为 `ai/github/youtube/overseasMedia/globalSocial/overseasGame/domesticCore/domesticPlatform/chinaIp/apple/microsoft/download`。
- `businessTargetByKey(key)` 保留已发布的带图标、无图标中文和英文别名；`parseBusinessOverrides(encoded)` 返回只含十二个稳定 ID 的冻结对象。
- `canonicalBusinessTarget(value)` 只返回大写 `FOLLOW`、大写 `DIRECT` 或保留 Unicode/大小写的 `NODE:<name>`。

- [ ] **Step 1: 写严格 JSON 和业务语义失败测试**

```js
assert.deepEqual(BUSINESS_TARGETS.map(({ id, defaultTarget }) => [id, defaultTarget]), [
  ["ai", "FOLLOW"], ["github", "FOLLOW"], ["youtube", "FOLLOW"],
  ["overseasMedia", "FOLLOW"], ["globalSocial", "FOLLOW"], ["overseasGame", "FOLLOW"],
  ["domesticCore", "DIRECT"], ["domesticPlatform", "DIRECT"], ["chinaIp", "DIRECT"],
  ["apple", "DIRECT"], ["microsoft", "DIRECT"], ["download", "DIRECT"],
]);
assert.throws(() => parseStrictJson('{"ai":"FOLLOW","ai":"DIRECT"}'), /duplicate/i);
assert.throws(() => parseStrictJson('{"__proto__":{}}'), /prototype|unsupported/i);
assert.deepEqual(parseBusinessOverrides(base64url({ "国内平台": "direct", ai: "node:🇯🇵 Tokyo" })), {
  domesticPlatform: "DIRECT", ai: "NODE:🇯🇵 Tokyo",
});
```

加入未知键、非对象根、空 `NODE:`、换行/Unicode 行分隔符、普通 Base64 `+` `/`、重复别名冲突和错误消息不得包含编码输入/节点秘密的测试。跨客户端 fixture 必须明确检查 `domesticCore`、`domesticPlatform`、`chinaIp`、六个海外业务、Apple、Microsoft、download 和最终 FOLLOW。

- [ ] **Step 2: 运行 focused 测试确认 RED**

运行：`node --test test/strict-json.test.js test/business-targets.test.js test/semantic-intents.test.js test/cross-client-routing.test.js`

预期：失败，因为当前目标表仍包含 `domestic`、`dnsAndRules`、`final`，且严格 JSON 检查内嵌在旧模块中。

- [ ] **Step 3: 实现严格 JSON 解析器和共享目标表**

`parseStrictJson` 先用 fatal UTF-8/字节限制和递归下降解析器检查重复键，再调用 `JSON.parse`；解析前拒绝三个原型污染键，解析后拒绝数组作为 policy 根。业务表把兼容键 `国内平台`、`domestic`、`🇨🇳 国内平台` 映射到 `domesticPlatform`，不再把 DNS 与规则下载、最终兜底伪装成可配置业务目标。将重复键检查从 `business-targets.js` 移到新模块，并保持错误不回显原文。

- [ ] **Step 4: 更新语义、DNS 类别和跨客户端预期**

令 `semantic-intents.js` 的顺序包含安全/隐私后十二业务语义；`lightweight-policy.js` 的 DNS 类别和 `ROUTING_PRECEDENCE` 明确 `domesticCore`、`domesticPlatform`、`chinaIp`，并保留明确海外服务优先于 ChinaIP。不要从某个客户端生成文本反推预期，测试直接读取共享语义。

- [ ] **Step 5: 运行 focused 测试确认 GREEN**

运行 Step 2 命令；预期严格 JSON、别名、默认目标、优先级和安全覆盖测试全部通过。

- [ ] **Step 6: 提交**

```bash
git add shared/serialization/strict-json.js shared/policies/business-targets.js shared/rules/semantic-intents.js shared/rules/lightweight-policy.js test/strict-json.test.js test/business-targets.test.js test/semantic-intents.test.js test/cross-client-routing.test.js
git commit -m "feat: align shared business target contract"
```

---

### Task 3: 实现 `apple-proxy-policy` 三频道严格契约和私密任务绑定

**Files:**
- Create: `shared/policies/private-policy.js`
- Create: `shared/release/private-task-binding.js`
- Create: `test/private-policy.test.js`
- Create: `test/private-task-binding.test.js`
- Modify: `shared/contracts.js`

**Interfaces:**
- `parsePrivatePolicy(text): PrivatePolicy` 接受严格 JSON 文本并返回深冻结结构。
- `resolvePrivatePolicy({ policy, channel, client }): ResolvedPrivatePolicy` 读取一个完整频道的 `defaults`，再应用该频道客户端覆盖。
- `bindPrivateTask({ client, channel, policy, publicManifest, geoDataSha256, readsPolicy }): PrivateTaskBinding` 返回 `{ client, channel, policyRevision, publicClientManifestSha256, geoDataSha256, readsPolicy }`，不返回节点或订阅字段。
- 频道 `defaults` 的确切结构为 `{ targets: {<十二 ID>: target}, dns: { chinaDns, globalDns }, adblockMode, clientChain }`；`happ`/`onexray` 覆盖只允许同一结构的可选字段。

- [ ] **Step 1: 写三频道、覆盖合并和秘密边界失败测试**

使用以下完整 fixture：

```json
{
  "schemaVersion": 1,
  "channels": {
    "edge": {
      "revision": "edge-2026-08-18-a",
      "defaults": {
        "targets": {"ai":"FOLLOW","github":"FOLLOW","youtube":"FOLLOW","overseasMedia":"FOLLOW","globalSocial":"FOLLOW","overseasGame":"FOLLOW","domesticCore":"DIRECT","domesticPlatform":"DIRECT","chinaIp":"DIRECT","apple":"DIRECT","microsoft":"DIRECT","download":"DIRECT"},
        "dns": {"chinaDns":"alidns","globalDns":"cloudflare"},
        "adblockMode":"off",
        "clientChain": {"mode":"off"}
      },
      "happ": {},
      "onexray": {}
    },
    "current": {"revision":"current-2026-08-18-a","defaults":{},"happ":{},"onexray":{}},
    "previous": {"revision":"previous-2026-08-18-a","defaults":{},"happ":{},"onexray":{}}
  }
}
```

测试要求三个频道各自完整存在；禁止缺频道、空 revision、未知键、重复键、非法 DNS/广告值、业务目标未知键、`NODE:` 空名、`clientChain.mode=on` 缺 `target`、安全字段覆盖、UUID/密码/URL/URI 字段和错误中出现秘密。验证 `resolvePrivatePolicy({ channel:"edge", client:"happ" })` 先应用 defaults 再应用 happ 覆盖。

- [ ] **Step 2: 运行 focused 测试确认 RED**

运行：`node --test test/private-policy.test.js test/private-task-binding.test.js`

预期：失败，因为仓库没有三频道私密 File 解析器和摘要绑定接口。

- [ ] **Step 3: 实现严格 schema 和覆盖合并**

使用 `parseStrictJson` 解析后逐层检查允许键集合；将 `targets` 规范化为十二个稳定 ID 的完整默认映射；`clientChain` 规范化为 `{ mode:"off" }` 或 `{ mode:"on", target:"NODE:<name>" }`。任何 `security`、`privacy`、HTTPDNS 或内部流量覆盖在 schema 层拒绝。`resolvePrivatePolicy` 对目标、DNS、adblock 和 chain 做深复制再冻结。

- [ ] **Step 4: 实现公开摘要绑定**

`bindPrivateTask` 要求 `channel` 属于 `edge/current/previous`、`publicManifest` 的 `client` 与参数一致、Manifest SHA-256 和 GeoData SHA-256 都是小写 64 位摘要；读取策略的任务必须有非空 policy revision，node-only 任务把 `readsPolicy` 设为 `false` 且不接受 policy override。绑定对象只能包含上述六个字段。

- [ ] **Step 5: 运行 focused 测试确认 GREEN**

运行 Step 2 命令；预期重复键、秘密、未知字段、频道闭合、覆盖合并和摘要不一致全部按预期失败/通过。

- [ ] **Step 6: 提交**

```bash
git add shared/contracts.js shared/policies/private-policy.js shared/release/private-task-binding.js test/private-policy.test.js test/private-task-binding.test.js
git commit -m "feat: add private three-channel policy contract"
```

---

### Task 4: 建立频道闭合扫描器并修复五客户端 previous 支持

**Files:**
- Create: `shared/release/channel-closure.js`
- Modify: `clients/egern/src/options.js`
- Modify: `clients/egern/src/render-rules.js`
- Modify: `clients/egern/src/render-dns.js`
- Modify: `clients/egern/src/validate-profile.js`
- Modify: `clients/shadowrocket/src/options.js`
- Modify: `clients/shadowrocket/src/render-rules.js`
- Modify: `clients/surge/src/options.js`
- Modify: `clients/sing-box/src/options.js`
- Modify: `automation/src/build-site.js`
- Create: `test/channel-closure.test.js`
- Modify: `clients/egern/test/options.test.js`
- Modify: `clients/egern/test/profile.test.js`
- Modify: `clients/egern/test/dns.test.js`
- Modify: `clients/egern/test/validation.test.js`
- Modify: `clients/shadowrocket/test/options.test.js`
- Modify: `clients/shadowrocket/test/profile.test.js`
- Modify: `clients/surge/test/profile.test.js`
- Modify: `clients/sing-box/test/config.test.js`

**Interfaces:**
- `findChannelClosureViolations({ files, channel, rootPrefix, immutableVersion = null }): readonly Violation[]` 扫描文本中的 `/edge|current|previous/` 路径段、`channel=` 参数、JSON/YAML channel 字段和 URL 编码后的等价形式。
- `assertChannelClosure(input)` 在发现跨频道引用时抛出包含文件相对路径和期望/实际频道的非秘密错误。
- 所有五个客户端的 `CHANNELS`/validator/rule base helper 都接受 `edge/current/previous`，默认仍是 `edge`；`versions/<hash>` 只能引用自身版本或显式频道。

- [ ] **Step 1: 写扫描器和五客户端 previous 失败测试**

```js
assert.deepEqual(
  findChannelClosureViolations({
    channel: "previous",
    files: new Map([
      ["surge/scripts/profile.js", "url='/previous/surge/rules/A.list'; channel='previous'"],
      ["surge/examples/bad.conf", "RULE-SET,https://site/current/surge/rules/A.list,DIRECT"],
      ["surge/examples/encoded.conf", "#channel%3Dedge"],
    ]),
  }).map(({ path }) => path),
  ["surge/examples/bad.conf", "surge/examples/encoded.conf"],
);
```

每个已有客户端都加入 `previous` 选项成功、`beta` 失败、规则 base URL 指向 `/previous/<client>/...` 的断言；Egern DNS/validator、Shadowrocket rules、Surge/sing-box options 全部直接验证 `previous`。

- [ ] **Step 2: 运行 focused 测试确认 RED**

运行：`node --test test/channel-closure.test.js clients/egern/test/options.test.js clients/egern/test/profile.test.js clients/egern/test/dns.test.js clients/egern/test/validation.test.js clients/shadowrocket/test/options.test.js clients/shadowrocket/test/profile.test.js clients/surge/test/profile.test.js clients/sing-box/test/config.test.js`

预期：扫描器不存在，客户端仍拒绝 `previous`，并且已有 generated previous/edge 产物中的 current 引用无法通过闭合检查。

- [ ] **Step 3: 实现扫描器**

对每个可解码 UTF-8 文本先做 `decodeURIComponent` 一次，再匹配频道路径、`channel` 参数和完整 URL；二进制输入只要求通过 Manifest 哈希，不把随机字节误判为频道。`immutableVersion` 只允许 `/versions/<64hex>/` 自引用；禁止跨频道和 `current`/`edge` 混用。返回按路径、偏移、实际频道排序的冻结记录。

- [ ] **Step 4: 扩展客户端 channel 常量和 renderer 校验**

把所有 `new Set(["edge", "current"])` 替换为共享 `FRONTIER_CHANNELS`；把 Egern/Shadowrocket/Surge/sing-box 的 URL 检查、诊断 fixture、Sub-Store 参数和 README fixture 都用传入 channel 构造，不能用字符串替换绕过校验。Anywhere 没有独立 channel 选项时，导入页生成器新增显式 `channel` 参数并默认 `edge`。

- [ ] **Step 5: 在 build-site 校验入口接入闭合扫描**

`validateClientPublication` 和 `validateDefaultPublication` 在 Manifest 文件闭合之后调用 `assertChannelClosure`；传入的 `basePrefix` 是 `edge`、`current`、`previous` 或 `versions/<hash>`，错误必须在发布前终止。

- [ ] **Step 6: 运行 focused 测试确认 GREEN**

运行 Step 2 命令；预期五客户端 previous 选项、URL、DNS、Profile validator 和恶意跨频道样本全部通过/失败于正确位置。

- [ ] **Step 7: 提交**

```bash
git add shared/release/channel-closure.js clients/egern/src clients/shadowrocket/src clients/surge/src clients/sing-box/src automation/src/build-site.js test/channel-closure.test.js clients/egern/test clients/shadowrocket/test clients/surge/test clients/sing-box/test
git commit -m "fix: close five-client publication channels"
```

---

### Task 5: 泛化发布原子性、Manifest 注册和 previous 初始封存

**Files:**
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/src/build-site.js`
- Modify: `automation/src/refresh-current.js`
- Modify: `scripts/update-rules.mjs`
- Modify: `scripts/check-substore-task.mjs`
- Modify: `test/update-rules.test.js`
- Modify: `test/substore-task-check.test.js`
- Modify: `automation/test/build-site.test.js`
- Modify: `automation/test/refresh-current.test.js`
- Modify: `test/public.test.js`

**Interfaces:**
- `buildArtifacts({ operation, publicDirectory, channel = "edge", ... })` 使用 `activeClientIds()` 生成五客户端产物，并在根审计 Manifest 的 `clientStates` 中记录七客户端的 `active/planned` 状态。
- `publishEdgeRelease({ publicDirectory, defaults, optionalPacks, manifest })` 只写 edge、rollout 和不可变版本，不写 current。
- `promoteClientRelease({ publicDirectory, client, expectedHash, canary })` 只移动一个 active 客户端的 current/previous，并重新生成同一原子 root artifact。
- 新增 `sealPreviousRelease({ publicDirectory })`：把现有 canonical current 快照转换为 previous，重写所有文本 URL/参数频道并重新计算 client/root Manifest；重复执行必须幂等。
- `parseUpdateRulesArguments` 接受 `--channel edge`、`--check --channel <edge|current|previous>`、`--seal-previous` 和 `--promote <active-client> <64hex-manifest>`；planned client 的 promote 直接失败。

- [ ] **Step 1: 写失败测试锁定发布隔离**

```js
const before = await readRollout(publicDirectory);
await promoteClientRelease({ publicDirectory, client: "surge", expectedHash: "a".repeat(64), canary: { device: "iphone", passed: true } });
const after = await readRollout(publicDirectory);
assert.notEqual(after.clients.surge, before.clients.surge);
assert.equal(after.clients.egern, before.clients.egern);
assert.equal(after.clients.onexray.state, "planned");
```

增加：edge 构建不改变 current、失败客户端不改变其他客户端、exact hash 不符失败、缺 canary 失败、planned promote 失败、版本目录 bytes 不变、`sealPreviousRelease` 二次执行字节不变、旧 current 中的 `/current/` 全部转换到 `/previous/`、Sub-Store `previous` 任务 URL 可解析。

- [ ] **Step 2: 运行 focused 测试确认 RED**

运行：`node --test test/update-rules.test.js test/substore-task-check.test.js automation/test/build-site.test.js automation/test/refresh-current.test.js test/public.test.js`

预期：当前发布表只有五客户端、Sub-Store 只接受两个频道、previous 仍混合 current，且没有独立 previous 封存入口。

- [ ] **Step 3: 从 client catalog 泛化所有客户端/可选包映射**

移除 `build-site.js`、`refresh-current.js`、`update-rules.mjs` 中手写的五客户端集合；用 `activeClientIds()`/`publicDirectoryForClient()` 构建目录。根 Manifest 的 `clients` 只放 active client hash，`clientStates` 同时放七个 `{ state, adapterSchema, publicDirectory }`。任何 planned client 不进入 renderer、optional pack 或 promotion selection。

- [ ] **Step 4: 保持 edge/current/previous 和 immutable version 原子性**

`publishEdgeRelease` 在 staging 中先复制既有 versions，再只写 `edge`；`promoteClientRelease` 在同一 staging 中移动目标 current 到 previous、安装指定 edge bytes、更新 rollout 与 audit，并用 rename 完成一次切换。构建、提升和 rollback 都调用 `assertChannelClosure`，禁止在事务中手工替单个规则文件。

- [ ] **Step 5: 实现 previous 初始封存和任务频道解析**

`sealPreviousRelease` 对当前每个 active client 的文本文件执行同频道重写：路径 `/current/`、`channel=current`、JSON/YAML channel 字段和 HTML 深链改为 `previous`；二进制只复制。重算 client Manifest、root Manifest 和 rollout，保持规则 bytes 之外的非 URL 内容不变。`check-substore-task.mjs` 的 `CHANNELS` 改为 `edge/current/previous`，脚本路径中的频道和 hash 选项必须互相一致。

- [ ] **Step 6: 运行 focused 测试确认 GREEN**

运行 Step 2 命令；预期发布隔离、幂等封存、planned 阻断、版本不可变、回滚频道和 Sub-Store previous 校验全部通过。

- [ ] **Step 7: 提交**

```bash
git add automation/src/build-artifacts.js automation/src/build-site.js automation/src/refresh-current.js scripts/update-rules.mjs scripts/check-substore-task.mjs test/update-rules.test.js test/substore-task-check.test.js automation/test/build-site.test.js automation/test/refresh-current.test.js test/public.test.js
git commit -m "feat: generalize atomic client publication"
```

---

### Task 6: 增加 v2fly 固定快照域名审计

**Files:**
- Create: `automation/src/fetch-v2fly-domain-audit.js`
- Create: `automation/src/v2fly-domain-audit.js`
- Create: `automation/test/fetch-v2fly-domain-audit.test.js`
- Create: `automation/test/v2fly-domain-audit.test.js`
- Modify: `automation/src/source-catalog.js`
- Modify: `automation/src/build-artifacts.js`
- Modify: `scripts/stage-rule-artifacts.mjs`

**Interfaces:**
- `resolveV2flyAuditCommit(fetchImpl, now): Promise<{ sha, committedAt }>` 只接受完整小写 SHA 和不晚于 now 的提交时间。
- `fetchV2flyDomainAuditSnapshot({ commit, fetchImpl }): Promise<{ source, files, entries, sha256 }>` 固定读取 `data/cn` 及 include closure。
- `parseV2flyDomainList({ text, path }): readonly Entry[]` 支持 `domain/full/keyword/regexp/include`，保留 include 属性过滤并拒绝未知语法。
- `buildV2flyDomainAudit({ snapshot, blackmatrixCatalog, generatedAt }): V2flyAuditReport` 只输出计数、SHA、差异样本哈希、include 统计和 warnings，不输出完整域名列表，也不改变生产 catalog。

- [ ] **Step 1: 写固定 commit、递归 include 和只审计失败测试**

用 fake fetch 提供：

```text
data/cn
include:tld-cn
include:geolocation-cn

data/tld-cn
domain:example.cn
full:full.example.cn
include:shared @-!cn
```

测试要求：重复 include 只抓取一次；`../escape`、绝对路径、循环 include、超过 16 层、超过 512 个文件或 8 MiB 总字节失败；属性过滤保留在条目 metadata；`domain/full/keyword/regexp` 都能规范化；HTML、重定向、错误 content-type、非法 UTF-8 和错误 SHA 失败；报告 `reportOnly: true` 且 `productionCatalog` 字节与未运行审计时完全一致。

- [ ] **Step 2: 运行 focused 测试确认 RED**

运行：`node --test automation/test/fetch-v2fly-domain-audit.test.js automation/test/v2fly-domain-audit.test.js`

预期：模块不存在。

- [ ] **Step 3: 实现安全抓取和 closure 展开**

沿用 ChinaIP 审计的 manual redirect、`content-type`、fatal UTF-8、单文件大小和响应体读取模式；对 `data/` 相对路径使用 `[A-Za-z0-9._/-]` 白名单，拒绝 `..`、反斜杠和空段。include 解析先拆出目标和属性，再以 `(path, activeAttributes)` 去重；对 closure 设置 16 层、512 文件、8 MiB 总限制。

- [ ] **Step 4: 实现报告对照而不合并**

将 Blackmatrix7 `ChinaTLD`/域名类条目和 v2fly 规范化 domain/full/keyword/regexp 集合分别计算数量、交集/差集计数和 SHA-256 采样键；报告字段明确 `productionSource: "blackmatrix7"`、`reportOnly: true`、`autoMerge: false`。v2fly 差异最多生成 warning，不调用规则编译器的 merge API。

- [ ] **Step 5: 接入 edge stage 的脱敏审计输入**

`stage-rule-artifacts.mjs --channel edge` 在 Blackmatrix7/ChinaIP stage 成功后获取固定 v2fly snapshot，把 canonical `audit/v2fly-domain-drift.json` 纳入审计目录；`current` stage 只读取已发布 current 审计 bytes，不重新抓取 v2fly。

- [ ] **Step 6: 运行 focused 测试确认 GREEN**

运行 Step 2 命令；预期 closure 限制、属性过滤、只审计、脱敏和 edge/current source boundary 全部通过。

- [ ] **Step 7: 提交**

```bash
git add automation/src/fetch-v2fly-domain-audit.js automation/src/v2fly-domain-audit.js automation/test/fetch-v2fly-domain-audit.test.js automation/test/v2fly-domain-audit.test.js automation/src/source-catalog.js automation/src/build-artifacts.js scripts/stage-rule-artifacts.mjs
git commit -m "feat: add report-only v2fly domain audit"
```

---

### Task 7: 生成脱敏中文公开审计看板

**Files:**
- Create: `automation/src/public-audit-dashboard.js`
- Create: `automation/test/public-audit-dashboard.test.js`
- Modify: `automation/src/build-artifacts.js`
- Modify: `automation/src/build-site.js`
- Modify: `public/index.html` via the canonical site builder
- Modify: `test/public.test.js`
- Modify: `automation/test/build-artifacts.test.js`

**Interfaces:**
- `buildPublicAuditDashboard({ generatedAt, upstream, chinaIpAudit, v2flyDomainAudit, routingPlanAudit, clientCatalog, releaseState, canaryState }): PublicAuditDashboard`。
- `validatePublicAuditDashboard(report): boolean` 严格检查 schema、来源摘要、七客户端状态、三个频道、闭合结果、规则统计和 blocker 键。
- `renderPublicAuditDashboard(report): string` 输出中文 HTML，所有动态内容使用 HTML 转义；不嵌入私密策略正文或节点字段。

- [ ] **Step 1: 写看板 schema、脱敏和链接失败测试**

```js
const dashboard = buildPublicAuditDashboard({
  generatedAt: "2026-08-18T03:23:00Z",
  upstream: { repository: "blackmatrix7", commit: "a".repeat(40), sha256: "b".repeat(64) },
  clientCatalog: [{ id: "happ", state: "planned", adapterSchema: "happ-v4-planned" }],
  canaryState: { surge: { edge: "passed" } },
  chinaIpAudit: { schemaVersion: 1, reportOnly: true },
  v2flyDomainAudit: { schemaVersion: 1, reportOnly: true },
  routingPlanAudit: { schemaVersion: 1 },
  releaseState: { channels: { edge: {}, current: {}, previous: {} }, closure: {} },
});
assert.equal(validatePublicAuditDashboard(dashboard), true);
assert.doesNotMatch(renderPublicAuditDashboard(dashboard), /password|uuid|subscription|NODE:/iu);
```

加入字符串 HTML 注入、节点名/URI/UUID/PSK/私密 URL、缺来源摘要、非法 blocker key、planned client 被误标 ready 和 channel 不闭合的失败测试。

- [ ] **Step 2: 运行 focused 测试确认 RED**

运行：`node --test automation/test/public-audit-dashboard.test.js automation/test/build-artifacts.test.js test/public.test.js`

预期：看板模块不存在，当前 root index 只提供英文简要链接。

- [ ] **Step 3: 实现严格脱敏模型**

看板只保留：Blackmatrix7 commit/时间/SHA、ChinaIP/v2fly 计数与 warnings、七客户端 `{state, adapterSchema, edge/current/previous manifestHash|null, closure, canary}`、规则/优先级/语义统计、GeoData/Profile 一致性布尔值、blocker `{key, severity, firstSeenAt, lastRecoveredAt, issueNumber|null}`。对所有递归字符串执行 secret-shape 检查，命中即失败。

- [ ] **Step 4: 接入 build-artifacts 和 Pages 首页**

把 `audit/dashboard.json` 写入 root default publication，不把它放进任一 client Manifest；`indexHtml()` 增加中文审计看板链接和“私密节点/策略不在公开页”说明。`validateDefaultPublication` 验证 dashboard canonical bytes、Manifest 文件记录和 `validatePublicAuditDashboard`。

- [ ] **Step 5: 运行 focused 测试确认 GREEN**

运行 Step 2 命令；预期看板 schema、脱敏、HTML 转义、root artifact 记录和七客户端 planned/active 显示全部通过。

- [ ] **Step 6: 提交**

```bash
git add automation/src/public-audit-dashboard.js automation/test/public-audit-dashboard.test.js automation/src/build-artifacts.js automation/src/build-site.js automation/test/build-artifacts.test.js test/public.test.js
git commit -m "feat: publish redacted Chinese audit dashboard"
```

---

### Task 8: 实现 blocker Issue 创建、更新、去重和恢复关闭

**Files:**
- Create: `automation/src/sync-audit-blocker-issues.js`
- Create: `scripts/sync-audit-blocker-issues.mjs`
- Create: `automation/test/sync-audit-blocker-issues.test.js`
- Modify: `.github/workflows/update-rules.yml`
- Modify: `scripts/check-actions.mjs`
- Modify: `test/actions.test.js`

**Interfaces:**
- `synchronizeAuditBlockerIssues({ owner, repo, token, blockers, fetchImpl, now }): Promise<{ created, updated, closed, deduplicated }>`。
- Issue body 必须包含 `<!-- apple-proxy-audit-key:<stable-key> -->`、脱敏摘要、首次发现时间、最近发现时间和对应 dashboard path；不能包含策略、节点、URL 或凭据。
- CLI 从 `GITHUB_REPOSITORY`、`GITHUB_TOKEN`、`PUBLIC_DIRECTORY` 读取参数，加载 `public/edge/audit/dashboard.json`，只同步 severity 为 `blocker` 的键。

- [ ] **Step 1: 写 fake GitHub API 生命周期失败测试**

覆盖以下序列：空列表创建 `source/blackmatrix7`；同键开放 Issue 更新而不创建第二个；两个相同 marker 只保留编号最小者并关闭 duplicate；dashboard 恢复后关闭开放 Issue；warning 不创建；API 返回秘密字段时拒绝写回；无 token 或仓库名不完整时失败。断言每个请求 method/path/body，确保不调用 issue comment 或任意仓库写 API。

- [ ] **Step 2: 运行 focused 测试确认 RED**

运行：`node --test automation/test/sync-audit-blocker-issues.test.js test/actions.test.js`

预期：Issue 同步模块不存在，workflow 也没有 `issues: write` 生命周期步骤。

- [ ] **Step 3: 实现稳定 marker 和 REST 调用**

只接受 `audit-blocker` label 的开放 issue，按 marker 建立映射；同键多个开放 issue 时保留最小 `number`，其余 PATCH 为 closed。缺键创建 POST，内容变化 PATCH；已不在 blocker 集合的 marker PATCH 为 closed。所有请求带 `Accept: application/vnd.github+json`、API 版本和 `Bearer` token；响应 JSON 先严格校验再使用。

- [ ] **Step 4: 最小化 workflow 权限和调用顺序**

只在 `build-edge` job 增加 `issues: write`，保留 `contents: write`，顶层 `permissions: {}` 不变；edge 构建在审计 dashboard 写入并 secret scan 后执行：

```yaml
- name: Sync public audit blocker issues
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: node scripts/sync-audit-blocker-issues.mjs
```

Promotion job 不请求 issues 权限，也不执行 Issue 同步；issue API 失败必须让 edge workflow 失败并保留已提交代码不被再次提升。

- [ ] **Step 5: 更新 Actions 检查器并运行 GREEN**

`check-actions.mjs` 仅允许 update workflow 的 build-edge job 额外拥有 `issues: write`，拒绝 `issues: write` 出现在 promote/deploy；检查 sync 命令在 `check:secrets` 之后、git commit 之前。运行：`node --test automation/test/sync-audit-blocker-issues.test.js test/actions.test.js && npm run check:actions`。

- [ ] **Step 6: 提交**

```bash
git add automation/src/sync-audit-blocker-issues.js scripts/sync-audit-blocker-issues.mjs automation/test/sync-audit-blocker-issues.test.js .github/workflows/update-rules.yml scripts/check-actions.mjs test/actions.test.js
git commit -m "feat: sync audit blocker issues"
```

---

### Task 9: 更新 Sub-Store 任务契约、23 任务文档和回滚说明

**Files:**
- Modify: `scripts/check-substore-task.mjs`
- Modify: `test/substore-task-check.test.js`
- Modify: `docs/substore-two-layer-setup.md`
- Modify: `docs/substore-client-pools.md`
- Modify: `docs/maintenance.md`
- Modify: `docs/implementation-status.md`
- Modify: `README.md`

**Interfaces:**
- 公开脚本校验器必须接受 `edge/current/previous`，但不接受 `onexray`/`happ` 的原生 renderer 路径，直到它们从 planned 变为 active。
- 文档保留现有 17 个任务原名，并把目标总数写为 23：`apple-proxy-policy`、`onexray-nodes`、`onexray-profile`、`onexray-routing-audit`、`happ-subscription`、`happ-routing-audit`。
- 所有读取策略的未来任务都记录同名 `channel`、policy revision、公开 Manifest SHA-256、GeoData SHA-256 绑定；OneXray node-only 任务也接收 channel 但不读业务策略。

- [ ] **Step 1: 写文档和 checker 失败测试**

增加以下 URL 检查：

```text
https://juan-nikola.github.io/apple-proxy-profiles/previous/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-egern&clientChain=off
```

必须通过；`channel=beta`、脚本路径 `/current/` 但参数 `channel=edge`、`public/previous` 里出现 `/current/`、公开页面出现 `apple-proxy-policy` File URL 必须失败或被文档 secret scan 拦截。文档测试要求审计入口、Issue 查看路径和回滚命令存在。

- [ ] **Step 2: 运行 focused 测试确认 RED**

运行：`node --test test/substore-task-check.test.js test/substore-docs.test.js`

预期：checker 只允许两个频道，文档没有七客户端状态、23 任务、审计看板和私密策略边界。

- [ ] **Step 3: 完成任务表和频道模板**

在 `docs/substore-two-layer-setup.md` 保留 17 个任务的原名/collection/平台参数，新增 6 个完整任务的用途、输入 collection、频道参数、失败策略和“用户可筛选全部节点、生成器不静默删除节点”的说明。新 renderer 未实现时明确标为 `planned — 不可创建`，不能放入可复制公开 URL。

- [ ] **Step 4: 增加维护与审计查看路径**

写明：Pages 的 `audit/dashboard.json` 和中文 HTML 看板是公开审计查看处；阻断 Issue 在仓库 Issues 的 `audit-blocker` 标签查看；policy File、节点 URL、固定目标和私密 audit 只在 Sub-Store 私密任务日志查看。写出 `--channel previous` 回滚和不可变 `/versions/<manifestHash>/` 回滚，并警告不能手工替单个规则文件。

- [ ] **Step 5: 运行 focused 测试确认 GREEN**

运行 Step 2 命令；预期任务频道、文档字段、私密边界和 planned 客户端不可复制公开 URL 的断言通过。

- [ ] **Step 6: 提交**

```bash
git add scripts/check-substore-task.mjs test/substore-task-check.test.js docs/substore-two-layer-setup.md docs/substore-client-pools.md docs/maintenance.md docs/implementation-status.md README.md
git commit -m "docs: define seven-client substore contracts"
```

---

### Task 10: 重建已发布五客户端证据并执行完整验证

**Files:**
- Modify: `public/edge/**`
- Modify: `public/current/**`
- Modify: `public/previous/**`
- Modify: `public/versions/**`（仅新增不可变 hash 目录或删除 retention 明确淘汰的旧目录）
- Modify: `public/manifest.json`、`public/rollout.json`、频道 Manifest、audit JSON/HTML
- Modify: `clients/*/examples/**`、canonical generated bundles（只由 build/fixture 命令生成）

**Interfaces:**
- 只接受前九个任务已通过的生成器和固定源快照；禁止手工编辑任何 generated 文件。
- 产物必须显示七客户端，其中五个 active 且有闭合的 edge/current/previous hash，OneXray/HAPP 为 planned/null；审计看板、v2fly report-only 报告和 Issue marker 与 root Manifest 同步。

- [ ] **Step 1: 先运行全部 focused 和静态检查**

按顺序运行：

```bash
node --test test/client-catalog.test.js test/strict-json.test.js test/business-targets.test.js test/private-policy.test.js test/private-task-binding.test.js test/channel-closure.test.js
node --test automation/test/fetch-v2fly-domain-audit.test.js automation/test/v2fly-domain-audit.test.js automation/test/public-audit-dashboard.test.js automation/test/sync-audit-blocker-issues.test.js
npm run check:actions
npm run check:secrets
git diff --check
```

预期全部退出码为 0；任何失败先修复代码/测试，不能跳过生成阶段。

- [ ] **Step 2: 封存旧 current 为闭合 previous**

运行：`node scripts/update-rules.mjs --seal-previous`

预期：旧 current 规则语义和 bytes 保持，文本内部所有频道改为 previous，client/root Manifest 与 rollout 原子更新；重复执行无 diff。

- [ ] **Step 3: 生成 edge 输入和客户端构建产物**

运行：

```bash
node scripts/install-sing-box-core.mjs
node scripts/stage-rule-artifacts.mjs --channel edge
npm --workspace @apple-proxy-profiles/sing-box run compile:rules
npm run fixtures
npm run build
npm run verify:lightweight
npm run verify
```

预期：Blackmatrix7 固定快照、ChinaIP blocker 校验、v2fly report-only 审计、五客户端 renderer、规则编译、语义/预算/秘密测试全部通过；没有任何 onexray/happ 原生输出。

- [ ] **Step 4: 只发布 edge 并验证频道/版本树**

运行：`npm run update:rules`，随后运行：

```bash
npm run check:secrets
node scripts/update-rules.mjs --check --channel edge
node scripts/update-rules.mjs --check --channel current
node scripts/update-rules.mjs --check --channel previous
node --test test/public.test.js test/frontier-contract.test.js automation/test/build-site.test.js automation/test/refresh-current.test.js
```

预期 edge 改变、current/previous 不被 edge 任务覆盖；三频道每个 active 客户端闭合，所有 `versions/<hash>` 不可变，root dashboard 与七客户端状态一致。

- [ ] **Step 5: 运行最终全量验证**

运行：`npm test && npm run verify && npm run check:actions && npm run check:secrets && git diff --check`。检查 `git status --short` 只包含预期 generated/public 文件，检查 `public/edge/audit/dashboard.json` 没有节点名、URL、UUID、密码或策略正文。

- [ ] **Step 6: 提交生成证据**

```bash
git add public clients/*/examples clients/*/dist
git commit -m "chore: rebuild closed seven-client publication evidence"
```

---

## Implementation Handoff and Verification Gate

完成本计划文件后，执行者必须做一次规格覆盖检查：

1. 逐节对照设计规格：七客户端身份、五 active/两 planned 边界、十二业务目标、DNS 与安全不可覆盖、Blackmatrix7 唯一生产源、三频道/版本闭合、单客户端提升、回滚、私密 policy、23 个任务、v2fly 审计、中文看板、Issue 生命周期、Actions 权限和测试矩阵均在任务中有明确文件、接口和命令。
2. 扫描计划文件中的占位词、空泛步骤和没有实际输入/输出的“写测试”步骤；每一步必须给出具体文件、接口、命令和预期结果。
3. 检查所有跨任务接口签名一致：`clientAdapter`/`activeClientIds`、`parseStrictJson`、`parsePrivatePolicy`/`resolvePrivatePolicy`、`bindPrivateTask`、`assertChannelClosure`、`sealPreviousRelease`、`fetchV2flyDomainAuditSnapshot`、`buildPublicAuditDashboard`、`synchronizeAuditBlockerIssues`。
4. 开始真正改代码前，先向用户明确发送“计划已完成，准备开始编码”，并由用户选择执行方式；本计划本身不实现 OneXray/HAPP renderer，也不自动提升任何客户端 `current`。
