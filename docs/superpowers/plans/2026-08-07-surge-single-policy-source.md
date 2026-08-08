# Surge 单池单链接 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Surge 远程模式改为只生成一个远程节点池和一个可替换的 `policy-path`。默认使用 Sub-Store 提供的 Surge 组合订阅；用户手动替换同一个链接后，区域、流媒体和自动测速分组仍通过相同的 `include-other-group` 与 `policy-regex-filter` 继续分类。

**Architecture:** 以 `proxyPolicyUrl` 作为唯一远程来源。生成器只输出隐藏的 `📦 远程节点池`，所有需要节点的策略组引用该池并保留既有过滤器；删除第二个个人池及节点来源选择组。Sub-Store 的三个私有 Surge Profile File 继续只传递默认 `proxyPolicyUrl`，用户切换时编辑同一条 `policy-path`。本地节点模式和共享策略规则保持不变。

**Tech Stack:** Node.js ESM、Node built-in test runner、Surge profile renderer/validator、Sub-Store Profile File 脚本、GitHub Actions Pages。

## Global Constraints

- 不在仓库、测试输出、文档或命令回显中写入真实订阅 URL、API token 或个人节点信息；测试只使用 `example.invalid` 地址。
- `personalPolicyUrl` 从公开生成器选项中移除并按未知选项拒绝，避免悄悄生成第二个来源。
- 保留 `validateSurgeProfile` 对通用逗号分隔 `include-other-group` 的支持，不改变其他客户端、分流规则、DNS、节点命名和协议筛选逻辑。
- 所有代码修改使用 `apply_patch`；不使用破坏性 Git 操作。
- 每个任务完成后运行该任务列出的最小验证；最终合并前再运行完整测试、密钥扫描和构建快照检查。

---

## Task 1: 用测试锁定单池和手动替换行为

**Files:** `clients/surge/test/profile.test.js`, `clients/surge/test/options.test.js`（若测试文件名称不同，以仓库现有文件为准）。

- [ ] 将现有“双远程池”测试改为断言：远程 Profile 恰好包含一条 `policy-path=`，包含 `📦 远程节点池`，不包含 `🧩 个人节点池` 或 `🛠 节点来源`。
- [ ] 断言所有带 `policy-regex-filter=` 的策略组都引用 `include-other-group=📦 远程节点池`，并记录这些过滤行。
- [ ] 用第二个安全的 `proxyPolicyUrl` 替换生成 Profile 中唯一的 `policy-path`，再运行 `validateSurgeProfile`；断言所有分类过滤行完全不变。
- [ ] 将个人链接测试改为断言 `parseSurgeOptions({ personalPolicyUrl: ... })` 抛出未知 Surge 选项错误；保留代理链接不安全 URL 的拒绝测试。
- [ ] 先运行 Surge 测试，确认新断言在旧实现上失败，记录失败原因，再进入实现任务。

验证命令：`NODE=...; "$NODE" --test clients/surge/test/*.test.js`。

## Task 2: 实现唯一远程来源

**Files:** `clients/surge/src/options.js`, `clients/surge/src/render-groups.js`, `clients/surge/src/render-profile.js`。

- [ ] 从允许选项、解析结果和校验路径中移除 `personalPolicyUrl`，使其按未知选项 fail closed。
- [ ] 用单个 `remotePolicy` 对象替换双池数组；仅渲染隐藏的 `📦 远程节点池`，并保留更新间隔。
- [ ] 远程模式下所有带节点过滤器的共享组使用同一个 `include-other-group`，过滤表达式仍写入 `policy-regex-filter`；删除节点来源选择组和个人池引用。
- [ ] 将 `hasRemotePolicy` 简化为 `Boolean(options.proxyPolicyUrl)`；本地模式继续渲染内联节点并保持 DIRECT 回退行为。
- [ ] 运行 Task 1 测试及相关 validator 测试，确认实现满足单池、筛选和本地兼容性断言。

验证命令：`NODE=...; "$NODE" --test clients/surge/test/*.test.js`。

## Task 3: 更新公开文档、示例和生成器产物

**Files:** `clients/surge/README.md`, `docs/deployment.md`, `docs/troubleshooting.md`, 受影响的 Surge fixtures/examples/dist 文件。

- [ ] 删除 `personalPolicyUrl` 和“双池/节点来源”说明，明确默认 Sub-Store URL 是唯一来源。
- [ ] 增加手动切换说明：只替换 `📦 远程节点池` 的 `policy-path`，不要改组名；链接必须是 Surge 兼容输出（例如 `t=surge`），刷新后分类自动继续工作。
- [ ] 说明上游订阅若注释/筛掉节点，生成器不会恢复这些节点；只剩一个可用节点时显示一个节点是预期行为。
- [ ] 更新 fixtures/render 脚本中仍引用个人池的期望值；不得写入真实订阅 URL。
- [ ] 按仓库构建流程重建 Surge bundle 和 fixture，检查生成产物不再包含 `personalPolicyUrl`、个人池或节点来源组。

验证命令：`NODE=...; "$NODE" clients/surge/scripts/build.mjs && "$NODE" clients/surge/scripts/render-fixtures.mjs`。

## Task 4: 同步三个私有 Sub-Store Surge Profile File

**Files:** Sub-Store 中的 `surge-macos`、`surge-iphone`、`surge-ipad` Profile File 脚本（不写入仓库）。

- [ ] 保留默认 `proxyPolicyUrl` 参数，删除 `personalPolicyUrl` 参数；保持现有规则、节点筛选和其他选项不变。
- [ ] 保存后仅通过私有 API 检查 HTTP 状态、长度、远程池数量、个人池/来源组是否存在、分类 include 数量和最终策略组；不输出 Profile 内容或私有链接。
- [ ] 三个文件都应 HTTP 200、恰好一条 `policy-path`、无个人池/来源组、分类 include 数量大于零。

验证命令：使用浏览器会话保存后，对三个私有 raw endpoint 做脱敏字段检查；不得把响应正文打印到聊天或日志。

## Task 5: 全量构建与质量检查

**Files:** `current/` 和 `public/` 生成快照（由脚本更新）。

- [ ] 运行 `scripts/update-rules.mjs` 重建公开客户端快照和规则索引。
- [ ] 运行仓库全量单元测试、密钥扫描、快照 check、`git diff --check`。
- [ ] 检查生成的公开 Surge bundle 支持单池逻辑且不含个人 token/私有域名；确认 sing-box、Egern、小火箭、Anywhere 产物未被意外改写。

验证命令：

```sh
NODE=/Users/sunyuze/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
"$NODE" --test test/*.test.js automation/test/*.test.js
"$NODE" --test clients/*/test/*.test.js
"$NODE" scripts/check-secrets.mjs
"$NODE" scripts/update-rules.mjs --check
git diff --check
```

## Task 6: 提交、发布和线上验证

**Files:** Git history、GitHub PR、Pages deployment。

- [ ] 将计划、实现、文档和生成快照提交为有意图的 commit，推送 `agent/surge-remote-provider`。
- [ ] 创建指向 `main` 的 PR，描述单池语义、手动替换兼容性和验证结果；通过检查后 squash merge。
- [ ] 观察 Pages workflow 至成功，验证公开 Surge generator/bundle HTTP 200、无敏感字符串且已包含新单池逻辑。
- [ ] 再次验证三个私有 Sub-Store Profile File 的脱敏指标，并在交付说明中给出只编辑同一 `policy-path` 的使用方法。

## Plan self-review

- [ ] 检查计划无 `TODO`、`TBD`、`FIXME` 或未定义占位符；测试 URL 统一使用 `example.invalid`。
- [ ] 检查文件、函数名和命令与当前仓库一致；每个目标都对应至少一个测试或线上验证。
- [ ] 检查“唯一来源、手动替换、分类不变、私有 Sub-Store 同步、Pages 发布”五项需求均有明确实现和验收步骤。
