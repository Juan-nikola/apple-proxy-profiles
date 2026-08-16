# OpenWrt 透明网关

OpenWrt 暂不属于本次 sing-box 重写范围。当前生成器只接受 `macos`、`iphone`、`ipad` 和 `android`，不会生成可被误用为透明网关的 OpenWrt JSON。Sub-Store 组合 `apple-proxy-singbox` 的迁移和回滚见 [Sub-Store 客户端节点池指南](../../../docs/substore-client-pools.md)。

后续实现前必须确认 LAN/VLAN 网段、路由器管理地址、IPv6、fw4/nftables、DNS 劫持方式、回环排除和旁路由拓扑。确认这些参数后再单独设计 `auto_redirect` 配置，并用测试 VLAN 验证；不要把终端 TUN 配置直接放到 OpenWrt。
