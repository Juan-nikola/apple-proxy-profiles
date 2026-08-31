# Anywhere 配置

Anywhere 新任务只读取 `apple-proxy-anywhere`。客户端 collection 边界、迁移与回滚以 [Sub-Store 客户端节点池指南](../../docs/substore-client-pools.md) 为准；已有 `apple-proxy-sources` collection、tasks 和旧 URL 保留作兼容/回滚，不要删除。

Anywhere 不能用一个远程文件表达 Shadowrocket/Egern 的完整 Profile。本项目采用功能等价的三层结构：

| 层 | 本项目提供 | 必须留在本地 |
|---|---|---|
| 私密节点订阅 | `dist/anywhere-node-generator.js` 生成仅含 `proxies` 的 Clash YAML | 私密订阅 URL、节点凭据、当前节点 |
| 策略校验/映射 | `dist/anywhere-strategy-generator.js` 读取私密 `apple-proxy-policy`，生成脱敏目标状态和固定节点映射 | 私密 policy 文件和节点选择 |
| 公开规则 | 固定上游输入聚合成 14 个稳定 `.arrs` 业务包及 schema-v2 Manifest | 每个业务包最终绑定到 DIRECT、REJECT、节点或链 |
| 设备设置 | 部署、灰度和回滚说明 | Rule/Global、DNS、链、IPv6、QUIC、Purify 等 |

三层任一缺失，都不能称为完整配置。`.arrs` 的 `routing = 0/1/2` 仅控制首次导入的 Default、DIRECT、REJECT。特别注意：`Default` 并非停用；在审计的 Anywhere 源码中，它会让自定义规则集回退到当前选择的节点或链。`anywhere-strategy` 的 `final` 会完整记录为 `FOLLOW`、`DIRECT` 或固定节点结果，供本地绑定核对；输出中的 `localAssignments.importable` 固定为 `false`，它不能通过远程 JSON 自动创建业务组绑定或设置 `漏网之鱼` 默认出口，仍需在 Anywhere App 内手动完成。

默认 14 个稳定业务包是：`AI`、`Apple`、`ChinaIP`、`DomesticCore`、`DomesticPlatform`、`Download`、`GitHub`、`Microsoft`、`OverseasGame`、`OverseasMedia`、`OverseasSocial`、`Privacy`、`Security`、`YouTube`。上游来源如何聚合、每包规则数量和 SHA-256 以 schema-v2 Manifest 为唯一事实源。

## 已生成产物

- `dist/anywhere-node-generator.js`：自包含私密节点 File Operator。
- `dist/anywhere-strategy-generator.js`：自包含私密策略校验/映射 File Operator，不生成完整 Anywhere Profile。
- `examples/rules/manifest.json`：固定提交、输入哈希、计数、优先级归并和分片闭包。
- `examples/rules/*.arrs`：每片最多 95,000 条，低于源码 100,000 条上限。
- `examples/import.html`：默认轻量分片导入页，含 schema-v2 迁移提示。
- `examples/optional/adblock-full/anywhere/import.html`：只导入 `Advertising` 与 `Advertising_Domain` 的可选 REJECT 页；启用前必须评估内存。

新任务统一使用 `anywhere-node-generator.js`。旧 `substore-node-generator.js` 文件和 Pages URL 保留为字节一致的兼容别名，既有 Sub-Store 任务不必仅为改名更换 URL；新旧名称不是两个不同版本。

先按根目录的 [Sub-Store 外置 JS + 任务引用总指南](../../docs/substore-two-layer-setup.md)，再让 File `anywhere-nodes` 选择链接模式，直接引用 `anywhere-node-generator.js` 的规范 Pages URL，并在自己的参数编辑器中保存参数。以后升级 JS 不复制脚本正文，File 的脚本 URL、任务名、私密输出 URL和参数都不动。

## Sub-Store 两层创建清单（可直接照填）

仓库在 GitHub Pages 维护一条 Anywhere 外置 JS；Sub-Store 不需要先创建独立脚本记录：

| 外置 JS 文件名 | JavaScript URL |
| --- | --- |
| `anywhere-node-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js` |
| `anywhere-strategy-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-strategy-generator.js` |

新建 File `anywhere-nodes`，脚本来源选择“链接/远程脚本”，直接粘贴上面的 URL，然后在这个 File 的可视化参数编辑器中填写：

```text
output=nodes&type=collection&name=apple-proxy-anywhere&clientChain=off
```

旧版只有单行链接时使用 `JS_URL#output=nodes&type=collection&name=apple-proxy-anywhere&clientChain=off`，不能使用 `?` 连接脚本参数。保存后先预览，确认 `accepted` 至少为 1，再把这个 File 的私密输出 URL 加入 Anywhere；不要在 File 中粘贴 JavaScript 正文。以后脚本升级不改 JS URL、File 名称、参数或私密 URL。

### 独立策略校验/映射 File

如果要检查统一策略中的业务目标和固定节点是否能被 Anywhere 识别，另建 `anywhere-strategy` File，使用：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-strategy-generator.js
```

参数为：

```text
output=strategy&type=collection&name=apple-proxy-anywhere&channel=current
```

它读取私密 `apple-proxy-policy`，只返回脱敏的目标状态、固定节点映射和计数；其中包含 `final` 的 `configured`/`resolved` 状态，并以 `localAssignments` 给出业务组和 `漏网之鱼` 的本地默认建议。`localAssignments.importable` 固定为 `false`：Anywhere 不接受由这个远程文件自动写入业务组或最终出口，生成结果只能用来逐项核对后手动绑定。不返回 `proxies`，也不替代 `anywhere-nodes`。节点 File 仍是 collection-only；策略文件缺失、节点名不精确或协议不兼容时必须失败关闭。

## 新手部署：从节点 File 到规则导入

### 1. 先备份并确认来源

1. 在 Anywhere 保留当前能联网的节点、Rule Mode 规则集及本地策略绑定，不删除旧设置。
2. 备份 Sub-Store；确认组合订阅 `apple-proxy-anywhere` 已存在、包含你已验证的私密来源且预览节点数大于 0。
3. 真实来源 URL、节点、File 输出 URL 和 Anywhere 本地绑定不得进入公开仓库、截图或聊天。
4. 由于 Anywhere 不支持远程导入本地策略绑定，记录 `anywhere-strategy` 中的 `localAssignments`，作为后续 App 内逐项设置的核对表。

### 2. 创建 `anywhere-nodes`

1. Sub-Store 进入“文件”→左上角“+”→“文件”。
2. 填写：名称 `anywhere-nodes`，显示名称 `Anywhere 节点订阅`，来源选“本地”。本地占位内容无需手工删除，脚本成功后会替换它。
3. 打开“操作”→“脚本操作”，选择“远程链接”，粘贴：

   ```text
   https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js
   ```

4. 展开参数，逐行填写：

   | key | value |
   | --- | --- |
   | `output` | `nodes` |
   | `type` | `collection` |
   | `name` | `apple-proxy-anywhere` |
   | `clientChain` | `off` |

5. 单条脚本的“启用”和“预览”都勾选；“关闭缓存”和“不验证服务器证书”都不勾选。标题“文件操作”旁的开关图标只是全部展开/收起，不是运行总开关。
6. 点击“即时预览”。成功输出必须包含顶层 `proxies:` 且至少一个节点，不能继续显示“填入文件内容”。保存后复制 File 的私密直链，只放进 Anywhere。

远程链接应使用 `JS_URL#output=nodes&type=collection&name=apple-proxy-anywhere&clientChain=off`。当前 Sub-Store 后端从 URL 的 `#...` 读取 `$arguments`；新界面的独立 key/value 参数行适合检查和修改，但即使这些行已经显示，也必须确认脚本 URL 本身保留相同的 hash 参数，不能只保存无 hash 的 JS URL。

### 3. 在 Anywhere 添加节点

1. 在测试用 iPhone 的 Anywhere 中新增远程节点订阅，粘贴 `anywhere-nodes` 私密直链。
2. 手动 Refresh/Update；确认节点数大于 0、名称唯一，至少一个节点能完成真实联网测试。
3. Anywhere 源码只证明了手动刷新行为，不要把它写成每 6 小时自动更新；节点变化后要主动刷新。

### 4. 导入公开 `.arrs` 规则

1. 如果设备导入过旧版，先删除或禁用 `Advertising`、`Advertising_Domain`、`ChinaMax_Domain` 和通用 `Game` 分片；否则旧大规则仍会占用内存并可能抢先命中。
2. 打开 Pages 的 `current/anywhere/import.html`，优先使用总导入 deep link；若当前系统或分享链路无法打开，再按页面顺序完成所有回退批次。总 deep link 只会打开 Anywhere 的确认页面，不会创建单个聚合 `.arrs` 订阅。
3. 回到 Anywhere，确认 14 个稳定业务包全部出现。`routing=1` 是 DIRECT，`routing=2` 是 REJECT，`routing=0` 的 Default 会回退到当前节点或链，并不表示停用。
4. `Privacy`、`DomesticCore`、`DomesticPlatform`、`Apple`、`Microsoft`、`Download` 和 `ChinaIP` 应为 DIRECT，`Security` 应为 REJECT；其余六个境外业务包首次使用 Default/代理。
5. 对照 `localAssignments.businessGroups`，在 App 内把 policy 指定的业务组默认逐项绑定；对照 `localAssignments.leakGroup.default`，手动设置 `漏网之鱼` 的默认出口。远程节点或策略文件不会自动完成这两类绑定。
6. 配置 DNS、IPv6、QUIC、链与 Purify 等设备设置，然后切换到 Rule Mode。节点 File 不会自动完成这些步骤。

### 5. 灰度和回滚

1. 先按 [iPhone canary 清单](docs/canary.md)验证节点更新、规则命中、DIRECT/REJECT、漏网流量及真实联网。
2. iPhone 全部通过后才在 iPad 重复节点添加、规则导入和本地绑定；不要假设绑定会自动同步。
3. 失败时切回旧节点订阅和旧本地规则绑定；若是公开规则问题，恢复旧 `.arrs` 导入；若是节点问题，只回滚 `anywhere-nodes`，不要混改规则层。
4. 公开 `/current/` JS 升级时任务名、参数和私密直链保持不变。先在 iPhone 重新预览和刷新，通过后再推广到 iPad。

成功标志：节点 File 预览非空；iPhone、iPad 都能手动刷新节点；14 个稳定业务包和 `localAssignments` 对应的本地绑定完整；旧配置仍可立即恢复。

Anywhere 只有这一条 Sub-Store 节点生成链。它不能用一个远程文件表达完整 Profile，所以本项目不会创建虚假的 `anywhere-profile-generator.js`：公开 `.arrs` 规则、规则目标绑定、DNS、IPv6、QUIC、链和 Rule 模式必须继续在 Anywhere 部署链路中完成。完整步骤见[部署指南](docs/deployment.md)。

当前固定 Blackmatrix7 提交为 `dab47069a30c4ae70f7f5f4c919d639d9aaf79dc`。固定上游输入经过优先级归并后生成 14 个稳定业务包；精确输入数、规则数、SHA-256 和包列表以当前 schema-v2 Manifest 为准。完整 `Advertising` 与 `Advertising_Domain` 仅位于可选 `adblock-full` 包，默认导入不会加载它们。

国内 App 偶发变慢、切换开关后暂时恢复，通常是旧大规则仍在生效，或 DNS/连接缓存处于旧状态。删除或禁用旧 `ChinaMax_Domain`/`Game` 后，确认 `DomesticCore`、`DomesticPlatform` 和 `ChinaIP` 为 DIRECT，可避免常见国内域名和国内 IP 回落到代理。

客户端兼容性固定到用户提供并核验的 Anywhere 官方源码提交 `e15518fde1f5d2652dfc1c234c89a68b87cecec0`。

## 最短部署路径

1. 按 [部署指南](docs/deployment.md) 在私密 Sub-Store 创建节点 File 任务；真实订阅 URL绝不能提交到仓库。
2. 在测试设备添加私密节点订阅，检查节点名称唯一且稳定。
3. 打开最终 Pages 的 `current/anywhere/import.html`，优先使用总导入 deep link；若失败再依次完成全部回退批次。不要把 `anywhere://add-rule-set` deep link 粘贴到 `.arrs` 订阅输入框。
4. 在 Anywhere 内逐个检查 14 个业务包的本地绑定；若某个业务包以后拆成多个 shard，同包分片必须绑定相同目标。确认后切换到 Rule 模式。
5. 按 [canary 清单](docs/canary.md) 先 iPhone、后 iPad，并在每台设备做真实回滚。

稳定版是生产基线；Beta/TestFlight 只是附加灰度通道，使用同一套已验证产物，不推定 beta 拥有未审计能力。节点产物可由 Sub-Store 按私密任务节奏重建，但 Anywhere 源码只证明了用户手动 Refresh/Update；不要写成 App 会自动每 6 小时刷新。

## 安全边界

- 真实订阅 URL、节点、UUID、密码、密钥和证书只存在于私密 Sub-Store 与设备。
- 本项目不生成 `.amrs`、MITM、HTTPS 解密、重写或证书；Allow Insecure 保持关闭。
- 可选完整广告包体积大，可能显著提高内存占用；它不属于默认路由。
- 节点、规则和设备设置是独立更新链路；只更新其中一层不会同步另外两层。

进一步阅读：[故障排查](docs/troubleshooting.md) · [上游兼容性](UPSTREAM_COMPATIBILITY.md)
