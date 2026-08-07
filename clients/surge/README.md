# Surge 配置生成器

本目录为官方 Surge macOS、iPhone、iPad 客户端提供 Sub-Store 远程配置生成器。节点和凭据只在你的 Sub-Store 运行时读取；GitHub Pages 只公开无节点的 JavaScript、规则和文档。

## 先看这三份文档

1. [五客户端总指南](../../docs/substore-two-layer-setup.md)：创建 `apple-proxy-sources`、引用 `snell` 与 `vlesshy2`，以及 17 个私密任务的总表。
2. [Surge 部署](docs/deployment.md)：按 macOS → iPhone → iPad 创建三个 File，并导入官方 Surge。
3. [灰度与排障](docs/canary.md)：确认国内 App、DNS、UDP、局域网和回滚顺序。

## 三个私密 File 任务

三个 File 都引用同一份公开脚本；只改变 `platform` 和 macOS 的 `ipv6Mode`。`Apple-Proxy-Nodes` 只是示例显示名，必须改成你在 Sub-Store/Surge 节点订阅中实际使用的显示名，并在三个任务里保持完全一致。

| File | 平台 | Arguments |
| --- | --- | --- |
| `surge-macos` | macOS | `output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `surge-iphone` | iPhone | `output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=iphone&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `surge-ipad` | iPad | `output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=ipad&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

旧版 Sub-Store 只有单行远程链接时，参数放在 `JS_URL#...` 后面，例如：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=iphone&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off
```

不要用 `?` 连接脚本参数，也不要把整条 JS URL 或参数分隔符一起编码。`insecure`、`noCache` 保持关闭；正式任务不要把真实节点 URL、API、UUID 或密码放进参数。

## 公开脚本地址

- 稳定版：`https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js`
- 测试版：`https://juan-nikola.github.io/apple-proxy-profiles/edge/surge/scripts/surge-profile-generator.js`

先用 `edge` 在一台 Mac 灰度，再切回或提升到 `current`。Surge macOS 的两个架构共用 `platform=macos`；iPhone、iPad 分别使用各自参数。

`adblockMode=off` 是默认值，不下载完整广告分类。只有明确改为 `adblockMode=full` 时，才会加载与 `channel` 一致的独立可选广告包。

## 改什么去哪里

| 需求 | 修改位置 | 说明 |
| --- | --- | --- |
| 增加节点或来源 | Sub-Store 的 `apple-proxy-sources` | 只加入/移除 `snell`、`vlesshy2` 或新来源，不改 JavaScript。 |
| 改国内/国外分流 | `shared/rules/`、`clients/surge/src/render-rules.js` | 先改共享规则，再运行规则测试和构建。 |
| 改 Surge 分组/参数 | `clients/surge/src/`、`clients/surge/src/options.js` | 必须同步测试与 README 参数表。 |
| 改公开远程入口 | `clients/surge/scripts/build.mjs`、`public/` 生成流程 | `dist/` 和 `public/` 都是构建产物，不手工编辑。 |
| 改使用步骤 | `clients/surge/docs/` 与根目录 `docs/` | 每次更新都保留旧 Profile，先做 canary。 |

## 本地构建与检查

在仓库根目录执行：

```bash
npm ci
npm --workspace @apple-proxy-profiles/surge test
npm --workspace @apple-proxy-profiles/surge run build
npm --workspace @apple-proxy-profiles/surge run check:secrets
```

生成的 `dist/*.js`、`public/current/surge/` 和 `public/edge/surge/` 只读使用，不要直接编辑；源码、测试和文档才是修改入口。
