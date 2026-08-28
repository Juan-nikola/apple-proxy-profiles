# 实施状态

七客户端收敛已完成：注册表、能力矩阵、协议表、发布清单和 public current 均只包含 active 客户端。

统一策略使用 schema v2，路由顺序为 `ChinaTLD -> ChinaIP -> 默认代理`；schema v1 仅保留迁移读取。Surge 使用单远程节点池，发布流程 current-only 并支持 previous 回滚。

Sub-Store 目标为 8 个 collection、27 个 canonical task。旧客户端后台 collection 和 File task 需要按迁移清单手动删除。
