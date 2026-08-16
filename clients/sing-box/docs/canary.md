# sing-box 灰度与 testing 跟踪

`edge` 跟踪官方 sing-box testing 分支的每日提交；`current` 是经过配置结构、规则集和客户端冒烟测试后的稳定指针。前沿版本可能改变字段，因此不要让所有设备同时切到 edge。

建议顺序：先 Mac，再 Android，再 iPhone 和 iPad，最后是 OpenWrt 测试 VLAN。每个平台至少验证启动、DNS、国内 App、国际站点、节点切换、UDP 和回滚；OpenWrt 还要验证 LAN、IPv6、旁路设备和网关自身访问。

出现问题时先把 `channel` 改回 `current`，再保留 edge 的提交号和客户端日志。

## 分流顺序、残余风险与离线解释

共享分流顺序固定为：`DomesticCore` → 服务规则 → `OverseasGame` → `ChinaTLD` → `ChinaIP` → FINAL。sing-box 在 `ChinaIP` 前显式执行 DNS 直连解析（resolve action）。稳定 DNS 优先国内解析；普通 `.cn` 域名应命中 `ChinaTLD`/DIRECT，未知国内 IPv4/IPv6 应命中 `ChinaIP` 直连，未知境外与 DNS 失败走 `🚀 节点选择`。HTTPDNS、硬编码 IP、IPv6、QUIC 和手动服务组选择仍是残余风险。`npm run explain:route -- --channel current --domain <域名>` 只读取本地已发布规则、不执行 DNS，可用于离线核对预期分流。支持蜂窝的设备必须分别测试 Wi‑Fi 与蜂窝；保留旧配置，并实际完成一次回滚。

## 零远程规则诊断配置

如果点击启动后内存立即暴涨，先直接导入与设备对应的诊断配置。它保留 TUN、DNS、节点出站和可选的最终策略，但 `route.rule_set` 为空，不会下载任何远程规则。示例节点只用于启动与内存对照，不提供实际代理连接。

- [Mac 诊断配置](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/examples/sing-box-macos-diagnostic.json)
- [iPhone 诊断配置](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/examples/sing-box-iphone-diagnostic.json)
- [iPad 诊断配置](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/examples/sing-box-ipad-diagnostic.json)
- [Android 诊断配置](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/examples/sing-box-android-diagnostic.json)
- [OpenWrt 诊断配置](https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/examples/sing-box-openwrt-diagnostic.json)

诊断配置可正常启动而默认配置仍暴涨，问题优先指向规则集加载或规则引擎；两者都暴涨，则优先检查 TUN、节点出站或客户端本身。iPhone/iPad 的当前配置应只有一个 `⚡ 全部自动` URLTest；如果日志仍同时出现全局、洲级和规则下载多组并发测速，说明设备仍在使用旧配置，需要重新预览、刷新并重新导入。
