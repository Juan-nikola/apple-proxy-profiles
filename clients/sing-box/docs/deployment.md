# sing-box 部署

本手册覆盖官方 sing-box macOS、iPhone、iPad、Android 和 OpenWrt 软路由。五个平台共用节点组合，但 Apple/Android 是设备 TUN，OpenWrt 是透明网关，不能互换配置。

## 1. 创建私密组合

1. 在 Sub-Store 新建组合 `apple-proxy-sources`。
2. 加入已有来源 `snell` 与 `vlesshy2`，预览节点数必须大于 0。
3. 记下节点订阅的显示名，例如 `Apple-Proxy-Nodes`。后续 `subscriptionName` 必须与这个显示名完全一致；它不是组合名，也不是公开占位 URL。

## 2. 创建五个 File

每个 File 添加一条启用的“脚本操作”，选择远程链接：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js
```

复制公共参数后逐项填写；`platform` 是每个任务的唯一平台差异，macOS 明确使用 `ipv4-only`，移动端和 OpenWrt 使用 `auto`。稳定版公共参数如下：

```text
output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&autoGroupMode=auto&clientChain=off&channel=current
```

| File | `platform` | `ipv6Mode` |
| --- | --- | --- |
| `sing-box-macos` | `macos` | `ipv4-only` |
| `sing-box-iphone` | `iphone` | `auto` |
| `sing-box-ipad` | `ipad` | `auto` |
| `sing-box-android` | `android` | `auto` |
| `sing-box-openwrt` | `openwrt` | `auto` |

预览时 JSON 必须能解析，并包含 `dns`、`inbounds`、`outbounds`、`route`；节点不为空。若只看到占位内容，先确认脚本启用/预览开关、组合非空、`name` 和 `subscriptionName` 没有混用。

`🚀 节点选择` 采用两级结构：主组只包含 `⚡ 全部自动`、`🛟 全部故障转移` 和洲组（`🌏 亚太`、`🌍 欧洲`、`🌎 美洲`），具体节点按洲收进对应洲组。这样在 sing-box 图形客户端（SFA/SFM）里，先选洲、再选节点，而不是面对一长串平铺节点。

## 3. current 与 edge

`current` 是稳定发布入口；`edge` 使用 testing 分支每日构建，可能出现字段、内核行为或规则兼容性变化。测试时同时做两处修改：

1. 远程脚本 URL 中 `current` 改为 `edge`。
2. Arguments 中 `channel=current` 改为 `channel=edge`。

先只在 Mac 预览和导入，确认后再 Android、iPhone、iPad，最后在 OpenWrt 测试 VLAN。出错时先回到 `current`，保留失败的 JSON、平台、日期和 sing-box 提交号用于排障。

## 4. 导入顺序与平台差异

1. macOS：先保留旧配置，导入 `sing-box-macos`，验证 DNS、国内 App、国际站点、UDP、IPv4/IPv6 和节点切换。
2. Android：导入 `sing-box-android`，确认系统 VPN 权限、TUN、后台运行和电池策略。
3. iPhone、iPad：依次导入对应 File，确认按需连接、系统 VPN 权限、局域网访问和切换节点。
4. OpenWrt：只把 `sing-box-openwrt` 放到测试 VLAN，确认网关自身和 LAN 客户端都能回滚后再接入主 LAN。

所有设备保留上一份可用配置。国内 App 通过“开关一下”恢复时，先重新生成/刷新配置并检查 DNS、规则命中与测速状态，不把反复开关当作修复。

## 5. 文件职责与构建

- `clients/sing-box/src/options.js`：Arguments 白名单、平台和 `channel` 解析；可修改但必须更新测试。
- `clients/sing-box/src/render-config.js`、`render-platform.js`：JSON 根配置、TUN、OpenWrt 透明网关字段；可修改。
- `clients/sing-box/src/render-node.js`、`render-rules.js`：节点和规则格式转换；可修改。
- `clients/sing-box/test/`、`examples/`：测试和 `example.invalid` 结构样例；不含真实节点。
- `clients/sing-box/dist/`、`public/current/sing-box/`、`public/edge/sing-box/`：生成产物，只读。

```bash
npm --workspace @apple-proxy-profiles/sing-box test
npm --workspace @apple-proxy-profiles/sing-box run build
npm --workspace @apple-proxy-profiles/sing-box run check:secrets
```

`.srs` 规则集必须由官方 sing-box core 编译，不能使用任意第三方转换器。根目录的 `clients/sing-box/scripts/compile-rules.mjs` 会检查 core 生成的文件确实为非空二进制，并记录 SHA-256。
