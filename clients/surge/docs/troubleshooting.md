# Surge 排障

国内 App 偶发变慢时，先确认 `ChinaMax`、本地网段和 DNS 规则命中，再检查自动测速组是否把不可用节点保留在首选位置。手动切换一次后恢复，通常说明旧配置缓存或测速状态没有及时刷新；重新生成配置并等待一个测试周期，避免只反复开关客户端。

如果 `edge` 失败而 `current` 正常，先停留在 `current`，不要继续扩大灰度。若两个版本都失败，检查私密 Sub-Store 的 `name`、`subscriptionName`、节点产物是否为空，以及规则镜像是否可访问。

如果 Surge 提示“规则必须以 FINAL 结尾”，不要导入组合订阅/API 总地址；必须使用 Sub-Store 中对应平台的 `surge-macos`、`surge-iphone` 或 `surge-ipad` Profile File 私有输出。正确预览的 `[Rule]` 最后一行必须是 `FINAL,🚀 节点选择,dns-failed`。重新预览并刷新 File；若仍疑似拿到旧 CDN 内容，临时打开该远程脚本操作的 `关闭缓存/noCache`，确认新 Profile 生效后再恢复缓存。

Surge 不识别 VLESS 节点类型。生成器会在输出前自动过滤 VLESS 和其他未登记协议；因此源组合里仍可保留 `vlesshy2`，但这些 VLESS 节点只会进入支持它们的客户端，不会进入 Surge Profile。如果过滤后没有任何可用节点，任务会失败并保留旧输出。参见 [Surge Proxy Policy](https://manual.nssurge.com/policy/proxy.html)。
## 远程节点池

纯远程 Profile 的 `[Proxy]` 为空是预期行为；节点应从隐藏组 `📦 远程节点池` 的 `policy-path` 加载。若策略组为空，先单独打开 `surge-nodes` File 的私密输出 URL，确认它返回 `[Proxy]` 和至少一个节点，再检查 Profile 的 `proxyPolicyUrl` 是否逐字一致。

节点资源会在生成阶段排除 Surge 不支持或字段不完整的协议。新增协议不会被盲目写入 Surge；需要先在项目协议注册表和 Surge 渲染器中登记。节点实际不可达时，由 Surge 的自动测速/故障转移组选择其他节点。

如果手动把唯一的 `📦 远程节点池` 的 `policy-path` 换成另一份 Surge 节点订阅后“🌏 亚太”为空，先确认新链接返回的是 Surge `[Proxy]` 节点且节点名保留国旗前缀（`🇯🇵Neburst` 和 `🇯🇵 节点名｜自建·U` 两种格式都支持）。不要新增个人池或节点来源组，也不要删除原有 `include-other-group`、`policy-regex-filter`；重新刷新同一个 Profile 即可。
