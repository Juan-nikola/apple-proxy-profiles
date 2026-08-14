# Intel Mac 灰度清单

本清单验收 `apple-proxy-shadowrocket`；迁移顺序、preview 与旧 URL 回滚见 [Sub-Store 客户端节点池指南](../../../docs/substore-client-pools.md)。已有 `apple-proxy-sources` 入口继续保留。

开始前确认旧 Profile 可用，新 Profile 只是并存导入。每完成一项再勾选；关键联网、DNS、局域网或回滚项失败时立即切回旧 Profile，停止向 iPhone 和 iPad 推广。

- [ ] 旧节点订阅和旧 Profile 均可立即选回。
- [ ] 节点订阅（`apple-proxy-shadowrocket` 输出）手动更新成功，节点数量不是 0；Shadowrocket 显示名与本平台 File 参数的 `subscriptionName` 完全一致（本例 `Shadowrocket-Nodes`，动态候选显示 `Shadowrocket-Nodes,use=true`）。显示名可自由命名（支持中文、内部空格和普通标点），但不能以空白开头或结尾，也不能包含换行；大小写、emoji、空格和标点必须匹配。截图若为 `SHADOWROCKET-NODES`，三个 Profile File Operator 都填写该精确名称。
- [ ] 升级已有安装时，macOS、iPhone、iPad 三个 Profile File Operator 的 `subscriptionName` 已逐一核对；节点 URL 和节点 Script Operator 未更换。若旧占位值不匹配当前显示名，已改参数或重命名订阅，并重新发布和更新各平台 Profile。
- [ ] 常用中国网站直连，常用境外网站经 `🚀 节点选择`。
- [ ] 一个未列规则但解析为中国 IP 的测试目标命中 `GEOIP,CN,DIRECT`。
- [ ] 一个未列规则的境外目标命中 `FINAL,🚀 节点选择`。
- [ ] `🚀 节点选择`包含 `PROXY`、全自动、故障转移和固定的亚太、欧洲、美洲洲组；首页切换洲组后，此处不再保存或显示具体节点名。
- [ ] 动态组按匹配的 `subscriptionName` 显示具体节点；若名称不匹配，`DIRECT`、`🚀 节点选择`、自动/故障转移和地区等显式选择仍可用，但不会显示该订阅的服务器。
- [ ] 已重新运行当前平台中直接引用 `shadowrocket-profile-generator.js` 规范 Pages URL 的 File，并更新 Profile；三个 File 不粘贴脚本正文。`clients/shadowrocket/dist/` 与 `clients/shadowrocket/examples/` 已重新构建校验。默认参数为 `channel=edge`、`adblockMode=off`；若灰度稳定通道则明确改为 `channel=current`，只有专门测试完整广告时才使用 `adblockMode=full` 和独立 optional 包。既有 File 若仍引用旧 `substore-profile-generator.js` 兼容 URL，可保持原 URL，只需确认内容已更新。
- [ ] 规则顺序明确为 `DomesticCore`、`DomesticGame`、`SteamCN` DIRECT，随后是境外服务，`OverseasGame` 进入 `🌍 海外游戏`，再到 `ChinaIP`、`GEOIP,CN,DIRECT`，最后 `FINAL,🚀 节点选择`。
- [ ] 规则顺序包含 `ChinaTLD`：普通 `.cn` 域名命中 `ChinaTLD`/DIRECT，位置在 `OverseasGame` 之后、`ChinaIP`/`GEOIP,CN` 之前。
- [ ] 稳定 DNS 优先国内解析；未知国内 IPv4/IPv6 命中 `GEOIP,CN,DIRECT`，未知境外与 DNS 失败走 `FINAL,🚀 节点选择`；HTTPDNS、硬编码 IP、IPv6、QUIC 和手动服务组选择仍作为残余风险记录。
- [ ] 用 `npm run explain:route -- --channel current --domain <域名>` 离线核对过预期分流（只读取本地已发布规则，不执行 DNS）。
- [ ] 9 个常用业务组都有自动测速、故障转移、固定顺序地区组和符合筛选条件的具体节点；没有国家组。
- [ ] 打开 `🐙 GitHub` 和 `🍎 Apple`：确认两组的自动、故障转移、地区、`DIRECT`、`🚀 节点选择`等所有显式选择及匹配订阅的具体服务器都存在；GitHub 的 `policy-select-name=🚀 节点选择`，Apple 的 `policy-select-name=DIRECT`。
- [ ] 在 Shadowrocket 首页切换节点后，`🐙 GitHub` 仍选择 `🚀 节点选择`并继续联网；Apple 保持其已选择的显式策略。
- [ ] 常用业务组的摘要已逐个核对。Shadowrocket 若保留仍有效的旧选择，生成器的首项不会自动覆盖：希望境外组跟随首页时手动选第一项 `🚀 节点选择`；希望国内组恢复直连时手动选第一项 `DIRECT`，没有误留在具体节点、自动组、故障转移或地区组。
- [ ] `🤖 AI 专用`直接列出全部已勾选具体节点；更改 AI 节点不改变主线路，OpenAI、Claude、Gemini、Copilot 与常用其他 AI 分流正确。
- [ ] GitHub 命中 `🐙 GitHub`，早于 Microsoft 规则。
- [ ] `🇨🇳 国内平台`（哔哩哔哩、抖音、小红书、微博）能在 DIRECT、`🚀 节点选择`或具体节点间切换；抖音视频和评论加载正常。
- [ ] `☣️ 安全威胁`和`🕵️ 严格跟踪`能在 REJECT 与 DIRECT 间热切换；默认关闭的广告不产生远程规则请求，只有 `adblockMode=full` 时才检查 optional `🧱 常见广告`命中。
- [ ] 连接、规则和 DNS 日志可查看，且自动删除 7 天前日志。
- [ ] IPv4 网络正常。
- [ ] 双栈网络的 IPv4 和 IPv6 都不绕过规则。
- [ ] 有条件时验证 IPv6-only 网络；无条件时保留未勾选并注明网络不可用。
- [ ] 正式 Profile 为 `quicMode=proxy-block`；如需对照，另存测试 Profile 验证 `allow` 与 `all-block` 后切回 `proxy-block`。
- [ ] 路由器管理页和其他局域网目标 DIRECT。
- [ ] AirPlay 正常。
- [ ] HomeKit 正常。
- [ ] NAS 正常。
- [ ] 打印机正常。
- [ ] `⬇️ 下载/P2P`候选没有 `[机场]`。
- [ ] `🎮 游戏连接`只出现明确带 `·U` 能力标记的节点，默认 DIRECT；`OverseasGame` 业务规则使用独立的 `🌍 海外游戏`策略组。
- [ ] iPhone 在 Wi-Fi 和蜂窝网络分别测试《问道手游》登录、换线、战斗和资源加载；雷霆/吉比特域名命中 DIRECT。
- [ ] macOS 的 `ipv6Mode=ipv4-only`，并完成休眠唤醒与 Wi-Fi 切换测试，无持续断流。
- [ ] 更新一次 Profile 后，`🚀 节点选择`仍包含 `PROXY`、全自动、故障转移和固定的亚太、欧洲、美洲洲组；AI 和其他仍有效的手动策略选择保持不变，若未保留则在推广前记录并处理。
- [ ] 实际切回旧 Profile 一次，确认回滚无需删除新 Profile。
- [ ] 支持蜂窝的设备已分别测试 Wi‑Fi 与蜂窝，且保留旧 Profile 后完成一次真实回滚。

## 未知路由两项怎么测试

不要寻找或记录一个“永远不在规则里”的固定域名，因为远程规则会更新。页面能打开不是证明，必须以 Shadowrocket 的规则日志为准。

中国候选的做法：

1. 打开规则日志后，访问一个自己知道解析到中国 IP、但不确定是否有专用规则的普通站点候选。
2. 查看这次请求的命中结果；如果命中 `ChinaIP`、`DomesticCore`、某个服务名或任何其他命名规则集，丢弃这个候选并换一个。
3. 只有日志明确显示 `GEOIP,CN,DIRECT`，才勾选中国未知路由项。
4. 在下面的记录中只记录候选目标和测试日期，不记录完整 URL、查询参数或带地址栏截图。

境外候选的做法：

1. 保持规则日志打开，访问一个自己知道解析到境外、但不确定是否有专用规则的普通站点候选。
2. 如果日志命中 AI、GitHub、媒体、社交或任何其他命名规则集，丢弃并换一个。
3. 只有日志明确显示 `FINAL,🚀 节点选择`，才勾选境外未知路由项。
4. 同样记录候选目标和测试日期；只看到页面成功打开不能勾选。

## 记录

```text
测试日期：
Shadowrocket 版本：
macOS 版本：
设备：Intel Mac
节点总数（只写数字）：
中国未知路由候选目标和测试日期：
境外未知路由候选目标和测试日期：
未完成项目及原因：
回滚测试结果：
```

全部勾选后继续观察稳定性，再按顺序导入 iPhone、iPad。不要把含订阅 URL、Profile URL、Token、节点详情、二维码或完整地址栏的截图附在记录中。HTTPS 解密和 iCloud 节点自动同步应始终保持关闭，Shadowrocket 运行时不要叠加 iCloud 私密转送。
