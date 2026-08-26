# 实施状态

Sub-Store 当前的十个 active 客户端 collection 边界、迁移和回滚见 [Sub-Store 客户端节点池指南](substore-client-pools.md)。HAPP、OneXray、v2rayN、V2Box 和 Clash Apple 已接入原生 renderer、GeoData、公开安装页和发布闭包；节点、Profile 与策略仍只在私密任务中生成。旧 `apple-proxy-sources` 保留作兼容/回滚入口。

| 里程碑 | 状态 | 说明 | 验证 |
| --- | --- | --- | --- |
| 共享核心与节点能力 | 已完成 | 共享协议、规范化、隐私边界；sing-box 默认 strict 失败关闭，显式 compatible 和其他客户端按 renderFailures 边界运行 | `npm run verify` |
| Shadowrocket | 已完成 | Profile 生成器内置节点归一化（兼容 Sub-Store 2.36）、macOS/iPhone/iPad Profile、规则和兼容入口 | workspace 测试、构建、线上 Sub-Store 输出验证 |
| Egern | 已完成 | 节点 YAML、macOS/iPhone/iPad Profile 和 Sub-Store 入口 | workspace 测试、构建、脱敏 fixtures |
| Anywhere | 已完成 | 节点 YAML、`.arrs` 规则分片、Manifest、全部导入页 | workspace 测试、规则检查、导入页测试 |
| Surge | 已完成 | macOS/iPhone/iPad Profile 和 Sub-Store 远程入口 | workspace 测试、构建、示例校验 |
| sing-box | 已完成 | macOS/iPhone/iPad/Android JSON、testing 最新 release edge、DNS response matching、ChinaIP rule-set、Egern 风格策略组；OpenWrt 暂缓 | workspace 测试、官方 core `format/check`、`.srs` 失败关闭测试 |
| Sub-Store 客户端文档 | 已完成 | `apple-proxy-all`、10 个 client collection、公开 JS、40 个任务、维护/编译/回滚指南 | 文档测试、秘密扫描 |
| GitHub Pages 公开发布 | 已完成 | 十个 active 客户端的无凭据 GeoData、安装页和私密 renderer 已通过自动化门禁并发布到唯一公开通道 `current/` | Actions 检查、current 闭包与秘密扫描 |
| 共享分流顺序与离线解释 | 已完成 | `DomesticCore` → 服务规则 → `OverseasGame` → `ChinaTLD` → `ChinaIP` → FINAL；`explain:route` 只读本地已发布规则、不执行 DNS | `npm run explain:route`、跨客户端回归与文档测试 |
| 独立业务组 | 已完成 | 恢复 16 个独立业务组；Netflix、Disney+、Spotify、国际媒体、Telegram、TikTok，以及 B 站、抖音、小红书、微博重新使用独立策略目标；sing-box 主组继续使用洲级两级结构 | 全客户端测试、fixtures 与 edge/current 发布验证 |
| 私密 Sub-Store 任务 | 已配置 | 11 个 collection、40 个任务已配置；正式任务使用 `current`，维护者可用同构的 `edge` URL 做隔离预览，旧入口保留作兼容/回滚 | canonical 配置校验、任务 URL 检查、公开脚本验证 |
| HAPP / OneXray 任务契约 | active | HAPP 六平台 JSON/审计任务与 OneXray 节点/Profile/审计任务仍是私密任务；公开层只提供无凭据 GeoData、manifest、安装页和脚本 | workspace 测试、GeoData round-trip、发布闭包、秘密扫描 |
| 公开审计与 blocker Issue | 已完成 | `audit/dashboard.json` 脱敏公开；edge blocker 使用 `audit-blocker` marker 同步，恢复后关闭 | dashboard/schema 测试、fake GitHub API 生命周期测试 |
| 上线后设备反馈 | 可选 | HAPP 六个平台的导入、联网、DNS、规则、网络切换和回滚清单用于实践反馈与排障；没有设备证据也不阻塞 `current` | 自动测试、规则预算、manifest 闭合、ChinaIP/v2fly 审计和秘密扫描 |

真实 Sub-Store API、节点 URL、凭据和生成后的私密输出 URL 不在本仓库保存。没有设备反馈时，只能说明自动化发布门禁已通过，不能描述为“已完成真机验证”。
