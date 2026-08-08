# sing-box 配置生成器

本目录为官方 sing-box 客户端生成 JSON 配置，覆盖 macOS、iPhone、iPad、Android 和 OpenWrt 软路由。配置由私密 Sub-Store 运行时生成，`current` 是通过验证的发布指针，`edge` 跟踪 testing 分支每日构建；前沿版本只应先在单台设备或测试 VLAN 灰度。

## 先看这三份文档

1. [五客户端总指南](../../docs/substore-two-layer-setup.md)：创建 `apple-proxy-sources`，引用已有 `snell`、`vlesshy2`，并按平台创建五个私密任务。
2. [sing-box 部署](docs/deployment.md)：填写远程 JS、平台参数、`channel=current|edge`，导入官方客户端。
3. [OpenWrt 透明网关](docs/openwrt.md)：单独验证 TUN、DNS 劫持、透明路由、LAN 与 IPv6。

## 五个私密 File 任务

五个 File 都引用同一份 Config Generator。`Apple-Proxy-Nodes` 是可替换的示例显示名，必须改成你的节点订阅真实显示名；`name` 固定指向保留来源标记的原始组合 `apple-proxy-sources`，不要指向 Shadowrocket 的处理组合。

| File | 平台 | Arguments 差异 |
| --- | --- | --- |
| `sing-box-macos` | macOS | `platform=macos&ipv6Mode=ipv4-only` |
| `sing-box-iphone` | iPhone | `platform=iphone&ipv6Mode=auto` |
| `sing-box-ipad` | iPad | `platform=ipad&ipv6Mode=auto` |
| `sing-box-android` | Android | `platform=android&ipv6Mode=auto` |
| `sing-box-openwrt` | OpenWrt | `platform=openwrt&ipv6Mode=auto` |

公共参数为：

```text
output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&autoGroupMode=auto&clientChain=off&channel=current
```

把每个平台追加到公共参数末尾。旧版 Sub-Store 单行模式使用 `JS_URL#output=config&type=collection&...`；不能使用 `?` 连接脚本参数。要测试 testing 分支，只把 `channel=current` 改为 `channel=edge`，并将远程脚本路径中的 `current` 改为 `edge`。

## 公开脚本地址

- 稳定版：`https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js`
- 测试版：`https://juan-nikola.github.io/apple-proxy-profiles/edge/sing-box/scripts/sing-box-config-generator.js`

预览成功标志：输出是合法 JSON，包含 `log`、`dns`、`inbounds`、`outbounds`、`route`，并且有节点和规则引用。Apple/Android 的 TUN 配置不应直接复制到 OpenWrt；OpenWrt 是透明网关，需用独立 LAN/VLAN 灰度。

如果 sing-box 日志出现 `https://https:%2F...` 或 `invalid port`，说明旧配置把完整 DoH URL 填进了结构化 HTTPS DNS 的 `server` 字段。重新生成当前配置后，`server` 应是纯主机/IP，`server_port`、`path` 和 `tls.server_name` 分开出现；不要手工把完整 URL 拼回 `server`。

## 改什么去哪里

| 需求 | 修改位置 | 说明 |
| --- | --- | --- |
| 增加节点或来源 | Sub-Store 的 `apple-proxy-sources` | 只在私密组合中添加来源，不改公开 JS。 |
| 改分流规则 | `shared/rules/`、`clients/sing-box/src/render-rules.js` | 规则源与客户端格式分开维护。 |
| 改平台 TUN/透明网关 | `clients/sing-box/src/render-platform.js`、`src/render-config.js` | Apple/Android 与 OpenWrt 必须分别验证。 |
| 改 testing/current 行为 | `clients/sing-box/src/options.js`、`src/substore-config-entry.js` | `edge` 只适合灰度，`current` 才是稳定入口。 |
| 改 `.srs` 规则集 | `public/current/sing-box/rules/*.json` 或规则源 | `.srs` 由官方 sing-box core 编译，不能手工编辑。 |
| 改文档/测试 | `clients/sing-box/docs/`、`clients/sing-box/test/` | 先更新文档契约，再构建和校验。 |

`clients/sing-box/dist/`、`public/current/sing-box/`、`public/edge/sing-box/` 是生成产物，只读使用。真实 JSON、节点 URL、凭据和 Sub-Store API 不得进仓库。

## 本地构建与检查

```bash
npm ci
npm --workspace @apple-proxy-profiles/sing-box test
npm --workspace @apple-proxy-profiles/sing-box run build
npm --workspace @apple-proxy-profiles/sing-box run check:secrets
```

编译二进制规则集时还需要官方 sing-box core，详见 [OpenWrt 与规则集构建说明](docs/openwrt.md) 和根目录[维护手册](../../docs/maintenance.md)。
