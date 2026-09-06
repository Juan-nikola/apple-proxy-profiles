# 实施状态

十客户端收敛已完成：注册表、能力矩阵、协议表、发布清单和 public current 均只包含 active 客户端。

统一策略使用 schema v3 按客户端分层，路由顺序为 `ChinaTLD -> ChinaIP -> 漏网之鱼`；schema v1/v2 仅保留兼容读取。每个客户端都使用同一组中文业务名，Surge 的 AI 默认 `FOLLOW`，其他客户端的 AI 默认 `NODE~🇺🇸qqpw家宽|vless`。`apple-proxy-policy.final` 控制漏网组默认出口，支持 `FOLLOW`、`DIRECT` 和 `NODE~查询词`，发布流程 current-only 并支持 previous 回滚。

Sub-Store 目标为 11 个手动 collection、43 个 canonical task，其中 34 个是配置任务，包含 v2rayN 的 sing-box/Xray 双 core 任务。OneXray 旧后台 collection 和 File task 需要按迁移清单手动删除。

Task 9 已完成：INCY 的端到端路由、secret-free 安全覆盖和跨客户端语义验证已接入，root verify 保持全仓库验证契约，INCY workspace verify 额外包含 JSON 规范校验。
