# v2rayN / V2Box 统一规则集成设计

**状态：** 已通过聊天确认，待用户审阅 spec 后进入实现计划  
**日期：** 2026-08-22

## 1. 背景

项目已经有一套跨客户端的统一分流中间层，当前维护七个 active 客户端。用户希望把 v2rayN（Windows、macOS）和 V2Box（iPhone、iPad）作为正式客户端加入，同时把以下四个外部规则项目融合进既有规则，而不是作为并行的四套配置：

- `v2fly/domain-list-community`：基础域名分类
- `Loyalsoldier/v2ray-rules-dat`：综合增强数据
- `runetfreedom/russia-v2ray-rules-dat`：俄罗斯地区覆盖
- `Chocolate4U/Iran-v2ray-rules`：伊朗地区覆盖

节点组合仍由用户在自己的 Sub-Store 中维护。本仓库只接收用户指定的 collection，并生成客户端可导入或订阅的输出；不接管节点来源、不筛选节点、不保存私密节点。

## 2. 目标

1. 将四个规则项目通过独立 source adapter 接入现有统一规则模型。
2. 保留现有 AI、媒体、社交、GitHub、游戏、国内、广告和安全业务语义。
3. 通过确定性的优先级和来源追踪，解决规则重叠和冲突。
4. 支持 `region=cn|global|ru|ir`，Russia/Iran 只作为对应地区的可选 overlay。
5. 新增 v2rayN 和 V2Box 正式客户端身份、平台契约、renderer、Sub-Store 任务、manifest 和测试。
6. 让 v2rayN 与 V2Box 使用同一份地区版本和规则 manifest，避免客户端之间规则漂移。
7. 保持公开层无节点凭据，支持 `edge → current → previous` 的验证和回滚。

## 3. 非目标

- 不 fork、修改或重新发布 v2rayN/V2Box 客户端本身。
- 不把 Sub-Store、节点来源或节点筛选迁移到本仓库。
- 不让客户端直接依赖四个 GitHub 项目的漂移 URL。
- 不把四个上游项目的分类名称直接当作本项目的策略名称。
- 不承诺所有客户端都能表达每一种上游规则；不可表达时必须报告诊断并遵守发布门禁。

## 4. 总体架构

```text
上游规则源 + 现有业务规则 + 用户规则
        ↓
Source Adapter
        ↓
Canonical Rule Model
        ↓
去重 / 冲突检测 / 来源追踪 / 策略映射
        ↓
统一 RouteDecision
        ↓
v2rayN / V2Box / 现有客户端 renderer
        ↓
私密 Sub-Store 配置 + 公开 Geo Assets / manifest
```

### 4.1 来源适配器

每个外部项目有独立 adapter。adapter 负责：

- 解析仓库锁定 commit 或 release 中允许的输入格式；
- 转换为现有规则模型的 `domain`、`domainSuffix`、`domainKeyword`、IPv4 CIDR、IPv6 CIDR 等类型；
- 记录 source ID、上游 commit、抓取时间、SHA-256、许可证和解析诊断；
- 对未知格式或未知规则类型显式失败或进入阻断诊断；
- 不在 renderer 内直接抓取上游文件。

上游数据只表达候选分类和事实，不直接决定 `DIRECT`、`PROXY` 或 `REJECT`。分类到策略的映射由本项目维护的映射表负责。

### 4.2 规范规则模型

继续使用现有 `RuleEntry` matcher 类型，并在编译阶段通过独立 metadata/index 保存：

- `sourceId`
- `sourceCommit` / `sourceSha256`
- `category`
- `region`
- `semanticIntent`
- `policyAction` 或业务策略目标
- 去重前后的来源证据

不把客户端专属字段写进共享 matcher；客户端差异只能出现在各自 renderer 和 capability contract 中。

同一 matcher 被多个来源收录时，运行时只输出一份规范记录，manifest 和审计保留全部来源证据。

## 5. 统一策略与优先级

最终策略对象包含：

```text
RouteDecision {
  matcher,
  action: DIRECT | PROXY | REJECT,
  policyGroup,
  priority,
  reason,
  matchedSources,
  region
}
```

冲突解决顺序固定为：

```text
用户自定义规则
> 现有明确业务规则
> 广告 / 隐私 / 恶意安全规则
> 选定地区 overlay
> 通用 Geo 分类
> ChinaTLD / ChinaIP
> 默认回落
```

映射原则：

- AI、YouTube、GitHub、Telegram、游戏等现有业务组优先保留；
- 安全规则遵守现有 `blockMode`（`balanced`、`security`、`strict`、`off`）；
- Russia/Iran overlay 按具体类别映射到代理、直连或安全策略，不把整个仓库粗暴地设为代理；
- v2fly/Loyalsoldier 通用分类用于补充匹配，不覆盖已有明确业务语义；
- 未命中时沿用项目现有国内直连、海外代理和默认回落逻辑；
- `explain:route` 能显示最终动作、命中的业务组、来源和映射原因。

## 6. 地区配置

统一参数为：

```text
region=cn|global|ru|ir
```

- `cn`：现有中国用户默认规则、业务规则、安全规则和中国基础判断；不启用 Russia/Iran overlay。
- `global`：通用业务和安全规则；不强行使用中国、俄罗斯或伊朗本地覆盖。
- `ru`：在通用规则上加入 Russia overlay。
- `ir`：在通用规则上加入 Iran overlay。

地区参数只改变规则组合，不改变用户维护的节点 collection。地区规则可与现有 `dnsMode`、`blockMode`、`ipv6Mode`、`quicMode` 和 `clientChain` 参数共同使用。

## 7. 客户端契约

### 7.1 v2rayN

- 正式 client identity：`v2rayn`
- 平台：`windows`、`macos`
- 输入：用户在 Sub-Store 中维护的 `apple-proxy-v2rayn` collection
- 输出：节点订阅、Windows 配置、macOS 配置
- 路由：Xray/V2Ray 路由 JSON，引用项目编译的 GeoData 或内联轻量规则
- 验证：严格 JSON 解析、GeoData 引用闭合、节点渲染失败诊断、平台 fixture

### 7.2 V2Box

- 正式 client identity：`v2box`
- 平台：`iphone`、`ipad`
- 输入：用户在 Sub-Store 中维护的 `apple-proxy-v2box` collection
- 输出：节点订阅、iPhone 配置、iPad 配置
- 路由：V2Box 可导入的 Xray/JSON 路由配置，配套项目编译 Geo Assets
- 验证：JSON schema、订阅导入格式、Geo Assets URL、平台 fixture、节点渲染失败诊断

客户端 renderer 不读取原始 GitHub 文件。两者使用相同的规则 manifest 和地区 GeoData 版本，但可以按客户端能力选择资产引用或内联轻量规则。

## 8. Geo Assets 与公开发布

公开发布目录新增：

```text
public/current/v2rayn/scripts/
public/current/v2box/scripts/
public/current/geodata/<region>/geosite.dat
public/current/geodata/<region>/geoip.dat
public/current/geodata/<region>/manifest.json
```

GeoData 由统一规则编译器生成。manifest 至少包含：

- schema/version
- region
- source commits and hashes
- generated asset hashes and sizes
- category/source counts
- omitted/unsupported diagnostics
- build timestamp

V2Box 资产模式为默认路径；轻量内联模式用于必要的小型业务规则和资产暂不可用时的安全回落。公开资产不得包含节点、订阅凭据或私密任务参数。

## 9. Sub-Store 私密任务

新增任务：

```text
v2rayn-nodes
v2rayn-config-windows
v2rayn-config-macos
v2box-nodes
v2box-config-iphone
v2box-config-ipad
```

任务仅引用 GitHub Pages 上的公开 generator URL，并从 Sub-Store 运行时接收 collection。真实 collection 内容、节点 URL、密码、UUID、私密输出 URL 仍只存在用户自己的 Sub-Store。

任务必须支持 `edge`、`current`、`previous` channel 绑定和现有参数校验。collection slug 是机器绑定键，不随显示名称变化。

## 10. 质量门禁

### 10.1 来源门禁

- commit/release、SHA-256、许可证和抓取时间必须记录；
- 解析失败、来源为空、最小条目数不足或异常波动阻止发布；
- 未知规则类型不得静默丢弃。

### 10.2 融合测试

- 每个 adapter 有脱敏 fixture；
- 覆盖重复域名、父子域名、CIDR 包含、跨来源重叠和 region 矩阵；
- 验证用户规则、业务规则、安全规则、地区规则的优先级；
- 验证每条规则的 provenance 和解释结果。

### 10.3 跨客户端等价

同一测试语料必须经过统一策略解释器、v2rayN renderer、V2Box renderer 和现有客户端 renderer。可表达规则要求得到相同动作和业务组；不可表达规则必须进入 `renderFailures`，不能静默改变语义。

### 10.4 发布与回滚

```text
edge → 自动测试 → 私密 Sub-Store preview → current
current → 异常 → previous
```

规则资产、公开脚本和私密任务可分别回滚；规则更新不改动用户维护的节点 collection。

## 11. 验收标准

1. `CLIENT`、release catalog、manifest、文档和测试均包含 `v2rayn`、`v2box`。
2. 四个外部项目均有锁定版本、adapter、解析 fixture 和第三方声明。
3. `region=cn|global|ru|ir` 能生成不同且可审计的规则组合。
4. v2rayN Windows/macOS 与 V2Box iPhone/iPad 均能从对应 Sub-Store task 生成非空节点和完整配置。
5. 统一规则解释器与各 renderer 的可表达语料通过跨客户端等价测试。
6. Geo Assets、manifest、脚本和配置 hash 闭合，公开层无私密信息。
7. 失败时发布阻断，成功后支持 `current`/`previous` 回滚。

## 12. 实现前必须验证的客户端细节

在实现 renderer 时，必须以目标客户端当前可验证的导入格式和官方核心行为为准，特别是：

- v2rayN 对完整 Xray JSON、GeoData 路径/引用和订阅更新的实际导入边界；
- V2Box 对自定义 JSON、Geo Assets URL、资产更新和 iPhone/iPad 配置字段的实际导入边界。

如果某项能力不能由订阅或 JSON 自动表达，renderer 必须明确输出诊断，并在安装文档中给出最小必要的资产导入步骤，而不是伪造一个看似可用的字段。
