# Surge 配置生成器

Surge 新任务只读取 `apple-proxy-surge`。客户端 collection 边界、迁移与回滚以 [Sub-Store 客户端节点池指南](../../docs/substore-client-pools.md) 为准；已有 `apple-proxy-sources` collection、tasks 和旧 URL 保留作兼容/回滚，不要删除。

本目录为官方 Surge macOS、iPhone、iPad 客户端提供 Sub-Store 远程配置生成器。节点和凭据只在你的 Sub-Store 运行时读取；GitHub Pages 只公开无节点的 JavaScript、规则和文档。

## 先看这三份文档

1. [Sub-Store 八客户端指南](../../docs/substore-two-layer-setup.md)：创建 `apple-proxy-surge`、加入你已验证的私密来源，以及 30 个私密任务的总表。
2. [Surge 部署](docs/deployment.md)：先创建 Surge 节点资源 File，再按 macOS → iPhone → iPad 创建三个远程 Profile File。
3. [灰度与排障](docs/canary.md)：确认国内 App、DNS、UDP、局域网和回滚顺序。

## 一个节点资源 File + 三个私密 Profile File

`surge-nodes` 从同一个 `apple-proxy-surge` 组合生成 Surge 专用节点资源；三个 Profile File 只写入这个资源的私密 URL，不再嵌入服务器、端口或密码。`Apple-Proxy-Nodes` 只是示例显示名，必须改成你在 Sub-Store/Surge 中实际使用的显示名，并在三个任务里保持完全一致。

节点资源脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-nodes-generator.js
```

节点资源参数：

```text
output=nodes&type=collection&name=apple-proxy-surge&clientChain=off
```

先预览并保存 `surge-nodes` 的私密输出 URL，再把它作为唯一的 `proxyPolicyUrl` 填入下表三个 Profile 任务。示例中的 `https://example.invalid/private/surge-nodes` 不能直接使用。

每个 Profile 只生成一个隐藏的 `📦 远程节点池`。如果要手动切换到另一份 Surge 节点订阅，只替换下载后 Profile 中这一组的 `policy-path`，不要改组名或删除 `include-other-group`、`policy-regex-filter`；节点分类和自动测速会继续对新订阅生效。订阅源中被注释或筛掉的节点不会被生成器恢复，因此只剩一个可用节点时显示一个节点是预期行为。

| File | 平台 | Arguments |
| --- | --- | --- |
| `surge-config-macos` | macOS | `output=config&type=collection&name=apple-proxy-surge&subscriptionName=Apple-Proxy-Nodes&platform=macos&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `surge-config-iphone` | iPhone | `output=config&type=collection&name=apple-proxy-surge&subscriptionName=Apple-Proxy-Nodes&platform=iphone&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `surge-config-ipad` | iPad | `output=config&type=collection&name=apple-proxy-surge&subscriptionName=Apple-Proxy-Nodes&platform=ipad&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |

旧版 Sub-Store 只有单行远程链接时，参数放在 `JS_URL#...` 后面，例如：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js#output=config&type=collection&name=apple-proxy-surge&subscriptionName=Apple-Proxy-Nodes&platform=iphone&channel=current&adblockMode=off&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off
```

不要用 `?` 连接脚本参数，也不要把整条 JS URL 或参数分隔符一起编码。`insecure`、`noCache` 保持关闭；正式任务不要把真实节点 URL、API、UUID 或密码放进参数。

## 公开脚本地址

- 稳定版：`https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js`
- 稳定节点资源版：`https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-nodes-generator.js`
- 测试版：`https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js`

生产直接使用已通过自动化门禁的 `current`；`edge` 仅供维护者预览，设备 canary 是上线后的可选反馈。Surge macOS 的两个架构共用 `platform=macos`；iPhone、iPad 分别使用各自参数。

`adblockMode=off` 是默认值，不下载完整广告分类。只有明确改为 `adblockMode=full` 时，才会加载与 `channel` 一致的独立可选广告包。

`globalDns` 暂保留为跨客户端参数兼容位，Surge 的三端可移植 Profile 不在本地使用它。明确的海外域名在 IP 规则之前命中代理，由代理端解析；未命中域名使用 `chinaDns`，若国内 DNS 解析失败则由 `FINAL` 的 `dns-failed` 回退到代理。

三个完整 Profile 都读取私密 `apple-proxy-policy`。`final=FOLLOW`、`DIRECT` 或 `NODE~查询词` 分别让 `漏网之鱼` 默认选择 `🚀 节点选择`、`DIRECT` 或唯一匹配节点；该组始终保留三种候选，`REJECT` 只用于手动排查。Surge 的最终规则固定为 `FINAL,漏网之鱼,dns-failed`。

## 改什么去哪里

| 需求 | 修改位置 | 说明 |
| --- | --- | --- |
| 增加节点或来源 | Sub-Store 的 `apple-proxy-surge` | 只加入/移除你已验证的私密来源，不改 JavaScript。 |
| 改国内/国外分流 | `shared/rules/`、`clients/surge/src/render-rules.js` | 先改共享规则，再运行规则测试和构建。 |
| 改 Surge 分组/参数 | `clients/surge/src/`、`clients/surge/src/options.js` | 必须同步测试与 README 参数表。 |
| 改公开远程入口 | `clients/surge/scripts/build.mjs`、`public/` 生成流程 | `dist/` 和 `public/` 都是构建产物，不手工编辑。 |
| 改使用步骤 | `clients/surge/docs/` 与根目录 `docs/` | 每次更新都保留旧 Profile；canary 仅作上线后反馈。 |

## 本地构建与检查

在仓库根目录执行：

```bash
npm ci
npm --workspace @apple-proxy-profiles/surge test
npm --workspace @apple-proxy-profiles/surge run build
npm --workspace @apple-proxy-profiles/surge run check:secrets
```

生成的 `dist/*.js`、`public/current/surge/` 和 `public/current/surge/` 只读使用，不要直接编辑；源码、测试和文档才是修改入口。
