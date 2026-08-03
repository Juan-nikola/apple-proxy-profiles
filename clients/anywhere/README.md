# Anywhere 配置

Anywhere 不能用一个远程文件表达 Shadowrocket/Egern 的完整 Profile。本项目采用功能等价的三层结构：

| 层 | 本项目提供 | 必须留在本地 |
|---|---|---|
| 私密节点订阅 | `dist/anywhere-node-generator.js` 生成仅含 `proxies` 的 Clash YAML | 私密订阅 URL、节点凭据、当前节点 |
| 公开规则 | 32 个 Blackmatrix7 Surge 输入转换成 34 个 `.arrs` 分片及 Manifest | 每个规则集最终绑定到 DIRECT、REJECT、节点或链 |
| 设备设置 | 部署、灰度和回滚说明 | Rule/Global、DNS、链、IPv6、QUIC、Purify 等 |

三层任一缺失，都不能称为完整配置。`.arrs` 的 `routing = 0/1/2` 仅控制首次导入的 Default、DIRECT、REJECT。特别注意：`Default` 并非停用；在审计的 Anywhere 源码中，它会让自定义规则集回退到当前选择的节点或链。

## 已生成产物

- `dist/anywhere-node-generator.js`：自包含私密节点 File Operator。
- `examples/rules/manifest.json`：固定提交、输入哈希、计数、优先级归并和分片闭包。
- `examples/rules/*.arrs`：每片最多 95,000 条，低于源码 100,000 条上限。
- `examples/import.html`：34 个分片分成 3 个不超过 1,800 字符的 deep-link 批次。

新任务统一使用 `anywhere-node-generator.js`。旧 `substore-node-generator.js` 文件和 Pages URL 保留为字节一致的兼容别名，既有 Sub-Store 任务不必仅为改名更换 URL；新旧名称不是两个不同版本。

先按根目录的 [Sub-Store 外置 JS + 任务引用总指南](../../docs/substore-two-layer-setup.md)，再让 File `anywhere-nodes` 选择链接模式，直接引用 `anywhere-node-generator.js` 的规范 Pages URL，并在自己的参数编辑器中保存参数。以后升级 JS 不复制脚本正文，File 的脚本 URL、任务名、私密输出 URL和参数都不动。

## Sub-Store 两层创建清单（可直接照填）

仓库在 GitHub Pages 维护一条 Anywhere 外置 JS；Sub-Store 不需要先创建独立脚本记录：

| 外置 JS 文件名 | JavaScript URL |
| --- | --- |
| `anywhere-node-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js` |

新建 File `anywhere-nodes`，脚本来源选择“链接/远程脚本”，直接粘贴上面的 URL，然后在这个 File 的可视化参数编辑器中填写：

```text
output=nodes&type=collection&name=shadowrocket-sources&clientChain=off
```

旧版只有单行链接时使用 `JS_URL#output=nodes&type=collection&name=shadowrocket-sources&clientChain=off`，不能使用 `?` 连接脚本参数。保存后先预览，确认 `accepted` 至少为 1，再把这个 File 的私密输出 URL 加入 Anywhere；不要在 File 中粘贴 JavaScript 正文。以后脚本升级不改 JS URL、File 名称、参数或私密 URL。

Anywhere 只有这一条 Sub-Store 节点生成链。它不能用一个远程文件表达完整 Profile，所以本项目不会创建虚假的 `anywhere-profile-generator.js`：公开 `.arrs` 规则、规则目标绑定、DNS、IPv6、QUIC、链和 Rule 模式必须继续在 Anywhere 部署链路中完成。完整步骤见[部署指南](docs/deployment.md)。

当前固定 Blackmatrix7 提交为 `dab47069a30c4ae70f7f5f4c919d639d9aaf79dc`：32 个输入共 393,743 条候选，376,477 条可转换，跨来源去重和优先级编译后输出 375,265 条。完整 Advertising 由 `Advertising` 与 `Advertising_Domain` 两个独立输入共同组成。

客户端兼容性固定到用户提供并核验的 Anywhere 官方源码提交 `e15518fde1f5d2652dfc1c234c89a68b87cecec0`。

## 最短部署路径

1. 按 [部署指南](docs/deployment.md) 在私密 Sub-Store 创建节点 File 任务；真实订阅 URL绝不能提交到仓库。
2. 在测试设备添加私密节点订阅，检查节点名称唯一且稳定。
3. 打开最终 Pages 的 `current/anywhere/import.html`，依次完成全部批次。
4. 在 Anywhere 内逐个检查所有分片的本地绑定，切换到 Rule 模式。
5. 按 [canary 清单](docs/canary.md) 先 iPhone、后 iPad，并在每台设备做真实回滚。

稳定版是生产基线；Beta/TestFlight 只是附加灰度通道，使用同一套已验证产物，不推定 beta 拥有未审计能力。节点产物可由 Sub-Store 按私密任务节奏重建，但 Anywhere 源码只证明了用户手动 Refresh/Update；不要写成 App 会自动每 6 小时刷新。

## 安全边界

- 真实订阅 URL、节点、UUID、密码、密钥和证书只存在于私密 Sub-Store 与设备。
- 本项目不生成 `.amrs`、MITM、HTTPS 解密、重写或证书；Allow Insecure 保持关闭。
- Privacy 的 20 条可转换规则因更高优先来源而归并为 0 个独立输出：19 条重复、1 条被完整覆盖。这是避免 Anywhere 后插入覆盖改变策略，不是漏源。
- 节点、规则和设备设置是独立更新链路；只更新其中一层不会同步另外两层。

进一步阅读：[故障排查](docs/troubleshooting.md) · [上游兼容性](UPSTREAM_COMPATIBILITY.md)
