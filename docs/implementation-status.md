# 实施状态

| 里程碑 | 状态 | 说明 | 验证 |
| --- | --- | --- | --- |
| 共享核心与节点能力 | 已完成 | 共享协议、规范化、能力过滤和隐私边界已建立 | `npm run verify` |
| Shadowrocket | 已完成 | 节点 Operator、macOS/iPhone/iPad Profile、规则和兼容入口 | workspace 测试、构建、兼容性检查 |
| Egern | 已完成 | 节点 YAML、macOS/iPhone/iPad Profile 和 Sub-Store 入口 | workspace 测试、构建、脱敏 fixtures |
| Anywhere | 已完成 | 节点 YAML、`.arrs` 规则分片、Manifest、全部导入页 | workspace 测试、规则检查、导入页测试 |
| Surge | 已完成 | macOS/iPhone/iPad Profile 和 Sub-Store 远程入口 | workspace 测试、构建、示例校验 |
| sing-box | 已完成 | macOS/iPhone/iPad/Android/OpenWrt JSON、testing edge 通道、官方 core 编译边界 | workspace 测试、配置校验、`.srs` 失败关闭测试 |
| Sub-Store 五客户端文档 | 已完成 | `apple-proxy-sources`、7 个公开 JS、17 个任务、维护/编译/回滚指南 | 文档测试、秘密扫描 |
| GitHub Pages 公开发布 | 已完成 | `current/`、`edge/`、规则和脚本入口可由 Pages 发布 | Actions 检查、公开 URL HTTP 200 |
| 私密 Sub-Store 任务 | 待在用户实例完成 | 需要在用户自己的 Sub-Store 创建 `apple-proxy-sources` 和 17 个任务 | 以 Sub-Store 预览和私密输出为准 |
| 真机 canary | 待用户执行 | 需要按各客户端清单逐台导入、联网、DNS、规则和回滚 | 自动测试不能替代设备验收 |

真实 Sub-Store API、节点 URL、凭据和生成后的私密输出 URL 不在本仓库保存。没有用户设备验收证据时，本项目不能描述为“已完成真机验证”。
