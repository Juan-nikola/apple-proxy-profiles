# Happ 第六客户端无感分流设计

## 目标

在不修改 Happ 客户端的前提下，把官方 Happ 加入本项目，成为第六个客户端。支持 macOS、iPhone、iPad、Android、Windows 和 Linux。

Happ 的默认流量决策必须与现有客户端保持一致：国内与局域网直连，明确海外服务走代理 DNS 和代理出口，业务规则按共享顺序匹配，固定节点故障时自动回退，最终未匹配流量按用户配置处理。

Happ 官方界面不提供 Surge、sing-box、Egern 式的多个可交互业务策略组。本设计不伪造该能力。业务出口通过私密 Sub-Store 任务参数配置；Happ 首页的服务器选择控制所有 `FOLLOW` 业务。

## 范围

### 包含

- 官方 Happ 稳定版，不维护客户端 fork。
- 六个平台的 Xray JSON 数组订阅。
- 中文业务目标配置。
- `DIRECT`、`FOLLOW` 和按完整节点名固定出口。
- 固定节点运行时健康观测、自动回退与恢复。
- 与现有客户端共享的规则顺序、DNS 意图和安全边界。
- Happ 专用 Xray `geosite.dat`、`geoip.dat`、发布清单和回滚通道。
- 私密中文审计报告和 Happ 服务器说明中的配置告警。

### 不包含

- Happ 界面内的业务策略组或独立业务组切换控件。
- Snell 支持。Snell 对 Happ 显式过滤，其他客户端不受影响。
- OpenWrt。Happ 只覆盖终端平台，OpenWrt 继续使用 sing-box。
- MITM、HTTPS 解密、证书安装、脚本重写或请求修改。
- 静态订阅主动发送运行时推送通知。

## 约束与事实

Happ 使用 Xray core。Xray JSON 数组中的每个对象是一份完整配置，并在 Happ 首页表现为一个服务器条目。完整 JSON 启动时由 Happ 交给 Xray 运行，不能复用现有 sing-box JSON 或 `.srs` 规则。

Happ 的官方路由 Profile 只有全局直连、代理、阻止和 DNS 语义，不能把多个 Xray outbound 或 balancer 显示成独立业务组。因此，“官方原版”和“业务组 UI 完全等价”不能同时满足。本设计以流量行为等价为目标，并保留一个可见的全局服务器选择。

## 架构

新增独立的 Happ/Xray 客户端适配层，不修改现有五个客户端：

```text
apple-proxy-sources
        ↓
共享节点规范化与 Happ 能力过滤
        ↓
过滤 Snell，保留 Xray 兼容节点
        ↓
Happ 配置生成器
        ├─ 共享分流顺序与规则意图
        ├─ 私密业务出口覆盖
        ├─ Xray DNS、路由、观测与故障回退
        └─ 平台运行参数
        ↓
Xray JSON 数组订阅
        ↓
官方 Happ
```

共享层增加 `CLIENT.happ` 和明确的协议能力集合。Happ renderer 只接收通过共享规范化与能力检查的节点，并生成 Xray 配置；它不读取其他客户端的最终产物。

规则构建流水线从同一共享源额外编译 Happ/Xray 资产。Happ 资产进入现有 `edge → current → previous` 版本化发布、清单校验和独立客户端推进机制。

## 订阅模型与首页选择

输出是 Xray JSON 数组。数组中的每个对象对应一个 Happ 兼容节点，并以规范化后的节点名作为 `remarks`。用户在 Happ 首页选择其中一个条目时，该对象内的 `FOLLOW` 出站指向所选节点。

每个对象只嵌入：

- 当前首页条目对应的 `FOLLOW` 节点；
- 当前业务覆盖实际引用的唯一固定节点；
- `DIRECT`、`REJECT`、DNS 和内部观测出站。

生成器不得在每个对象中无条件复制全部订阅节点。固定目标数由业务键数量限制，因此总输出随节点数量近似线性增长，不形成节点数平方级膨胀。

当用户切换 Happ 首页服务器时，Happ 切换到另一个完整 JSON 对象：

- `FOLLOW` 随首页选择变化；
- `DIRECT` 保持直连；
- 固定节点保持不变；
- 安全阻止规则保持不变。

## 平台输出

新增六个私密 Sub-Store 配置任务：

- `happ-config-macos`
- `happ-config-iphone`
- `happ-config-ipad`
- `happ-config-android`
- `happ-config-windows`
- `happ-config-linux`

每个平台由薄适配层提供 Happ/Xray 所需的 inbound、DNS 接管、IPv4/IPv6 和桌面 Proxy/TUN 边界。共享策略和节点转换不得复制到平台适配层。

新增一个平台无关的私密审计任务：

- `happ-routing-audit`

项目的私密 Sub-Store 任务总数从 17 增加到 24。

### 两层导入

Happ 安装分为两个彼此独立但都必须完成的层：

1. 公开 Xray 资产 Profile：通过项目生成的 `happ://routing/onadd/<base64>` 深链安装。Profile 只负责把版本化 `geosite.dat`、`geoip.dat` 下载到 Happ/Xray 资产目录，不携带私密节点或业务覆盖。
2. 私密 Xray JSON 数组订阅：来自对应平台的 Sub-Store 配置任务，携带兼容节点、业务覆盖、DNS 和完整路由。

公开 Pages 提供 Happ 导入页、深链和二维码。导入页不会请求、接收或保存私密订阅 URL。Happ 官方文档明确完整 JSON 不套用普通 Happ 路由规则；本设计只使用路由 Profile 的 geo 文件管理能力，实际 DNS 和分流仍完全由 JSON 对象控制。

Geo Profile 的 `Name` 固定，更新使用同名覆盖；`LastUpdated` 随已发布资产变化。Profile 的 `Geoipurl` 和 `Geositeurl` 指向对应发布通道的稳定入口，入口背后由清单哈希保证原子内容。配置启动前必须能解析全部必需标签，否则不得把该通道推进到 `current`。

## 业务目标契约

面向用户的主要配置键使用中文完整业务名。代码内部保留稳定英文 ID，用于测试、兼容和重命名迁移。

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

普通业务目标接受：

- `FOLLOW`：跟随 Happ 首页当前条目；
- `DIRECT`：直连；
- `NODE:<规范化后的完整节点名>`：固定到唯一节点。

目标关键字大小写不敏感，输出和文档统一显示大写形式。节点名部分保持原始 Unicode，并在比较前只应用项目既有节点规范化，不进行模糊匹配、子串匹配或大小写折叠。

生成器识别以下键别名：

- 带图标的完整中文名称；
- 文档规定的无图标中文短名；
- 稳定英文内部 ID。

同一业务通过多个别名重复配置且值一致时合并；值不一致时拒绝生成并报告冲突。

### 私密参数格式

七个 Happ Sub-Store 任务使用同一个 `policyOverrides` 参数。它是 UTF-8 JSON 的 Base64URL 编码，不是加密；完整任务 URL 仍按私密凭据处理。JSON 以中文业务名称为键，例如：

```json
{
  "🤖 AI 专用": "NODE:🇺🇸 Los Angeles｜自建·U",
  "📺 YouTube": "NODE:🇯🇵 Tokyo｜自建·U",
  "🎬 海外流媒体": "FOLLOW",
  "🍎 Apple": "DIRECT",
  "🇨🇳 国内平台": "DIRECT",
  "最终兜底": "FOLLOW"
}
```

同一个编码值复制到六个平台配置任务和 `happ-routing-audit`，避免配置与审计使用不同策略。公开 Happ 导入页提供纯本地的编码/解码辅助器；辅助器不发起网络请求、不写浏览器持久存储，并在页面上明确说明 Base64URL 不提供保密性。

未提供 `policyOverrides` 时使用表中默认值。Base64URL 解码失败、JSON 不是普通对象、出现未知业务键或目标值非法时拒绝生成。

安全威胁、广告和严格跟踪继续由 `blockMode` 控制，只接受共享安全策略允许的 `REJECT` 或 `DIRECT` 行为，不能意外指向代理节点。

## 固定节点解析

固定节点在 Happ 能力过滤之后，按规范化完整名称严格解析：

- 恰好一个匹配：生成固定出站和健康回退；
- 无匹配：本次生成解析为 `FOLLOW`，产生缺失告警；
- 多个匹配：本次生成解析为 `FOLLOW`，产生重名告警；
- 仅匹配到 Snell 或其他不兼容协议：等同无匹配，并注明协议不兼容。

节点名称和覆盖参数只存在于私密 Sub-Store 任务及私密生成结果，不写入公开仓库、公开 fixture 或公开 Pages 清单。公开测试只使用脱敏节点名。

## 固定节点健康回退

每个被引用的固定节点获得唯一、不可前缀碰撞的内部 outbound tag。Xray observatory 观测这些内部出站；业务规则通过只匹配该固定出站的 balancer 发送流量，并把当前对象的 `FOLLOW` 出站作为故障回退。

运行时状态转换为：

```text
固定节点健康 → 固定节点
固定节点不可达 → FOLLOW
固定节点恢复 → 固定节点
```

运行时回退不修改订阅参数，也不把临时状态写回 Sub-Store。`FOLLOW` 当前节点本身不可用时，Happ 显示该首页条目的连接或测速异常，由用户选择另一个首页条目；生成器不得永久替用户改选。

## 路由与 DNS

Happ 使用现有共享路由计划和优先级：

```text
local
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

规则语义映射到 Xray `routing.rules`：

- 本地地址和局域网域名优先 `DIRECT`；
- 安全规则按 `blockMode` 处理；
- 国内核心、国内游戏、中国域名和解析后的中国 IP 默认 `DIRECT`；
- 明确海外服务进入对应业务目标；
- 最终未匹配流量进入 `最终兜底`。

DNS 保留中国优先、明确海外代理 DNS 的项目语义：

- 国内和未知域名使用中国 DNS；
- 明确海外服务使用代理侧 DoH；
- 路由在需要时对域名解析结果执行 ChinaIP 判断；
- 防止 DNS 请求重新进入 TUN 或形成路由环；
- IPv4/IPv6 行为由平台参数和现有 `ipv6Mode` 语义控制。

Happ 不读取 sing-box `.srs`。构建系统从共享规则快照编译 Happ 专用的标准 Xray `geosite.dat` 和 `geoip.dat`，使用稳定标签承载每个共享规则源。配置引用版本化资产和清单哈希，不引用漂移的第三方 latest URL。

## 可观测性

### 生成时告警

以下情况安全退回 `FOLLOW` 并继续生成：

- 固定节点缺失；
- 固定节点重名；
- 固定节点被协议过滤；
- 固定节点名称变化导致旧名称失配。

告警同时写入：

- 每个 Happ JSON 对象的 `meta.serverDescription` 摘要；
- 私密 `happ-routing-audit` 完整报告；
- Sub-Store 生成日志。

审计报告以中文业务名为主键，至少包含配置目标、解析结果、状态和原因。审计不得包含节点密码、UUID、PSK、订阅 URL 或其他凭据。

### 运行时状态

Xray 日志记录实际 outbound、balancer 和回退决策。固定节点临时断线只改变运行时选择，不显示为规则已修改。官方 Happ 没有业务组状态控件，静态订阅也不承诺主动弹出运行时回退通知。

## 失败策略

以下情况拒绝生成配置：

- 没有任何 Happ 兼容节点；
- 输入目标值不属于允许语法；
- 中文别名和内部 ID 配置冲突；
- JSON、DNS、路由、outbound 或 balancer 引用无效；
- Xray geo 资产标签、清单或哈希不一致；
- 配置意外包含 Snell；
- 公开产物或审计结构意外包含凭据。

固定目标缺失或歧义不是整个订阅的致命错误，因为已定义安全、可见的 `FOLLOW` 回退。结构完整性、秘密边界和无可用节点属于致命错误。

更新失败时不发布新的有效产物，Happ 保留本地最后一次可用订阅。生产故障可将 Sub-Store 任务从 `current` 切换到 `previous`。

## 构建与发布

新增 Happ renderer、Sub-Store 入口、Xray geo 编译器、artifact renderer、客户端清单和 Pages 目录。公开目录遵循现有结构：

```text
public/current/happ/
public/edge/happ/
public/previous/happ/
public/versions/<manifest-hash>/happ/
```

每个通道至少包含：

- Happ 配置生成器；
- Xray `geosite.dat`；
- Xray `geoip.dat`；
- client manifest；
- 脱敏平台示例；
- 部署和 canary 文档。

Happ 作为独立发布客户端推进。一处 Happ 构建或 canary 失败不能移动、回滚或阻塞其他客户端的生产通道。

## 测试

### 节点兼容

覆盖 VLESS/Reality、Hysteria2、VMess、Trojan、Shadowsocks 和 SOCKS5。测试协议字段转换、规范化名称、能力过滤和 Snell 排除。固定节点测试包含唯一匹配、缺失、重名、改名和不兼容协议。

### 策略契约

覆盖中文全名、中文短名和英文内部 ID；测试 `DIRECT`、`FOLLOW`、`NODE`、别名冲突、固定节点回退和安全组约束。每条路由规则必须引用存在的 outbound 或 balancer，每个 balancer 必须引用有效且不碰撞的内部标签。

### 跨客户端一致性

扩展现有跨客户端路由回归，验证国内核心、AI、GitHub、YouTube、流媒体、社交、Apple、Microsoft、国内平台、海外游戏、下载和最终兜底的代表域名。Happ 默认决策必须与共享规则模型及其他客户端一致。

### Xray 与产物

使用与当前 Happ 稳定版兼容的 Xray core 校验六个平台生成配置。检查 Xray geo 标签、规则数量、清单哈希、秘密扫描和 JSON 数组结构。使用 30、100、1000 节点脱敏 fixture 测量生成时间和体积，并断言增长近似线性。

六个平台可能捆绑不同 Xray 版本。构建清单记录 canary 所用 Happ 版本和可确认的 core 版本；生成器只使用六个平台当前稳定版共同支持的配置字段。任何平台不支持的字段必须由平台适配层降级或导致该平台停止推进，不能让其他平台的验证结果替代它。

### 官方 Happ 真机 canary

macOS、iPhone、iPad、Android、Windows 和 Linux 分别验证：

- 导入和订阅刷新；
- 首页节点切换后 `FOLLOW` 出口变化；
- 固定业务保持指定节点；
- 国内和局域网直连；
- 海外 DNS 经代理且无明显泄漏；
- 固定节点故障后自动退回；
- 固定节点恢复后自动切回；
- 缺失固定节点时出现中文告警；
- `current → previous` 回滚。

自动测试不能替代真机 canary。六个平台没有全部验收前，状态文档必须明确标注未完成的平台。

## 文档

README 和部署指南需要：

- 将 Happ 加入第六客户端；
- 将私密 Sub-Store 任务总数更新为 24；
- 提供中文业务参数表和 URL 编码示例；
- 说明 Happ 没有可视化业务组，配置通过私密任务参数调整；
- 说明首页选择、固定节点、自动回退、告警和审计；
- 提供六个平台导入、验证和回滚步骤；
- 重申 Snell 在 Happ 中过滤、OpenWrt 继续使用 sing-box；
- 重申私密节点名、订阅 URL 和凭据不得提交或分享。

## 验收标准

1. 六个平台均能生成合法、非空、可由官方 Happ 导入的 Xray JSON 数组。
2. Happ 首页选择控制全部 `FOLLOW` 业务。
3. 中文业务参数可配置 `DIRECT`、`FOLLOW` 和唯一固定节点。
4. 固定节点故障自动退回 `FOLLOW`，恢复后自动返回固定节点。
5. 节点缺失、重名或不兼容时产生中文可见告警和私密审计记录。
6. 默认路由顺序、DNS 意图和代表域名结果与共享模型及现有客户端一致。
7. Snell 不进入 Happ 配置，其他客户端的 Snell 支持不变。
8. 公开产物不包含私密节点名、订阅 URL 或凭据。
9. Happ 可独立从 `edge` 推进到 `current`，并能回滚到 `previous`。
10. 未完成真机 canary 的平台不会被声明为已验证。
