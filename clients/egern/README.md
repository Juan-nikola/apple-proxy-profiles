# Egern 配置生成器

这里提供与项目规则体系一致的 Egern 配置生成器。它把已有 Sub-Store 节点集合转换为一份私密节点文件，再按 macOS、iPhone、iPad 分别生成 Egern Profile；节点不会写进仓库或公开示例。

## 从这里开始

1. 先按根目录的 [Sub-Store 外置 JS + 任务引用总指南](../../docs/substore-two-layer-setup.md)，再按[部署指南](docs/deployment.md)让四个私密 File 任务以链接模式直接引用两条 Egern Pages JS URL 并导入 Profile。
2. 按[灰度与回滚指南](docs/canary.md)严格以 Intel Mac、iPhone、iPad 的顺序逐台验证。
3. 遇到失败时按[排障指南](docs/troubleshooting.md)定位；第一原则是保留旧 Profile 并安全回滚。

可执行产物是[节点生成器](dist/egern-node-generator.js)和[配置生成器](dist/egern-profile-generator.js)。仓库中的 [macOS 结构示例](examples/egern-macos.yaml)、[iPhone 结构示例](examples/egern-iphone.yaml)及 [iPad 结构示例](examples/egern-ipad.yaml)只用于检查结构，使用 `example.invalid` 保留域名，不能直接联网或实际使用。实际使用必须来自你自己的私密 Sub-Store File 输出。

新任务统一使用 `egern-node-generator.js` 与 `egern-profile-generator.js`。旧 `substore-node-generator.js`、`substore-profile-generator.js` 文件和 Pages URL 保留为字节一致的兼容别名，既有 Sub-Store 任务无需仅为改名更换 URL；不要把新旧别名当成不同脚本重复导入。

Egern Node Generator 通过稳定 URL 复用：File `egern-nodes` 直接引用 `egern-node-generator.js` 的规范 Pages URL，并在自己的参数编辑器中保存参数。以后升级 JS 不复制脚本正文，`egern-nodes` 的脚本 URL、任务名、私密输出 URL和参数都不动。三个 Profile File 对 `egern-profile-generator.js` 采用相同方式。

## Sub-Store 两层创建清单（可直接照填）

仓库在 GitHub Pages 维护两条 Egern 外置 JS。Sub-Store 不需要先创建独立脚本记录；后面的 4 个 File 直接引用对应 URL。

| 外置 JS 文件名 | JavaScript URL |
| --- | --- |
| `egern-node-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js` |
| `egern-profile-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js` |

按顺序创建 4 个 File。每个 File 选择“链接/远程脚本”，直接粘贴上表对应 URL，并在自己的可视化参数编辑器中填写下面参数；不要粘贴 JavaScript 正文。

| File 任务名 | 引用脚本 | Arguments |
| --- | --- | --- |
| `egern-nodes` | `egern-node-generator.js` | `output=nodes&type=collection&name=shadowrocket-sources&clientChain=off` |
| `egern-macos` | `egern-profile-generator.js` | `output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `egern-iphone` | `egern-profile-generator.js` | `output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `egern-ipad` | `egern-profile-generator.js` | `output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

先运行 `egern-nodes`，取得自己的私密输出 URL，再只在三个 Profile File 的参数编辑器里替换 `https://example.invalid/private/egern-nodes`。可视化参数编辑器填写原始 URL；旧版只有单行链接时，把真实 URL 当作一个参数值进行百分号编码。不要编码整条 JS URL，也不要把真实 URL 写入公开脚本、仓库或文档。

旧版单行链接写法是 `JS_URL#arg1=value1&arg2=value2`，不能使用 `?` 连接脚本参数。创建、预览、导入、可选参数和回滚的完整步骤见[部署指南](docs/deployment.md)。

## 安全与更新边界

- 私密节点 URL、Profile URL、订阅 URL 只能保存在自己的 Sub-Store 与 Egern 中。不得公开、发布、粘贴或上传私密 URL 到 GitHub、Issue、截图、聊天或日志。
- 本项目不需要 HTTPS 解密或 MITM，CA 证书不要安装；也不得启用 MITM。脚本、重写和抓包不是此配置的运行依赖，不需要开启。
- 节点挂载组的刷新周期是 `21600` 秒，即 6 小时；公开规则的刷新周期是 `86400` 秒，即 24 小时。两者不是同一刷新源。
- 生成配置中的 `auto_update` 保持空的 `{}` 是有意设计：仓库不知道你的私密 Profile URL。参数变化后，应重新运行或刷新私密 Sub-Store Profile File 任务，再在 Egern 中更新。
- Egern 稳定版是默认发布基线。Beta 或 TestFlight 仅供主动选择的用户验证，并继续使用同一份 Profile；除非以后仓库提交明确的 feature flag（功能开关），不要假设测试版专属行为。

所有生成器都采用 fail-closed（失败即停止）校验。不得绕过或削弱 fail-closed 校验，也不得删除或覆盖旧 Profile 来“修复”导入问题。
