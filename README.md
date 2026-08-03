# Apple Proxy Profiles

这是 `Juan-nikola/apple-proxy-profiles` 的公开生成器仓库：用同一套节点能力、策略意图与 Blackmatrix7 增强规则，为 Shadowrocket、Egern 和 Anywhere 生成尽可能功能等价、可验证、可回滚的配置产物。

> 当前状态：三个客户端的生成器与确定性示例已通过本地自动验证，GitHub Pages 已上线；真实设备 canary 尚未完成。没有设备验收记录时，不应把本项目描述为已完成真机验证。

首次配置 Sub-Store 请先看 **[两层部署总指南](docs/substore-two-layer-setup.md)**：先建立 5 条共享脚本记录，再让组合订阅 Operator/File 引用脚本并只填写参数。脚本升级只改共享记录一次。

## 三个客户端

| 客户端 | 公开仓库提供 | 私密环境提供 | 使用入口 |
| --- | --- | --- | --- |
| Shadowrocket | 节点 Operator、macOS/iPhone/iPad Profile 生成器、脱敏结构示例 | Sub-Store 原始订阅、节点订阅 URL、三个 Profile URL | [说明](clients/shadowrocket/README.md) · [部署](clients/shadowrocket/docs/deployment.md) · [canary](clients/shadowrocket/docs/canary-checklist.md) |
| Egern | 节点生成器、macOS/iPhone/iPad Profile 生成器、脱敏结构示例 | Sub-Store 原始订阅、节点文件 URL、三个 Profile URL | [说明](clients/egern/README.md) · [部署](clients/egern/docs/deployment.md) · [canary](clients/egern/docs/canary.md) |
| Anywhere | 节点生成器、公开 `.arrs` 规则分片、Manifest 与批量导入页 | 节点订阅 URL、节点凭据，以及 App 内的规则绑定、DNS、链和模式 | [说明](clients/anywhere/README.md) · [部署](clients/anywhere/docs/deployment.md) · [canary](clients/anywhere/docs/canary.md) |

Shadowrocket 和 Egern 能从私密 Sub-Store File 生成平台 Profile；Anywhere 没有等价的远程完整 Profile 格式，因此不能把它伪装成同一种部署结构。

新部署统一使用带客户端前缀的脚本名：`shadowrocket-node-operator.js`、`shadowrocket-profile-generator.js`、`egern-node-generator.js`、`egern-profile-generator.js`、`anywhere-node-generator.js`。已经部署的旧 `substore-*` Pages URL 继续作为字节一致的兼容别名保留，现有 Sub-Store 任务不必仅为改名而更换 URL；新文档和新任务不要再选旧名。

## 公开与私密边界

公开仓库、GitHub Pages、Actions 日志、Issue、截图、测试夹具和文档只允许包含源码、公开规则、哈希、来源路径、聚合计数和使用 `example.invalid` 的脱敏示例。

以下内容必须只保存在自己的 Sub-Store 和设备中，绝不能提交到 Git、上传到 Pages、粘贴到 Issue/聊天或出现在完整日志和截图里：

- 原始或生成后的订阅 URL、Sub-Store 管理地址与 Profile URL；
- 节点服务器、端口、UUID、密码、PSK、私钥、证书和认证参数；
- 带秘密查询参数的 deep link、二维码、完整节点 YAML/URI；
- 能还原以上内容的抓包、调试转储或未脱敏配置。

本项目不启用 MITM、HTTPS 解密、根证书、请求重写或正文脚本。公开脚本可以在私密 Sub-Store 运行时读取节点，但输出、错误与诊断不得把节点内容带回公开链路。详见 [安全策略](SECURITY.md)。

## Anywhere 的三层配置

Anywhere 的功能等价方案必须同时完成三层，少一层都不是完整配置：

1. **私密节点订阅**：`clients/anywhere/dist/anywhere-node-generator.js` 在私密 Sub-Store 中生成仅含 `proxies` 的 Clash YAML；真实 URL 和节点留在私密链路。
2. **公开规则集**：Blackmatrix7 的 32 个固定 Surge 输入被转换为有哈希、计数与来源信息的 `.arrs` 分片；发布后通过导入页加入 App。
3. **设备本地设置**：逐个绑定规则集目标，并在 App 中设置默认节点/链、Rule/Global 模式、DNS、IPv6、QUIC 等。远程节点或规则刷新不会替代这些本地设置。

特别注意：Anywhere 的 `Default` 不是“停用”。在审计的源码基线上，自定义规则集未绑定时会回退到当前全局目标（广告阻止规则除外）。导入后必须人工核对绑定。

## 固定上游基线

为了避免一次构建混用不同日期的规则，自动化只从完整提交 SHA 读取允许清单中的路径。

| 上游 | 用途 | 固定提交 | 许可 |
| --- | --- | --- | --- |
| [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script) | 三客户端的 32 个增强规则输入 | `dab47069a30c4ae70f7f5f4c919d639d9aaf79dc`（2026-08-01 19:07:21 UTC） | GPL-2.0-only |
| [NodePassProject/Anywhere](https://github.com/NodePassProject/Anywhere) | Anywhere 导入能力的源码审计基线 | `e15518fde1f5d2652dfc1c234c89a68b87cecec0` | GPL-3.0；本仓库不复制其源码或品牌资产 |

“固定”表示可复现基线，不表示永远停留在旧版本。升级上游后必须重新做兼容性审计、确定性验证、秘密扫描和真机 canary，再更新固定 SHA。完整许可与修改说明见 [第三方声明](THIRD_PARTY_NOTICES.md)。

## 验证

需要 Node.js 22 或更高版本。完整本地门禁：

```bash
npm ci
npm run verify
npm run check:actions
npm run check:rules
```

也可以按客户端运行：

```bash
npm run verify:shadowrocket
npm run verify:egern
npm run verify:anywhere
npm run check:secrets
```

`npm run verify` 会执行测试、重建产物、生成脱敏示例并扫描敏感信息；`check:actions` 检查工作流的 SHA 固定与最小权限；根目录的 `check:rules` 按 `public/current/manifest.json` 中的不可变提交重新下载并逐字节核对整个当前快照。若只想检查 Shadowrocket 上游 `master` 的实时健康状况，可另运行 `npm --workspace @apple-proxy-profiles/shadowrocket run check:rules`，但它不能替代固定快照复现门禁。自动验证通过只证明候选产物满足仓库契约，不等于 App Store/TestFlight 版本和真实网络上的真机验收已经完成。

## 发布、灰度与回滚

发布后的公开入口计划为：

- [当前 Manifest](https://juan-nikola.github.io/apple-proxy-profiles/current/manifest.json)
- [上一已知良好版本](https://juan-nikola.github.io/apple-proxy-profiles/previous/manifest.json)
- 内容哈希版本：读取当前 Manifest 的 `manifestHash`，再访问 `https://juan-nikola.github.io/apple-proxy-profiles/versions/<manifestHash>/manifest.json`

这些 Pages URL 已上线；使用前仍应检查 Manifest 和文件哈希。`current/` 是当前快照，`previous/` 是更新前的 `current/`（首次构建时两者相同）。在线 `versions/` 最多保留 8 个内容哈希快照；整个 `public/` 树（包括 `current/`、`previous/` 和 `versions/`）不得超过 750 MiB。构建器先把 `versions/` 裁到最多 8 个；若整棵树仍超过 750 MiB，则继续从最旧哈希快照开始删除，但不会因容量清理而把已有在线窗口降到 2 个以下。若保留 `current/`、`previous/` 和最多 2 个哈希快照后仍超限，构建直接失败。需要长期保存的更老版本必须在清理前通过 Git tag/Release 归档；当前工作流不会自动创建 tag 或 Release，不能把 Pages 当成无限历史仓库。

跨客户端发布 canary 固定为：Intel Mac Egern → iPhone Egern → iPad Egern → iPhone Anywhere → iPad Anywhere；Shadowrocket 继续按自己的 Intel Mac → iPhone → iPad 清单验收。任一阶段失败都停止推广并保留后续设备旧配置。

稳定版是生产基线；Beta/TestFlight 只作为额外 canary 通道，不假设存在未经源码或真机验证的新能力。具体完成度见 [实施状态](docs/implementation-status.md)。

## 许可

本仓库整体以 [GNU General Public License v2.0 only](LICENSE) 发布。Blackmatrix7 规则的来源、固定提交、转换说明与免责声明必须随衍生产物保留。各客户端名称及商标属于各自权利人；本项目与这些 App 及上游项目没有隶属或背书关系。
