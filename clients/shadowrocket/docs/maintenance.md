# 日常维护速查

Shadowrocket 维护对象是 `apple-proxy-shadowrocket`；统一迁移、回滚和计数对比步骤见 [Sub-Store 客户端节点池指南](../../../docs/substore-client-pools.md)。已有 `apple-proxy-sources` collection、tasks 和旧 URL 继续保留。

先记住两类更新：节点凭据只在原始组合 `apple-proxy-shadowrocket` 中，每 6 小时更新；规则与策略在平台 Profile 中，每天更新。不要手工编辑生成文件，也不要公开任何远程 URL。

- 新增机场：只加入原始 `apple-proxy-shadowrocket`，名称以 `[机场]` 开头，不改生成器源码。
- 新增自建：使用 `[自建]协议名`；Realm 用 `[realm]`；服务器已完成链路用 `[链式代理]`。
- 协议：Snell 和 Shadowsocks 是两种独立协议；Shadowrocket 可使用两者，订阅中不要把 Snell 写成 Shadowsocks。
- 客户端链式：只有落地标 `[落地]`；必须按下文创建完整隔离的版本化测试栈，不修改正式组合、节点脚本、节点订阅或 Profile；Hysteria2 不生成链式副本。
- DNS：修改 `dnsMode`、`chinaDns`、`globalDns` 后重新生成并更新 Profile，不是热切换。
- QUIC：修改 `quicMode=allow|proxy-block|all-block` 后更新 Profile，不是热切换。
- IPv6：iPhone/iPad 使用 `ipv6Mode=auto`；macOS 稳定优先使用 `ipv4-only`。
- 广告：默认 `adblockMode=off` 不下载完整广告包；明确使用 `adblockMode=full` 时才从独立 optional 发布加载两份广告规则，策略仍可在 `🧱 常见广告` 中热切换。
- HTTPS 解密：保持关闭；广告规则中的域名/IP 项仍会工作，需要解密 HTTPS 路径的 URL 正则不会生效，不为提高拦截率安装证书。
- AI：在 `🤖 AI 专用`里可通过独立 AI 洲组或具体节点选择出口；它可以与主线路使用不同节点，更新后确认选择仍保留。
- 国内平台：各自策略组默认 DIRECT，需要时可切到 `🚀 节点选择`或具体节点。抖音使用 Blackmatrix7 `ByteDance` 增强规则；代理不能保证评论地区改变。
- 游戏连接：默认 DIRECT，只显示明确带 `·U` 能力标记的节点；海外游戏网页和服务由 `🌍 海外游戏` 控制。
- 下载/P2P：默认 DIRECT，候选只含 `｜自建`、`｜Realm`、`｜链式代理` 节点。

## 新增或修改来源

1. 只在 Sub-Store 中添加或修改一个来源，并使用正确前缀。
2. 先预览该来源，再预览原始 `apple-proxy-shadowrocket`。
3. 确认节点数量不为 0、国旗没有重复、日志只含计数。
4. 节点库存会决定洲组、来源组、`🎮 游戏连接`和`⬇️ 下载/P2P`候选，因此必须重新生成并预览 `shadowrocket-config-macos`、`shadowrocket-config-iphone`、`shadowrocket-config-ipad`；三份都应能生成三个 INI 段且不含凭据。
5. Intel Mac 必须同时手动更新节点订阅和 `shadowrocket-config-macos`，核对两者的新时间并完成灰度。
6. Intel Mac 通过后，iPhone 同时更新节点订阅和 `shadowrocket-config-iphone`；iPad 最后同时更新节点订阅和 `shadowrocket-config-ipad`。
7. 任一设备只更新了节点或只更新了 Profile，都不算完成。节点异常时恢复前一次可用来源、订阅和匹配的 Profile，不需要修改生成器源码。

同名但配置不同的节点会保留并获得稳定短序号；已有国旗不会再加一份。249 个 ISO 3166-1 国家和地区国旗都会自动归入亚太、欧洲、美洲或其他，新增节点无需修改分组。固定顺序是亚太、欧洲、美洲、其他；没有节点的洲不会显示，也不会生成国家组。未知国旗或无法识别地区的节点进入 `🌐 其他/未分类`，这不是发布失败。

## 打开客户端链式

客户端链式会同时改变节点内容和 Profile 引用，不能只复制 Profile。整套测试必须与正式栈隔离：

下面所有 `YYYYMMDD` 都替换为同一个测试日期，例如 20260725；不要在同一套测试中混用不同日期。

1. 保持正式的原始 `apple-proxy-shadowrocket`、节点订阅、三个正式 Profile File 及其 URL 全部不变。
2. 新建带日期的测试组合，例如 `apple-proxy-shadowrocket-chain-test-YYYYMMDD`。复制正式组合的来源成员，不复制任何脚本操作（本项目不使用组合 Script Operator；Profile 生成器内置节点归一化）。如果某个来源必须把标签改为 `[落地]`，先复制该来源条目，只在副本上改显示名，不重命名生产来源。
3. 从测试组合发布一份新的版本化节点订阅，例如 `shadowrocket-nodes-chain-test-YYYYMMDD`；原来的 `shadowrocket-nodes` 保持不变（旧结构中的处理组合名称；新结构下保持正式的 `apple-proxy-shadowrocket` 不动即可）。节点订阅不需要脚本操作：Profile 生成器通过 `clientChain=on` 在 Profile 内生成链式副本，节点侧始终使用原始节点列表（等价于旧结构 `output=nodes&clientChain=off` 的输出；测试 Profile 开启链式等价于旧结构节点侧的 `output=nodes&clientChain=on`）。
5. 在 Shadowrocket 中给新节点订阅一个便于识别的显示名，显示名准确填写 `Shadowrocket-Nodes-Chain-Test-YYYYMMDD`。这是测试示例，不是固定名称；若自定义名称，后续 `subscriptionName` 必须逐字相同，包括大小写、emoji、空格和标点。动态组只从 `subscriptionName` 精确指定的测试订阅读取，无需因防混入而暂停生产订阅；正式订阅与测试订阅仍应分别保留，便于独立回滚和复测。
6. 先只复制 macOS Profile File，名称加同一天的链式测试后缀。参数中的三个关键值填写为：
   - `name=apple-proxy-shadowrocket-chain-test-YYYYMMDD`
   - `subscriptionName=Shadowrocket-Nodes-Chain-Test-YYYYMMDD`
   - `clientChain=on`
7. `name` 对应第 2 步测试组合，`clientChain` 为 `on`；`subscriptionName` 必须与第 5 步的 Shadowrocket 节点订阅显示名完全一致。因此本例的显示名和参数都是 `Shadowrocket-Nodes-Chain-Test-YYYYMMDD`；不匹配时显式选项仍可选择，但动态组不会列出该订阅的具体服务器。其他参数先保持正式 macOS Profile 的值。
   如果正式 Profile 仍使用默认参数，可复制下面整行，再把所有 `YYYYMMDD` 换成同一天：

   `output=config&type=collection&name=apple-proxy-shadowrocket-chain-test-YYYYMMDD&subscriptionName=Shadowrocket-Nodes-Chain-Test-YYYYMMDD&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=on`

8. 预览 macOS 测试 Profile 后发布新的 URL，在 Intel Mac 中把新节点订阅和新 Profile 并排导入。新 Profile 的动态组只读取第 5 步 `subscriptionName` 指定的测试订阅；测试时无需停用或移除正式节点订阅。
9. 先在 Intel Mac 验证：普通落地仍在、允许的 `🔗` 链式副本出现、入口失败时连接关闭而不是绕过入口。Hysteria2 不生成客户端链式副本；`[realm]` 和 `[链式代理]`是已完成链路，也不会再次克隆。
   节点名中的 `·链` 由脚本在检测到 `chain`、`underlying-proxy` 等既有链路字段时自动添加，表示该节点不会再次用作客户端入口。不要手工删除或伪造这个标记；原节点名里手写的同名标记会先被清除，再按真实字段重新判断。
10. macOS 通过后，才在同一隔离测试栈中复制 iPhone、iPad Profile File；分别只改 `platform=iphone`、`platform=ipad`，并保持第 6 步三个关键值一致。每份都发布新的 URL，按 iPhone、iPad 顺序测试。
11. 回滚时直接选回旧 Profile；原节点订阅和旧 Profile 从未被修改，因此不需要反向改参数。停止链式测试也只需切回原来的旧 Profile。
12. 回滚观察期结束前，不修改或删除正式栈，也不删除测试组合、测试节点订阅和测试 Profile；确认不再需要复现后再自行归档测试产物。

## 参数修改表

参数值必须完全匹配下表；未知值会报错，不会静默猜测。

| 目的 | 可用值 | 建议 |
|---|---|---|
| `dnsMode` | `stable`、`privacy`、`speed` | 日常使用 `stable` |
| `chinaDns` | `alidns`、`dnspod`、`system` | 日常使用 `alidns` |
| `globalDns` | `cloudflare`、`google`、`quad9` | 日常使用 `cloudflare` |
| `quicMode` | `allow`、`proxy-block`、`all-block` | 日常使用 `proxy-block`；只阻止代理侧应用 QUIC |
| `ipv6Mode` | `auto`、`ipv4-only` | iPhone/iPad 用 `auto`；macOS 稳定优先用 `ipv4-only` |
| `blockMode` | `balanced`、`security`、`strict`、`off` | 只决定首次默认值，日常在客户端热切换 |
| `autoGroupMode` | `auto`、`full`、`balanced`、`minimal` | 使用 `auto`，节点增多会自动降低测速负担 |
| `clientChain` | `off`、`on` | 无明确客户端落地时保持 `off` |

`autoGroupMode=auto` 在节点不超过 30 个时使用完整测速，31–100 个时使用均衡测速，超过 100 个时使用精简测速；所有手动节点始终保留。`full`、`balanced`、`minimal`只改变后台测试组和频率。

每次只改一个参数，生成新的测试 Profile，执行 Intel Mac 的相关检查并保留旧 Profile。DNS、QUIC、IPv6、`blockMode`初始值和测速模式都不是客户端热切换；修改后必须重新生成、更新 Profile。

## 创建版本化测试 Profile

修改 DNS、QUIC、IPv6、`blockMode`或测速模式时，不要直接改写当前可回滚的 File：

`clientChain` 不使用这套仅复制 File 的流程，因为它还会改变节点订阅。客户端链式必须执行上面的“打开客户端链式”完整隔离栈步骤。

1. 在 Sub-Store 复制对应的平台 File，例如复制 `shadowrocket-config-macos`。
2. 给副本名称加日期+参数后缀，格式可用 `-test-YYYYMMDD-参数-值`，例如 `shadowrocket-config-macos-test-20260725-quic-proxy-block`。
3. 只在副本中修改一个参数，预览通过后发布为新的 URL。不要覆盖旧 File 或旧 URL；旧 File 的内容和地址保持不变。
4. 在 Intel Mac 把新 URL 导入为一个新 Profile，放在旧 Profile 旁边，不使用覆盖导入。
5. 为避免远程内容在对比期间变化，按需要关闭测试 Profile 和旧回滚 Profile 的自动更新；记下各自名称、URL 用途、参数和日期。不要在截图或记录中写出 URL 本身。
6. 测试失败就选回旧 Profile。测试通过后，才按同样方法为 iPhone、iPad 分别创建版本化 File 和新的 URL。
7. 完成测试后恢复正式 Profile 的每天更新；仍作为回滚依据的旧 Profile/File 保持冻结，直到明确结束回滚期。

“更新 Profile”在参数试验中始终指创建、发布和导入版本化副本，不是覆盖回滚 File/URL。

## 每日、每月和升级后检查

- 每天：确认节点和 Profile 显示最近更新时间；常用中国和境外目标能按预期访问。
- 每月：实际切回旧 Profile 一次；检查日志仍只保留 7 天；确认 iCloud 节点自动同步和 HTTPS 解密仍关闭。
- 新增大量节点后：预览诊断计数，检查 `autoGroupMode=auto` 是否适合，不要因测速频繁而手工删除节点。
- Shadowrocket 或 Sub-Store 升级后：先在 Intel Mac 手动更新和预览，再检查 iPhone、iPad；界面文字变化时按页面用途寻找，不随意打开证书、重写或解密功能。
- 更新生成器代码后：维护者从仓库根目录先运行 `npm ci`、`npm run verify` 和联网的 `npm --workspace @apple-proxy-profiles/shadowrocket run check:rules`，再上传新的 `clients/shadowrocket/dist/` 内容。

如发现规则、节点、DNS 或局域网异常，立即按[故障排查与回滚](troubleshooting.md)处理。
