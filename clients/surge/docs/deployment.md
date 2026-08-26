# Surge 部署

Surge 新任务只读取 `apple-proxy-surge`。先按 [Sub-Store 客户端节点池指南](../../../docs/substore-client-pools.md) 完成筛选、preview 和回滚准备；已有 `apple-proxy-sources` collection、tasks 和旧 URL 保留作兼容/回滚。

本手册把一份私密组合订阅转换为 Surge macOS、iPhone、iPad 三个官方客户端 Profile。先在 Sub-Store 完成组合和 Surge 节点资源 File，再创建三个远程 Profile File；不要把节点凭据直接粘到 GitHub 或脚本参数。

## 1. 准备组合与公开脚本

1. 在 Sub-Store 的“组合订阅”中创建 `apple-proxy-surge`。
2. 只加入你已单独预览并确认可用的私密来源；组合预览节点数必须大于 0。
3. 记录你准备在 Surge 中显示的节点订阅名，例如 `Apple-Proxy-Nodes`。这只是示例，三个 File 的 `subscriptionName` 必须与实际显示名逐字一致。
4. 创建一个 `surge-nodes` 节点 File，远程脚本为：

   ```text
   https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-nodes-generator.js
   ```

   参数为 `output=nodes&type=collection&name=apple-proxy-surge&clientChain=off`。预览必须出现 `[Proxy]` 和至少一个节点；保存该 File 的私密输出 URL，下面记作 `<SURGE_NODES_URL>`。
5. 三个 Profile File 都引用稳定版：

   ```text
   https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js
   ```

   公开路径只使用 `current`；不要改成不存在的测试频道。

## 2. 创建三个 File

在 Sub-Store“文件/File”中新建 `surge-config-macos`、`surge-config-iphone`、`surge-config-ipad`。来源使用本地占位内容，添加一条启用且参与预览的“脚本操作”，脚本来源选择“远程链接”。可视化参数逐项填写以下值，把 `<SURGE_NODES_URL>` 替换为上一步的私密 URL；旧版单行界面则使用 `JS_URL#...`，不要使用 `?`。

| key | macOS | iPhone | iPad |
| --- | --- | --- | --- |
| `output` | `config` | `config` | `config` |
| `type` | `collection` | `collection` | `collection` |
| `name` | `apple-proxy-surge` | `apple-proxy-surge` | `apple-proxy-surge` |
| `subscriptionName` | `Apple-Proxy-Nodes` | `Apple-Proxy-Nodes` | `Apple-Proxy-Nodes` |
| `proxyPolicyUrl` | `<SURGE_NODES_URL>` | `<SURGE_NODES_URL>` | `<SURGE_NODES_URL>` |
| `platform` | `macos` | `iphone` | `ipad` |
| `channel` | `current` | `current` | `current` |
| `adblockMode` | `off` | `off` | `off` |
| `dnsMode` | `stable` | `stable` | `stable` |
| `chinaDns` | `alidns` | `alidns` | `alidns` |
| `globalDns` | `cloudflare` | `cloudflare` | `cloudflare` |
| `blockMode` | `balanced` | `balanced` | `balanced` |
| `quicMode` | `proxy-block` | `proxy-block` | `proxy-block` |
| `ipv6Mode` | `ipv4-only` | `auto` | `auto` |
| `autoGroupMode` | `auto` | `auto` | `auto` |
| `clientChain` | `off` | `off` | `off` |

预览成功标志：Profile 包含 `[General]`、`[Proxy]`、`[Proxy Group]`、`[Rule]`，隐藏组 `📦 远程节点池` 含有 `policy-path=<SURGE_NODES_URL>`，而 `[Proxy]` 不包含服务器、端口、密码或 UUID。若节点资源为空，先检查原始组合是否非空、Surge 兼容节点是否存在，以及脚本是否启用。

Profile 只包含一个隐藏组 `📦 远程节点池`。如果要临时使用另一份 Surge 节点订阅，下载 Profile 后只编辑该组的 `policy-path`；保持组名、`include-other-group` 和 `policy-regex-filter` 不变，地区、流媒体和自动测速组会继续分类新来源。手动替换的 URL 必须返回 Surge 兼容的 `[Proxy]`（例如 Sub-Store 的 `t=surge` 输出），不能使用 JSON、通用 API 或其他客户端格式。

`adblockMode=off` 保持轻量默认分流；确实需要完整广告分类时才使用 `full`。公开脚本和任务始终使用唯一的 `channel=current`。

`globalDns` 为共享参数兼容位，这份 Surge Profile 不会在本地使用它。海外规则命中后由代理端解析；其他域名使用 `chinaDns`，解析失败时通过 `dns-failed` 交给代理，这样才能同时兼容 macOS、iPhone 和 iPad。

“关闭缓存/noCache”和“不验证证书/insecure”保持关闭。公开规则 URL 可以更新，但私密节点 URL、API、UUID 和密码永远不应出现在 Arguments、README、Issue 或终端日志中。

## 3. 导入官方 Surge 与上线后反馈

1. 在 Intel Mac 或 Apple Silicon Mac 的官方 Surge 中保留旧 Profile，再添加 `surge-config-macos` 的私密 File URL。
2. 手动更新并验证：国内常用 App、国际站点、DNS、UDP、局域网设备、IPv4/IPv6、节点切换和断网恢复。
3. 需要设备反馈时，可按 macOS → iPhone → iPad 顺序观察；不要求等待前一台通过才能使用其他平台的 `current`。
4. 任一平台出现异常，立刻切回旧 Profile，并保留失败任务和时间；不要删除旧 File。

## 4. 版本选择与刷新

`current` 是唯一公开发布指针。节点资源建议每 6 小时刷新，Profile 结构每天刷新。脚本升级后先只重新预览 `surge-config-macos`，再按 macOS → iPhone → iPad 手动更新。正式任务不需要打开 `noCache`；只有确认 CDN 缓存问题时临时使用，验收后恢复关闭。

## 5. 文件与构建

- `clients/surge/src/`：生成器源码、参数解析、节点、分组、规则和 Profile 渲染；可修改。
- `clients/surge/test/`：单元、文档和 bundle 契约；改源码后必须同步运行。
- `clients/surge/examples/`：使用 `example.invalid` 的结构样例；不可当作真实订阅。
- `clients/surge/dist/`、`public/current/surge/`、`public/current/surge/`：构建产物，只读，不手工编辑。

```bash
npm --workspace @apple-proxy-profiles/surge test
npm --workspace @apple-proxy-profiles/surge run build
npm --workspace @apple-proxy-profiles/surge run check:secrets
```

更多跨客户端维护、规则更新、回滚和发布步骤见[根目录维护手册](../../docs/maintenance.md)。
