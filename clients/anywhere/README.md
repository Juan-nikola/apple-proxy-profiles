# Anywhere 配置

Anywhere 不能用一个远程文件表达 Shadowrocket/Egern 的完整 Profile。本项目采用功能等价的三层结构：

| 层 | 本项目提供 | 必须留在本地 |
|---|---|---|
| 私密节点订阅 | `dist/substore-node-generator.js` 生成仅含 `proxies` 的 Clash YAML | 私密订阅 URL、节点凭据、当前节点 |
| 公开规则 | 32 个 Blackmatrix7 Surge 输入转换成 34 个 `.arrs` 分片及 Manifest | 每个规则集最终绑定到 DIRECT、REJECT、节点或链 |
| 设备设置 | 部署、灰度和回滚说明 | Rule/Global、DNS、链、IPv6、QUIC、Purify 等 |

三层任一缺失，都不能称为完整配置。`.arrs` 的 `routing = 0/1/2` 仅控制首次导入的 Default、DIRECT、REJECT。特别注意：`Default` 并非停用；在审计的 Anywhere 源码中，它会让自定义规则集回退到当前选择的节点或链。

## 已生成产物

- `dist/substore-node-generator.js`：自包含私密节点 File Operator。
- `examples/rules/manifest.json`：固定提交、输入哈希、计数、优先级归并和分片闭包。
- `examples/rules/*.arrs`：每片最多 95,000 条，低于源码 100,000 条上限。
- `examples/import.html`：34 个分片分成 3 个不超过 1,800 字符的 deep-link 批次。

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
