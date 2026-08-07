# sing-box 灰度与 testing 跟踪

`edge` 跟踪官方 sing-box testing 分支的每日提交；`current` 是经过配置结构、规则集和客户端冒烟测试后的稳定指针。前沿版本可能改变字段，因此不要让所有设备同时切到 edge。

建议顺序：先 Mac，再 Android，再 iPhone 和 iPad，最后是 OpenWrt 测试 VLAN。每个平台至少验证启动、DNS、国内 App、国际站点、节点切换、UDP 和回滚；OpenWrt 还要验证 LAN、IPv6、旁路设备和网关自身访问。

出现问题时先把 `channel` 改回 `current`，再保留 edge 的提交号和客户端日志。

## 零远程规则诊断配置

如果点击启动后内存立即暴涨，先直接导入与设备对应的诊断配置。它保留 TUN、DNS、节点出站和可选的最终策略，但 `route.rule_set` 为空，不会下载任何远程规则。示例节点只用于启动与内存对照，不提供实际代理连接。

- [Mac 诊断配置](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/examples/sing-box-macos-diagnostic.json)
- [iPhone 诊断配置](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/examples/sing-box-iphone-diagnostic.json)
- [iPad 诊断配置](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/examples/sing-box-ipad-diagnostic.json)
- [Android 诊断配置](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/examples/sing-box-android-diagnostic.json)
- [OpenWrt 诊断配置](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/examples/sing-box-openwrt-diagnostic.json)

诊断配置可正常启动而默认配置仍暴涨，问题优先指向规则集加载或规则引擎；两者都暴涨，则优先检查 TUN、节点出站或客户端本身。
