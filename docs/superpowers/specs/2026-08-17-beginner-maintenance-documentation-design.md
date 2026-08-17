# 零基础部署与维护文档重构设计

## 目标

把根 `README.md` 设为项目唯一的新手入口，让第一次接触 GitHub、Sub-Store 和代理客户端的用户，也能按顺序完成首次部署、日常维护、规则更新、发布和回滚。

本次文档必须与当前代码和发布产物保持一致：项目保留 Shadowrocket、Surge、Egern、Anywhere、sing-box 五个客户端；Happ 和 OneXray 不再作为当前可部署客户端；Anywhere 默认发布 14 个稳定业务包。

## 非目标

- 不修改客户端生成器、共享语义规则或发布产物的运行逻辑。
- 不重新引入 Happ、OneXray 或第六客户端入口。
- 不在公开文档中保存真实 Sub-Store 地址、私密输出 URL、订阅、节点、密码、UUID 或令牌。
- 不把全部客户端内部实现细节复制到根 README；深入参数、格式和排障仍由已有子文档承载。
- 不声称读者已经部署 Sub-Store、已经创建任务或拥有特定节点来源。

## 方案比较

### 方案 A：分层单入口（采用）

根 README 提供完整的零基础主流程、成功标志、失败处理和回滚入口；子文档只承载客户端差异、参数表和开发者细节。

优点是第一次使用不会在多个文档之间迷路，维护者也不需要在 README 重复所有实现细节。缺点是根 README 仍会较长，但可以通过“我现在要做什么”导航和场景化章节控制阅读成本。

### 方案 B：所有内容放进一个巨型 README

优点是全部信息都在一页。缺点是五个客户端的参数、部署、排障和源码说明会大量重复，后续规则数量或任务结构变化时更容易产生多处漂移。

### 方案 C：极简 README 加多个独立指南

优点是每个文件短。缺点是零基础用户需要先理解文档结构，才能知道下一步该打开哪个文件，不符合“根 README 是唯一入口”的要求。

## 信息架构

根 README 顶部先回答“这个项目做什么”和“我现在要做什么”，随后按真实使用顺序组织：

1. 先理解节点、订阅、Sub-Store、客户端、业务分组和公开规则。
2. 首次部署：准备环境，建立五个 client collection，创建或核对 16 个 File 任务。
3. 导入客户端：分别说明 Shadowrocket、Surge、Egern、Anywhere 和 sing-box 的最短成功路径。
4. 验证与回滚：先验证国内、海外、局域网和业务组切换，再说明客户端、Sub-Store 和发布通道三层回滚。
5. 日常维护：按“增加或删除节点、修改任务参数、更新公开规则、修改源码、发布 Pages”拆分场景。
6. 常见问题和命令速查。
7. 深入阅读：链接到客户端部署、维护和排障子文档。

根 README 必须足以独立完成主流程。子文档可以补充细节，但不能成为完成首次部署所必需的隐藏前置条件。

## 新手步骤模板

关键步骤统一包含四类信息：

- **操作**：只写当前一步要点什么、改什么或运行什么。
- **成功标志**：给出可以观察到的结果，例如预览包含 `proxies:`、JSON 包含 `dns` 和 `route`，或客户端能看到业务组。
- **失败怎么办**：先检查最常见且可逆的原因，避免直接修改源码。
- **回滚方式**：说明如何切回旧 Profile、旧任务输出或 `previous` 发布通道。

命令块必须说明运行目录和用途。对零基础用户不要求理解 npm workspace、构建器或规则编译内部结构；这些内容放在开发者维护章节或子文档。

## 当前事实与命名

### 客户端边界

当前客户端固定为五个：

1. Shadowrocket
2. Surge
3. Egern
4. Anywhere
5. sing-box（同时覆盖 Android 输出）

Android 是 sing-box 的平台输出，不是第六个客户端。所有当前部署清单、collection 数量、任务映射和验证说明都必须使用这个口径。

历史设计规范和实施计划可以保留 Happ、OneXray 的历史记录，但当前 README、部署文档、维护文档和状态文档不得把它们列为活跃入口。

### Sub-Store 边界

文档使用一个总池和五个客户端专用 collection：

- `apple-proxy-all`
- `apple-proxy-shadowrocket`
- `apple-proxy-surge`
- `apple-proxy-egern`
- `apple-proxy-anywhere`
- `apple-proxy-singbox`

旧 `apple-proxy-sources` 只作为兼容和回滚入口。所有“已经帮你建好”“你的服务地址是”“你已有某些来源”之类的私人环境断言改为条件式说明，例如“如果已经创建，先预览；如果尚未创建，按清单创建”。

### 任务边界

根 README 展示 16 个 File 任务及其用途：

- Egern：`egern-nodes` 与三个平台配置，共 4 个。
- Anywhere：`anywhere-nodes`，共 1 个。
- Shadowrocket：`shadowrocket-config-macos/iphone/ipad`，共 3 个。
- Surge：`surge-nodes` 与三个平台配置，共 4 个。
- sing-box：四个平台配置，共 4 个。

任务清单必须说明“已有则核对、没有则创建”，不能假设读者的 Sub-Store 已经完成配置。

### Anywhere 规则边界

Anywhere 当前默认导入 14 个稳定业务包：

- AI
- Apple
- ChinaIP
- DomesticCore
- DomesticPlatform
- Download
- GitHub
- Microsoft
- OverseasGame
- OverseasMedia
- OverseasSocial
- Privacy
- Security
- YouTube

文档把它们称为“业务包”，不再称为 31 个上游来源分片。导入页、Manifest 或 `.arrs` 文件是发布实现；用户只需要看到和绑定这 14 个稳定业务包。

## 日常维护决策表

根 README 用场景而不是源码目录组织维护动作：

| 场景 | 首先修改 | 验证 | 回滚 |
| --- | --- | --- | --- |
| 增加或删除节点 | Sub-Store 总池及受影响 client collection | preview 节点数量和协议 | 恢复旧 collection 筛选或旧订阅 |
| 修改任务参数 | 单个 File 任务 URL 的参数部分 | 先预览，再只刷新一台测试设备 | 恢复原参数或旧 Profile |
| 更新公开规则 | 规则更新脚本与 `edge` 通道 | 自动测试、路由解释和 canary | 不推进 `current`，或切到 `previous` |
| 修改源码 | 对应 `src/` 与测试 | 构建、fixtures、全量测试、verify | 回退提交或使用 `previous` |
| 发布 Pages | GitHub Actions | 工作流成功且公开 URL 可下载 | 保持旧通道或回退提交 |

每个场景先提供最小安全操作，再链接到维护手册的深入说明。

## 文档一致性测试

新增自动化文档测试，直接读取当前仓库事实，防止后续重构再次出现旧数字或旧客户端：

1. 从当前客户端集合或客户端目录断言活跃客户端正好是 Shadowrocket、Surge、Egern、Anywhere 和 sing-box。
2. 从真实 Anywhere 默认 `.arrs` 产物或权威 Manifest/目录读取业务包名称，断言根 README 和 Anywhere 当前文档记录 14 个业务包。
3. 扫描当前用户文档，禁止出现“六个客户端”“六个 client collection”“31 个默认规则分片”等旧口径。
4. 扫描当前入口文档，禁止把 Happ 或 OneXray 列为可部署客户端；历史 `docs/superpowers/specs/` 和 `docs/superpowers/plans/` 不纳入此项，因为它们承担决策档案作用。
5. 保留现有秘密扫描，确保文档示例继续使用无效域名、占位符和公开 URL。

测试失败信息必须指出具体文件和旧文本，让没有项目背景的维护者也能直接修正。

## 失败处理与隐私

- 文档中的公开 Pages URL 可以使用项目真实公开地址；Sub-Store 管理地址、File 输出 URL 和订阅地址只能使用 `example.invalid` 或明确占位符。
- 不把“私密 URL 难以猜”描述为安全措施；继续提醒它不能替代认证和 TLS。
- 规则更新失败时不把 `edge` 推进 `current`；客户端异常时优先切回旧 Profile 或 `previous`。
- 文档测试发现数字漂移时，以当前生成目录、Manifest 或共享客户端集合为事实源，而不是单独修改测试硬编码来迁就文档。

## 实施范围

预计修改：

- 根 `README.md`：重排为唯一新手入口，删除私人环境假设，修正五客户端和 14 个 Anywhere 业务包。
- `docs/substore-two-layer-setup.md`、`docs/implementation-status.md`：修正当前客户端和 collection 数量。
- `clients/anywhere/README.md` 与 `clients/anywhere/docs/*.md`：把 31 个分片口径更新为 14 个稳定业务包，并按当前绑定语义修正文案。
- `test/` 下的文档一致性测试：从当前仓库事实验证客户端和 Anywhere 业务包，阻止旧口径回归。

如果搜索发现其他当前维护文档仍把 Happ、OneXray 或 31 个分片写成活跃状态，也一并修正；历史设计与计划只保留归档事实，不进行批量重写。

## 验收标准

1. 新用户只读根 README 就知道自己当前该做哪一步，并能完成首次部署、验证和回滚。
2. 所有当前文档统一描述五个客户端、五个 client collection、16 个任务和 Anywhere 14 个稳定业务包。
3. README 不再断言用户已经部署特定 Sub-Store、拥有特定来源或已经建立任务。
4. 每个关键操作都有成功标志，失败时有可逆检查和回滚入口。
5. 文档一致性测试能在旧口径重新出现时失败，并从实际仓库结构获得客户端和 Anywhere 业务包事实。
6. `npm test`、`npm run verify`、`npm run check:secrets`、`npm run check:actions` 与 `git diff --check` 全部通过后才允许提交和推送。
