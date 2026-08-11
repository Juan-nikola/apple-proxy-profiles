# OneXray 原生 Profile 完美分流设计

## 目标

在不修改或 fork OneXray 客户端的前提下，把官方 OneXray 加入本项目。设计覆盖 macOS、iPhone、iPad、Android、Windows 和 Linux，先在 macOS 与 iPhone 完成真机 canary，再逐个平台推进。

OneXray 的实际流量决策必须尽量与 Shadowrocket、Surge、Egern 和 sing-box 一致：国内与局域网直连，明确海外服务使用代理 DNS 和代理出口，业务规则按共享顺序匹配，安全规则按共享参数处理，最终未匹配流量跟随首页当前主节点。

OneXray 不提供 Surge、Shadowrocket、Egern 或 sing-box 式的可交互业务策略组。本设计不伪造该能力。用户在 OneXray 首页随时切换主节点；每个业务在私密 Sub-Store 参数中配置为 `FOLLOW`、`DIRECT` 或固定节点。固定节点运行时失效时不自动回退、不通知，由用户查看 OneXray/Xray 日志后人工修复。

## 已确认的产品决策

- 使用 OneXray 原生 Xray Profile，不使用完整 Raw JSON 作为主方案。
- 首页当前节点保持可随时切换；所有 `FOLLOW` 业务随首页主节点一起切换。
- 少数业务可以写死到固定节点；固定节点不随首页切换。
- 不提供应急 Profile、自动故障回退或节点故障通知。
- 固定节点在生成时缺失、重名、改名或协议不兼容时拒绝生成，不静默降级为 `FOLLOW`。
- 设计覆盖 OneXray 的六个平台，但只在逐平台完成 canary 后声明对应平台可用。
- 全局客户端链保留为可选能力，默认关闭。
- 固定节点凭据只进入私密 Profile，不进入公开 Pages、Manifest、fixture 或日志。
- Profile 使用版本化名称；导入新版本后保留上一版用于人工回滚。

## 范围

### 包含

- 官方 OneXray 稳定版，不维护客户端 fork。
- 一个跨六平台复用的 Xray Profile。
- 一个可自动刷新的私密 OneXray 节点订阅。
- 一个私密 OneXray Profile 深链任务。
- 一个私密中文路由审计任务。
- `FOLLOW`、`DIRECT` 和按完整节点名固定出口。
- 与现有客户端共享的路由顺序、DNS 意图、安全边界和参数语义。
- OneXray 专用 Xray `geosite`/`geoip` 资产、发布清单和回滚通道。
- 可选的 OneXray 全局 Final Outbound 客户端链。
- 版本化 Profile 导入、上一版 Profile 回滚和 `previous` 规则回滚。

### 不包含

- OneXray 界面中的业务策略组或独立业务组切换控件。
- 固定节点的运行时自动回退、自动恢复或推送通知。
- 应急 Profile。
- OneXray Profile 同名自动覆盖；官方客户端当前只会新增记录。
- Profile 或固定节点快照的自动远程刷新。
- Snell、SSR、TUIC、AnyTLS、WireGuard、SSH 等未通过 OneXray 官方模型验证的协议。
- OpenWrt 或 Apple TV；OpenWrt 继续使用 sing-box。
- MITM、HTTPS 解密、证书安装、脚本重写或请求修改。

## 审计基线与客户端约束

设计以 OneXray 官方仓库提交 `a7415277f3c9fb6a6af3ef29101517fac731d029`（OneXray 26.8.3 准备提交）和同日官方文档为审计基线。实现前必须把该提交和已验证版本记录到 `clients/onexray/UPSTREAM_COMPATIBILITY.md`；OneXray 升级时重新审计并运行兼容测试。

已确认的 OneXray 运行时约束：

- 首页 Outbound 节点在 Rule 模式下成为运行时 `proxy`。
- Xray Profile 提供 DNS、路由、FakeDNS、系统出站、自定义出站和运行时入站基础。
- OneXray 会接管 TUN 与 `pingIn` 入站、随机端口、GeoData 路径、移动端 TUN 文件描述符、Windows/Linux 路由字段、日志路径和可选 metrics。
- OneXray 会根据设备 TUN IPv6 开关重写全局和 DNS server 的 `queryStrategy`。
- Profile 可以包含自定义 outbound，路由规则可以指向这些自定义 tag。
- Profile 的结构化路由模型不包含 Xray balancer 或 observatory，因此标准 Profile 不能实现固定节点自动回退。
- 普通 HTTPS 订阅只导入 outbound 节点，不会创建 Profile、DNS、路由、GeoData 或完整配置。
- `onexray://onexray.com/config/add?type=profile&data=...` 可以导入 Profile，但同名导入会新增记录而不是覆盖旧记录。
- 节点订阅和 GeoData 可以自动刷新；正在运行的 VPN 保持启动时的 Final Config，刷新后需重启连接才生效。
- macOS System Extension 模式可能强制关闭 Xray access/error 文件日志；此时依赖 OneXray 状态、Ping 和客户端可见错误诊断。

## 总体架构

新增独立的 OneXray 适配层。适配层只消费共享节点、策略和规则模型，不读取 Shadowrocket、Surge、Egern、Anywhere、sing-box 或 Happ 的最终产物。

```text
apple-proxy-sources
        ↓
共享节点规范化
        ↓
OneXray 协议与字段能力过滤
        ├─ 不兼容节点 → 排除并写入私密审计
        └─ 兼容节点   → OneXray outbound renderer
        ↓
┌──────────────────────────────────────────┐
│ 私密 onexray-nodes                       │
│ 首页主节点 HTTPS 订阅                    │
├──────────────────────────────────────────┤
│ 私密 onexray-profile                     │
│ DNS、路由、固定业务节点、全局链           │
├──────────────────────────────────────────┤
│ 私密 onexray-routing-audit               │
│ 中文业务目标与节点解析报告                │
├──────────────────────────────────────────┤
│ 公开 AppleProxySite/AppleProxyIP GeoData │
│ current、previous、edge                  │
└──────────────────────────────────────────┘
        ↓
OneXray Rule 模式
```

### 模块边界

OneXray 客户端目录按单一职责拆分：

- 节点能力模块：声明 OneXray 协议、传输、安全和字段边界。
- outbound renderer：把一个通过能力检查的规范化节点转换成 Xray outbound。
- 订阅 renderer：生成只含首页可选 outbound 的 Xray JSON HTTPS 订阅。
- 业务目标模块：解析 `policyOverrides`、中文别名和固定节点引用。
- Profile renderer：组合 OneXray Profile、系统出站、自定义固定出站和版本信息。
- 路由 renderer：把共享路由计划映射为 Xray `routing.rules`。
- DNS renderer：把共享 DNS 意图映射为 Xray DNS server 与 DNS 路由规则。
- GeoData builder：从固定共享规则快照编译 Xray domain/IP `.dat`。
- 审计 renderer：输出不含凭据的中文私密报告。
- Sub-Store entries：只负责参数解析、读取私密 collection 和调用上述纯模块。

模块不得在不同入口复制节点转换、策略解析或规则排序逻辑。

## 私密输出与 Sub-Store 任务

新增三个私密 File 任务，当前 17 个任务增加到 20 个：

| 任务 | 输出 | 更新模型 |
| --- | --- | --- |
| `onexray-nodes` | Xray JSON outbound HTTPS 订阅 | OneXray 自动或手动刷新 |
| `onexray-profile` | 版本化 `onexray://...type=profile` 深链 | 策略或固定节点变化时人工重导 |
| `onexray-routing-audit` | 脱敏中文 JSON/文本报告 | 与 Profile 使用同一参数生成 |

`onexray-nodes` 输出标准 Xray JSON 文档，顶层只包含用于订阅解析的 outbound 列表。每个 outbound 的 tag 使用规范化完整节点名。OneXray 导入后只保存有效 outbound，不把订阅内容当成 Full Config、Raw JSON 或 Profile。

`onexray-profile` 的深链内嵌 Profile Base64 数据，包含被固定业务实际引用的节点凭据。深链、File 输出 URL 和完整任务参数均为私密信息。

`onexray-routing-audit` 与 Profile 必须读取完全相同的 `policyOverrides`、DNS、安全、QUIC、IPv6 和链参数，防止审计与实际配置不一致。

## 六平台复用模型

macOS、iPhone、iPad、Android、Windows 和 Linux 共用同一个节点任务和同一个 Profile。平台差异由 OneXray TUN Settings 与原生运行时接管：

- iOS/iPadOS/macOS：VPN/TUN、On Demand、Apple 隧道策略和可选 DNS over TLS。
- Android：VPN/TUN 与可选 Per-App VPN。
- Windows/Linux：TUN 网关、系统路由、DNS、外联网卡和防回环。

Profile 不伪造这些平台设置。部署文档为六个平台分别给出本地设置核对表。`ipv6Mode` 必须与设备设置一致：

- `ipv6Mode=ipv4-only`：OneXray TUN Settings 关闭 IPv6。
- `ipv6Mode=auto`：允许设备启用 IPv6，Profile 接受 OneXray 写入的 `UseIP`。

平台设置不一致属于部署失败，不在 renderer 中通过未经审计的字段覆盖 OneXray 运行时。

## 首页主节点与运行时组合

用户从 `onexray-nodes` 订阅中选择任意兼容主节点。Rule 模式启动时：

```text
首页当前节点 → runtime proxy
FOLLOW       → proxy
FIXED        → ap-fixed-<stable-id>
DIRECT       → direct
安全阻止     → block
DNS          → dnsOut / direct / proxy
```

首页切换主节点后，所有 `FOLLOW` 业务和最终兜底一起切换；固定业务、直连业务和安全阻止保持不变。正在运行时切换节点由 OneXray 重启 Core 并重新组合 Final Config。

Profile 只嵌入被业务实际引用的唯一固定节点，不复制全部订阅节点。多个业务引用同一固定节点时复用一个 outbound。固定 outbound tag 由规范化节点身份的稳定哈希生成，不含可读凭据，并避开 `proxy`、`chainProxy`、`direct`、`fragment`、`block`、`dnsOut`、`tunIn` 和 `pingIn` 等保留 tag。

## 业务目标契约

OneXray 与 Happ 共享同一套业务 ID、中文名称、别名和 `policyOverrides` Base64URL JSON 语义。

| 内部 ID | 主要中文名称 | 默认目标 |
| --- | --- | --- |
| `ai` | `🤖 AI 专用` | `FOLLOW` |
| `github` | `🐙 GitHub` | `FOLLOW` |
| `youtube` | `📺 YouTube` | `FOLLOW` |
| `globalMedia` | `🎬 海外流媒体` | `FOLLOW` |
| `globalSocial` | `💬 海外社交` | `FOLLOW` |
| `apple` | `🍎 Apple` | `DIRECT` |
| `microsoft` | `🪟 Microsoft` | `DIRECT` |
| `domestic` | `🇨🇳 国内平台` | `DIRECT` |
| `overseasGame` | `🌍 海外游戏` | `FOLLOW` |
| `download` | `⬇️ 下载/P2P` | `DIRECT` |
| `dnsAndRules` | `🧭 DNS 与规则下载` | `FOLLOW` |
| `final` | `最终兜底` | `FOLLOW` |

普通业务只接受：

- `FOLLOW`：跟随 OneXray 首页当前主节点。
- `DIRECT`：直连。
- `NODE:<规范化后的完整节点名>`：固定到唯一兼容节点。

目标关键字大小写不敏感，输出与文档统一显示大写。节点名保留原始 Unicode，只应用项目既有规范化，不做模糊匹配、子串匹配或大小写折叠。

生成器识别带图标完整中文名、规定的无图标中文短名和稳定英文 ID。同一业务通过多个别名重复配置且值一致时合并；值冲突时拒绝生成。

示例：

```json
{
  "🤖 AI 专用": "NODE:🇺🇸 Los Angeles｜自建·U",
  "📺 YouTube": "NODE:🇯🇵 Tokyo｜自建·U",
  "🎬 海外流媒体": "FOLLOW",
  "🍎 Apple": "DIRECT",
  "最终兜底": "FOLLOW"
}
```

`policyOverrides` 是编码而不是加密。完整任务 URL 和编码值按私密凭据处理。

## 固定节点解析与失败语义

固定节点在 OneXray 能力过滤之后按规范化完整名称解析：

- 恰好一个兼容匹配：生成固定 outbound。
- 没有匹配：拒绝生成。
- 多个匹配：拒绝生成。
- 只匹配到 Snell 或其他不兼容协议：拒绝生成。
- 名称变化导致旧名称失配：拒绝生成。

拒绝时错误必须指出中文业务名、规范化目标名和脱敏原因，但不得输出密码、UUID、密钥或订阅 URL。生成器不得把失效固定目标改为 `FOLLOW`，避免业务出口静默变化。

运行时固定节点不可达时：

- 对应业务连接失败；
- 规则和 Profile 不改变；
- 不自动回退、不自动恢复、不推送通知；
- 其他 `FOLLOW`、`DIRECT` 和其他固定业务不受影响；
- 用户通过 OneXray 状态、Ping、Xray 日志或业务错误人工诊断。

## 全局客户端链

`clientChain=off` 为默认。启用时必须同时提供：

```text
clientChain=on
clientChainTarget=NODE:<规范化后的完整落地节点名>
```

链目标必须在 OneXray 能力过滤后唯一匹配、标记为 landing，且不存在已有上游链。启用链时：

- `onexray-nodes` 只发布符合共享 entry 条件的首页主节点；
- 首页当前主节点成为 OneXray `chainProxy` 入口；
- `clientChainTarget` 作为 Profile Final Outbound，在运行时成为 `proxy` 最终出口；
- 所有 `FOLLOW` 业务经过该全局链；
- 固定业务 outbound 直接连接，不叠加全局链；
- `DIRECT` 与 `block` 不进入链。

缺少兼容 entry、链目标缺失/重名/不兼容、链目标已有其他链或 tag 引用无效时拒绝生成。第一版不支持不同业务使用不同客户端链。

## 安全策略

`blockMode` 沿用共享语义：

| 模式 | 安全威胁 | 常见广告 | 严格跟踪 |
| --- | --- | --- | --- |
| `off` | `DIRECT` | `DIRECT` | `DIRECT` |
| `security` | `BLOCK` | `DIRECT` | `DIRECT` |
| `balanced` | `BLOCK` | `BLOCK` | `DIRECT` |
| `strict` | `BLOCK` | `BLOCK` | `BLOCK` |

安全目标只能映射到 OneXray `block` 或 `direct`，不能被 `policyOverrides` 指向首页或固定代理节点。

## 路由计划

OneXray 必需的系统 DNS 与 Ping 规则位于 Profile 前部，只处理内部流量。普通用户流量随后严格按共享计划匹配：

```text
OneXray system DNS / ping
→ local
→ security
→ custom
→ domesticCore
→ domesticGame
→ explicitOverseas
→ overseasGame
→ ChinaTLD
→ resolved ChinaIP
→ final
```

语义如下：

- 局域网域名、localhost、私有 IPv4/IPv6 优先 `DIRECT`。
- 安全威胁、广告和严格跟踪按 `blockMode` 处理。
- 共享自定义规则位于国内/海外大规则之前。
- 国内核心、国内游戏、中国域名后缀和解析后的中国 IP 默认 `DIRECT`。
- AI、GitHub、YouTube、海外流媒体、海外社交等进入对应业务目标。
- 海外游戏进入 `🌍 海外游戏` 目标。
- 最终未匹配流量进入 `最终兜底`。

`quicMode` 映射：

- `allow`：不增加 QUIC 阻止规则。
- `proxy-block`：只阻止应走代理的 UDP/443 QUIC，避免绕过代理策略。
- `all-block`：所有 UDP/443 QUIC 指向 `block`。

QUIC 规则必须位于会被其保护的业务规则之前，同时不得误阻止项目明确允许的国内 UDP 流量。具体顺序通过共享路由 plan 和跨客户端 fixture 固定。

## OneXray GeoData

OneXray 不读取 sing-box `.srs`。构建系统从同一固定共享规则快照编译两类标准 Xray `.dat`：

- `AppleProxySite<Channel>.dat`：域名规则与稳定分类标签。
- `AppleProxyIP<Channel>.dat`：IP/CIDR 规则与稳定分类标签。

通道对应独立的 OneXray GeoData 名称和 URL：

- `AppleProxySiteCurrent` / `AppleProxyIPCurrent`
- `AppleProxySitePrevious` / `AppleProxyIPPrevious`
- `AppleProxySiteEdge` / `AppleProxyIPEdge`

Profile 通过 `ext:<Name>.dat:<stable-code>` 引用对应通道。分类 code 来自稳定内部 ID，不使用易变显示名称。标签删除或重命名属于破坏性 schema 变更，必须发布新版 Profile 并完成 canary。

构建清单记录源提交、输入哈希、分类计数、规则计数、输出哈希和 Profile schema。`edge` 只有在 `.dat` 结构、全部引用标签、Xray 配置和清单原子一致后才能推进到 `current`。

OneXray 分别刷新 domain 与 IP GeoData，客户端侧不提供跨文件原子事务。设计通过稳定标签和相邻版本兼容保证短暂的新旧组合仍可解析；任何需要同时改变标签语义的版本都必须先发布兼容 Profile，再在后续发布移除旧标签。

完整大型广告库继续作为可选资产，不进入默认移动端 Profile，避免 iOS/iPadOS 内存压力。

## DNS 设计

DNS 保留项目现有意图：

- 国内与未知域名优先使用中国 DNS。
- 明确海外服务使用代理侧 DNS。
- 中国 DNS 查询走 `direct`。
- 海外 DNS 查询走运行时 `proxy`；启用客户端链时自然经过全局链。
- TUN 内 UDP/TCP 53 由 OneXray `dnsOut` 劫持。
- DNS server 使用独立 tag，路由规则按 tag 发送到 `direct` 或 `proxy`。
- 防止 DNS outbound、DoH/DoT 连接和 Xray 自身流量重新进入 TUN。
- `domainStrategy=IPIfNonMatch`；域名规则未命中时允许解析 IP，再执行 ChinaIP 判断。
- DNS 与规则资产下载进入 `🧭 DNS 与规则下载` 目标。

保留参数：

```text
dnsMode=stable|privacy|speed
chinaDns=alidns|dnspod|system
globalDns=cloudflare|google|quad9
blockMode=balanced|security|strict|off
quicMode=allow|proxy-block|all-block
ipv6Mode=auto|ipv4-only
clientChain=off|on
clientChainTarget=NODE:<name>
policyOverrides=<Base64URL JSON>
channel=edge|current|previous
```

DNS provider 名称和模式复用共享定义，OneXray renderer 只负责转换为 Xray DNS server 结构，不复制 provider 选择逻辑。

OneXray 会根据设备 IPv6 开关重写 DNS `queryStrategy`，因此 renderer 接受该运行时所有权，不试图保留相冲突的 per-server 值。部署文档必须要求设备 TUN IPv6 设置与 `ipv6Mode` 一致。

## 协议能力边界

初始 OneXray 协议集合只包含官方结构化 outbound 模型和真机导入验证共同支持的协议：

- VLESS，包括经过测试的 TLS、REALITY 与受支持传输。
- VMess。
- Shadowsocks。
- Trojan。
- SOCKS。
- HTTP。
- Hysteria2，对应 OneXray/Xray 的 Hysteria outbound 模型。

每个协议还必须通过字段级能力检查；协议名称受支持不代表任意传输、TLS、ECH、mux、socket option 或别名组合都受支持。能力模块应返回稳定排除原因，例如 `unsupported-onexray-protocol`、`unsupported-onexray-transport`、`incomplete-onexray-reality`。

Snell 以及未列出的协议默认排除。不能用 Raw JSON 理论兼容性扩大节点订阅或 Profile 的结构化能力范围。

## Profile 命名与内容哈希

OneXray 同名深链导入会新增记录。Profile 名称固定为：

```text
Apple Proxy · OneXray · <channel> · <8位小写十六进制>
```

短哈希取完整规范化 Profile JSON SHA-256 的前 8 位。私密审计记录完整 SHA-256。Profile 内容变化，包括固定节点凭据变化，必须产生新名称。

深链编码后长度必须受测试预算约束。实现以 32 KiB 为首个硬上限；自动测试和六平台 canary 记录实际长度。超过上限时拒绝生成，并要求减少固定节点数量或缩小 Profile，而不是输出可能无法导入的链接。私密 Profile 不生成二维码，避免 QR 容量和旁观泄密问题。

## 公开导入页与首次安装

公开 Pages 提供：

- OneXray 安装与六平台设置说明。
- `current` 与 `previous` GeoData 深链。
- 独立 `edge` canary GeoData 页面。
- 规则清单、哈希、兼容 OneXray 版本和回滚说明。

公开页面不得请求、接收、解析或保存私密节点订阅 URL、`policyOverrides` 或 Profile 深链。

首次安装顺序：

1. 从公开 Pages 安装 `current` 与 `previous` GeoData。
2. 在 OneXray 添加 `onexray-nodes` 私密 HTTPS 订阅。
3. 从私密 `onexray-profile` File 输出复制或打开深链。
4. 选择新 Profile。
5. 把首页模式设为 Rule。
6. 在首页选择任意主节点。
7. 按平台 canary 检查 DNS、路由、出口和回滚。

## 更新与回滚

### 节点更新

OneXray 可以按其支持的周期自动刷新节点订阅，也可以手动刷新。刷新事务替换订阅节点，但正在运行的 VPN 保持旧 Final Config，重启连接后才使用新节点数据。

固定节点是 Profile 内的快照。即使节点订阅中存在同名节点，订阅刷新也不会更新 Profile 中的固定 outbound。固定节点地址、端口、UUID、密码、TLS/REALITY 参数或名称变化时必须重建并重导 Profile。

### Profile 更新

1. Sub-Store 生成新哈希 Profile。
2. 用户导入新深链；OneXray 新增记录。
3. 用户选择新 Profile 并重启连接。
4. 验证正常后保留上一版 Profile。
5. 用户手动删除更旧版本。

### 回滚

- Profile 或固定节点问题：切回上一版已验证 Profile。
- 公开规则问题：切换到引用 `Previous` GeoData 名称的 previous Profile。
- edge canary 问题：切回 current Profile 和 current GeoData。
- 节点订阅问题：恢复 Sub-Store 上一份可用输出或保留的旧订阅记录。

旧 Profile 只有在对应 GeoData 名称仍已安装时才构成完整回滚。文档不得把“保留上一版 Profile”描述为自动保存其依赖资产。

## 生成时审计

`onexray-routing-audit` 至少包含：

- OneXray 兼容与排除节点总数。
- 按协议统计的接受与排除数量。
- 稳定排除原因计数。
- 每个中文业务的配置目标。
- `FOLLOW`、`DIRECT` 或解析后的固定节点名。
- 固定节点协议、唯一性和能力检查结果。
- 全局链状态、entry 订阅范围和落地节点。
- DNS mode/provider、IPv6、QUIC、blockMode 摘要。
- Profile 完整内容哈希、短版本、规则发布 ID 和 GeoData 哈希。
- 深链编码长度与 32 KiB 预算状态。

审计不得包含密码、UUID、PSK、私钥、公钥材料、订阅 URL、完整深链或其他凭据。

## 失败策略

以下情况拒绝生成节点订阅或 Profile：

- 没有任何 OneXray 兼容首页节点。
- `policyOverrides` Base64URL 或 JSON 无效。
- 出现未知业务键、非法目标或别名冲突。
- 固定节点缺失、重名、改名或协议/字段不兼容。
- `clientChain=on` 但 entry 集合或落地节点无效。
- Xray outbound、DNS、路由 tag 或系统保留 tag 冲突。
- Profile 引用不存在的 GeoData 名称或分类 code。
- `.dat` 清单、哈希、规则计数或 schema 不一致。
- Profile 无法通过规范化、OneXray 模型兼容检查或 Xray 配置测试。
- Profile 深链超过 32 KiB。
- 私密审计出现被禁止的秘密字段。
- 公开构建产物命中秘密扫描。

普通节点中存在部分不兼容节点不会让整个任务失败；这些节点被排除并计入审计。只有没有兼容主节点，或被固定业务/链目标明确引用的不兼容节点，才拒绝生成。

## 安全边界

- 真实订阅 URL、节点、UUID、密码、密钥和私密 Profile 只存在于私密 Sub-Store、私密输出和用户设备。
- `policyOverrides` Base64URL 不是加密，完整参数必须私密保存。
- 公开 GeoData 只含公开规则，不含节点或业务私密选择。
- Profile 短哈希和完整哈希只出现在私密输出或本地 OneXray 名称中。
- OneXray 备份 ZIP 未加密，必须作为敏感文件保存。
- `Allow Insecure` 默认关闭；生成器不为导入成功而降低 TLS 验证。
- 不生成 MITM、HTTPS 解密、证书、rewrite 或脚本执行配置。

## 自动测试

### 节点层

- 共享规范化后再执行 OneXray 能力过滤。
- 每种允许协议和关键传输至少有一个通过 fixture。
- VLESS REALITY、TLS、WebSocket、gRPC、XHTTP 等字段按实际支持范围测试。
- Snell 和未支持协议产生稳定排除原因。
- Xray JSON 订阅只包含合法 outbound 和规范化名称。

### 策略层

- 中文名、短名和英文 ID 解析一致。
- `FOLLOW`、`DIRECT`、`NODE:` 目标严格校验。
- 固定节点缺失、重名、改名和不兼容均拒绝生成。
- 多业务相同固定节点只生成一个 outbound。
- 安全业务不能被覆盖到代理。
- `clientChain` entry、landing 和固定业务隔离语义正确。

### Profile 层

- OneXray Profile JSON 只使用审计模型支持的字段。
- 保留 tag 唯一且引用闭合。
- 首页 runtime `proxy` 不与固定 tag 冲突。
- Profile 深链编码后可被独立解析器逐字节还原。
- Profile 名称哈希对规范化内容稳定，对凭据或策略变化敏感。
- 32 KiB 大小预算有边界测试。

### 路由与 DNS 层

- 路由顺序与共享 plan 一致。
- 国内、局域网、明确海外、海外游戏、ChinaTLD、ChinaIP 和 final fixture 与其他客户端结果一致。
- 中国 DNS 走 direct，海外 DNS 走 proxy，DNS 不回环。
- `ipv6Mode`、`quicMode` 和 `blockMode` 全组合覆盖关键边界。
- OneXray 系统 DNS/Ping 规则不会抢占普通业务流量。

### GeoData 与发布层

- 分类标签、规则计数、输入提交和输出哈希可复现。
- 所有 Profile 引用的 code 在对应 domain/IP `.dat` 中存在。
- current、previous 和 edge 名称互不混淆。
- 相邻版本保留标签兼容性。
- Frontier Manifest、发布推进、回滚和秘密扫描通过。

### 兼容性与安全层

- 固定 OneXray 上游提交和已验证版本。
- 记录 OneXray 对 TUN、DNS queryStrategy、日志、metrics 和系统出站的运行时重写。
- 普通 HTTPS 订阅不能被误当成 Profile。
- 同名 Profile 导入新增记录的行为有文档回归测试。
- 所有公开 fixture 脱敏，构建产物执行秘密扫描。

## 真机 canary

推进顺序：

```text
macOS → iPhone → iPad → Android → Windows → Linux
```

每个平台必须验证：

- GeoData 深链导入和自动更新。
- 私密节点订阅导入、手动/自动刷新和首页切换。
- 主节点变化后所有 `FOLLOW` 业务一起换出口。
- 固定业务保持固定出口。
- 固定节点故障时不回退，客户端可见错误或日志足以定位。
- 国内网站、局域网设备和中国 IP 直连。
- AI、GitHub、YouTube、海外流媒体、海外社交和海外游戏规则命中。
- 安全威胁、广告和严格跟踪模式。
- 中国与海外 DNS 出口、端口 53 劫持和无明显 DNS 泄漏/回环。
- `ipv4-only` 与 `auto`。
- QUIC 三种模式。
- 可选全局客户端链。
- 新版本 Profile 导入、选择、重启和上一版 Profile 回滚。
- previous GeoData 规则回滚。
- Wi-Fi/蜂窝或网卡切换、App 重启和系统重启后的恢复。

macOS 和 iPhone 未通过前，OneXray 不得从 `edge` 推进到 `current`。其他平台逐个平台记录验收，不因 Apple 平台通过而自动宣称全部六平台完成。

## 发布与完成标准

OneXray 适配只有同时满足以下条件才可描述为生产可用：

- 自动测试、Xray 配置验证、规则构建和秘密扫描全部通过。
- `onexray-nodes` 能被官方 OneXray 刷新并生成非空兼容节点列表。
- 私密 Profile 深链能被官方 OneXray 导入并选择。
- Mac 与 iPhone 完成完整 canary 和真实回滚。
- current GeoData 与 Profile Manifest 一致。
- 文档明确业务组 UI、自动回退、通知、Profile 自动覆盖和不支持协议的边界。

验收目标是流量决策、DNS、安全规则、业务出口和回滚行为尽量与 Shadowrocket、Surge、Egern、sing-box 一致。业务组 UI 不属于等价目标。
