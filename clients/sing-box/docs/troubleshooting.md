# sing-box 排障

国内 App 偶发变慢时，先看 DNS 是否误走代理、`ChinaMax` 是否命中直连、自动测速组是否选中了高延迟节点，以及规则集是否下载成功。开关后恢复通常是缓存或测速状态重新初始化，并不代表根因消失。

如果 edge 启动失败，切换到 current；如果只有 OpenWrt 失败，检查 TUN、DNS 劫持、路由标记和 LAN 排除项；如果只有 Android 或 Apple 失败，检查客户端是否支持当前字段。保留平台、channel、生成时间、sing-box 提交号和日志，再提交问题。

如果出现 `dns.rules[0].action` 无法反序列化、提示不能把对象解析为字符串，说明拿到了旧版 DNS 规则结构：当前 sing-box 要求 `action` 是顶层字符串（例如 `"action": "route"`），`server` 也是同级字段。不要继续使用旧缓存 JSON；在 Sub-Store 重新预览并刷新对应的 `sing-box-*` Config File，确认 JSON 来自平台专用任务而不是组合订阅/API 总地址。
