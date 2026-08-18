# 实施状态

Sub-Store 当前的五个 active 客户端 collection 边界、迁移和回滚见 [Sub-Store 客户端节点池指南](substore-client-pools.md)。OneXray 与 HAPP 已注册为 `planned`，不生成原生 renderer；旧 `apple-proxy-sources` 保留作兼容/回滚入口。任务契约目标总数为 23（现有 17 个公开任务 + 6 个 planned/private 任务）。

| 里程碑 | 状态 | 说明 | 验证 |
| --- | --- | --- | --- |
| 共享核心与节点能力 | 已完成 | 共享协议、规范化、隐私边界；sing-box 默认 strict 失败关闭，显式 compatible 和其他客户端按 renderFailures 边界运行 | `npm run verify` |
| Shadowrocket | 已完成 | Profile 生成器内置节点归一化（兼容 Sub-Store 2.36）、macOS/iPhone/iPad Profile、规则和兼容入口 | workspace 测试、构建、线上 Sub-Store 输出验证 |
| Egern | 已完成 | 节点 YAML、macOS/iPhone/iPad Profile 和 Sub-Store 入口 | workspace 测试、构建、脱敏 fixtures |
| Anywhere | 已完成 | 节点 YAML、`.arrs` 规则分片、Manifest、全部导入页 | workspace 测试、规则检查、导入页测试 |
| Surge | 已完成 | macOS/iPhone/iPad Profile 和 Sub-Store 远程入口 | workspace 测试、构建、示例校验 |
| sing-box | 重写中 | macOS/iPhone/iPad/Android JSON、testing 最新 release edge、DNS response matching、ChinaIP rule-set、Egern 风格策略组；OpenWrt 暂缓 | workspace 测试、官方 core `format/check`、`.srs` 失败关闭测试 |
| Sub-Store 客户端文档 | 已完成 | `apple-proxy-all`、5 个 client collection、公开 JS、17 个任务、维护/编译/回滚指南 | 文档测试、秘密扫描 |
| GitHub Pages 公开发布 | 已完成 | `current/`、`edge/`、规则和脚本入口可由 Pages 发布 | Actions 检查、公开 URL HTTP 200 |
| 共享分流顺序与离线解释 | 已完成 | `DomesticCore` → 服务规则 → `OverseasGame` → `ChinaTLD` → `ChinaIP` → FINAL；`explain:route` 只读本地已发布规则、不执行 DNS | `npm run explain:route`、跨客户端回归与文档测试 |
| 独立业务组 | 已完成 | 恢复 16 个独立业务组；Netflix、Disney+、Spotify、国际媒体、Telegram、TikTok，以及 B 站、抖音、小红书、微博重新使用独立策略目标；sing-box 主组继续使用洲级两级结构 | 全客户端测试、fixtures 与 edge/current 发布验证 |
| 私密 Sub-Store 任务 | 待用户迁移 | 保留旧 collection/tasks，按 canonical 指南建立总池与五个 client collection，再逐客户端切换 `name=` | preview、refresh/计数对比、旧 URL 回滚演练 |
| HAPP / OneXray 任务契约 | planned | `happ-subscription`、`happ-routing-audit`、`onexray-nodes`、`onexray-profile`、`onexray-routing-audit` 与 `apple-proxy-policy` 只记录边界，不可创建原生公开任务 | renderer、fixture、协议验证和 canary 尚未完成 |
| 公开审计与 blocker Issue | 已完成 | `audit/dashboard.json` 脱敏公开；edge blocker 使用 `audit-blocker` marker 同步，恢复后关闭 | dashboard/schema 测试、fake GitHub API 生命周期测试 |
| 真机 canary | 待用户执行 | 需要按各客户端清单逐台导入、联网、DNS、规则和回滚 | 自动测试不能替代设备验收 |

真实 Sub-Store API、节点 URL、凭据和生成后的私密输出 URL 不在本仓库保存。没有用户设备验收证据时，本项目不能描述为“已完成真机验证”。
