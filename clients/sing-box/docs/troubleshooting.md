# sing-box 排障

国内 App 偶发变慢时，先看 DNS 是否误走代理、`ChinaMax` 是否命中直连、自动测速组是否选中了高延迟节点，以及规则集是否下载成功。开关后恢复通常是缓存或测速状态重新初始化，并不代表根因消失。

如果日志大量出现 `dial tcp [2408:...]:443: connect: no route to host`（通常是抖音等使用 IPv6 CDN 的国内 App），说明当前 Wi‑Fi/蜂窝没有 IPv6 路由但 `ipv6Mode=auto` 仍在解析 AAAA。把对应 `sing-box-*` 任务的 `ipv6Mode` 改为 `ipv4-only` 并重新预览/刷新即可；网络具备 IPv6 时再改回 `auto`。

`quicMode=proxy-block` 会在 sing-box 路由中阻止“代理路径”上的 QUIC（UDP 443）：显式海外业务（YouTube、Netflix 等）和未命中直连规则的未知流量先被 REJECT，客户端回落到 TCP；国内直连域名、`.cn` 和中国 IP 的 QUIC 保持允许。`all-block` 在本地规则之后阻止全部应用 QUIC；`allow` 不添加任何 QUIC 规则。

如果 edge 启动失败，切换到 current；如果只有 OpenWrt 失败，检查 TUN、DNS 劫持、路由标记和 LAN 排除项；如果只有 Android 或 Apple 失败，检查客户端是否支持当前字段。保留平台、channel、生成时间、sing-box 提交号和日志，再提交问题。

如果出现 `dns.rules[0].action` 无法反序列化、提示不能把对象解析为字符串，说明拿到了旧版 DNS 规则结构：当前 sing-box 要求 `action` 是顶层字符串（例如 `"action": "route"`），`server` 也是同级字段。不要继续使用旧缓存 JSON；在 Sub-Store 重新预览并刷新对应的 `sing-box-*` Config File，确认 JSON 来自平台专用任务而不是组合订阅/API 总地址。

如果出现 `outbounds[*].snell: unsupported version: 5`，说明旧生成器没有适配源节点的 Snell v5。sing-box 1.14 的 Snell 出站只接受 v4/v6；v5 在不使用 QUIC 时与 v4 线格式兼容，生成器现在会把 v5 自动转换为 v4，并保留 PSK、复用和 UDP 设置。参见 [sing-box Snell outbound](https://sing-box.sagernet.org/configuration/outbound/snell/)。

如果出现 `domain_resolver` 或 `default_domain_resolver` 缺失，说明配置仍是旧版本缓存。sing-box 1.14 对包含域名服务器、规则集或代理节点的配置要求默认域名解析器；重新预览并刷新对应的 `sing-box-*` Config File，使 JSON 中出现 `route.default_domain_resolver: "dns-direct"`。

如果规则集报 `dial ... connection refused`、`context deadline exceeded` 或 TLS/握手错误，说明规则下载候选节点不可用。当前 `🧭 DNS 与规则下载` 是普通 selector，候选为 `🚀 节点选择`、`DIRECT`，默认走 `🚀 节点选择`；不会为下载规则建立全节点 URLTest 探测组。先刷新配置确认 selector 默认值，再在客户端里把 `🧭 DNS 与规则下载` 切到可用节点或 DIRECT，避免启动时对全部节点并发探测。

如果全部候选都失败，sing-box 仍会在规则集初始化阶段报错；这表示当前网络既不能通过代理访问规则文件，也不能直连 GitHub Pages，需要更换网络或节点后重新加载配置。

iOS 长时间开启后出现 `memory pressure: critical` 并自动退出时，先导入对应的诊断配置区分规则集与节点组开销。默认配置只保留 `⚡ 全部自动`、`🛟 全部故障转移` 两个测速组，并为它们设置 `idle_timeout`，空闲时暂停周期探测；`⚡ 亚太自动` 等洲级自动组已收敛为 selector，不再各自对全洲节点发起测速。若诊断配置也退出，优先更新 sing-box 客户端，并检查 TUN、节点数量和客户端后台限制。
