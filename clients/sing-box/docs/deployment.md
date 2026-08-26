# sing-box 部署

sing-box 读取独立的 Sub-Store 组合 `apple-proxy-singbox`。组合中的节点由你维护；`sing-box-client` 不是必需标签，可以删除标签筛选后手动选择节点。默认严格模式会保留所有可完整转换的节点，并对无效输入、未知字段或不支持的传输组合 fail closed。组合迁移和回滚见 [Sub-Store 客户端节点池指南](../../../docs/substore-client-pools.md)。

首次手动组合建议：记录旧 preview 数量，移除 `sing-box-client` 筛选，手动勾选节点，Preview collection，再 Preview 四个平台任务。不要修改 `name=apple-proxy-singbox`；如果 strict 失败，先移除不兼容节点或修正字段。

## Sub-Store File

脚本地址：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js
```

公共参数：

```text
output=config&type=collection&name=apple-proxy-singbox&subscriptionName=Apple-Proxy-Nodes&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&autoGroupMode=auto&clientChain=off&nodeErrorMode=strict&channel=current
```

`subscriptionName` 必须是节点 File 在客户端显示的名称。不要把私密节点 URL、密码、UUID 或 Sub-Store API 放进公开脚本参数。

| File | `platform` | `ipv6Mode` |
| --- | --- | --- |
| `sing-box-macos` | `macos` | `ipv4-only` |
| `sing-box-iphone` | `iphone` | `ipv4-only` |
| `sing-box-ipad` | `ipad` | `ipv4-only` |
| `sing-box-android` | `android` | `auto` |

预览必须是合法 JSON，并包含 `dns`、`inbounds`、`outbounds`、`route`。如果 `strict` 失败，查看 Sub-Store 日志中的协议和字段错误，不要改成兼容模式来掩盖节点丢失。

## 分流验收

每个平台至少测试：

- `baidu.com`、`bilibili.com` 和局域网地址直连。
- `google.com`、`youtube.com`、GitHub 和 AI 服务走相应业务组。
- 未配置但解析到中国 IP 的域名直连。
- 未配置且解析到非中国 IP 的域名走 `🚀 节点选择`。
- 代理节点切换后，海外服务的新连接使用新节点。
- 关闭代理后系统网络恢复。

未知域名使用 DNS response matching 和 `ChinaIP` rule-set 自动分类，但不承诺对已经失败的请求进行跨出口重放。被墙的中国域名应加入自定义 proxy 规则。

## current-only 发布

更新工作流解析官方 sing-box testing 最新 release，安装官方校验过的 core，重新编译 `.srs`、生成四个平台配置并执行 `sing-box check`，通过后原子替换唯一公开的 `current` 快照。设备侧如需回滚，使用本地保留的旧 Config，不切换不存在的公开回滚频道。

iPhone/iPad/Android 的配置统一按移动端内存预算生成：日志为 `warn`、缓存文件和 `store_dns` 关闭、规则集限制为 14 个，且不允许 `adblockMode=full`。macOS 继续使用完整规则目录。

## 代码职责

- `src/render-dns.js`：国内 DNS、代理 DoH、未知域名 response matching。
- `src/render-rules.js`：rule-set、GeoIP/ChinaIP 兜底和 QUIC 策略。
- `src/render-groups.js`：Egern 风格策略组到 sing-box selector/urltest 的映射。
- `src/render-node.js`：节点协议投影；WireGuard 使用 endpoint，不再生成已移除的 outbound。
- `src/render-platform.js`：Apple/Android TUN 差异。
- `scripts/compile-rules.mjs`：只接受官方 core 生成的 `.srs`。

OpenWrt 透明网关暂不属于本次生成器目标，后续必须在明确 LAN、IPv6、fw4/nftables 和回环要求后单独实现。
