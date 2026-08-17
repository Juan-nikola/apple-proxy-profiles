# Anywhere 部署指南

Anywhere 新任务只读取 `apple-proxy-anywhere`。先按 [Sub-Store 客户端节点池指南](../../../docs/substore-client-pools.md) 完成筛选、preview 和回滚准备；已有 `apple-proxy-sources` collection、tasks 和旧 URL 保留作兼容/回滚。

先读 [Sub-Store 外置 JS + 任务引用总指南](../../../docs/substore-two-layer-setup.md)。File `anywhere-nodes` 选择链接模式，直接引用 Anywhere Node Generator 的规范 Pages URL，并在自己的可视化参数编辑器中保存参数；不要粘贴 JavaScript 正文。

## 0. 先记录，不删除

记录 App 版本/build、stable 或 Beta/TestFlight、当前节点/链、规则绑定、Rule/Global、五类 DNS、IPv6、UDP/QUIC 和 iCloud 状态。保留旧订阅与旧规则集。iCloud 不是完整配置备份，它不覆盖当前选择、规则绑定和大量 UserDefaults；灰度期间不要测试跨设备删除。

## 1. 创建私密节点任务

Anywhere Node Generator 的规范 Pages URL 为：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js
```

创建 File 任务 `anywhere-nodes`，按 File/文件 → Script/脚本操作 → 链接模式 → 粘贴上述 URL → 展开参数的顺序操作。不要粘贴 JavaScript 正文；推荐用可视化参数编辑器逐项添加下面参数：

新任务统一选择 `anywhere-node-generator.js`。旧 `substore-node-generator.js` Pages URL 继续保留为字节一致的兼容别名；既有任务无需仅为改名替换 URL，也不要同时添加新旧两个别名。

```text
output=nodes&type=collection&name=apple-proxy-anywhere&clientChain=off
```

旧版只有单行链接时使用 `JS_URL#output=nodes&type=collection&name=apple-proxy-anywhere&clientChain=off`，不能使用 `?` 连接脚本参数。以后更新 Anywhere Node Generator 不复制脚本正文；`anywhere-nodes` 的 JS URL、任务名、私密输出 URL和上述参数保持不动。发布后先重新预览，再在一台 canary 设备手动 Refresh。

Anywhere 没有与 Shadowrocket/Egern 等价的完整 Profile File，不要创建 `anywhere-profile-generator.js`。这个 File 只完成私密节点层；规则、绑定和设备设置必须继续完成第 2—5 节。

预览应显示至少一个 accepted 节点，诊断只有计数。私密输出 URL 不得进入仓库、Issue、截图或共享终端记录。可以手动粘贴私密 HTTPS URL，也可在本地构造 `anywhere://add-proxy?link=<百分号编码私密URL>`；不要把真实 deep link 写进文档。

节点名称必须唯一、稳定。Refresh 只按“名称 + 同名出现序号”尽量复用 UUID；重命名、删除、同名顺序改变都可能破坏规则绑定和链。不要通过删除订阅再导入来更新。

## 2. 导入公开规则

发布完成后打开：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html
```

已导入旧版的设备，旧分片包括 `Advertising`、`Advertising_Domain`、`ChinaMax_Domain` 和通用 `Game`；导入前必须删除或禁用这些旧分片。然后点默认页最上方的总导入 deep link；如果无法一次打开，按页面顺序点击全部回退批次。deep link 使用 `anywhere://add-rule-set`，只打开确认流程。不要混用 `current`、`previous` 与某个 `versions/<hash>` 的分片。

Manifest 中每个逻辑规则集的所有 shard 必须绑定相同目标。漏一个 shard 就是部分生效。
导入完成后应看到总计 14 个稳定业务包，并逐一核对它们的本地 assignment。可选广告包的独立页是：

```text
https://juan-nikola.github.io/apple-proxy-profiles/optional/adblock-full/current/anywhere/import.html
```

该页只导入 `Advertising` 和 `Advertising_Domain`，两者均为 REJECT；完整包可使内存显著增长，不建议低内存设备启用。

## 3. 检查首次绑定

- `routing = 2`：默认业务包 `Security` 应为 REJECT；它聚合旧的 Hijacking 与 BlockHttpDNS 输入。可选包的 `Advertising`、`Advertising_Domain` 也应为 REJECT。
- `routing = 1`：`Privacy`、`DomesticCore`、`DomesticPlatform`、`Apple`、`Microsoft`、`Download`、`ChinaIP` 首次为 DIRECT。
- `routing = 0`：境外服务与 `OverseasGame` 首次为 Default/当前代理。若当前版本支持专用组，在 App 内手动将 `OverseasGame` 绑定到海外游戏组。

Default 不是停用，而是回退到当前节点或链。`AI` 业务包聚合 OpenAI、Claude、Gemini 和 Copilot；如需 AI 独立出口，在每台设备只需把 `AI` 业务包绑定到同一个 AI 节点或链，再分别实测四项服务。其他境外业务包需要独立出口时同理。`Download` 聚合下载与 PrivateTracker 输入，默认 DIRECT；除非服务商明确允许 P2P，不要随意绑定机场。

## 4. 链与本地设置

链只能在 App 本地创建，至少 2 个仍存在的节点；列表第一项是入口，最后一项是出口。远程节点订阅和 `.arrs` 都不能创建链。

关闭 Global Mode，使用 Rule 模式。逐项记录并验证 Subscriptions DNS、IP Rules DNS、Proxies DNS、ECH DNS、Fallback DNS；稳定基线可分别参考 AliDNS `https://dns.alidns.com/dns-query` 与 Cloudflare `https://cloudflare-dns.com/dns-query`，但最终值必须结合网络实测。MITM/HTTPS 解密和 Allow Insecure 保持关闭。

在 Advanced Settings 检查 Advertise IPv6 to Apps；验证时关闭 Hide VPN Icon，因为它会影响 IPv6。QUIC 有 Blocked、Automatic、Unblocked 三种状态，Egern 的 proxy-block 语义最接近 Automatic。Block UDP 开启时 QUIC 控件不再具有独立验证意义。

共享分流顺序为 `DomesticCore` → 服务规则 → `OverseasGame` → `ChinaTLD` → `ChinaIP` → FINAL；普通 `.cn` 命中 `ChinaTLD`/DIRECT，未知国内 IP 命中 `ChinaIP` 直连。可用 `npm run explain:route -- --channel current --domain <域名>` 离线核对预期分流，该命令只读取本地已发布规则、不执行 DNS。

## 5. 更新节奏

Sub-Store 私密节点产物可按 6 小时任务节奏重建；这不代表 Anywhere 自动刷新。设备仍需对节点订阅手动 Refresh。公开 Pages 可以每日生成新规则，但已导入 `.arrs` 仍需在现有规则集上点 Update 才应用。规则 Update 保留本地名称与目标绑定，并忽略新文件的 routing 头。

Stable 先走 iPhone→iPad；Beta/TestFlight 使用同一产物再走一次 iPhone→iPad，Experimental Features 默认关闭。任何 beta 专属能力都必须先重新审计源码、显式 opt-in 并加测试。
