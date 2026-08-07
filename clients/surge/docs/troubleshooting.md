# Surge 排障

国内 App 偶发变慢时，先确认 `ChinaMax`、本地网段和 DNS 规则命中，再检查自动测速组是否把不可用节点保留在首选位置。手动切换一次后恢复，通常说明旧配置缓存或测速状态没有及时刷新；重新生成配置并等待一个测试周期，避免只反复开关客户端。

如果 `edge` 失败而 `current` 正常，先停留在 `current`，不要继续扩大灰度。若两个版本都失败，检查私密 Sub-Store 的 `name`、`subscriptionName`、节点产物是否为空，以及规则镜像是否可访问。

如果 Surge 提示“规则必须以 FINAL 结尾”，不要导入组合订阅/API 总地址；必须使用 Sub-Store 中对应平台的 `surge-macos`、`surge-iphone` 或 `surge-ipad` Profile File 私有输出。正确预览的 `[Rule]` 最后一行必须是 `FINAL,🚀 节点选择,dns-failed`。重新预览并刷新 File；若仍疑似拿到旧 CDN 内容，临时打开该远程脚本操作的 `关闭缓存/noCache`，确认新 Profile 生效后再恢复缓存。

Surge 不识别 VLESS 节点类型。生成器会在输出前自动过滤 VLESS 和其他未登记协议；因此源组合里仍可保留 `vlesshy2`，但这些 VLESS 节点只会进入支持它们的客户端，不会进入 Surge Profile。如果过滤后没有任何可用节点，任务会失败并保留旧输出。参见 [Surge Proxy Policy](https://manual.nssurge.com/policy/proxy.html)。
