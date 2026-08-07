# Surge 配置生成器

本目录为官方 Surge macOS、iPhone、iPad 客户端提供 Sub-Store 远程配置生成器。节点和凭据只在你的 Sub-Store 运行时读取；GitHub Pages 只公开无节点的 JavaScript、规则和文档。

## 先看这三份文档

1. [五客户端总指南](../../docs/substore-two-layer-setup.md)：创建 `apple-proxy-sources`、引用 `snell` 与 `vlesshy2`，以及 18 个私密任务的总表。
2. [Surge 部署](docs/deployment.md)：先创建 Surge 节点资源 File，再按 macOS → iPhone → iPad 创建三个远程 Profile File。
3. [灰度与排障](docs/canary.md)：确认国内 App、DNS、UDP、局域网和回滚顺序。

## 一个节点资源 File + 三个私密 Profile File

`surge-nodes` 从同一个 `apple-proxy-sources` 组合生成 Surge 专用节点资源；三个 Profile File 只写入这个资源的私密 URL，不再嵌入服务器、端口或密码。`Apple-Proxy-Nodes` 只是示例显示名，必须改成你在 Sub-Store/Surge 中实际使用的显示名，并在三个任务里保持完全一致。

节点资源脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-nodes-generator.js
```

节点资源参数：

```text
output=nodes&type=collection&name=apple-proxy-sources&clientChain=off
```

先预览并保存 `surge-nodes` 的私密输出 URL，再把它作为 `proxyPolicyUrl` 填入下表三个 Profile 任务。示例中的 `https://example.invalid/private/surge-nodes` 不能直接使用。

如果还要保留个人 Surge 节点订阅，可在三个 Profile 的私密 Script Operation 参数中追加可选的 `personalPolicyUrl=https://example.invalid/private/personal-surge`。生成的配置会额外提供隐藏的 `🧩 个人节点池` 和可见的 `🛠 节点来源`；在 `🚀 节点选择` 中选择来源即可在默认池与个人池之间切换。个人链接只保存在 Sub-Store 私有参数和下载后的 profile，不要提交到 GitHub。

| File | 平台 | Arguments |
| --- | --- | --- |
| `surge-macos` | macOS | `output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&proxyPolicyUrl=https://example.invalid/private/surge-nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `surge-iphone` | iPhone | `output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&proxyPolicyUrl=https://example.invalid/private/surge-nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `surge-ipad` | iPad | `output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&proxyPolicyUrl=https://example.invalid/private/surge-nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

旧版 Sub-Store 只有单行远程链接时，参数放在 `JS_URL#...` 后面，例如：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&proxyPolicyUrl=https%3A%2F%2Fexample.invalid%2Fprivate%2Fsurge-nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off
```

不要用 `?` 连接脚本参数，也不要把整条 JS URL 或参数分隔符一起编码。`insecure`、`noCache` 保持关闭；正式任务不要把真实节点 URL、API、UUID 或密码放进参数。

## 公开脚本地址

- 稳定版：`https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js`
- 稳定节点资源版：`https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-nodes-generator.js`
- 测试版：`https://juan-nikola.github.io/apple-proxy-profiles/edge/surge/scripts/surge-profile-generator.js`

先用 `edge` 在一台 Mac 灰度，再切回或提升到 `current`。Surge macOS 的两个架构共用 `platform=macos`；iPhone、iPad 分别使用各自参数。

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
