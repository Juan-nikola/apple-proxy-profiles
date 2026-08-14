# Apple 多客户端代理配置系统设计

日期：2026-08-01  
状态：用户已批准完整书面设计，可进入实施

目标仓库：`Juan-nikola/apple-proxy-profiles`（Public）  
目标客户端：最新稳定版 Shadowrocket、Egern、Anywhere；测试版新增能力仅以显式参数试用

## 1. 目标

把现有 `shadowrocket-profile` 升级为一个保留完整 Git 历史的多客户端仓库，为 Shadowrocket、Egern 和 Anywhere 生成长期一致、可验证、可回滚的代理配置。

“一致”按客户端能力分成两级：

- Shadowrocket：保持现有已验证行为与 Sub-Store 对象兼容。
- Egern：策略组名称、层级、候选、默认方向和分流功能尽量与 Shadowrocket 同构。
- Anywhere：不修改 App 源码，以官方支持的节点订阅和 `.arrs` 规则集实现功能等价；无法文件化的绑定和网络设置由零基础手册指导完成。

共同目标包括：

- 中国大陆流量优先直连，境外流量默认代理。
- AI 可使用独立出口。
- 16 个常用业务保持独立分流和切换能力。
- 安全、广告、隐私三层可分别拦截或放行。
- 游戏连接与下载/P2P 默认直连，并限制推荐的代理候选。
- DNS、IPv6、QUIC 和客户端链式代理采用同一组意图和平台默认值。
- 节点凭据与公开代码、规则、日志完全分离。
- Blackmatrix7 规则每天自动转换、验证和原子发布；失败继续使用上一已知良好版本。

## 2. 已确认的决策

- 新建工作目录 `apple-proxy-profiles`，采用单仓库、多客户端目录结构。
- 新仓库从现有 `shadowrocket-profile` Git 历史复制而来，再用迁移提交调整目录；旧文件夹保留作回滚。
- GitHub 所有者为 `Juan-nikola`，仓库为 Public。
- 公开规则与文档发布到 `https://juan-nikola.github.io/apple-proxy-profiles/`，GitHub Raw 仅作备用。
- 仓库整体采用 `GPL-2.0-only`，保留 Blackmatrix7 来源、许可、修改日期和免责声明。
- 复用现有 Sub-Store 来源、标签、组合、Shadowrocket 输出名称和链接；不重命名或删除现有对象。
- 节点每 6 小时更新，平台 Profile 和公共规则每天更新。
- 完整国内基线为 `ChinaMax_Domain + ChinaMax`；广告使用完整 `Advertising`，不用 `AdvertisingLite`。
- 不启用 MITM、HTTPS 解密、根证书、请求重写或正文脚本。
- 不兼容节点按客户端能力过滤，并只输出脱敏原因计数；不伪造协议转换。
- 客户端链式代理默认关闭，通过显式参数开启。
- 最新稳定版是最低基线；测试版独占功能不得成为默认输出。
- 真机灰度严格串行：Intel Mac Egern → iPhone Egern → iPad Egern → iPhone Anywhere → iPad Anywhere。

## 3. 范围与非目标

### 3.1 本期范围

- 一个共享节点、策略、规则、能力和安全核心。
- 三个客户端原生渲染器和独立产物验证器。
- Egern 节点订阅与 macOS、iPhone、iPad 三份完整 Profile。
- Anywhere 兼容节点订阅、完整业务 `.arrs` 规则集、分批导入页和手动设置手册。
- Shadowrocket 现有功能迁移、回归测试和 Sub-Store 兼容入口。
- Blackmatrix7 自动同步、转换、冲突审计、语义测试和 GitHub Pages 发布。
- 脱敏示例、零基础部署、维护、故障排查、灰度与回滚文档。
- Apple TV 目录和平台参数可以预留，但不属于本期产物与真机验收。

### 3.2 非目标

- 不修改、编译或重新分发 Anywhere App 源码。
- 不让 Egern 或 Anywhere 的 UI 外观与 Shadowrocket 完全一致。
- 不在 GitHub 保存真实节点、订阅 URL、Token、密码、UUID、PSK、私钥或证书。
- 不修改或加固 Sub-Store 服务器、反向代理、TLS、认证或网络访问控制。
- 不承诺代理可以改变社交平台显示的评论地区；账号、GPS、手机号、缓存和平台风控仍可能影响结果。
- 不伪造 GPS，不绕过服务条款，不自动让机场承担 P2P。
- 不把测试版独占语法写入默认生产配置。

## 4. 仓库结构与迁移

目标结构如下：

```text
apple-proxy-profiles/
├── shared/
│   ├── nodes/
│   ├── policies/
│   ├── rules/
│   ├── capabilities/
│   ├── diagnostics/
│   └── security/
├── clients/
│   ├── shadowrocket/
│   ├── egern/
│   └── anywhere/
├── automation/
├── public/
├── examples/
├── test/
├── docs/
├── scripts/
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

迁移步骤本身由后续实施计划定义。迁移必须满足：

1. 从现有仓库复制 `.git` 历史到新文件夹，不改写或压缩旧提交。
2. 旧 `shadowrocket-profile` 文件夹原地保留。
3. 用一个独立迁移提交移动 Shadowrocket 文件并建立共享目录。
4. 在迁移前后分别运行现有 `npm run verify`，证明行为没有因目录移动而改变。
5. 新仓库成为唯一后续维护入口后，旧文件夹仍不自动删除。

## 5. 总体架构

系统分为公开规则链路与私密节点链路。

### 5.1 公开规则链路

```text
Blackmatrix7 官方 master 路径
  → GitHub Actions 下载与来源审计
  → 共享规则解析、去重、优先级和冲突编译
  → Shadowrocket / Egern / Anywhere 原生规则产物
  → 跨端语义、安全和链接验证
  → GitHub Pages 原子发布
```

公开链路不需要任何用户秘密。每次发布生成 manifest，记录：

- 发布版本和生成时间。
- 上游仓库、分支、提交或可验证的来源标识。
- 每份输入和输出的 SHA-256。
- 原始、有效、去重、冲突消解、跳过的规则数量。
- 跳过的规则类型和原因计数。
- 三端产物对应关系。

### 5.2 私密节点链路

```text
现有 Sub-Store 来源与组合
  → 共享节点规范化
  → 客户端能力过滤
  → Shadowrocket / Egern / Anywhere 私密节点订阅
  → Shadowrocket / Egern 私密平台 Profile
```

共享代码可以在 Sub-Store 中读取真实节点，但公开产物、日志和诊断只能包含聚合统计。真实节点 URL 和凭据不得跨越私密链路边界。

## 6. 共享节点模型

共享节点核心负责解析 Sub-Store 节点对象并输出不依赖客户端语法的中间模型。每个节点至少携带：

- 稳定身份和显示名。
- 来源类型：机场、自建、Realm、服务端链式、客户端落地或未知。
- 国家/地区与洲分类。
- 原始协议和传输能力。
- UDP、P2P、入口和客户端链式资格。
- 各客户端的支持判定与不支持原因。

处理顺序固定为：

1. 校验必填字段、端口、认证、安全和传输形状。
2. 排除公告、套餐、流量、到期时间和无效伪节点。
3. 用完整规范化配置生成内存指纹，删除完全相同的节点。
4. 识别来源、国旗、地区、UDP 和链式资格。
5. 生成稳定、唯一、可筛选的显示名。
6. 按客户端能力矩阵过滤并渲染。
7. 输出不含服务器或凭据的诊断统计。

显示名继续采用现有形状：

```text
{国旗} {统一来源标签} {原节点名}
```

完全相同节点只保留一个；同名不同配置全部保留，并用稳定短序号消除重名。现有来源标签与大小写兼容规则继续保留。

## 7. 客户端能力与协议过滤

能力判断以客户端当前官方文档和源码可验证行为为准，不以营销简介推断。

- Shadowrocket 继续支持现有生成器允许的节点类型。
- Egern 使用其原生代理 YAML，重点保留 Snell、VLESS/Reality、Hysteria2、Shadowsocks/2022 以及其他已确认支持的类型。
- Anywhere 使用官方订阅解析器可稳定导入的 URI 或 Clash YAML 子集。当前不支持 Snell；部分协议传输组合即使内核存在实现，也只有在订阅解析路径可验证时才进入自动输出。

处理不兼容节点时：

- 不把节点转换成服务器未提供的另一种协议。
- 不把不支持的安全或传输字段静默删除后继续输出。
- 默认跳过单个不兼容节点，不让整个订阅失败。
- 如果过滤后客户端订阅为空，生成失败并保留旧输出。
- 诊断仅报告协议、传输、原因和数量，不报告节点名、服务器、端口或凭据。

## 8. 共享策略模型

共享策略只表达业务意图，不包含任何客户端专用语法。

### 8.1 主组与地区组

- `🚀 节点选择`
- `⚡ 全部自动`
- `🛟 全部故障转移`
- `🌏 亚太`
- `🌍 欧洲`
- `🌎 美洲`
- `🌐 其他/未分类`
- `🏠 自建节点`
- `🏢 机场节点`
- `↪️ Realm 转发`
- `⛓️ 链式代理`
- `🎯 客户端落地`（满足条件且显式开启时）

地区顺序固定为亚太、欧洲、美洲、其他。没有节点的地区不生成可见空组。地区识别继续覆盖 ISO 3166-1 国旗，中东和大洋洲归亚太，俄罗斯归欧洲，美洲包含加勒比，非洲、南极洲和无法确认的节点归其他。

### 8.2 独立业务组

必须保留以下 16 个常用业务组：

- `🐙 GitHub`
- `📺 YouTube`
- `🎬 Netflix`
- `🏰 Disney+`
- `🎵 Spotify`
- `🌍 国际媒体`
- `✈️ Telegram`
- `💬 海外社交`
- `🎶 TikTok`
- `🍎 Apple`
- `🪟 Microsoft`
- `📺 哔哩哔哩`
- `🎵 抖音`
- `📕 小红书`
- `🧣 微博`
- `🕹️ 游戏平台`

前 9 个境外服务和游戏平台默认走 `🚀 节点选择`。Apple、Microsoft 和四个国内平台默认 DIRECT。每个可表达完整结构的客户端还提供自动、故障转移、地区、DIRECT 和具体节点候选。

额外策略包括：

- `🤖 AI 专用`：默认可跟随主线路，但能独立选择具体节点。
- `🎮 游戏连接`：默认 DIRECT，代理候选只推荐明确支持 UDP 的节点。
- `⬇️ 下载/P2P`：默认 DIRECT，代理候选只推荐自建、Realm 和服务端链式节点。
- `🧭 DNS 与规则下载`：默认代理，可切换 DIRECT。

### 8.3 安全和广告层

- `☣️ 安全威胁`
- `🧱 常见广告`
- `🕵️ 严格跟踪`

默认 `balanced` 映射为 REJECT、REJECT、DIRECT。继续支持 `off`、`security`、`balanced`、`strict` 四种初始模式；客户端允许时可在本地即时切换。

## 9. Blackmatrix7 完整增强规则

### 9.1 来源原则

- 只使用 Blackmatrix7 官方仓库和明确的官方路径。
- 国内总表固定为 `ChinaMax_Domain + ChinaMax`。
- 不再叠加 China、ChinaLite、ChinaIPs、Mainland 等重复国内合集。
- 广告使用完整 `Advertising`；只保留能够在不启用 MITM 的条件下生效、且目标客户端能表达的规则类型。
- 安全和隐私继续使用 Hijacking、BlockHttpDNS、Privacy。
- 所有已定义的 AI、开发、媒体、社交、国内平台、游戏和下载规则继续独立加载。

“完整”不表示把 Blackmatrix7 整个仓库无差别合并。互相矛盾、用途不同、需要 MITM 或与目标业务重复的目录不得自动加入。

### 9.2 关键优先级

共享优先级从高到低为：

1. 局域网、保留地址和本地域名直连。
2. 用户自定义拦截、直连、主代理和 AI 纠错。
3. 安全、广告和隐私规则。
4. 具有独立策略的国内平台。
5. AI。
6. GitHub、境外媒体、社交和其他境外业务。
7. Apple、Microsoft。
8. 已确认的国内游戏和 SteamCN 直连纠正。
9. `ChinaMax_Domain`。
10. 游戏平台、游戏连接、下载/P2P。
11. `ChinaMax` 和客户端支持的 CN GeoIP 兜底。
12. 未匹配流量进入主选择。

现有 `perplexity.ai`、`pplx.ai`、`x.ai`、`grok.com`、`poe.com`、`poecdn.net` AI 纠正规则，以及雷霆/吉比特游戏域名纠正规则继续保留。

### 9.3 规则转换约束

规则编译器必须：

- 拒绝 HTML、空文件、非 UTF-8 和明显截断内容。
- 校验规则类型、值、CIDR、正则以及每个源的保守最低数量。
- 规范化域名大小写、尾点、CIDR 和重复项。
- 保存来源到输出的可审计映射。
- 对目标客户端不支持的类型给出计数和原因。
- 不因为单个目标客户端不支持某类型而从其他客户端删除该规则。

## 10. Shadowrocket 设计

Shadowrocket 是行为基线。迁移首先保证现有测试、构建、示例和 Sub-Store 用法不变，再逐步切换到共享模块。

- 现有 `shadowrocket-sources`、节点输出、三份 Profile 输出及其 URL 不改名。
- `🚀 节点选择 = select,PROXY` 的首页跟随语义不变。
- 现有节点规范化、地区、来源、AI、服务组、DNS、IPv6、QUIC 和客户端链式参数保持兼容。
- Profile 最终引用本项目 GitHub Pages 上同一版本的 Shadowrocket 规则快照，从而与 Egern 和 Anywhere 使用同一上游时点。
- 切换规则地址前必须同时保留旧 Profile，并通过完整回归和 Intel Mac 验证。

## 11. Egern 设计

### 11.1 产物

- 一份私密 `egern-nodes` 代理订阅，使用 Egern 原生 `proxies:` YAML。
- `egern-config-macos`、`egern-config-iphone`、`egern-config-ipad` 三份私密 Profile YAML。
- 脱敏结构示例和 Profile 静态验证器。

Egern Profile 通过私密参数引用 `egern-nodes` URL；该 URL 只存在于 Sub-Store File 参数和生成的私密 Profile，不进入代码仓库、示例或日志。

### 11.2 结构等价

Egern 使用原生 `select`、`auto_test`、`fallback`、嵌套策略、`urls`、`filter`、`flatten` 和 `hidden` 复刻 Shadowrocket 的策略结构。

唯一必须明确的结构差异是：Egern 没有 Shadowrocket 内建首页 `PROXY` 的相同入口。Egern 的 `🚀 节点选择` 自身成为主手动选择组，境外业务仍把它作为首项；切换发生在 Egern 策略组页面，分流效果保持一致。

节点、地区、来源、AI、16 个业务组、游戏、P2P、DNS 和广告组名称及候选顺序必须通过结构快照测试。

### 11.3 平台 Profile

- macOS：稳定优先，默认 `ipv6Mode=ipv4-only`。
- iPhone/iPad：默认 `ipv6Mode=auto`，兼容蜂窝 IPv6/NAT64。
- 默认 `quicMode=proxy-block`，只阻止代理侧应用 QUIC，DIRECT QUIC 保持允许。
- 默认 DNS 为国内 AliDNS、境外 Cloudflare；境外 DNS 经代理，避免污染。
- 保留 `stable`、`privacy`、`speed` DNS 模式和提供商参数。
- 客户端链式代理默认关闭；开启时使用 Egern `prev_hop`，并在缺少合法入口时拒绝生成链式副本。

## 12. Anywhere 设计

### 12.1 产物

- 一份私密 `anywhere-nodes` 订阅，输出官方订阅解析器能够稳定导入的兼容节点。
- 每个独立业务和控制层一份公开 `.arrs` 规则集。
- GitHub Pages 上的 Anywhere 导入页，按链接长度分成数个批次调用 `anywhere://add-rule-set`。
- iPhone/iPad 零基础导入、绑定、网络设置、刷新和回滚手册。

不生成 `.amrs`，不启用 MITM。

### 12.2 首次路由映射

`.arrs` 的 `routing` 头按意图生成：

- 境外业务和 AI：`routing = 0`，默认使用 Anywhere 当前全局节点；AI 可在 App 中另绑节点或 Chain。
- 国内平台、国内总表、游戏连接、下载/P2P：`routing = 1`，首次导入即 DIRECT。
- 安全威胁和完整广告：`routing = 2`，首次导入即 REJECT。
- 严格隐私：均衡模式使用 `routing = 1`，需要严格模式时改为 REJECT。

普通境外业务无需逐个绑定即可跟随当前全局节点。只有 AI 独立出口、临时国内平台出口或其他个性化需求需要手动绑定。

这一默认回落行为来自用户提供的 Anywhere 源码：普通自定义规则集未设置专用 assignment 时，路由同步会使用当前全局 Configuration 或 Chain。由于源码内的开发文档对 `Default` 有不同表述，生成器必须把它视为需要验证的客户端契约，而不是永久假设。自动测试覆盖解析和持久化逻辑，首次 iPhone 灰度还必须用一个专用测试域名确认 `routing = 0` 实际跟随全局节点；如果最新稳定版不满足该契约，发布清单标记 Anywhere 为需要逐组手动绑定，部署手册切换到显式绑定流程，不得宣称自动跟随。

### 12.3 规则优先级编译

Shadowrocket 和 Egern 以配置顺序首次命中；Anywhere 同一用户规则层按规则种类和具体程度选择。Anywhere 渲染器必须包含专用优先级编译器：

- 检测完全重复域名、后缀、关键字和 CIDR。
- 检测域名后缀包含、关键字交叉和 CIDR 包含关系。
- 按共享策略优先级从低层删除会错误覆盖高层意图的规则。
- 保留宽泛低层规则中不与高层冲突的覆盖范围。
- 对无法证明无损的交叉关系阻止发布，而不是猜测。
- 用代表性域名和 IP 运行三端语义矩阵，证明最终决策一致。

### 12.4 原生限制

- Anywhere 没有 Egern/Shadowrocket 同构的动态策略组，因此不会展示相同的地区、自动或故障转移层级。
- 游戏与 P2P 规则集默认 DIRECT。用户手动改绑时，App 可以选择任意节点；生成器只能通过节点命名、诊断和手册提示兼容候选，不能强制 UI 过滤。
- DNS、IPv6、QUIC、日志、始终连接和 iCloud 等不能由 `.arrs` 设置的选项，必须逐设备手动配置并验收。
- 订阅解析器不支持或会丢失必要字段的节点必须过滤。

## 13. 网络默认值

共享参数继续支持：

- `dnsMode=stable|privacy|speed`
- `chinaDns=alidns|dnspod|system`
- `globalDns=cloudflare|google|quad9`
- `blockMode=off|security|balanced|strict`
- `quicMode=allow|proxy-block|all-block`
- `ipv6Mode=auto|ipv4-only`
- `autoGroupMode=auto|full|balanced|minimal`
- `clientChain=off|on`

默认值为 stable、AliDNS、Cloudflare、balanced、proxy-block、自动分组、客户端链式关闭。macOS 的 IPv6 默认是 ipv4-only，iPhone/iPad 默认 auto。

如果客户端无法从配置表达某项设置，生成器仍在 manifest 中记录预期值，部署手册把它列为必须手工核对项。

## 14. 自动更新与发布

GitHub Actions 每天执行：

1. 拉取允许清单中的 Blackmatrix7 官方文件。
2. 验证 HTTP 状态、内容类型、编码、格式、更新时间和最低数量。
3. 解析并生成统一规则快照。
4. 为三端转换原生格式并生成 manifest。
5. 运行单元、契约、结构、语义、快照、安全和链接测试。
6. 在临时 Pages artifact 中完成冒烟检查。
7. 全部通过后原子部署 GitHub Pages。

Pages 使用不可变版本目录与两个稳定入口：

- `/versions/<manifest-sha256>/...` 保存每次成功发布的完整产物。
- `/current/...` 指向或复制当前已验证版本。
- `/previous/...` 指向或复制发布前的已知良好版本。

Actions 先在独立 artifact 中构建上述完整目录，再一次性部署整个 Pages artifact。客户端日常订阅只使用 `/current/`；回滚手册使用 `/previous/` 或指定的不可变版本目录，因此不会出现三端只更新了一部分的中间状态。

失败处理：

- 任一步失败均不得覆盖当前 Pages。
- Action 失败摘要只输出公开来源、规则 ID、计数和原因，不输出用户秘密。
- 设备继续使用上一已知良好版本。
- 当前版和上一已知良好版必须有稳定地址和 manifest。
- 修复后重新运行完整流水线，不允许手工只替换单个生产文件而绕过验证。

节点订阅仍由 Sub-Store 每 6 小时更新；节点更新与公共规则发布相互独立。

## 15. 安全与许可证

### 15.1 秘密边界

公开仓库、Pages、Actions 日志、示例、测试快照和文档禁止出现：

- 私密订阅 URL 和管理地址。
- Token、Cookie、Authorization、x-hwid 或类似凭据。
- 节点服务器、端口、密码、UUID、PSK、私钥、证书或二维码。
- 从真实节点派生、可能用于重识别的指纹。

安全扫描至少包括敏感字段模式、URL 参数、UUID、密钥形状、高熵字符串和已知真实值拒绝列表。假节点示例必须使用保留域名、文档地址和无效凭据。

### 15.2 开源义务

- 根许可证为 `GPL-2.0-only`。
- `THIRD_PARTY_NOTICES.md` 记录 Blackmatrix7、esbuild 和其他依赖。
- 转换后的规则标明原作者、原仓库、许可证、抓取时间、源文件和本项目修改日期。
- 不复制 Anywhere 源码、名称、图标或品牌资产到本仓库；源码只作为兼容性研究输入。

## 16. 测试策略

### 16.1 单元与属性测试

- 节点必填字段、协议安全字段和传输组合。
- 指纹去重、稳定命名、来源标签、国旗和洲分类。
- UDP、P2P、入口和客户端链式资格。
- Blackmatrix7 各规则类型解析与规范化。
- 域名后缀、关键字和 CIDR 的包含与冲突消解。
- 选项默认值、未知参数和平台预设。

### 16.2 客户端契约测试

- Shadowrocket INI 段、策略组、规则顺序和内建策略验证。
- Egern YAML 语法、全局唯一名称、策略引用、订阅挂载和三平台结构快照。
- Anywhere Clash/URI 节点订阅兼容性、`.arrs` 语法、规则数量上限和 `routing` 头。
- 不支持协议和传输的固定夹具，证明过滤而非静默降级。

### 16.3 跨端语义测试

维护一组不含秘密的代表性域名、IP、端口和协议场景，断言三端得到相同业务意图：

- 局域网和保留地址。
- 国内普通网站和 ChinaMax 边界。
- AI、GitHub、媒体、社交和国内平台。
- 广告、安全和隐私。
- SteamCN、问道手游、游戏平台和实时 UDP。
- 下载和 PrivateTracker。
- 未识别境外流量和 CN GeoIP 兜底。

### 16.4 在线与安全测试

- 官方规则 URL、状态、大小、类型、数量和关键条目。
- GitHub Pages 当前版、上一良好版、manifest、Content-Type 和深链。
- 构建可重复性：同一输入产生相同哈希。
- 仓库、构建输出和 Git 历史增量敏感信息扫描。

## 17. 部署与真机灰度

### 17.1 Sub-Store

- 保留 `shadowrocket-sources` 和全部现有 Shadowrocket 对象。
- 新增 Egern 节点输出和三份平台 Profile。
- 新增 Anywhere 节点输出。
- 新输出发布前先预览节点数量、协议过滤统计和配置结构。
- 私密 URL 只保存到对应 File 参数和设备。

### 17.2 客户端顺序

1. Shadowrocket 保持当前生产入口并完成迁移回归。
2. Intel Mac 导入 Egern 新配置，完整验收并稳定使用。
3. iPhone 导入 Egern。
4. iPad 导入 Egern。
5. iPhone 导入 Anywhere 节点订阅和分批 `.arrs`。
6. iPad 导入 Anywhere。

每一步都保留旧配置，实际切回一次再切回新配置。任一关键网络、DNS、局域网或规则问题出现时立即回滚，不同时修改多个平台或参数。

### 17.3 真机验收场景

- 中国网站、境外网站、AI、GitHub、流媒体和社交服务。
- 抖音首页、视频、图片和评论。
- 问道手游登录、换线、战斗和资源加载；iPhone 同时测试 Wi-Fi 与蜂窝网络。
- 路由器、NAS、打印机、Bonjour、AirPlay、HomeKit 和 `.local`。
- DNS 污染防护、国内/境外解析方向和无循环引导。
- iPhone/iPad IPv6、NAT64；macOS IPv4 稳定基线。
- 代理侧 QUIC 回落、DIRECT QUIC、UDP 游戏和不支持 UDP 的节点行为。
- macOS 休眠唤醒、Wi-Fi 切换和长时间连接。
- AI 独立出口、国内平台临时改绑、广告三层切换。
- 节点和规则手动刷新、自动刷新、旧配置回滚。

## 18. 完成标准

只有同时满足以下条件，项目才算实现完成：

- 新目录保留现有 Git 历史，旧项目文件夹未被删除。
- Shadowrocket 全部旧测试与新跨端测试通过，现有 Sub-Store 对象无需改名。
- Egern 三个平台 Profile 结构完整，策略引用无悬空、节点名无冲突、默认顺序符合设计。
- Anywhere 能分批导入全部公开规则集，首次默认路由正确，订阅刷新保留本地绑定。
- ChinaMax_Domain、ChinaMax、完整 Advertising、安全、隐私及所有既定业务规则都有来源、数量、哈希和转换诊断。
- GitHub Actions 在成功时原子发布，在模拟上游异常、规则骤减、语法错误或敏感信息时拒绝发布。
- GitHub Pages 当前版、上一良好版、manifest、文档和 Anywhere 导入页可访问。
- 公开仓库和产物通过敏感信息扫描。
- 零基础部署、维护、故障排查、真机灰度和回滚文档可由非开发者逐项执行。
- 指定顺序的真机灰度全部通过，且旧配置仍可回滚。

## 19. 设计依据

- Egern 官方完整 Profile、代理、策略组、规则、DNS 和 URL Scheme 文档。
- Anywhere 用户提供的源码快照，重点核对订阅解析、`.arrs` 导入、规则匹配、路由分配和本地持久化实现。
- Blackmatrix7 官方 `ios_rule_script` master 目录、ChinaMax 说明和 GPL v2 许可证。
- 现有 `shadowrocket-profile` 源码、测试、部署文档、维护记录和 Git 历史。

实现阶段如官方稳定版行为与本设计引用的测试版或源码快照不同，以最新稳定版可验证行为为最低兼容基线；差异必须通过能力矩阵和显式诊断处理，不能静默改变策略意图。
