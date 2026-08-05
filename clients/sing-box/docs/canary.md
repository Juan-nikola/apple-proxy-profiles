# sing-box 灰度与 testing 跟踪

`edge` 跟踪官方 sing-box testing 分支的每日提交；`current` 是经过配置结构、规则集和客户端冒烟测试后的稳定指针。前沿版本可能改变字段，因此不要让所有设备同时切到 edge。

建议顺序：先 Mac，再 Android，再 iPhone 和 iPad，最后是 OpenWrt 测试 VLAN。每个平台至少验证启动、DNS、国内 App、国际站点、节点切换、UDP 和回滚；OpenWrt 还要验证 LAN、IPv6、旁路设备和网关自身访问。

出现问题时先把 `channel` 改回 `current`，再保留 edge 的提交号和客户端日志。
