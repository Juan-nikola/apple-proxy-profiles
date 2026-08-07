# sing-box 排障

国内 App 偶发变慢时，先看 DNS 是否误走代理、`ChinaMax` 是否命中直连、自动测速组是否选中了高延迟节点，以及规则集是否下载成功。开关后恢复通常是缓存或测速状态重新初始化，并不代表根因消失。

如果 edge 启动失败，切换到 current；如果只有 OpenWrt 失败，检查 TUN、DNS 劫持、路由标记和 LAN 排除项；如果只有 Android 或 Apple 失败，检查客户端是否支持当前字段。保留平台、channel、生成时间、sing-box 提交号和日志，再提交问题。

如果出现 `dns.rules[0].action` 无法反序列化、提示不能把对象解析为字符串，说明拿到了旧版 DNS 规则结构：当前 sing-box 要求 `action` 是顶层字符串（例如 `"action": "route"`），`server` 也是同级字段。不要继续使用旧缓存 JSON；在 Sub-Store 重新预览并刷新对应的 `sing-box-*` Config File，确认 JSON 来自平台专用任务而不是组合订阅/API 总地址。

如果出现 `outbounds[*].snell: unsupported version: 5`，说明旧生成器没有适配源节点的 Snell v5。sing-box 1.14 的 Snell 出站只接受 v4/v6；v5 在不使用 QUIC 时与 v4 线格式兼容，生成器现在会把 v5 自动转换为 v4，并保留 PSK、复用和 UDP 设置。参见 [sing-box Snell outbound](https://sing-box.sagernet.org/configuration/outbound/snell/)。

如果出现 `domain_resolver` 或 `default_domain_resolver` 缺失，说明配置仍是旧版本缓存。sing-box 1.14 对包含域名服务器、规则集或代理节点的配置要求默认域名解析器；重新预览并刷新对应的 `sing-box-*` Config File，使 JSON 中出现 `route.default_domain_resolver: "dns-direct"`。
