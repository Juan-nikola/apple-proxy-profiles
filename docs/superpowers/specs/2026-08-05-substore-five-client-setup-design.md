# Sub-Store 五客户端统一引用与维护文档设计

## 目标

在不把私密节点、Sub-Store API 地址、输出订阅 URL 或凭据写入 GitHub 的前提下，建立一套可维护的 Sub-Store 结构：一个私密组合订阅统一引用 `snell` 与 `vlesshy2`，Egern、Anywhere、Shadowrocket、Surge、sing-box 都通过 GitHub Pages 上的公开远程 JavaScript 生成自己的私密输出。

同时重写仓库维护文档，使新用户可以逐步完成首次部署，维护者可以明确知道新增节点、修改公开规则、修改生成器、构建、验证、发布和回滚分别应修改哪些文件。

## 已确认的“引用”语义

Sub-Store 任务不保存复制后的 JavaScript 正文，而是在 File 或 Script Operator 中保存稳定的 GitHub Pages JS URL。旧版单行链接使用 URL hash 传递参数：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/<client>/scripts/<script>.js#arg=value&arg2=value
```

新版界面优先使用远程脚本链接字段和可视化参数编辑器；文档同时给出 hash 形式，保证不同 Sub-Store 前端版本都能照做。脚本 URL 使用 `current/`，测试时可换成 `edge/`，私密节点输入始终留在 Sub-Store。

## Sub-Store 私密对象

创建一个组合订阅：

- 名称：`apple-proxy-sources`
- 来源：已有订阅 `snell`、`vlesshy2`

创建 16 个输出任务，全部通过 `name=apple-proxy-sources` 引用该组合：

| 客户端 | 任务数量 | 输出 |
| --- | ---: | --- |
| Egern | 4 | 节点文件、macOS/iPhone/iPad Profile |
| Anywhere | 1 | Clash 节点 YAML |
| Shadowrocket | 4 | 节点 Script Operator、macOS/iPhone/iPad Profile |
| Surge | 3 | macOS/iPhone/iPad Profile |
| sing-box | 5 | macOS/iPhone/iPad/Android/OpenWrt JSON |

任务名、远程 URL、参数、输出类型、平台、更新周期和成功标志会集中写入总指南；每个客户端 README 保留本客户端的完整操作和故障处理。

## 公开脚本边界

公开脚本只接收 Sub-Store 运行时传入的节点集合和参数，不保存或回传私密节点。仓库公开内容禁止出现真实 Sub-Store 地址、API key、节点源 URL、输出 URL、服务器、端口、UUID、密码、PSK、私钥和完整节点配置。文档只能使用 `example.invalid` 或结构占位符。

规范脚本入口共 7 个：

1. Shadowrocket 节点 Operator
2. Shadowrocket Profile Generator
3. Egern 节点 Generator
4. Egern Profile Generator
5. Anywhere 节点 Generator
6. Surge Profile Generator
7. sing-box Config Generator

现有 `substore-*` 兼容 URL 继续保留，不重复部署；新任务统一使用客户端前缀名称。

## 文档结构

- 根 README：项目边界、五客户端总览、快速开始、目录地图、常见维护任务、构建与验证入口。
- `docs/substore-two-layer-setup.md`：从组合订阅到 16 个任务的逐项填写表，包含 URL、hash 参数、任务依赖、输出链接保存位置、刷新与回滚。
- `clients/<client>/README.md`：客户端能力、支持平台、脚本 URL、参数摘要、公开与私密边界、客户端专属目录。
- `clients/<client>/docs/deployment.md`：零基础逐步部署、预览成功标志、导入顺序和升级。
- `clients/<client>/docs/maintenance.md` 或等价章节：新增节点、修改规则、修改策略、生成器变更、编译和验证命令。
- `docs/maintenance.md`：跨客户端维护决策树，明确“改 Sub-Store”“改公开规则”“改客户端代码”分别落在哪里。
- 设计、计划和实施状态文档：记录方案与验证证据，但不包含私密值。

## 维护规则

### 新增节点源

只在自己的 Sub-Store 中把新来源加入 `apple-proxy-sources`；不修改仓库脚本，不把节点 URL 写入 README。预览组合非空后，按客户端重新运行受影响的 File 或 Operator。

### 修改公开规则

修改规则目录和上游固定提交时，只改 Anywhere 的规则源目录、允许清单或自动化源目录，不直接编辑 `public/` 和各客户端 `dist/`。运行规则更新、构建、规则验证、秘密扫描和客户端测试，再发布。

### 修改客户端行为

只修改对应客户端 `src/` 和共享核心；先写失败测试，再修改最小实现，运行对应 workspace 测试、构建、fixtures、根验证和秘密扫描。不得手工编辑生成的 `dist/`、`public/` 或脱敏示例。

## 构建与验证要求

文档必须给出 macOS、Linux/软路由开发机通用的 Node.js 22+ 命令：

```bash
npm ci
npm run verify
npm run check:actions
npm run check:rules
```

并给出每个 workspace 的单独构建、测试、fixtures 和 verify 命令。sing-box 的 `.srs` 文件只能通过显式官方 sing-box core 编译器生成；没有官方可执行文件时，构建必须失败，不能用文本伪造二进制。

## 验收标准

1. README 不再只描述三个客户端，而是准确覆盖五个客户端及所有平台。
2. 总指南列出 7 个规范远程脚本、16 个任务、每个任务的 `#...&...` 参数和依赖顺序。
3. 文档明确新增节点只改 Sub-Store 组合，新增公开规则只改规则源/目录，代码修改只改 `src/`。
4. 文档给出每个目录和关键文件作用、完整构建验证命令、发布前检查和真实设备 canary 边界。
5. 公开扫描不发现 API key、真实 URL 或节点字段；所有测试、构建和文档测试通过。

