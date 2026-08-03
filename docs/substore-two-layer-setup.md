# Sub-Store 两层部署总指南

本项目的 Sub-Store 部署固定分成两层：

1. **共享脚本层**：先在 Sub-Store 的脚本管理/脚本库中创建 5 条客户端专属脚本记录。每个 JavaScript 只保存一次。
2. **任务层**：组合订阅的 Script Operator 或 File 任务只引用已保存的脚本记录，并填写各自参数。不要把同一份脚本重复粘贴到多个 File。

这样升级脚本时只改共享脚本记录，所有引用它的任务继续使用原参数。不同 Sub-Store 版本的页面名称可能略有差异；应按“脚本管理 → 保存远程 JavaScript → 在组合订阅或 File 中选择已保存脚本”的用途寻找，不要进入 MITM、重写或证书页面。

## 0. 安全边界

本指南只列公开 Pages 脚本 URL 和 `example.invalid` 占位符。真实节点订阅、File 输出、Profile、Sub-Store 管理地址和认证信息只能保存在自己的 Sub-Store 与设备里，不能写进仓库、Issue、聊天、截图或终端历史。

开始前保留现有任务和设备旧配置。不要为了采用新脚本名删除或重命名已有对象。

## 1. 先创建 5 条共享脚本记录

在 Sub-Store 的脚本管理/脚本库中逐条新建并保存：

| 推荐脚本记录名 | 规范 Pages URL | 用途 |
| --- | --- | --- |
| `shadowrocket-node-operator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-operator.js` | Shadowrocket 组合订阅节点 Operator |
| `shadowrocket-profile-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js` | Shadowrocket 三个平台 Profile File |
| `egern-node-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js` | Egern 私密节点 File |
| `egern-profile-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js` | Egern 三个平台 Profile File |
| `anywhere-node-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js` | Anywhere 私密节点 File |

每条记录都应显示已成功取得完整 JavaScript，且不应要求 `import`、MITM 或证书。Pages 尚未正式上线时先不要创建生产任务；URL 返回 404 时停止，而不是改用未知镜像。

## 2. Shadowrocket 任务层

### 2.1 节点组合订阅 Operator

Shadowrocket 的节点生成不是 File：

1. 准备组合订阅 `shadowrocket-sources`，把私密来源加入其中。
2. 在该组合的处理链中新增 Script Operator。
3. Operator 引用共享脚本记录 `shadowrocket-node-operator.js`，不要再次粘贴 JavaScript。
4. 参数填写 `output=nodes&clientChain=off`，目标平台选择 Shadowrocket。
5. 将组合处理后的私密节点订阅命名为 `shadowrocket-nodes`，建议每 6 小时更新。
6. 预览至少有一个节点后，才把该私密订阅 URL 加入 Shadowrocket。

只有在隔离测试组合中验证客户端链时才把参数改为 `output=nodes&clientChain=on`；正式任务默认保持 `off`。

### 2.2 三个 Profile File

新建三个 File。每个 File 都引用同一条共享脚本记录 `shadowrocket-profile-generator.js`，File 内只填写对应参数：

| File 任务名 | 完整参数 |
| --- | --- |
| `shadowrocket-config-macos` | `output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `shadowrocket-config-iphone` | `output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `shadowrocket-config-ipad` | `output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

`subscriptionName` 必须逐字等于 Shadowrocket 中 `shadowrocket-nodes` 的显示名；`Shadowrocket-Nodes` 只是示例。建议三个 File 每天更新。每个 File 的私密输出 URL 只加入对应平台，不能公开。

## 3. Egern 任务层

先创建节点 File，再创建三个 Profile File。任务只引用共享脚本记录，不保存第二份 JavaScript。

| File 任务名 | 引用脚本 | 完整参数 |
| --- | --- | --- |
| `egern-nodes` | `egern-node-generator.js` | `output=nodes&type=collection&name=shadowrocket-sources&clientChain=off` |
| `egern-macos` | `egern-profile-generator.js` | `output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `egern-iphone` | `egern-profile-generator.js` | `output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `egern-ipad` | `egern-profile-generator.js` | `output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

先运行 `egern-nodes`。随后只在三个私密 Profile File 的参数编辑器中，把 `https://example.invalid/private/egern-nodes` 替换成自己的 `egern-nodes` 输出 URL；不要把真实值写回共享脚本、公开文档或示例。Egern 应导入三个平台 Profile 之一，不直接导入 `egern-nodes`。

以后更新 Egern Node Generator 只改共享脚本记录 `egern-node-generator.js`；`egern-nodes` File 的名称、私密输出 URL和参数保持不动。Profile Generator 同理，三个 Profile File 继续引用同一共享记录，参数不随脚本升级自动更改。

## 4. Anywhere 任务层

1. 新建 File 任务 `anywhere-nodes`。
2. 引用共享脚本记录 `anywhere-node-generator.js`，不要再次粘贴 JavaScript。
3. 参数填写 `output=nodes&type=collection&name=shadowrocket-sources&clientChain=off`。
4. 预览 `accepted` 至少为 1 后，保存私密 File 输出 URL并加入 Anywhere。
5. Anywhere 的公开 `.arrs`、本地规则绑定、DNS、节点/链和 Rule 模式仍需按客户端部署指南分别完成；节点 File 不是完整 Profile。

以后更新 Anywhere Node Generator 只改共享脚本记录 `anywhere-node-generator.js`；`anywhere-nodes` File 的名称、私密输出 URL和参数保持不动。

## 5. 脚本升级只改共享记录

规范 Pages URL 使用稳定的 `current/` 路径。发布新版本后：

1. 先保留旧设备配置和 Sub-Store 备份。
2. 在脚本管理中更新对应的共享脚本记录，或让 Sub-Store 从同一规范 Pages URL 重新取得最新正文。
3. 不要把新正文分别粘贴到每个 File；不要改任务名，也不要仅因脚本升级改 File 参数。
4. 逐个预览引用该记录的 Operator/File，先按客户端 canary 顺序测试，再推广到下一台设备。
5. 失败时恢复上一份共享脚本正文或已验证 Pages 快照，File 参数和私密输出 URL保持不变。

## 6. 旧 `substore-*` URL 兼容

以下旧 Pages URL 保留为对应规范名称的字节一致兼容别名：

| 规范名称 | 旧兼容名称 |
| --- | --- |
| `shadowrocket-node-operator.js` | `substore-node-operator.js` |
| `shadowrocket-profile-generator.js` | `substore-profile-generator.js` |
| `egern-node-generator.js` | `substore-node-generator.js` |
| `egern-profile-generator.js` | `substore-profile-generator.js` |
| `anywhere-node-generator.js` | `substore-node-generator.js` |

既有共享脚本记录或任务若仍引用旧 URL，可以继续使用，不必只为改名迁移。新任务统一使用规范名称。不要在同一个 Operator/File 中同时引用新旧别名；它们不是两个版本。这里的兼容只指公开脚本 URL，用户自己的私密节点/File/Profile URL和对象名都不应因此改变。
