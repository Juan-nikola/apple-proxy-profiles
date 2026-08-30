# 实施状态

八客户端收敛已完成：注册表、能力矩阵、协议表、发布清单和 public current 均只包含 active 客户端。

统一策略使用 schema v2，路由顺序为 `ChinaTLD -> ChinaIP -> 漏网之鱼`；schema v1 仅保留迁移读取。`apple-proxy-policy.final` 控制漏网组默认出口，支持 `FOLLOW`、`DIRECT` 和 `NODE~查询词`，发布流程 current-only 并支持 previous 回滚。

Sub-Store 目标为 9 个手动 collection、30 个 canonical task，其中新增 HAPP 三平台配置任务。OneXray、v2rayN 旧后台 collection 和 File task 需要按迁移清单手动删除。
