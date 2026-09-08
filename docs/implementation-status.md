# 实施状态

当前注册表覆盖十一个客户端，Hiddify Next 新增六平台生成器。Hiddify 的真实设备导入和分流验收尚未完成，完整配置需要保留 DNS/route 的 raw config 运行路径。

统一策略使用 schema v3 按客户端分层，路由顺序为 `ChinaTLD -> ChinaIP -> 漏网之鱼`；schema v1/v2 仅保留兼容读取。每个客户端都使用同一组中文业务名，Surge 的 AI 默认 `FOLLOW`，既有其他客户端的示例 AI 为 `NODE~🇺🇸qqpw家宽|vless`，Hiddify 新层默认 `FOLLOW`，需要固定出口时独立核对其节点池。`apple-proxy-policy.final` 控制漏网组默认出口，支持 `FOLLOW`、`DIRECT` 和 `NODE~查询词`，发布流程 current-only 并支持 previous 回滚。

Sub-Store 目标为 12 个手动 collection、49 个 canonical task，其中 40 个是配置任务，包含 v2rayN 的 sing-box/Xray 双 core 任务。OneXray 旧后台 collection 和 File task 需要按迁移清单手动删除。

Task 9 已完成：INCY 的端到端路由、secret-free 安全覆盖和跨客户端语义验证已接入，root verify 保持全仓库验证契约，INCY workspace verify 额外包含 JSON 规范校验。

旧十层 schema v3 policy 继续用于既有客户端；Hiddify 生成时要求独立的完整 13 项 target 层，不隐式继承 sing-box 固定节点。
