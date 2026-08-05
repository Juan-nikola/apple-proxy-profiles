# Surge 部署

本手册把一份私密组合订阅转换为 Surge macOS、iPhone、iPad 三个官方客户端 Profile。先在 Sub-Store 完成组合，再创建 File；不要把节点凭据直接粘到 GitHub 或脚本参数。

## 1. 准备组合与公开脚本

1. 在 Sub-Store 的“组合订阅”中创建 `apple-proxy-sources`。
2. 只加入已有来源 `snell`、`vlesshy2`；预览节点数必须大于 0。
3. 记录你准备在 Surge 中显示的节点订阅名，例如 `Apple-Proxy-Nodes`。这只是示例，三个 File 的 `subscriptionName` 必须与实际显示名逐字一致。
4. 三个 File 都引用稳定版：

   ```text
   https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js
   ```

   首次灰度可将路径中的 `current` 改成 `edge`；通过验证后再切回 `current`。

## 2. 创建三个 File

在 Sub-Store“文件/File”中新建 `surge-macos`、`surge-iphone`、`surge-ipad`。来源使用本地占位内容，添加一条启用且参与预览的“脚本操作”，脚本来源选择“远程链接”。可视化参数逐项填写以下值；旧版单行界面则使用 `JS_URL#...`，不要使用 `?`。

| key | macOS | iPhone | iPad |
| --- | --- | --- | --- |
| `output` | `config` | `config` | `config` |
| `type` | `collection` | `collection` | `collection` |
| `name` | `apple-proxy-sources` | `apple-proxy-sources` | `apple-proxy-sources` |
| `subscriptionName` | `Apple-Proxy-Nodes` | `Apple-Proxy-Nodes` | `Apple-Proxy-Nodes` |
| `platform` | `macos` | `iphone` | `ipad` |
| `dnsMode` | `stable` | `stable` | `stable` |
| `chinaDns` | `alidns` | `alidns` | `alidns` |
| `globalDns` | `cloudflare` | `cloudflare` | `cloudflare` |
| `blockMode` | `balanced` | `balanced` | `balanced` |
| `quicMode` | `proxy-block` | `proxy-block` | `proxy-block` |
| `ipv6Mode` | `ipv4-only` | `auto` | `auto` |
| `autoGroupMode` | `auto` | `auto` | `auto` |
| `clientChain` | `off` | `off` | `off` |

预览成功标志：内容以 Surge INI 配置段落开头，包含 `[General]`、`[Proxy]`、`[Proxy Group]`、`[Rule]`，并且至少有一个节点。若输出为空，先检查组合是否非空、`subscriptionName` 是否只是显示名而非组合名，以及脚本是否启用。

“关闭缓存/noCache”和“不验证证书/insecure”保持关闭。公开规则 URL 可以更新，但私密节点 URL、API、UUID 和密码永远不应出现在 Arguments、README、Issue 或终端日志中。

## 3. 导入官方 Surge 与灰度

1. 先在 Intel Mac 或 Apple Silicon Mac 的官方 Surge 中保留旧 Profile，再添加 `surge-macos` 的私密 File URL。
2. 手动更新并验证：国内常用 App、国际站点、DNS、UDP、局域网设备、IPv4/IPv6、节点切换和断网恢复。
3. macOS 通过后，再在 iPhone 导入 `surge-iphone`；iPhone 通过后，最后导入 `surge-ipad`。
4. 任一平台失败，立刻切回旧 Profile，并保留失败任务和时间；不要删除旧 File。

## 4. 版本选择与刷新

`current` 是稳定发布指针，`edge` 是测试指针。脚本升级后先只重新预览 `surge-macos`，再按 macOS → iPhone → iPad 手动更新。正式任务不需要打开 `noCache`；只有确认 CDN 缓存问题时临时使用，验收后恢复关闭。

## 5. 文件与构建

- `clients/surge/src/`：生成器源码、参数解析、节点、分组、规则和 Profile 渲染；可修改。
- `clients/surge/test/`：单元、文档和 bundle 契约；改源码后必须同步运行。
- `clients/surge/examples/`：使用 `example.invalid` 的结构样例；不可当作真实订阅。
- `clients/surge/dist/`、`public/current/surge/`、`public/edge/surge/`：构建产物，只读，不手工编辑。

```bash
npm --workspace @apple-proxy-profiles/surge test
npm --workspace @apple-proxy-profiles/surge run build
npm --workspace @apple-proxy-profiles/surge run check:secrets
```

更多跨客户端维护、规则更新、回滚和发布步骤见[根目录维护手册](../../docs/maintenance.md)。
