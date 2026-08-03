# Egern 部署指南

本指南把已有的 Sub-Store 节点集合生成三份设备 Profile。先读 [Sub-Store 外置 JS + 任务引用总指南](../../../docs/substore-two-layer-setup.md)，再完整读一遍并开始操作；四个 File 都选择链接模式，直接引用两条规范 Pages JS URL。四个任务存在依赖关系，必须按顺序完成。

## 0. 开始前

- 确认 Sub-Store 中已有节点集合 `shadowrocket-sources`。下文的 `name` 指向这个现有集合；不要重命名或改名 `shadowrocket-sources`，也不要创建同名副本来替代它。
- 备份 Egern 当前使用的旧 Profile，记下当前选中的策略与节点。不要删除或覆盖旧 Profile。
- 准备仅自己可访问的 Sub-Store File 输出地址。不得公开、发布、粘贴或上传私密 URL、订阅 URL 或 Profile URL。
- 以下 `example.invalid` 是 IANA 保留域名，只是占位符；结构示例不能直接联网或实际使用。

## 1. 创建私密节点任务 `egern-nodes`

本项目在 Pages 提供两条外置 JavaScript：

- `egern-node-generator.js` → `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js`
- `egern-profile-generator.js` → `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js`

随后在 Sub-Store 中新建 File 任务 `egern-nodes`：

- 添加脚本操作，来源选择“链接/远程脚本”，直接粘贴 `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js`，不要粘贴 JavaScript 正文。
- 参数原样复制：`output=nodes&type=collection&name=shadowrocket-sources&clientChain=off`
- 来源类型是已有 collection，名称必须仍是 `shadowrocket-sources`。

操作顺序是：新建 File `egern-nodes` → 添加 Script/脚本操作 → 选择链接模式 → 粘贴 Node Generator URL → 展开可视化参数编辑器并填写上述参数。以后更新 Node Generator 不复制脚本正文；`egern-nodes` 的脚本 URL、任务名、私密输出 URL和参数保持不动。

旧版只有单行链接时使用 `JS_URL#arg1=value1&arg2=value2`，不能使用 `?` 连接脚本参数。

旧 `substore-node-generator.js`、`substore-profile-generator.js` Pages URL 继续作为字节一致兼容别名；既有 File 无需仅为改名迁移。新任务使用 `egern-*` 规范 URL，不要同时引用新旧别名。

保存并运行。预览诊断中的 `total` 和 `accepted` 应为数字，且 `accepted` 至少为 1。若输出为空，不要继续创建 Profile；先按排障指南处理。

运行成功后，Sub-Store 会为这个 File 任务提供一个仅自己可访问的真实输出 URL。记下它，但不要把它写入仓库、Issue、截图、聊天、终端命令或日志。

## 2. 创建 macOS 任务 `egern-macos`

在 Sub-Store 中新建第二个 File 任务，名称设为 `egern-macos`：

- 脚本来源选择链接模式，直接粘贴 `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js`，不要粘贴 JavaScript 正文。
- 参数原样复制：`output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off`
- 只在这个私密 Profile File 任务的参数编辑器里，把 `https://example.invalid/private/egern-nodes` 替换为第 1 步得到的真实 `egern-nodes` 输出 URL。

保存并运行。生成的 Profile 根结构包含且只包含以下根键：`ipv6`、`block_quic`、`close_connections_on_policy_change`、`bypass_tunnel_proxy`、`real_ip_domains`、`hijack_dns`、`dns`、`policy_groups`、`rules`、`default_subscription_group`。它默认省略 `auto_update`，因为仓库不知道你的私密 Profile URL，而 Egern 不接受缺少必填 `url` 的空对象；它也不含 `url_rewrites`，没有把真实节点内嵌进 Profile。本项目不会生成且不依赖 URL 重写。

## 3. 创建 iPhone 任务 `egern-iphone`

在 Sub-Store 中新建第三个 File 任务，名称设为 `egern-iphone`：

- 继续以链接模式引用同一个 `egern-profile-generator.js` 规范 Pages URL，不要粘贴脚本正文。
- 参数原样复制：`output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off`
- 同样只在这个私密任务的参数编辑器中替换节点占位 URL。

保存、运行并检查结构。iPhone 默认 `ipv6Mode=auto`，不要照抄 macOS 的 `ipv4-only`。

## 4. 创建 iPad 任务 `egern-ipad`

在 Sub-Store 中新建第四个 File 任务，名称设为 `egern-ipad`：

- 继续以链接模式引用同一个 `egern-profile-generator.js` 规范 Pages URL，不要粘贴脚本正文。
- 参数原样复制：`output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off`
- 同样只在这个私密任务的参数编辑器中替换节点占位 URL。

保存、运行并检查结构。到这里，四个任务才算完整。

## 参数边界

默认组合是稳定 DNS、阿里 DNS、Cloudflare、平衡拦截、代理时阻止 QUIC、自动策略组、关闭客户端链路。可选值如下；每次只改一个参数，并重新生成后灰度验证：

| 参数 | 可选值 |
| --- | --- |
| dnsMode | stable、privacy、speed |
| chinaDns | alidns、dnspod、system |
| globalDns | cloudflare、google、quad9 |
| blockMode | balanced、security、strict、off |
| quicMode | allow、proxy-block、all-block |
| ipv6Mode | auto、ipv4-only |
| autoGroupMode | auto、full、balanced、minimal |
| clientChain | off、on |

`clientChain=off` 是默认值。只有明确、合法且兼容的入口节点和落地节点同时存在，并能验证 `prev_hop` 引用时，才考虑开启。

## 私密 URL 的唯一替换位置

`https://example.invalid/private/egern-nodes` 是固定的文档占位值。只允许在三个私密 Profile File 任务的参数编辑器内替换它；不要改公开示例，不要提交真实值，也不要在公开文档、GitHub、Issue、截图、聊天或日志中出现真实值。实际可用配置必须由自己的私密 Sub-Store 任务产生。

如果界面提供可视化参数名/参数值输入框，真实 URL 填原值并让界面编码；如果只有单行脚本链接，把完整真实 URL 作为 `nodeSubscriptionUrl` 的一个参数值进行百分号编码，尤其是其中的 `?`、`&`、`=`、`#` 和 `%`。不要编码脚本 URL 或整段 `#arg1=value1&arg2=value2`。

节点挂载 URL 每 `21600` 秒（6 小时）刷新；公开规则 URL 每 `86400` 秒（24 小时）刷新。它们分别更新，节点失败不等于规则失败。默认省略 `auto_update` 是因为没有可安全写入生成器的私密 Profile 自更新 URL；修改参数后，请重新运行或刷新对应的 Sub-Store Profile File 任务，然后在 Egern 手动更新 Profile。

规范 `/current/` Pages URL 保持不变。脚本版本升级时四个 File 继续直接引用原 URL，任务名、File 参数和私密输出 URL均不修改；发布后逐个重新预览并按 canary 顺序验证。

## 导入 Egern

### 方式 A：界面导入

在 Egern 的 Profile/配置界面选择添加或导入远程 Profile，把对应的私密 Profile File 输出 URL 直接粘贴到 Egern。不要导入 `egern-nodes` 的节点文件；应导入 `egern-macos`、`egern-iphone` 或 `egern-ipad` 的输出。

### 方式 B：URL Scheme

Egern 官方格式是 `egern:/profiles/new?name=name&url=url`。`name` 和 `url` 都应分别进行百分号编码（URL 编码）；以下只是占位示例：

`egern:/profiles/new?name=Egern%20macOS&url=https%3A%2F%2Fexample.invalid%2Fprivate%2Fegern-macos`

不要把真实 URL 写进 shell 历史、公开笔记或截图。官方说明见 [Egern URL Scheme](https://egernapp.com/zh-CN/docs/url-scheme/)。

## 无需 HTTPS 解密

本项目的配置不需要 HTTPS 解密或 MITM，应保持关闭；CA 证书不要安装，也不得启用 MITM。额外脚本、URL 重写、HTTP 抓包或捕获不需要开启。Egern 官方文档说明，[URL 重写](https://egernapp.com/zh-CN/docs/configuration/url_rewrites/)与 [HTTP 抓包](https://egernapp.com/zh-CN/docs/configuration/http_captures/)若处理 HTTPS 会要求 MITM 与 CA；本项目故意不使用这些能力。

## 稳定版与测试版

稳定版 Egern 是默认基线。Beta/TestFlight 是自愿、主动选择的额外验证通道，仍使用同一份 Profile，不代表可以开启未验证字段。只有仓库以后提交明确的 feature flag 或功能开关，才会出现可审计的测试版差异。

完成导入后不要立即更新其他设备；进入[灰度与回滚指南](canary.md)。
