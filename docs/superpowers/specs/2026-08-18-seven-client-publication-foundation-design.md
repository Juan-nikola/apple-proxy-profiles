# 七客户端共享发布基础设计

## 状态与范围

本规格记录 2026 年 8 月 18 日已经确认的共享基础设计。它是后续 OneXray 与 HAPP v4 规格的前置依赖，不直接实现两个新客户端的原生 renderer。

本规格完成后，项目拥有一个可以独立构建、审计、测试、提升和回滚的七客户端发布骨架：Anywhere、Egern、Shadowrocket、Surge、sing-box、OneXray 和 HAPP。原有五个客户端的行为保持兼容，但规则语义、DNS 边界、通道闭合和审计能力得到统一。

2026 年 8 月 12 日的 HAPP 与 OneXray 旧规格保留作为历史参考；新的 HAPP v4 和 OneXray 原生适配规格会在共享基础完成后分别编写，并明确取代其中不再适用的导入或回退行为。

## 目标

1. 让七个客户端消费同一套共享业务语义、规则优先级、DNS 意图和安全边界。
2. 继续只把 Blackmatrix7 作为生产规则源，同时增加可审计但不自动合并的外部对照源。
3. 为每个客户端建立闭合的 `edge`、`current`、`previous` 发布通道和不可变版本目录。
4. 允许每天自动生成 `edge`，但只有通过测试和人工批准的单个客户端才能进入 `current`。
5. 让任何客户端都可以独立回滚，不阻塞或改变其他客户端。
6. 提供公开中文审计看板、阻断 Issue 生命周期和私密任务审计所需的稳定契约。
7. 在不把节点、订阅 URL、凭据或私密策略写入公开仓库的前提下，支持独立的 Sub-Store collection 和 File 任务。

## 非目标

- 本阶段不生成 OneXray 原生 Profile。
- 本阶段不生成 HAPP v4 JSON 订阅或 `routing` 响应头。
- 不恢复历史 HAPP/OneXray 代码，不复制其他客户端的最终配置作为新客户端输入。
- 不把 v2fly、gaoyifan 或 dnsmasq-china-list 的内容自动并入 Blackmatrix7 生产规则。
- 不在客户端之间伪造统一 UI。每个客户端继续使用自己的原生策略组、Profile、JSON 或节点订阅形式。
- 不把公开 Pages 变成私密节点管理器；公开页面不能请求或保存私密 Sub-Store URL、节点或策略。
- 不在本阶段启用完整广告包或客户端链；两者保留为已有可选能力，默认关闭。

## 七客户端身份

共享客户端注册表固定使用以下稳定 ID：

```text
anywhere
egern
shadowrocket
surge
singbox
onexray
happ
```

客户端 ID 是 Manifest、发布目录、审计报告和 Sub-Store 任务映射中的唯一键。显示名称可以本地化，但不能改变 ID。

每个客户端声明：

- 支持的平台集合；
- 原生配置格式；
- 规则资产格式；
- 节点能力验证器；
- Profile/节点订阅是否分离；
- 是否支持独立策略覆盖；
- 当前 adapter schema 版本。

共享发布层不根据客户端名称推断能力；能力由客户端适配层显式声明，未知能力默认为不支持。

## 总体架构

```text
Blackmatrix7 不可变快照
    + gaoyifan / v2fly / dnsmasq 对照审计
                ↓
        共享规则模型与优先级
                ↓
    共享业务目标、DNS、安全契约
                ↓
      七个独立客户端适配器
                ↓
   edge → 自动验证 → 人工提升 → current
                ↓
     previous / versions/<manifest-hash>
```

私密节点链路与公开规则链路保持边界：

```text
Sub-Store 总池与客户端 collection
                ↓
         私密 File 任务
                ↓
     客户端原生订阅/Profile

公开规则与 GeoData ────────────────┘
```

客户端适配器可以读取公开规则通道和私密 Sub-Store 输入，但公开构建不能读取私密节点；公开产物不能反向包含私密节点名称或凭据。

## 共享业务语义

共享模型固定十二个可配置业务意图。代码使用稳定英文 ID，用户文件使用带图标的中文标准名称，并继续接受已经发布的英文和无图标中文别名。

| ID | 标准名称 | 默认目标 |
| --- | --- | --- |
| `ai` | `🤖 AI 专用` | `FOLLOW` |
| `github` | `🐙 GitHub` | `FOLLOW` |
| `youtube` | `📺 YouTube` | `FOLLOW` |
| `overseasMedia` | `🎬 海外流媒体` | `FOLLOW` |
| `globalSocial` | `💬 海外社交` | `FOLLOW` |
| `overseasGame` | `🌍 海外游戏` | `FOLLOW` |
| `domesticCore` | `国内核心` | `DIRECT` |
| `domesticPlatform` | `🇨🇳 国内平台` | `DIRECT` |
| `chinaIp` | `中国 IP` | `DIRECT` |
| `apple` | `🍎 Apple` | `DIRECT` |
| `microsoft` | `🪟 Microsoft` | `DIRECT` |
| `download` | `⬇️ 下载/P2P` | `DIRECT` |

业务目标只允许：

- `FOLLOW`：跟随客户端首页当前节点或该客户端的主代理组；
- `DIRECT`：直连；
- `NODE:<完整规范化节点名>`：固定到一个明确节点。

安全威胁、HTTPDNS 劫持、严格隐私/跟踪和系统内部流量不属于可配置业务意图。它们的阻止或直连语义由安全层固定，不能被上述目标覆盖。

共享规则优先级为：

```text
本地与局域网
→ 安全与隐私
→ 明确服务业务
→ 国内核心/国内平台
→ 国内游戏
→ 海外游戏
→ 中国域名
→ 解析后的中国 IP
→ 最终 FOLLOW
```

明确服务业务优先于中国 IP 判断，避免海外服务使用中国 CDN 时被错误直连。未知域名先按 DNS 意图解析，必要时用 `geoip:cn`/ChinaIP 进行最终分类。

DNS 选择跟随最终有效目标：`DIRECT` 使用中国 DNS；`FOLLOW` 和固定节点使用代理侧 DNS；`BLOCK` 不进行外部解析。任何 adapter 都必须保留防 DNS 回环和内部 DNS 流量优先级。

## 规则来源与审计治理

### 生产源

Blackmatrix7 是唯一生产输入。每次构建固定完整上游 commit，下载显式 allowlist 中的不可变文件，并记录：

- 上游仓库和路径；
- 完整 commit SHA；
- 抓取时间；
- 原始内容摘要；
- 许可证和来源说明。

生产构建不使用第三方 `latest` URL，也不从审计报告反向拼接生产规则。

### 对照源

- gaoyifan China operator IP 数据保留为 ChinaIP 审计对照，并继续使用现有 ChinaIP 促进阻断和校准机制；
- v2fly domain-list-community 新增为域名分类审计对照；差异默认是报告项，不自动改变生产目标；
- dnsmasq-china-list 仅作为人工调查参考，不进入自动生产和自动阻断。

审计源永不自动合并。若要改变生产规则，必须通过共享规则模型、明确的代码/数据变更和测试进入下一次 edge 构建。

### 阻断级别

以下属于生产阻断：

- Blackmatrix7 commit、文件、内容类型、UTF-8、大小或摘要校验失败；
- 规则源返回重定向、越过 allowlist 或包含秘密；
- 现有 ChinaIP 审计验证器报告 blocker；
- 共享规则模型出现重复、非法优先级或不可解析引用；
- 任何客户端产物包含跨通道引用、秘密或无效 Manifest；
- 代表性语义测试、adapter schema 检查或发布原子性检查失败。

v2fly/dnsmasq 差异本身不阻断发布，除非后续明确把某个差异转化为共享规则变更并通过正式测试。

## 三通道与不可变版本

每个客户端必须在公开 Pages 中拥有：

```text
public/edge/<client>/
public/current/<client>/
public/previous/<client>/
public/versions/<manifest-hash>/<client>/
```

`edge`、`current` 和 `previous` 都必须包含该客户端所需的完整目录、Manifest、示例和规则资产。`versions/<manifest-hash>` 是不可变证据目录，不能被后续构建覆盖。

通道闭合规则：

1. `edge` 产物只能引用 `edge` 规则、GeoData、脚本和订阅入口。
2. `current` 只能引用 `current` 规则、GeoData、脚本和订阅入口。
3. `previous` 只能引用 `previous` 规则、GeoData、脚本和订阅入口。
4. 版本目录只能引用自身版本或显式绑定的不可变版本目录。
5. 任何 URL、JSON 字段、YAML 字段、脚本参数或 HTML 深链中的频道值都必须通过闭合检查。

当前仓库中 `previous` 产物引用 `current`、`edge` 产物引用 `current` 以及任务校验器只接受 `edge/current` 的问题，必须在本阶段修复。新增客户端不能建立在未闭合的旧通道上。

### Edge 构建

GitHub Actions 每天北京时间 11:23（UTC 03:23）运行 edge 构建。该任务：

1. 固定 Blackmatrix7 commit；
2. 获取并校验生产快照；
3. 运行来源审计和共享语义编译；
4. 为七个客户端生成候选产物；
5. 运行单元、契约、跨客户端、秘密和通道闭合测试；
6. 将成功候选写入 `edge` 和不可变客户端 Manifest；
7. 更新公开审计看板；
8. 不得写入任何客户端的 `current`。

任何客户端候选失败都必须在 Manifest 中记录失败原因，并不能以“其他客户端成功”替代该客户端产物。

### 单客户端提升

人工提升必须输入：

- 客户端 ID；
- 已测试的 edge client Manifest SHA-256；
- canary 证据；
- 具有 `canary-approval` 权限的环境批准。

提升操作只移动指定客户端：

```text
current/<client> → previous/<client>
edge/clients/<client>/<manifest-hash>/<client> → current/<client>
```

根 Manifest、rollout 状态和公开审计报告必须在同一个原子 artifact 中更新。客户端 A 的提升不会移动客户端 B 的 current 或 previous。

初始迁移时，如果某客户端没有历史 previous，先把经验证的旧 current 作为 previous 种子；之后每次提升都保留最近一次 current。

### 回滚

公开回滚以客户端为粒度。Sub-Store 和设备文档允许将任务的 `channel=current` 改为 `channel=previous`，或使用不可变 Manifest 版本目录。回滚期间不得手工替换单个规则文件。

## 私密策略文件契约

Sub-Store 中维护一个私密 File：`apple-proxy-policy`。客户端任务通过内部 artifact 读取，不把 File URL 写入公开仓库。

顶层必须包含：

```json
{
  "schemaVersion": 1,
  "channels": {
    "edge": { "revision": "...", "defaults": {}, "happ": {}, "onexray": {} },
    "current": { "revision": "...", "defaults": {}, "happ": {}, "onexray": {} },
    "previous": { "revision": "...", "defaults": {}, "happ": {}, "onexray": {} }
  }
}
```

每个频道都是完整快照，不能依赖另一个频道。`defaults` 保存十二类业务默认值及共享 DNS、广告包和 client chain 开关；`happ` 和 `onexray` 只保存对应客户端的覆盖。生成器先读取当前频道 `defaults`，再应用自己的覆盖。

策略文件验证要求：

- 只接受严格 JSON；
- 重复 JSON 键、未知键、非法目标和空 revision 直接失败；
- 节点目标必须是完整 `NODE:<name>`，不支持模糊匹配；
- `security`、`privacy`、HTTPDNS 阻断和内部流量规则不接受覆盖；
- `adblockMode` 默认 `off`，`full` 作为显式可选包；
- `clientChain` 默认 `off`，开启必须同时提供合法链目标并单独 canary；
- 文件不包含 UUID、密码、密钥、订阅 URL 或完整节点 URI；
- 错误报告不得回显敏感字段。

策略 edge/current/previous 的人工提升与公开规则提升分开执行。每个读取策略的 HAPP/OneXray 任务（HAPP subscription/audit、OneXray profile/audit）都必须显式接收同名 `channel` 参数，并只读取 `apple-proxy-policy.channels[channel]`；它还必须检查同一频道的公开 client Manifest 和 GeoData 是否存在。OneXray node-only 任务也接受频道参数，但不读取业务策略。审计报告记录 `channel`、policy `revision`、public client Manifest SHA-256 和 GeoData SHA-256，任何频道或摘要不一致都拒绝生成。这样设备不会把一代业务策略与另一代公开规则拼接使用。

## Sub-Store 集合与任务边界

保留总池 `apple-proxy-all`，并维护七个正式客户端 collection：

```text
apple-proxy-egern
apple-proxy-anywhere
apple-proxy-shadowrocket
apple-proxy-surge
apple-proxy-singbox
apple-proxy-onexray
apple-proxy-happ
```

OneXray 另有 `apple-proxy-onexray-fixed` 固定节点 collection；HAPP 固定节点必须来自 `apple-proxy-happ`。

现有五客户端的 17 个 File 任务不改名，继续使用各自 collection。新客户端完整落地后的新增任务为：

| 任务 | 用途 |
| --- | --- |
| `apple-proxy-policy` | 私密三通道策略文件 |
| `onexray-nodes` | OneXray 首页节点订阅 |
| `onexray-profile` | OneXray 原生 Profile 深链 |
| `onexray-routing-audit` | OneXray 私密审计 |
| `happ-subscription` | HAPP JSON 数组与 routing 响应头 |
| `happ-routing-audit` | HAPP 私密审计 |

完整目标数量为 23 个 File 任务。共享基础阶段只更新任务契约、频道参数和内部策略读取接口；OneXray/HAPP 的输出格式留给各自后续规格。

节点和策略的边界：

- 节点集合由用户筛选；生成器不静默替用户删除节点；
- 不兼容节点导致对应任务严格失败；
- 普通节点增删可随节点任务刷新生效；
- 被固定策略引用的节点删除、重名或改名导致策略任务失败；
- HAPP/OneXray 任务和各自 audit 任务必须读取相同的 collection、policy channel 和客户端参数。

## 公开审计看板与 Issue

Pages 提供中文审计入口，至少显示：

- Blackmatrix7 commit、抓取时间、快照摘要和来源状态；
- gaoyifan ChinaIP 审计和 v2fly 域名对照结果；
- 七客户端的 edge/current/previous Manifest、adapter schema 和通道闭合状态；
- 规则数量、规则优先级、语义回归和跨客户端差异；
- Profile、GeoData、规则资产和 Manifest 是否一致；
- 每个平台的自动测试、真机 canary 和当前支持状态；
- 阻断项、首次发现时间、最近恢复时间和当前 Issue 编号。

看板不得显示私密节点名称、完整节点 URI、UUID、密码、PSK、私钥、Sub-Store URL 或策略文件正文。

只有阻断项创建或更新 GitHub Issue。Issue 使用稳定的审计键和 `audit-blocker` 标签；同一个键只能存在一个开放 Issue。阻断恢复后自动关闭，普通差异只进入看板和 JSON 审计快照。

私密节点选择、固定目标或 Sub-Store 凭据错误不创建公开 Issue，只在私密任务日志和 `*-routing-audit` 中报告。

## 测试设计

### 共享单元测试

- 七客户端注册、平台和 adapter schema；
- 十二类业务目标、中文别名、默认值和覆盖合并；
- `DIRECT/FOLLOW/NODE` 语法、严格节点名和安全目标不可覆盖；
- policy 文件重复键、未知键、频道缺失、敏感字段和非法 revision；
- 私密任务的 `channel`、policy revision、公开 client Manifest 和 GeoData 摘要绑定；
- DNS 类别、共享路由优先级和最终 FOLLOW；
- `edge/current/previous` 频道闭合扫描。

### 来源和审计测试

- Blackmatrix7 URL allowlist、commit、重定向、内容类型、UTF-8、大小和摘要；
- ChinaIP 现有 blocker 验证；
- v2fly/dnsmasq 差异只进入审计，不改变生产快照；
- 公开看板脱敏和审计键稳定；
- Issue 创建、更新、恢复关闭和重复抑制。

### 发布测试

- 每日 workflow 只能写 edge；
- 提升必须输入精确客户端和 Manifest SHA-256；
- 提升只移动目标客户端的 current/previous；
- 任意客户端失败不改变其他客户端；
- 版本目录不可变；
- 回滚后所有内部引用仍处于同一频道。

### 跨客户端语义测试

所有现有客户端至少验证国内核心、国内平台、中国 IP、AI、GitHub、YouTube、海外媒体、海外社交、海外游戏、Apple、Microsoft、下载和最终兜底。代表域名的预期目标来自共享模型，不从某个客户端最终文本反推。

### 安全与性能测试

- 公开 artifact、Manifest、日志和审计快照秘密扫描；
- 恶意 policy JSON、原型污染键、超长节点名、响应头注入和路径穿越；
- 30、100、1000 节点脱敏输入的生成时间、内存和产物大小；
- 移动端轻量规则和可选完整广告包分别验证，不以桌面结果替代移动 canary。

## 实施边界

共享基础预计涉及：

- `shared/contracts.js`、`shared/release/*`、`shared/policies/*`；
- `automation/src/build-site.js`、来源审计和 Manifest 生成；
- `scripts/update-rules.mjs`、`scripts/check-substore-task.mjs` 和 workflow 检查；
- Pages 首页、中文审计页面和脱敏审计 JSON；
- 现有五客户端的 channel 参数、跨通道引用和共享语义测试；
- 部署、维护和 Sub-Store 文档。

本阶段不得把 HAPP/OneXray renderer 实现混入共享模块。后续适配器只能通过定义好的共享规则、policy 和 release 接口接入。

## 验收标准

1. 七客户端均在注册表和发布契约中拥有稳定 ID；
2. 现有五客户端的 edge/current/previous 目录无跨频道引用；
3. 每日 11:23 构建只更新 edge，且失败不会改变 current；
4. 单客户端提升和回滚不会修改其他客户端；
5. Blackmatrix7 是唯一生产规则源，外部来源仅出现在审计；
6. policy 文件严格验证，包含 defaults、happ、onexray 三类频道覆盖且不含凭据；
7. 公开中文看板可查看规则、来源、七客户端通道和 canary 状态；
8. blocker Issue 能创建、更新、去重并在恢复后自动关闭；
9. 现有五客户端的跨客户端语义和安全测试通过；
10. 后续 OneXray/HAPP 适配器可以在不修改发布核心的情况下接入。

## 后续规格顺序

共享基础规格通过审阅并完成实现后，按以下顺序继续：

1. OneXray 原生 Profile 规格与实现；
2. HAPP v4 订阅/Profile 绑定规格与实现。

每个后续项目都单独经过规格审阅、实施计划、实现、代码审查、自动测试和真机 canary。
