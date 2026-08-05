# Anywhere 部署指南

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
output=nodes&type=collection&name=apple-proxy-sources&clientChain=off
```

旧版只有单行链接时使用 `JS_URL#output=nodes&type=collection&name=apple-proxy-sources&clientChain=off`，不能使用 `?` 连接脚本参数。以后更新 Anywhere Node Generator 不复制脚本正文；`anywhere-nodes` 的 JS URL、任务名、私密输出 URL和上述参数保持不动。发布后先重新预览，再在一台 canary 设备手动 Refresh。

Anywhere 没有与 Shadowrocket/Egern 等价的完整 Profile File，不要创建 `anywhere-profile-generator.js`。这个 File 只完成私密节点层；规则、绑定和设备设置必须继续完成第 2—5 节。

预览应显示至少一个 accepted 节点，诊断只有计数。私密输出 URL 不得进入仓库、Issue、截图或共享终端记录。可以手动粘贴私密 HTTPS URL，也可在本地构造 `anywhere://add-proxy?link=<百分号编码私密URL>`；不要把真实 deep link 写进文档。

节点名称必须唯一、稳定。Refresh 只按“名称 + 同名出现序号”尽量复用 UUID；重命名、删除、同名顺序改变都可能破坏规则绑定和链。不要通过删除订阅再导入来更新。

## 2. 导入公开规则

发布完成后打开：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html
```

先点页面最上方的总导入 deep link；如果当前系统、浏览器或分享链路无法一次性打开，再按页面顺序点击全部 3 个回退批次。在 Import Rule Sets 页面等待下载结束，确认没有 failed、所有项目均选中，再点 Done。deep link 使用 `anywhere://add-rule-set`；它只打开确认流程，不会静默导入，也不会生成一个聚合 `.arrs` 订阅。不要把 `anywhere://add-rule-set` deep link 粘贴到 `.arrs` 订阅输入框，也不要混用 `current`、`previous` 与某个 `versions/<hash>` 的分片。

Manifest 中每个逻辑规则集的所有 shard 必须绑定相同目标。漏一个 shard 就是部分生效。
导入完成后应看到总计 34 个规则分片，并逐一核对它们的本地 assignment。

## 3. 检查首次绑定

- `routing = 2`：Hijacking、BlockHttpDNS、Advertising 和 Advertising_Domain 全部分片应为 REJECT。
- `routing = 1`：Privacy、BiliBili、ByteDance、XiaoHongShu、Weibo、Apple、Microsoft、SteamCN、ChinaMax_Domain、Download、PrivateTracker、ChinaMax 首次为 DIRECT。Privacy 没有独立分片；若将来拓扑变化，以 Manifest 为准。
- `routing = 0`：OpenAI、Claude、Gemini、Copilot、GitHub、YouTube、Netflix、Disney、Spotify、GlobalMedia、Telegram、Facebook、Instagram、Twitter、TikTok、Game 首次为 Default。

Default 不是停用，而是回退到当前节点或链。四个 AI 规则集若要实现 AI 独立出口，必须在每台设备把所有相关 shard 本地绑定到同一个 AI 节点或链。服务独立出口同理。Download/PrivateTracker 默认 DIRECT；除非服务商明确允许 P2P，不要随意绑定机场。

## 4. 链与本地设置

链只能在 App 本地创建，至少 2 个仍存在的节点；列表第一项是入口，最后一项是出口。远程节点订阅和 `.arrs` 都不能创建链。

关闭 Global Mode，使用 Rule 模式。逐项记录并验证 Subscriptions DNS、IP Rules DNS、Proxies DNS、ECH DNS、Fallback DNS；稳定基线可分别参考 AliDNS `https://dns.alidns.com/dns-query` 与 Cloudflare `https://cloudflare-dns.com/dns-query`，但最终值必须结合网络实测。MITM/HTTPS 解密和 Allow Insecure 保持关闭。

在 Advanced Settings 检查 Advertise IPv6 to Apps；验证时关闭 Hide VPN Icon，因为它会影响 IPv6。QUIC 有 Blocked、Automatic、Unblocked 三种状态，Egern 的 proxy-block 语义最接近 Automatic。Block UDP 开启时 QUIC 控件不再具有独立验证意义。

## 5. 更新节奏

Sub-Store 私密节点产物可按 6 小时任务节奏重建；这不代表 Anywhere 自动刷新。设备仍需对节点订阅手动 Refresh。公开 Pages 可以每日生成新规则，但已导入 `.arrs` 仍需在现有规则集上点 Update 才应用。规则 Update 保留本地名称与目标绑定，并忽略新文件的 routing 头。

Stable 先走 iPhone→iPad；Beta/TestFlight 使用同一产物再走一次 iPhone→iPad，Experimental Features 默认关闭。任何 beta 专属能力都必须先重新审计源码、显式 opt-in 并加测试。
