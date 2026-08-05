# OpenWrt 透明网关

OpenWrt 配置使用 `platform=openwrt`，建议先在独立测试 VLAN 验证，再接入主 LAN。它启用 TUN、DNS hijack、`auto_redirect`、路由排除和 LAN 网段保护；不要把这些参数直接复制到 Android 或 Apple 客户端。

至少验证：网关自身 DNS、LAN 客户端访问国内 App、国际站点、IPv4/IPv6、UDP、局域网互访、规则更新和重启恢复。升级 testing 版本前保存上一份可用 JSON，并准备切回 `channel=current`。
