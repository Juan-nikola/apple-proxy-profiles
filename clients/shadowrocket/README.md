# Shadowrocket 多平台配置生成器

这个项目生成两个彼此分离的东西：

1. `shadowrocket-nodes`：私密节点订阅，含节点凭据，只在自己的 Sub-Store 与设备之间使用。
2. `shadowrocket-config-*`：macOS、iPhone、iPad 的配置 Profile，不含节点凭据。

第一次使用先读根目录的 [Sub-Store 外置 JS + 任务引用总指南](../../docs/substore-two-layer-setup.md)，再严格按 [零基础部署手册](docs/deployment.md) 操作：节点组合 Operator 与三个 Profile File 都选择链接模式，直接引用对应的 Pages JS URL，并在任务自己的参数编辑器中填写参数。日常增加节点或切换 DNS、QUIC、IPv6 时看 [维护速查](docs/maintenance.md)。出现网络、局域网、AI、评论地区或更新异常时看 [故障排查与回滚](docs/troubleshooting.md)。

安全边界：HTTPS 解密保持关闭；不要公开 Sub-Store 管理地址、订阅地址、Profile 地址、Token、节点二维码或带完整 URL 的截图。代理只能改变网络出口，不能保证改变哔哩哔哩、抖音、小红书或微博显示的评论地区。

公网 Sub-Store 风险：本项目不配置服务器端认证、TLS 或管理页面加固。公网中任何人都能打开的未认证管理页面，可能暴露订阅和节点；秘密 URL 不是访问控制。服务器加固明确不在本项目范围内。请根据自己的服务器文档或联系管理员，把 Sub-Store 放在私有网络/VPN 后面，或使用带认证和 TLS 的反向代理；完成保护前不要发布本项目生成的私密订阅。

## Sub-Store 两层创建清单（可直接照填）

仓库在 GitHub Pages 维护两条 Shadowrocket 外置 JS。Sub-Store 不需要先创建独立脚本记录；后面的 Operator/File 直接引用对应 URL。

| 外置 JS 文件名 | JavaScript URL |
| --- | --- |
| `shadowrocket-node-operator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-operator.js` |
| `shadowrocket-profile-generator.js` | `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js` |

在 Sub-Store 创建 1 个组合订阅 Script Operator 和 3 个 Profile File。每个任务选择“链接/远程脚本”，直接粘贴上表对应 URL，并在任务自己的可视化参数编辑器中填写参数；不要粘贴 JavaScript 正文。

| 任务 | 类型与引用脚本 | Arguments |
| --- | --- | --- |
| `shadowrocket-sources` 的节点处理 | 组合订阅 Script Operator → 节点 JS URL | `output=nodes&clientChain=off` |
| `shadowrocket-config-macos` | Profile File → Profile JS URL | `output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `shadowrocket-config-iphone` | Profile File → Profile JS URL | `output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `shadowrocket-config-ipad` | Profile File → Profile JS URL | `output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

创建顺序：先打开组合 `shadowrocket-sources` 并添加直接引用节点 JS URL 的 Script Operator → 生成私密节点订阅 `shadowrocket-nodes` → 再创建三个直接引用 Profile JS URL 的 File。Profile 脚本不能挂到组合处理链；节点脚本也不能代替 Profile File。

推荐先粘贴完整的 `JS_URL#参数`，再展开可视化参数编辑器逐项核对表中的键和值。当前 Sub-Store 的远程链接模式由后端从 URL 的 `#...` 读取 `$arguments`；即使界面已经显示 key/value 参数行，也必须确认远程链接本身仍包含相同的 hash 参数，不能只留下无 hash 的 JS URL。不能使用 `?` 连接脚本参数。`subscriptionName=Shadowrocket-Nodes` 必须改成 Shadowrocket 中私密节点订阅的真实显示名；只对包含中文、emoji、空格、`&`、`#` 或 `%` 的参数值进行百分号编码。完整页面操作、成功标志和回滚方法见[零基础部署手册](docs/deployment.md)。

## 你会得到什么

- 一份所有设备共用、每 6 小时更新的私密节点订阅 `shadowrocket-nodes`。
- 三份每天更新的平台 Profile：`shadowrocket-config-macos`、`shadowrocket-config-iphone`、`shadowrocket-config-ipad`。
- 一个只负责跟随 Shadowrocket 首页节点的 `🚀 节点选择`，以及 16 个常用业务组：每组都有自动测速、故障转移、地区和具体节点选择；其中 10 个境外组首项为 `🚀 节点选择`，6 个国内组首项为 `DIRECT`。
- Blackmatrix7 `ChinaMax_Domain + ChinaMax` 完整增强国内规则、抖音 `ByteDance` 和 SteamCN；广告源已从精简的 `AdvertisingLite` 升级为完整 `Advertising`，同时引用 `Advertising.list` 与 `Advertising_Domain.list` 以覆盖非域名和域名规则；其他未识别流量最终进入 `🚀 节点选择`。

Apple TV 已在生成器中预留参数，但不属于本轮部署范围。首轮顺序必须是 Intel Mac、iPhone、iPad；每台设备都保留原来的可用 Profile。

## 分组如何跟随首页节点

Profile 使用职责分开的两层结构：

1. 根组为 `🚀 节点选择 = select,PROXY`；`🚀 节点选择`只包含 `PROXY`。`PROXY` 是 Shadowrocket 内建的首页当前节点，因此这个分组不能再保存某个具体节点；在首页红框位置换节点后，使用它的业务分组会一起换出口。
2. 境外业务分组默认跟随 `🚀 节点选择`：10 个境外组的首项就是 `🚀 节点选择`；每组也都有 `⚡ 全部自动`、`🛟 全部故障转移`、亚太/欧洲/美洲等地区组和符合筛选条件的具体节点。自动测速和故障转移已移到境外业务分组，不再放进 `🚀 节点选择`。
3. 国内业务分组默认 `DIRECT`：6 个国内组的首项就是 `DIRECT`；每组同样都有 `🚀 节点选择`、自动测速、故障转移、地区组和具体节点，按需要再切换，避免国内 App 因误走代理而变慢。
4. `🤖 AI 专用`继续使用独立洲组和具体节点，不会跟着首页主线路一起变化。

除 `🚀 节点选择`外，需要枚举节点的动态组会按 `subscriptionName` 只从指定的 Shadowrocket 节点订阅中筛选。显示名可自由命名（支持中文、内部空格和普通标点），但不能以空白开头或结尾，也不能包含换行；macOS、iPhone、iPad 三个 Profile File 的 `subscriptionName` 必须与 Shadowrocket 中的显示名**完全一致**，包括大小写、emoji、空格和标点。本手册的示例显示名是 `Shadowrocket-Nodes`，生成的动态候选写作 `Shadowrocket-Nodes,use=true`；它不是强制名称。若截图中节点订阅的真实显示名是 `SHADOWROCKET-NODES`，三个 Profile File Operator 的 `subscriptionName` 都必须精确填写 `SHADOWROCKET-NODES`，不能仍填示例值。名称不匹配时，策略组中的 `DIRECT`、`🚀 节点选择`、自动/故障转移和地区等显式选项仍在，但动态组不会列出这个订阅的具体服务器。洲顺序固定为亚太、欧洲、美洲、其他；没有节点的洲不会显示。地区识别不会生成大量国家策略组。

生成器用 `policy-select-name=🚀 节点选择` 让境外业务组默认跟随首页节点，用 `policy-select-name=DIRECT` 让国内业务组默认直连；这两个默认项不影响每组完整的显式候选和具体服务器列表。

地区识别覆盖 ISO 3166-1 的 249 个国家和地区国旗。中东与大洋洲归入亚太，俄罗斯归入欧洲，美洲含加勒比，非洲、南极洲以及无法识别的国旗归入其他。不会因此生成任何国家策略组。节点已有国旗时以最左侧国旗为准；没有国旗时才使用内置的常见国家/地区、城市、机场代码和缩写推断，仍无法确认就进入 `🌐 其他/未分类`。

## 项目文件

- `clients/shadowrocket/dist/shadowrocket-node-operator.js`：发布到规范 Pages URL，由组合订阅的 Script Operator 以链接模式直接引用。
- `clients/shadowrocket/dist/shadowrocket-profile-generator.js`：发布到规范 Pages URL，由三个 Profile File 以链接模式直接引用。
- `clients/shadowrocket/examples/`：使用脱敏假节点生成的配置示例，只用于检查结构，不能当作节点订阅。
- `docs/canary-checklist.md`：Intel Mac 首轮灰度逐项验收表。

旧的 `substore-node-operator.js` 与 `substore-profile-generator.js` 文件和 Pages URL 保留为字节一致的兼容别名，既有 Sub-Store 任务无需因改名而迁移。新建任务统一选择上面的 `shadowrocket-*` 名称；不要把同一脚本的新旧 URL 当成两个不同版本。

不要手工编辑 `clients/shadowrocket/dist/` 或生成后的 Profile。日常改动只应发生在 Sub-Store 来源、File 参数或 Shadowrocket 策略组选择中。

## 新手照填：从备份到导入

下面按 Sub-Store 常见界面的用途写步骤；如果按钮名称略有差异，就寻找“组合订阅”“脚本操作/Script Operation”“文件/File”“链接/远程脚本”和“参数/Arguments”这些同用途入口。Sub-Store 不需要先创建独立脚本记录：节点 Operator 和三个 File 都直接引用稳定的公开 JavaScript URL，参数只保存在各自任务中，不把脚本正文复制进任务。

### 第 0 步：先备份，不覆盖现有配置

1. 在 Shadowrocket 保留当前能联网的旧 Profile，不删除、不改名。
2. 在 Sub-Store 备份当前来源、组合订阅、Script Operation 和 File；另外记下任务名、用途、更新间隔和参数，但不要把任何私密 URL 或节点凭据写进公开笔记、截图或聊天。
3. 确认 Sub-Store 管理页面已经放在私有网络/VPN 后面，或已有带认证和 TLS 的反向代理。未完成保护时停止，不生成私密输出 URL。
4. 首轮只准备 Intel Mac；它通过后再依次处理 iPhone、iPad。

成功标志：旧 Profile 仍可随时切回，Sub-Store 备份可以恢复，且本次操作不会覆盖已有任务或私密输出。

### 第 1 步：进入 Sub-Store 并确认来源组合

1. 登录自己的 Sub-Store，进入“订阅/组合订阅”页面。
2. 找到组合 `shadowrocket-sources`。如果还没有，就新建同名组合，并在自己的私密环境中加入原始节点来源。
3. 先预览原始组合；节点数必须大于 0，并与各来源数量大致相符。原始组合为空时停止，不继续添加脚本。
4. 组合名称必须逐字为 `shadowrocket-sources`；后面的三个 Profile File 会用 `name=shadowrocket-sources` 读取它。

成功标志：`shadowrocket-sources` 能稳定预览出节点，且没有把来源地址、服务器、UUID 或密码复制到公开位置。

### 第 2 步：给组合添加节点 Script Operation

1. 打开 `shadowrocket-sources` 的处理链，新增“脚本操作/Script Operation”。这里是组合订阅的节点 Operator，不是 File。
2. 脚本来源选择“链接/远程脚本”，不要选择“本地脚本正文”。
3. JavaScript URL 填：

   ```text
   https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-operator.js
   ```

4. 在可视化参数编辑器中逐项填写：

   | 参数名 | 参数值 |
   | --- | --- |
   | `output` | `nodes` |
   | `clientChain` | `off` |

   完整参数表示为 `output=nodes&clientChain=off`。如果旧版只有一个脚本链接框，使用 `JS_URL#arg1=value1&arg2=value2` 的形式，即在上述公开 JS URL 后接 `#output=nodes&clientChain=off`；不能使用 `?` 连接参数。
5. “不使用缓存/noCache”关闭；“不验证证书/insecure”关闭。目标平台选择 Shadowrocket。
6. 预览处理后的组合。至少应返回一个节点；节点名称应有统一来源标签，国旗不应重复，日志只能出现聚合计数，不能出现服务器、UUID 或密码。
7. 保存处理链，将组合处理后的私密节点订阅命名为 `shadowrocket-nodes`，建议每 6 小时更新。
8. 复制 Sub-Store 生成的 `<Shadowrocket 节点私密输出 URL>`，只保存在自己的设备中；不要把它粘贴回仓库或文档。

成功标志：Script Operation 预览非空且保存成功，重新打开任务仍能看到规范 JS URL、`output=nodes`、`clientChain=off`，并且 noCache 与 insecure 都是关闭状态。

### 第 3 步：分别创建三个 Profile File

进入 Sub-Store 的“文件/File”页面，按 macOS、iPhone、iPad 的顺序分别新建 File。每个 File 都添加“脚本操作/Script”，选择“链接/远程脚本”，使用同一个 Profile JavaScript URL：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js
```

三个 File 都保持“不使用缓存/noCache”关闭、“不验证证书/insecure”关闭，不粘贴 JavaScript 正文，也不要把 Profile 脚本挂到 `shadowrocket-sources` 的组合处理链。

每个 File 的单条脚本右侧都要勾选“启用”和“预览”。标题“文件操作”旁的开关图标只控制全部展开/收起，不是运行总开关；不要用它判断脚本是否执行。

先填写任务字段：

| File 任务名 | 设备 | 更新间隔 | 预期输出 |
| --- | --- | --- | --- |
| `shadowrocket-config-macos` | Intel Mac | 每天 | Shadowrocket INI Profile |
| `shadowrocket-config-iphone` | iPhone | 每天 | Shadowrocket INI Profile |
| `shadowrocket-config-ipad` | iPad | 每天 | Shadowrocket INI Profile |

再在每个 File 自己的参数编辑器中逐项填写：

| 参数名 | macOS | iPhone | iPad | 说明 |
| --- | --- | --- | --- | --- |
| `output` | `config` | `config` | `config` | 固定值 |
| `type` | `collection` | `collection` | `collection` | 从组合读取 |
| `name` | `shadowrocket-sources` | `shadowrocket-sources` | `shadowrocket-sources` | 必须等于第 1 步组合名 |
| `subscriptionName` | `Shadowrocket-Nodes` | `Shadowrocket-Nodes` | `Shadowrocket-Nodes` | 必须逐字等于客户端节点订阅显示名 |
| `platform` | `macos` | `iphone` | `ipad` | 每个平台不同 |
| `dnsMode` | `stable` | `stable` | `stable` | 稳定 DNS 预设 |
| `chinaDns` | `alidns` | `alidns` | `alidns` | 国内 DNS |
| `globalDns` | `cloudflare` | `cloudflare` | `cloudflare` | 境外 DNS |
| `blockMode` | `balanced` | `balanced` | `balanced` | 平衡拦截 |
| `quicMode` | `proxy-block` | `proxy-block` | `proxy-block` | 代理流量阻止 QUIC |
| `ipv6Mode` | `ipv4-only` | `auto` | `auto` | macOS 与移动端不同 |
| `autoGroupMode` | `auto` | `auto` | `auto` | 自动选择分组规模 |
| `clientChain` | `off` | `off` | `off` | 正式任务关闭客户端链式 |

用于复制核对的三条完整参数如下；不要加引号、前导 `?` 或换行：

- macOS：`output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off`
- iPhone：`output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off`
- iPad：`output=config&type=collection&name=shadowrocket-sources&subscriptionName=Shadowrocket-Nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off`

`Shadowrocket-Nodes` 只是便于首次照填的 ASCII 示例。它必须与稍后添加到 Shadowrocket 的节点订阅显示名完全一致，包括大小写、emoji、空格和标点。如果界面提供参数名/值输入框，直接填写显示名；如果旧版只有单行链接，包含中文、emoji、空格、`&`、`#` 或 `%` 的值必须先进行百分号编码，不能编码分隔参数的 `&` 和 `=`。

逐个点击预览。成功输出应在开头附近出现 `[General]`，后面同时出现 `[Proxy Group]` 和 `[Rule]`，且不能包含真实服务器、密码或 UUID。确认后保存 File，并分别取得 `<macOS Profile 私密输出 URL>`、`<iPhone Profile 私密输出 URL>`、`<iPad Profile 私密输出 URL>`；这些占位符代表你自己的私密输出，不是需要照抄的地址。

成功标志：三个 File 都能独立预览和保存；任务名、平台、IPv6 值正确；重新打开后规范 JS URL、全部参数、每天更新、noCache 关闭和 insecure 关闭都未丢失。

### 第 4 步：复制私密输出并导入对应客户端

1. 先在 Intel Mac 的 Shadowrocket 中进入节点订阅页面，添加 `<Shadowrocket 节点私密输出 URL>`，显示名设为 `Shadowrocket-Nodes`；如果你使用其他显示名，必须先把三个 File 的 `subscriptionName` 同步改成完全相同的文字。手动更新后节点数必须大于 0。
2. 在 Intel Mac 的配置/Profile 页面添加 `<macOS Profile 私密输出 URL>`。不要覆盖旧 Profile；让新旧 Profile 并排保留，再选择新 Profile 做 canary。
3. macOS Profile 通过 [Intel Mac 灰度清单](docs/canary-checklist.md) 后，才在 iPhone 添加同一节点私密输出和 `<iPhone Profile 私密输出 URL>`。
4. iPhone 通过后，最后在 iPad 添加同一节点私密输出和 `<iPad Profile 私密输出 URL>`。
5. 每台设备都保持 HTTPS 解密关闭；任一设备失败立即停止，不继续推广。

成功标志：节点订阅能手动更新，平台 Profile 能显示新的更新时间；`🚀 节点选择`摘要为 `SELECT > PROXY`，策略组和规则存在，旧 Profile 仍可立即选回。

### 第 5 步：升级与回滚

升级时保持任务名、参数和私密输出 URL 不变：

1. 先备份 Sub-Store，并保留每台设备的旧 Profile。
2. 规范 `/current/` JS URL 不变。依次重新预览节点 Operator、macOS File、iPhone File、iPad File；正式任务的 noCache 与 insecure 仍保持关闭。
3. 先只在 Intel Mac 更新并完成 canary，再按 iPhone、iPad 顺序推广。脚本升级不会自动更新客户端中的 Profile，仍需在客户端手动更新。
4. 若升级失败，立即在客户端切回旧 Profile，并在 Sub-Store 恢复备份或把测试任务脚本改回 `<已验证的旧版公开 JS URL>`。不要覆盖旧 File，不要更改任何私密输出 URL。
5. 回滚后再次预览节点与 Profile；确认旧配置恢复联网后才结束处理，并保留失败版本和日期供排查。

回滚成功标志：设备选回旧 Profile 后恢复联网；生产任务名称、参数和私密输出 URL 均保持原样，失败版本没有继续推广到下一台设备。

迁移说明：仓库布局已改为 `clients/shadowrocket/`，但现有 Sub-Store 对象名和已发布 URL 不变。`shadowrocket-sources`、`shadowrocket-nodes`、三个 `shadowrocket-config-*` 及其 URL 都不要重命名；继续按原顺序操作，并保留旧 Profile 作为回滚入口。

## 从 GitHub 同步新版生成器

更新代码不会自动改变你正在使用的 Sub-Store。安全更新顺序如下：

1. 仅当发布说明写明节点 Operator 有变化时，才重新预览组合 `shadowrocket-sources` 中直接引用 `shadowrocket-node-operator.js` 规范 Pages URL 的 Operator；脚本 URL、参数和私密节点 URL 都不改。否则跳过本步。
2. 如果执行了上一步，再预览节点输出，确认数量正常、国旗不重复、名称排序正常；异常就恢复旧脚本，不发布。
3. 重新运行直接引用 `shadowrocket-profile-generator.js` 规范 Pages URL 的 macOS、iPhone、iPad 三个 File；不复制脚本正文，也不因脚本升级改 URL 或参数。只有主动改变 QUIC/IPv6 策略时才按部署手册修改对应 File 参数。
4. 升级已有安装前，逐一核对 macOS、iPhone、iPad 三个 Profile File Operator 的 `subscriptionName`。节点 URL 和节点 Script Operator 无需更换；若旧占位值与 Shadowrocket 当前显示名不一致，就改成该现有显示名，或先在客户端重命名订阅，再重新发布 File 并更新对应 Profile。
5. 先预览 macOS Profile，确认整行是 `🚀 节点选择 = select,PROXY`；16 个常用业务组都有自动/故障转移/地区/具体节点选择，10 个境外组首项为 `🚀 节点选择`，6 个国内组首项为 `DIRECT`；动态组只含与 `subscriptionName` 完全匹配的 `<subscriptionName>,use=true`，AI 洲组仍存在，再发布并只在 Intel Mac 更新测试。
6. Intel Mac 验收通过后，才按 iPhone、iPad 顺序更新。整个过程中保留旧 Profile 作为回滚入口。

本次恢复服务组时，只需重新运行当前平台中直接引用 `shadowrocket-profile-generator.js` 规范 Pages URL 的 File 并更新 Profile；无需修改节点 JS URL、节点组合 Operator 或节点订阅。三个 Profile File 的任务名、脚本 URL、私密 URL和参数保持不动。仓库中的 `clients/shadowrocket/dist/` 与 `clients/shadowrocket/examples/` 已随源码重建并通过校验，节点 Operator 内容未改变；规则的唯一批准变更是用完整 `Advertising` 取代 `AdvertisingLite`，并按官方 Shadowrocket 拆分同时引用 `Advertising.list` 与 `Advertising_Domain.list`。必须在 Shadowrocket 中手动更新或重新导入新 Profile；只更新节点订阅不会改变分组。更新后打开 `🚀 节点选择`，摘要应显示 `SELECT > PROXY`，不能再显示某个国旗或具体节点名。如果仍显示具体节点，说明当前设备还在使用旧 Profile，先停止向其他设备推广并按部署手册核对 Profile 的更新时间。

Shadowrocket 可能保留其他业务分组中仍然有效的旧选择，生成时的首项默认值不会自动覆盖它。逐个查看常用业务组：境外组希望跟随首页时，手动选择第一项 `🚀 节点选择`；国内组希望恢复默认直连时，手动选择第一项 `DIRECT`。如果摘要仍显示具体节点、自动组、故障转移或地区组，业务会继续按该旧选择工作。

完整页面操作与成功标志见[零基础部署手册](docs/deployment.md)，更新后的逐项检查见[Intel Mac 灰度清单](docs/canary-checklist.md)。

## 本地维护者命令

需要 Node.js 22 或更高版本：

```bash
npm ci
npm run verify
npm --workspace @apple-proxy-profiles/shadowrocket run check:rules
```

`npm run verify` 会运行测试、重新构建两个脚本、生成脱敏示例并扫描敏感信息。`npm --workspace @apple-proxy-profiles/shadowrocket run check:rules` 会从仓库根目录联网检查 32 份远程规则；网络受限时它可能失败，这不等于本地代码错误，但首次部署时仍必须等规则检查全部通过。

## 部署入口

- [零基础部署](docs/deployment.md)
- [Intel Mac 灰度清单](docs/canary-checklist.md)
- [日常维护速查](docs/maintenance.md)
- [故障排查与回滚](docs/troubleshooting.md)
- [发布检查](RELEASE_CHECKLIST.md)
