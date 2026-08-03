# Sub-Store 外置 JS + 任务引用总指南

本项目统一使用两层结构：

1. **GitHub Pages 外置 JS 层**：仓库为 Shadowrocket、Egern、Anywhere 维护 5 个客户端专属 JavaScript 入口。代码只维护在仓库中。
2. **Sub-Store 任务层**：组合订阅的 Script Operator 或 File Script 选择“链接/远程脚本”模式，直接引用对应的 Pages JS URL，并在该任务的参数编辑器中保存自己的参数。

这里的“引用”是让每个 Operator/File 保存同一个稳定 JS URL，不是在每个任务里复制粘贴 JavaScript 正文。当前通用流程不依赖独立“脚本库/共享脚本记录”功能；如果某个前端版本提供模块或脚本收藏功能，可以自行使用，但不能改变本指南中的 URL、参数和任务职责。

## 0. 安全边界

本指南只列公开 Pages 脚本 URL 和 `example.invalid` 占位符。真实节点订阅、File 输出、Profile、Sub-Store 管理地址和认证信息只能保存在自己的 Sub-Store 与设备里，不能写进仓库、Issue、聊天、截图或终端历史。

开始前保留现有任务和设备旧配置。不要为了采用新脚本名删除或重命名已有对象。所有脚本都不需要 MITM、HTTPS 解密、CA 证书或“不验证证书/insecure”；这些选项必须保持关闭。

## 1. 五个外置 JavaScript 入口

| JS 文件名 | 规范 Pages URL | 用途 |
| --- | --- | --- |
| `shadowrocket-node-operator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-operator.js` | Shadowrocket 组合订阅节点 Script Operator |
| `shadowrocket-profile-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js` | Shadowrocket 三个平台 Profile File Script |
| `egern-node-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js` | Egern 私密节点 File Script |
| `egern-profile-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js` | Egern 三个平台 Profile File Script |
| `anywhere-node-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js` | Anywhere 私密节点 File Script |

打开任一 URL 应直接得到完整 JavaScript，不能是 404、HTML 登录页或未知镜像。Sub-Store 任务中粘贴的是这一列的完整 URL，不是 GitHub `blob` 页面地址，也不是本地 `clients/*/dist/` 路径。

## 2. 每个 Operator/File 的通用填写方式

本节按 Sub-Store 官方前端提交 [`aaecc3115ae5b5be72a2f027c36cfc9a1a6aadcc`](https://github.com/sub-store-org/Sub-Store-Front-End/blob/aaecc3115ae5b5be72a2f027c36cfc9a1a6aadcc/src/views/editor/components/Script.vue)核对：脚本操作支持链接模式、本地正文模式、可视化参数编辑器，以及旧版 `URL#参数` 兼容解析。界面文字若随版本变化，以“远程脚本链接”和“参数编辑器”这两个用途为准；也可参考官方[脚本使用说明](https://github.com/sub-store-org/Sub-Store/wiki/%E8%84%9A%E6%9C%AC%E4%BD%BF%E7%94%A8%E8%AF%B4%E6%98%8E)。

在 Sub-Store 的组合订阅处理链或文件管理中添加“脚本操作/Script Operator/File Script”后：

1. 脚本来源选择“链接/远程脚本”，不要选择“本地脚本正文”。
2. 链接框只粘贴第 1 节对应的规范 Pages URL。
3. 展开“参数/Arguments”，使用可视化参数编辑器逐项添加参数名和值。表格中的 `arg1=value1&arg2=value2` 只是便于复制和核对的完整参数表示。
4. “不使用缓存/noCache”默认关闭；发布更新后仅在隔离 canary 任务中临时开启以强制重取，验收完成后恢复关闭。
5. “不验证证书/insecure”始终关闭。

如果旧版界面没有可视化参数编辑器，只允许在同一个脚本链接后使用第一段 `#` 参数：

```text
https://example.invalid/script.js#arg1=value1&arg2=value2
```

不要使用 `?` 连接脚本参数。只有单行链接模式才需要把中文、emoji、空格、`&`、`#`、`%` 或带查询参数的私密 URL 作为**参数值**进行百分号编码；不要编码脚本 URL、参数名、分隔参数的 `&` 和 `=`。例如显示名 `我的节点 🚀` 应写成 `subscriptionName=%E6%88%91%E7%9A%84%E8%8A%82%E7%82%B9%20%F0%9F%9A%80`。若使用可视化参数编辑器，直接填写原值，由界面编码。

## 3. Shadowrocket

### 3.1 节点组合订阅 Script Operator

1. 准备组合订阅 `shadowrocket-sources`，把私密来源加入其中。
2. 在该组合的处理链中新增“脚本操作/Script Operator”，选择链接模式。
3. 脚本 URL 填 `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-operator.js`。
4. 参数填写 `output=nodes&clientChain=off`，目标平台选择 Shadowrocket。
5. 将组合处理后的私密节点订阅命名为 `shadowrocket-nodes`，建议每 6 小时更新。
6. 预览至少有一个节点后，才把该私密订阅 URL 加入 Shadowrocket。

节点生成是组合订阅 Operator，不是 File。只有在完全隔离的链式测试组合中才把 `clientChain` 改为 `on`；正式任务默认保持 `off`。

### 3.2 三个 Profile File

在文件管理中按 File/文件 → 脚本操作/Script → 链接模式创建三个 File。每个 File 的脚本 URL 都直接填写：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js
```

| File 任务名 | 完整参数 |
| --- | --- |
| `shadowrocket-config-macos` | `output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `shadowrocket-config-iphone` | `output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `shadowrocket-config-ipad` | `output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

`subscriptionName` 必须逐字等于 Shadowrocket 中 `shadowrocket-nodes` 的显示名；`Shadowrocket-Nodes` 只是 ASCII 示例。Profile 生成器不能挂到 `shadowrocket-sources` 的组合处理链；组合处理链只使用节点脚本。建议三个 File 每天更新，每个私密输出 URL 只加入对应平台。

## 4. Egern

在文件管理中依次创建 4 个 File。每个 File 都选择脚本链接模式，直接填写表中的 Pages URL，并在自己的参数编辑器中填写对应参数。

| File 任务名 | 脚本 URL | 完整参数 |
| --- | --- | --- |
| `egern-nodes` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js` | `output=nodes&type=collection&name=shadowrocket-sources&clientChain=off` |
| `egern-macos` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js` | `output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `egern-iphone` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js` | `output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `egern-ipad` | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js` | `output=config&type=collection&name=shadowrocket-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

先运行 `egern-nodes`。随后只在三个私密 Profile File 的参数编辑器中，把 `https://example.invalid/private/egern-nodes` 替换成自己的 `egern-nodes` 输出 URL；不要把真实值写回公开 JS、仓库文档或示例。可视化参数编辑器填写原始 URL；旧版单行链接模式对整个 URL 参数值进行百分号编码。Egern 应导入三个平台 Profile 之一，不直接导入 `egern-nodes`。三个 Profile 的预览必须以 `ipv6:` 开头，不能包含无效的 `auto_update: {}`；参数或结构变化后，先重新运行对应的 Sub-Store Profile File，再在 Egern 手动更新远程 Profile。

## 5. Anywhere

在文件管理中新建 File `anywhere-nodes`：

1. 脚本来源选择链接模式。
2. 脚本 URL 填 `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js`。
3. 参数填写 `output=nodes&type=collection&name=shadowrocket-sources&clientChain=off`。
4. 预览 `accepted` 至少为 1 后，保存私密 File 输出 URL并加入 Anywhere。

Anywhere 到此只完成私密节点层。它没有与 Shadowrocket/Egern 等价的完整 Profile File，因此不要新建 `anywhere-profile-generator.js` 或伪造 Profile 任务；公开 `.arrs` 规则、本地绑定、DNS、链与 Rule 模式继续按 Anywhere 部署指南完成。

## 6. 更新与回滚

规范 URL 使用稳定的 `current/` 路径。发布新版本后，所有直接引用该 URL 的 Operator/File 会继续使用同一地址，不需要复制新 JavaScript，也不需要修改任务名、参数或私密输出 URL。

安全更新顺序：

1. 保留旧设备配置、旧 Profile 和 Sub-Store 备份。
2. 先预览一个隔离 canary 任务；若确认缓存未刷新，可临时打开该任务的“不使用缓存/noCache”，但 `insecure` 仍保持关闭。
3. 重新运行对应任务，按客户端 canary 顺序逐台验证。
4. 失败时把 canary 任务的脚本 URL 从 `/current/` 改为 `/previous/`，或改成已验证的 `/versions/<manifestHash>/` 文件 URL；参数和私密输出 URL保持不变。
5. 回滚验收后停止推广，保留失败版本信息用于排查。

## 7. 旧 `substore-*` URL 兼容

以下旧 Pages URL 保留为对应规范名称的字节一致兼容别名：

| 规范名称 | 旧兼容名称 |
| --- | --- |
| `shadowrocket-node-operator.js` | `substore-node-operator.js` |
| `shadowrocket-profile-generator.js` | `substore-profile-generator.js` |
| `egern-node-generator.js` | `substore-node-generator.js` |
| `egern-profile-generator.js` | `substore-profile-generator.js` |
| `anywhere-node-generator.js` | `substore-node-generator.js` |

既有 Operator/File 若仍直接引用旧 URL，可以继续使用，不必只为改名迁移。新任务统一使用带客户端前缀的规范 URL；不要在同一任务中同时添加新旧两个地址。用户自己的私密节点/File/Profile URL 和对象名都不应因此改变。

## 8. 最终数量核对

| 客户端 | Sub-Store 任务 | 外置 JS URL 数量 |
| --- | --- | --- |
| Shadowrocket | 1 个组合节点 Script Operator + 3 个 Profile File | 2 |
| Egern | 1 个节点 File + 3 个 Profile File | 2 |
| Anywhere | 1 个节点 File | 1 |

最终共 8 个 Sub-Store 任务直接引用 5 个客户端专属 JS URL。仓库维护 5 份逻辑脚本；旧 `substore-*` 只作为兼容别名存在，不算新版本，也不应重复部署。
