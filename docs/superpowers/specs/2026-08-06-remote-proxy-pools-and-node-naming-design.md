# 远程代理池、节点命名与 sing-box 1.14 兼容设计

日期：2026-08-06  
状态：待用户审阅  
基线：`agent/surge-sing-box-slim`，基于现有 Surge、sing-box、Egern 生成器与 Sub-Store 私密任务

## 1. 背景与目标

当前配置已经可以生成五类客户端的基础订阅，但仍有三个实际问题：

1. sing-box 使用了已经移除的 `geoip` 路由字段，较新的客户端无法启动；
2. Surge 的主节点组没有把节点候选放入组内，界面只显示“全部自动”；
3. 节点名称同时包含 `[未标记]`、`[自建]`、来源技术标记和原始长名称，难以阅读和筛选。

本次改动的目标是：

- 以 `地区 + 来源 + 简短名称` 作为所有客户端共享的显示命名规范，例如 `🇭🇰 自建 · Boil-HKT [UDP]`；
- Surge 使用官方 `policy-path` 远程策略池，配置文件本身不再内嵌节点明细；
- Egern 继续使用官方 `urls` 远程策略组能力；
- sing-box 目标兼容官方 `1.14.0-beta.7`，继续输出完整远程 JSON 配置，因为官方 sing-box 没有与 Surge `policy-path` 等价的原生远程代理提供商字段；
- 未知或当前客户端不支持的协议自动排除，并输出不泄露节点内容的统计诊断；
- 保留可回退的内嵌节点模式，避免旧 Sub-Store 任务在迁移期间立即失效；
- 完善 README，说明 Sub-Store 私密任务、远程引用、节点新增、规则新增和每个文件的职责。

## 2. 非目标

- 不把真实节点地址、端口、UUID、密码、私钥、订阅 Token 或私密输出 URL 写入公开仓库；
- 不使用第三方 sing-box Provider 扩展或非官方字段来伪造远程节点池；
- 不在本次工作中编译、签名、安装或发布 Surge、Egern、sing-box 客户端本体；
- 不改变 Shadowrocket、Anywhere 的既有输出格式和公开链接契约，除非共享命名变化必须同步；
- 不保证测试版永久兼容；每次上游 schema 变化都必须经过版本化测试和可回滚发布。

## 3. 已确认的架构决策

### 3.1 私密与公开边界

共享仓库只发布稳定的公开脚本、规则、构建产物和脱敏示例。真实节点在 Sub-Store 私密订阅中流动，具体链路如下：

```text
私密 Sub-Store 节点
        │
        ├── Egern 远程策略组 urls ───────────────► Egern
        ├── Surge policy-path ─► 私密策略任务 ────► Surge
        └── sing-box 完整配置 URL ─► 私密配置任务 ► sing-box
```

公开脚本可以包含仓库内的公共规则和生成逻辑，但不能包含用户的 Sub-Store Token 或任何节点值。私密任务只引用公开脚本 URL，并通过参数传入私密节点源。

### 3.2 三端策略

| 客户端 | 配置中的节点明细 | 远程引用方式 | 本次处理 |
| --- | --- | --- | --- |
| Surge Mac/iPhone/iPad | 默认不内嵌 | `[Proxy Group]` 的 `policy-path=<HTTPS URL>` | 新增 Surge 策略行任务；组通过正则筛选远程节点 |
| Egern | 默认不内嵌 | 策略组 `urls: [<HTTPS URL>]` | 沿用现有能力；统一命名和协议过滤 |
| sing-box Mac/iPhone/iPad/Android/软路由 | 完整配置内含 outbounds | 官方 JSON 配置 URL | 移除 `geoip`；适配 1.14.0-beta.7 规则集下载字段 |

Surge 的 `policy-path` 接收的是策略行列表，不是完整 Surge Profile；因此必须有单独的私密 Sub-Store 任务输出 `[Proxy]` 区域中的策略行。sing-box 官方 selector/urltest 只能引用同一份 JSON 中的 outbound tag，不能直接引用一个远程节点列表，所以不新增未经官方支持的 Provider 语法。

## 4. 节点来源识别与命名

### 4.1 来源标记识别

Sub-Store 可能在多个 provenance 字段中保存订阅显示名。共享层应扫描全部既有字段，而不是第一个字段有值就停止：

`_subDisplayName`、`_subName`、`_collectionDisplayName`、`_collectionName`。

识别规则：

1. 优先采用第一个能匹配受支持来源映射的 `[来源]` 标记；
2. 如果所有字段都只有 `[未标记]` 或没有已知来源，来源显示为 `未知`，但不把未知标记重复拼进名称；
3. `[自建]`、`[机场]`、`[订阅]` 等来源标签只保留一次；
4. 来源来自字段而不是原始节点名称时，原始名称中的同类前缀仍要被清除，避免重复。

### 4.2 简短名称清理

从原始节点名中移除：

- 来源前缀：`[未标记]`、`[自建]` 及已知来源标签；
- 已经由共享层单独表达的地区旗帜和地区冗余前缀；
- `[UDP]`、`[已有链]` 等技术标记的重复副本；
- 连续空格、空括号和多余分隔符。

输出顺序固定为：

```text
<地区旗帜> <来源> · <简短名称> [已有链] [UDP]
```

其中技术标记只在确实存在时保留。`[UDP]` 暂时保留，因为现有游戏策略过滤依赖它；后续如果把协议能力从名称正则迁移到元数据，才可以移除该显示标记。

名称冲突时，继续使用现有稳定碰撞后缀机制；同一节点在不同客户端中必须尽量保持相同显示名。名称生成不得记录或输出 host、port、UUID、密码、Reality 公钥或其他凭据。

### 4.3 策略筛选契约

命名变更后，所有依赖节点名称的过滤器必须同步更新并测试：

- Surge `policy-regex-filter`；
- Egern 的 `filter`；
- 共享来源组、地区组、P2P/UDP 组和游戏组；
- 稳定自动组与故障转移组的候选排序。

过滤器只能匹配公开显示名称和共享节点元数据，不能依赖私密字段。

## 5. Surge 远程策略池

### 5.1 新增私密任务

新增一个只输出 Surge 策略行的 Sub-Store File 任务，暂定标识为 `surge-proxies`：

- 输入：私密节点订阅 URL、公开的 Surge 节点脚本 URL、共享参数；
- 输出：每行一个 Surge proxy 定义，不输出 `[Proxy]` 标题、策略组和规则；
- 只保留 Surge 当前能力矩阵支持的协议；
- 同名节点使用稳定去重策略；
- 不支持、解析失败或缺少必需字段的节点被排除，并在任务日志中聚合统计；
- 零个可用节点时失败，不生成空成功订阅，避免客户端把空池缓存为有效配置。

脚本 URL 公开、节点输入私密；任务输出 URL 私密。README 只给出 `example.invalid` 形式的参数模板。

### 5.2 Profile 生成

Surge Profile 生成器新增可选参数 `proxyPolicyUrl`：

- 有值时，`[Proxy]` 不写入节点明细；
- `[Proxy Group]` 中的主组、自动组、地区组和来源组通过 `policy-path` 引用该 URL；
- 过滤组附带 `update-interval` 与 `policy-regex-filter`，只选择符合地区/来源/技术条件的远程策略行；
- 主组也必须有明确的节点池候选，不能只留下“全部自动”；
- URL 必须是 HTTPS 绝对 URL，不允许用户名、密码、fragment 或换行；
- `proxyPolicyUrl` 缺失时保留当前内嵌节点模式，以兼容旧任务。

远程策略池不应让每个策略组都重新请求不同的节点订阅；统一引用同一策略 URL，再由 Surge 原生正则完成组内筛选。主组默认顺序为 `⚡ 全部自动`、远程节点池和安全回退项，具体 tag 由现有共享策略模型决定。

### 5.3 Surge 能力过滤

过滤发生在共享规范化节点模型之后、Surge 文本渲染之前。对不支持的协议返回稳定的原因码，例如 `unsupported-protocol`、`missing-required-field`、`invalid-transport`，不返回节点原文。实现必须覆盖当前项目能解析的协议，并以 Surge 能力矩阵为最终准入条件，而不是把未知类型原样写进 Profile。

## 6. Egern 远程组

Egern 已经使用策略组 `urls` 远程引用，因此不新增第二套订阅协议：

- 主节点组和过滤组继续引用同一个私密节点 URL；
- 过滤规则使用统一的新命名；
- 节点由共享层按 Egern 能力过滤；
- 远程 URL 和更新周期由私密任务参数提供；
- 保留当前本地/内嵌模式（若已有）作为回滚方式。

Egern 的输出不能依赖 Surge 的 `policy-path` 文本格式；两者共享中立节点模型，但分别使用各自的原生远程组字段。

## 7. sing-box 1.14.0-beta.7

### 7.1 规则兼容

移除生成的 `geoip` 路由规则。中国直连语义改由现有 `ChinaMax`/`ChinaMax_Domain` rule-set 承担，且该 rule-set 的 action 保持 `DIRECT` 对应的 sing-box direct outbound。

新增回归断言：

- 任何最终 route rules 不得包含 `geoip`；
- 中国规则集存在且动作指向 direct；
- 不产生已移除的 GeoIP/Geosite 数据库依赖。

### 7.2 规则集下载字段

按 `1.14.0-beta.7` 的官方 schema 检查远程 rule-set 下载配置：`download_detour` 已进入弃用/移除迁移路径，生成器应使用该版本官方支持的 HTTP client 结构。实现阶段必须用对应 beta.7 core 的 `check` 验证，而不是只依据 JSON 可解析性。

如果 beta.7 的 schema 与后续 testing 提交不兼容，版本适配器必须明确区分字段，并在 Manifest 中记录目标版本；不能把 testing-only 字段写入 current 配置。

### 7.3 节点与远程配置

sing-box 继续由私密 Sub-Store 任务输出完整 JSON：

- outbounds 使用统一命名后的节点 tag；
- selector/urltest 只引用同时存在的 outbound tag；
- 不支持的协议不进入 outbounds，也不进入 selector/urltest；
- 所有节点被排除时任务失败，而不是发布只有 direct 的伪成功配置；
- 配置 URL 由私密任务提供，公开仓库只保留生成脚本和脱敏示例。

官方 sing-box 没有 Surge `policy-path` 等价的远程 proxy provider。若未来官方增加 provider 字段，再单独增加版本化适配器；本次不采用第三方扩展。

## 8. 兼容、失败与回滚

### 8.1 兼容模式

- `proxyPolicyUrl` 可选；缺失时 Surge 使用旧内嵌节点输出；
- Egern 保留现有 URL/内嵌行为；
- sing-box 以 beta.7 为目标，同时保留上一份已验证配置作为回滚；
- 命名变更是共享层行为，旧名称不会通过兼容别名无限保留，避免远程组正则同时匹配重复节点。

### 8.2 Fail-closed

以下情况阻止对应私密任务成功输出：

- 远程 URL 非 HTTPS 或包含凭据/fragment/控制字符；
- 节点解析后没有任何目标客户端支持的节点；
- 组引用了不存在的节点 tag；
- Surge 远程策略输出不是合法策略行；
- sing-box `check` 失败、包含 `geoip` 或包含已移除字段；
- 规则集缺失、规则引用悬空或下载配置不符合目标版本。

错误信息只包含客户端、阶段、原因码和数量，不包含节点原文。任务失败时保留客户端已有缓存和上一版发布结果。

## 9. 测试与验证

实现阶段至少增加：

1. provenance 多字段识别测试，覆盖 `[未标记]` 在前、`[自建]` 在后；
2. 地区/来源/简短名称输出、技术标记去重和稳定碰撞测试；
3. Surge 远程策略行输出、HTTPS 参数校验、`policy-path` 组结构和主组候选测试；
4. Surge 内嵌回退模式测试；
5. Egern 远程 URL 与新命名过滤测试；
6. sing-box 无 `geoip`、规则集 direct 语义、beta.7 HTTP client 结构和 outbound 引用闭包测试；
7. 全部目标协议的支持/排除矩阵测试；
8. 脱敏和秘密扫描，确保测试 fixture 不含真实节点凭据；
9. 确定性测试：同一输入和参数产生同一字节输出；
10. 最终使用官方 Surge/sing-box 解析或 check 工具验证生成产物。

验收顺序：先在本地脱敏 fixture 上通过测试，再构建公开脚本和规则，最后由用户在 Sub-Store 私密任务中填入真实 URL 做 Surge、Egern、sing-box 导入验证。只有验证通过的变更才推送 `main`。

## 10. README 与交付内容

README 必须新增一个从零开始的操作章节，包含：

- Sub-Store 如何创建组合订阅与私密 File 任务；
- Surge `surge-proxies` 与 Profile 任务如何用公开脚本 + `&参数` 引用；
- Egern 和 sing-box 各自应该使用哪个私密输出 URL；
- 以后增加节点时只改 Sub-Store 哪个输入，何时需要改仓库；
- 以后增加规则时应改哪个规则源目录、构建脚本和测试；
- `shared/`、`clients/<name>/src`、`clients/<name>/scripts`、`public/`、`automation/` 各文件职责；
- Mac、iPhone/iPad、Android、软路由导入/编译/校验步骤；
- 如何查看不支持协议的统计、如何回滚到旧任务/旧 URL；
- 明确说明公开 GitHub 不保存真实节点和订阅 Token。

## 11. 实施顺序

1. 先完成并审阅本设计；
2. 写实现计划，拆分共享命名、Surge 远程池、Egern 过滤、sing-box beta.7、测试和文档；
3. 先补测试，再实现共享来源识别与命名；
4. 实现 Surge `surge-proxies` 与 `policy-path` Profile 模式，同时保留内嵌回退；
5. 修复 sing-box 路由和规则集下载 schema，执行 beta.7 check；
6. 更新 Egern 远程过滤和 README；
7. 构建、脱敏扫描、检查公开 diff，提交并推送到 GitHub；
8. 向用户交付三端私密任务参数模板、公开脚本链接格式和真实设备验收清单。

## 12. 方案取舍

采用“客户端原生远程能力优先、sing-box 保持完整远程 JSON”的混合方案：

- Surge 得到真正的远程节点池，刷新节点时不必重新生成 Profile；
- Egern 继续使用其官方远程组，保持现有使用方式；
- sing-box 不引入未经官方支持的 Provider，避免测试版升级时出现更隐蔽的启动错误；
- 共享命名仍由仓库统一生成，三端组筛选可预测；
- 代价是 sing-box 仍需由 Sub-Store 重新生成完整 JSON，而不是像 Surge 一样只刷新节点策略行；README 会明确说明这一差异。
