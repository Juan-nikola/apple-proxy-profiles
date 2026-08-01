# 零基础部署手册

本手册不要求理解 Shadowrocket 配置语法。先完整读完本页，再从第 0 节开始；每做完一步就核对“成功标志”。不同 Sub-Store 部署方式和 Shadowrocket 版本可能使用略有不同的页面名称，本手册描述的是页面用途，不把某个版本的按钮文字当成保证。

## 0. 部署前备份

保留当前能用的节点订阅和 Profile，不重命名、不删除。记录在每台设备上切回旧 Profile 的位置。首次只在 Intel Mac 灰度。

1. 在 Intel Mac、iPhone、iPad 上分别找到当前启用的旧 Profile，记下名称并确认仍能选中。
2. 备份 Sub-Store 当前配置；至少记录现有来源、组合、脚本和文件。
3. 不把含 Token、订阅 URL 或节点二维码的备份放入公开网盘、聊天群或截图。
4. 先不要改 iPhone 和 iPad。Intel Mac 全部验收通过并稳定使用后才继续。

成功标志：旧 Profile 仍在列表中，切回后可以恢复联网。做不到就停止部署，先修复备份或回滚入口。

### 公网 Sub-Store 安全检查

本项目不配置服务器端认证、TLS 或管理页面加固。公网中未认证的 Sub-Store 管理页面可能让他人看到订阅和节点；秘密 URL 不是访问控制，也不能替代登录认证。

服务器加固明确不在本项目范围内。部署前请依照自己的服务器文档或让服务器管理员确认：Sub-Store 仅能从私有网络/VPN 访问，或前面已有带认证和 TLS 的反向代理。不要照抄来历不明的服务器命令。保护未完成时停止部署，不创建或导出 `shadowrocket-nodes` 的公网 URL。

## 1. 准备 Sub-Store 来源

把每个机场、自建、Realm、服务端链式和客户端落地订阅加入组合 `shadowrocket-sources`。显示名前缀分别使用 `[机场]`、`[自建]`、`[realm]`、`[链式代理]`、`[落地]`。只有确实需要 Shadowrocket 再套一层入口的节点才标 `[落地]`。

1. 在 Sub-Store 的来源/订阅区域逐个添加已有订阅。
2. 每个来源先单独预览，确认能解析出节点；不要在公开场合打开或分享完整地址。
3. 新建组合订阅，名称准确填写 `shadowrocket-sources`。
4. 把刚才的来源全部加入这个组合。前缀含义如下：
   - `[机场]机场名字`：机场节点，不进入下载/P2P 手动候选。
   - `[自建]节点类型`：普通自建节点，例如 `[自建]Snell`。
   - `[realm] XXX`：Realm 已在服务器端完成转发，不再由客户端套链。
   - `[链式代理]XXX`：3x-ui 等已完成服务器端链路，不再由客户端套链。
   - `[落地]XXX`：明确允许 Shadowrocket 使用入口节点连接的落地。
5. 无法确认某个来源是否为客户端落地时，不要标 `[落地]`；先按普通自建或已完成链路处理。

成功标志：`shadowrocket-sources` 预览不是空的，数量与各来源大致相符。原始组合为空时停止，不创建输出文件。

## 2. 创建节点 Script Operator

新建脚本，粘贴 `dist/substore-node-operator.js` 全文；把它放到 `shadowrocket-sources` 的脚本操作中。参数先填 `output=nodes&clientChain=off`。目标平台选 Shadowrocket。输出文件命名 `shadowrocket-nodes`，更新间隔设为每 6 小时。

具体操作：

1. 从本项目打开 `dist/substore-node-operator.js`，全选并完整复制。不要只复制开头，也不要自行添加 `import`。
2. 在 Sub-Store 中新建 Script Operator，把完整脚本粘贴进去。
3. 将脚本操作加入组合 `shadowrocket-sources` 的处理链。
4. 参数准确填写 `output=nodes&clientChain=off`，不要加引号或空格。
5. 预览时目标平台选择 Shadowrocket。
6. 创建对应的远程输出/文件，显示名准确填写 `shadowrocket-nodes`，更新间隔设为每 6 小时。
7. 将生成的订阅 URL 只保存到自己的设备；它包含私密节点信息。

成功标志：预览得到至少一个节点；国旗不重复；名称含统一来源标签；没有服务器地址、密码或 UUID 出现在日志统计中。预览为空时停止，不发布。

如果只有个别节点被排除，先看不含节点详情的“排除原因计数”。如果全部节点被排除，保持旧订阅，不要继续导入设备。

## 3. 创建三个配置 File Script Operator

分别创建 `shadowrocket-config-macos`、`shadowrocket-config-iphone`、`shadowrocket-config-ipad`，脚本都粘贴 `dist/substore-profile-generator.js` 全文。macOS 使用稳定优先参数：

`output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off`

iPhone 和 iPad 将 `platform` 分别改成 `iphone`、`ipad`，并把 `ipv6Mode` 改成 `auto`；`quicMode=proxy-block` 保持不变。配置更新间隔设为每天。成功标志：预览首行附近出现 `[General]`，随后出现 `[Proxy Group]` 和 `[Rule]`，且没有节点密码。

按下面顺序逐份创建：

1. 在 Sub-Store 中找到用于生成文本文件的 File/文件功能，选择 Script Operator。
2. 粘贴 `dist/substore-profile-generator.js` 全文。
3. macOS 文件名填 `shadowrocket-config-macos`，使用上面的完整参数。
4. iPhone 文件名填 `shadowrocket-config-iphone`，使用 `platform=iphone`、`quicMode=proxy-block`、`ipv6Mode=auto`。
5. iPad 文件名填 `shadowrocket-config-ipad`，使用 `platform=ipad`、`quicMode=proxy-block`、`ipv6Mode=auto`。
6. 三份都设为每天更新，并分别保存远程 Profile URL。不要公开这些 URL。

`name=shadowrocket-sources` 必须与第 1 节的组合名完全一致。`subscriptionName` 不是占位参数：它必须与 Shadowrocket 中节点订阅的显示名**完全一致**，包括大小写、emoji、空格和标点。显示名可以由你自由命名；本手册仅以 `Shadowrocket-Nodes` 为示例，所以三个 File 的参数都写 `subscriptionName=Shadowrocket-Nodes`，动态候选会显示为 `Shadowrocket-Nodes,use=true`。如果截图中实际显示名是 `SHADOWROCKET-NODES`，macOS、iPhone、iPad 三个 Profile File Operator 的 `subscriptionName` 都必须精确填写 `SHADOWROCKET-NODES`（大小写也一致），不要把它当作必须固定使用的名字。名称不匹配时，`DIRECT`、`🚀 节点选择`、自动/故障转移和地区等显式选择仍在，但动态组不会显示该订阅的具体服务器。参数拼写错误、缺少必填参数或使用未知值时，生成器会直接报错。

如果预览不是三个 INI 段、包含实际节点凭据或为空，立即停止。不要把错误结果覆盖到任何设备。

## 灰度前的客户端设置（必须先完成）

下面这些设置不是灰度结束后的优化，而是每台设备导入和测试前的前置条件：

1. 将该设备的 Shadowrocket 更新到 App Store 最新稳定版。
2. 找到保持连接/按需连接一类设置，开启始终连接和异常断开后恢复；系统重启后仍需复查。
3. 开启连接、规则命中和 DNS 日志，并设置自动删除 7 天前日志。
4. 关闭 Shadowrocket iCloud 节点自动同步，让 Sub-Store 成为唯一节点来源。
5. Shadowrocket 运行期间不要叠加 iCloud 私密转送；断开 Shadowrocket 后可恢复系统原设置。
6. 保持 HTTPS 解密关闭，不安装解密证书，不开启重写。
7. 确认第 2、3 节已在 Sub-Store 中把节点订阅更新间隔设为每 6 小时、平台 Profile 更新间隔设为每天。

先在 Intel Mac 完成以上 7 项并逐项核对，才能进入第 4 节。以后轮到 iPhone、iPad 时，也必须先在对应设备完成这些设置，再导入和测试。

## 4. Intel Mac 灰度

先导入输出文件 `shadowrocket-nodes`，在 Shadowrocket 中将它的显示名填写为与三个 File 参数相同的名称（本例为 `Shadowrocket-Nodes`）；再导入 `shadowrocket-config-macos`。不要覆盖旧 Profile。保持 HTTPS 解密关闭。

开始前再次确认 Intel Mac 已完成“灰度前的客户端设置”全部 7 项；缺一项就停止。

1. 在 Intel Mac 的 Shadowrocket 中，进入用于添加远程节点订阅的页面，添加 `shadowrocket-nodes` 的私密 URL。
2. 显示名可按自己的习惯命名，但必须把同一名称逐字填入 macOS、iPhone、iPad File 参数的 `subscriptionName`；手动更新一次并确认节点数量不为 0。
3. 再进入用于添加远程配置/Profile 的页面，添加 `shadowrocket-config-macos` 的 URL，并手动更新一次当前平台（macOS）Profile。
4. 核对节点订阅和 macOS Profile 都显示新的更新时间；只更新其中一个不算完成。
5. 保留旧 Profile；新旧 Profile 必须能在列表中分别选中。
6. 选择新 Profile，连接后先测试一个中国网站、一个境外网站和路由器管理页；再按第 8 节检查一个境外业务组和一个国内直连优先业务组。

逐项执行 `docs/canary-checklist.md`，也就是这份 [Intel Mac 灰度清单](canary-checklist.md)。全部通过并稳定使用后再继续。

失败停止点：任一关键网络、DNS 或局域网测试失败时，立即选择旧 Profile；不要删除新 Profile，不要同时修改多个参数。

## 5. iPhone 与 iPad

按相同顺序导入共同的 `shadowrocket-nodes`，再分别导入 `shadowrocket-config-iphone` 和 `shadowrocket-config-ipad`。每台设备都保留旧 Profile。

1. Intel Mac 灰度通过后，先在 iPhone 完成“灰度前的客户端设置”全部 7 项，再导入任何新内容。
2. 在 iPhone 添加同一 `shadowrocket-nodes`；显示名必须与 iPhone File 参数的 `subscriptionName` 完全一致。建议三台设备使用同一个显示名，避免三个 File 参数混淆；然后手动更新。
3. iPhone 只导入 `shadowrocket-config-iphone`，不要误用 macOS 或 iPad Profile；手动更新 iPhone Profile。
4. 核对节点订阅和 iPhone Profile 都显示新的更新时间，再完成基础联网、局域网、DNS 和策略组测试。
5. iPhone 稳定后，先在 iPad 完成“灰度前的客户端设置”全部 7 项。
6. 在 iPad 添加并更新 `shadowrocket-nodes`，其显示名必须与 iPad File 参数的 `subscriptionName` 完全一致；只导入并更新 `shadowrocket-config-ipad`。
7. 核对节点订阅和 iPad Profile 都显示新的更新时间，再开始测试。
8. 每台设备分别实际切回旧 Profile 一次，再切回新 Profile，确认回滚入口有效。

Apple Silicon Mac 使用 `shadowrocket-config-macos`，语义与 Intel Mac 相同；Apple TV 本轮不要部署。

## 6. 必须手工设置的客户端选项

开启始终连接和异常断开后恢复；开启连接、规则和 DNS 日志；设置自动删除 7 天前日志；关闭 Shadowrocket iCloud 节点自动同步；Shadowrocket 运行时不要叠加 iCloud 私密转送；节点订阅每 6 小时更新；Profile 每天更新；HTTPS 解密保持关闭。

这些是每台设备上的客户端设置，不由生成的 Profile 代替：

本节是前面“灰度前的客户端设置”的完整复核表，不代表可以等到灰度或移动端导入结束后再设置。每台设备必须先完成，再导入和测试。

1. 更新 Shadowrocket 到 App Store 最新稳定版。
2. 找到保持连接/按需连接一类功能，设置为断开后可恢复；系统升级或重启后仍需检查。
3. 打开连接、规则命中和 DNS 日志；将日志自动清理周期设为 7 天。
4. 关闭 Shadowrocket 的 iCloud 节点自动同步，让 Sub-Store 成为唯一节点来源，避免重复或旧节点回流。
5. Shadowrocket 连接期间关闭 iCloud 私密转送，避免两层网络路径互相影响；断开 Shadowrocket 后可以恢复系统原设置。
6. 检查节点订阅是每 6 小时更新，三份 Profile 是每天更新。
7. 不安装解密证书，不开启 HTTPS 解密、重写或请求正文修改。

成功标志：手动更新能显示新时间；日志能看到规则命中但不需要公开分享；设备重连后仍使用选中的 Profile。

## 7. 页面名称不完全相同时怎么找

Sub-Store 中先找“订阅/组合订阅”，再找“脚本操作/Script Operator”，最后找“文件/File”。Shadowrocket 中先找“数据/订阅”添加 `shadowrocket-nodes`，再找“配置/Config”添加平台 Profile。最新版本如果文字略有不同，只进入具有同一用途的页面，不点击“证书”“HTTPS 解密”“重写”。

每次只做一个动作并立即核对：订阅成功应看到节点数量；节点预览应看到统一标签；Profile 预览应看到三个 INI 段；Shadowrocket 更新成功应显示新的更新时间；策略组页应只看到固定洲组而没有大量国家组。国家/地区映射覆盖 249 个 ISO 国旗，但不会生成国家策略组。任何一步看不到对应结果，停在当前设备，不继续到下一台。

## 8. 首次使用策略组

1. 本次恢复服务组时，设备端只需替换 `dist/substore-profile-generator.js` 并更新当前平台 Profile；无需替换节点 Script Operator，也无需改动节点订阅。仓库中的 `dist/` 与 `examples/` 已随源码重建校验，规则和节点 Operator 内容未改变。打开 `🚀 节点选择`，确认它只有 `PROXY`，摘要显示 `SELECT > PROXY`。以后直接在 Shadowrocket 首页选择节点，这个组会自动跟随；如果这里仍显示国旗或具体节点名，当前设备使用的还是旧 Profile。
2. 16 个常用业务组都提供自动测速、故障转移、地区和具体节点选择。GitHub、YouTube、Netflix、Disney+、Spotify、国际媒体、Telegram、海外社交、TikTok 和游戏平台这 10 个境外组以 `policy-select-name=🚀 节点选择` 设为首项；Apple、Microsoft、哔哩哔哩、抖音、小红书和微博这 6 个国内组以 `policy-select-name=DIRECT` 设为首项。检查至少一个境外组和一个国内组，确认各自首项、完整显式候选和匹配订阅中的具体服务器均可见。
3. 打开 `🤖 AI 专用`，可选择独立 AI 洲组或符合筛选条件的具体节点。AI 组的选择不会改变主线路。
4. Apple、Microsoft 和国内平台默认直连；需要时可在对应平台组选择 `🚀 节点选择`或具体节点。
5. `☣️ 安全威胁`、`🧱 常见广告`、`🕵️ 严格跟踪`可以在客户端即时切换。
6. `⬇️ 下载/P2P`和`🎮 游戏连接`默认 DIRECT；不了解节点服务条款时不要切换。

本次从旧版恢复服务组时，只更新当前平台 Profile；只更新节点订阅不会改变分组，且不需要更新节点 Script Operator。先在 Intel Mac 更新并核对 Profile 时间和 `SELECT > PROXY`，通过后再依次更新 iPhone、iPad。

Shadowrocket 可能保留业务组里仍有效的旧选择，生成器写入的首项默认值不会自动覆盖它。更新后检查常用组：境外组希望跟随首页时，手动选择第一项 `🚀 节点选择`；国内组希望恢复默认直连时，手动选择第一项 `DIRECT`。如果摘要仍是具体节点、`⚡ 全部自动`、`🛟 全部故障转移`或地区组，该业务会继续按这个旧选择工作。

全部检查完成后，才把新 Profile 作为日常使用配置。任何时候都不要为了“清理”而删除旧 Profile；等三台设备稳定一段时间并完成维护记录后再自行决定是否归档。
