# Surge 单池单链接设计

## 背景

当前 Surge 远程 Profile 同时生成默认远程节点池和个人节点池，并通过“节点来源”策略组切换。用户手动替换或注释其中一个来源后，地区和来源分类仍然围绕多个池工作，容易出现界面只显示一个池、自动分类结果不符合预期的问题。

## 目标

1. 每个 Surge Profile 只生成一个远程节点池和一个订阅链接。
2. 默认链接仍由 Sub-Store 的 `proxyPolicyUrl` 提供。
3. 用户只修改该池的 `policy-path` 时，亚太、欧洲、机场、自建和其他分类继续生效。
4. 保留 Surge 专用节点兼容筛选；被用户在上游订阅中注释的节点不重新加入。
5. 公开仓库不包含任何个人订阅地址或凭据。

## 非目标

- 不在 Surge Profile 中合并多个订阅源。
- 不为 Egern、Shadowrocket、sing-box 或 Anywhere 增加个人订阅入口。
- 不改变节点名称规范、规则集内容或 DNS 策略。

## 设计

### Profile 结构

当 `proxyPolicyUrl` 存在时，生成唯一的隐藏远程池：

```ini
📦 远程节点池 = select,policy-path=DEFAULT_SURGE_NODES_URL,update-interval=21600,hidden=1
```

所有自动组和分类组都使用同一个 `include-other-group=📦 远程节点池`，并继续携带各自的 `policy-regex-filter`。生成器不再接受或渲染 `personalPolicyUrl`、`🧩 个人节点池` 和 `🛠 节点来源`。

用户手动将 `📦 远程节点池` 的 `policy-path` 替换成另一个 Surge 兼容订阅后，策略组名称和过滤器不变，因此分类逻辑自动作用于新订阅。

### Sub-Store

三个现有 Surge Profile 私密任务继续使用 `proxyPolicyUrl`，移除 `personalPolicyUrl` 参数。默认节点链接由 `apple-proxy-sources` 的 Surge 专用节点任务提供；用户需要换源时只编辑 Surge 中唯一远程池的 `policy-path`，不修改生成脚本或公开仓库。

### 兼容性

- 远程 Profile 的 `[Proxy]` 仍为空，节点由唯一 `policy-path` 动态加载。
- 本地内嵌节点模式继续支持 `proxyPolicyUrl` 为空的情况。
- `validateSurgeProfile` 可继续解析通用的逗号分隔 `include-other-group`，但生成的 Surge Profile 只输出一个远程池引用。
- `personalPolicyUrl` 的旧参数应被拒绝或明确忽略，避免形成第二个隐藏来源；文档统一迁移到单池用法。

## 验证

新增或调整测试覆盖：

1. 远程 Profile 只包含一个 `policy-path` 和一个远程池。
2. 远程 Profile 不包含个人池或来源选择器。
3. 所有分类组都引用同一个远程池并保留 `policy-regex-filter`。
4. 将 `policy-path` 替换成另一个 HTTPS 地址后，Profile 仍通过结构验证，分类过滤器不变。
5. 三个平台示例、Sub-Store 入口、dist bundle 和公开 Pages 快照保持一致。
6. 完整测试、规则快照校验和密钥扫描通过。

## 发布与回滚

实现完成后重新生成客户端 bundle、示例和 `public` 快照，提交到主分支并等待 Pages 部署成功。若新 Profile 验证失败，回滚到实施前的主分支提交；个人订阅地址只存在于 Sub-Store 私密任务，不参与 Git 回滚。
