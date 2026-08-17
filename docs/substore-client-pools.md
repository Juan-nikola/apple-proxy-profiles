# Sub-Store 客户端节点池与迁移指南

本页是 Sub-Store collection 的 canonical 人工边界。公开仓库不保存任何私密节点或 Sub-Store 输出；文中名称均为合成名称，示例输出地址只使用 `https://example.invalid/private/<client-output>`。

## Collection 边界

`apple-proxy-all` 是用户在自己 Sub-Store 中建立的总池，用于汇总用户自己选择的来源。它不是仓库发布物，也不是五个客户端任务的直接输入。五个客户端分别读取下列 client collection：

| 客户端 | SubStore 组合 | 维护原则 |
| --- | --- | --- |
| Egern | `apple-proxy-egern` | 用户自行选择来源、AnyTLS 和字段形状 |
| Anywhere | `apple-proxy-anywhere` | 用户自行选择 Anywhere 可导入的节点，远程输出只有节点列表 |
| Shadowrocket | `apple-proxy-shadowrocket` | 用户自行选择节点；AnyTLS 等已实现类型可直接包含 |
| Surge | `apple-proxy-surge` | 用户自行选择节点；renderer 无法表示的协议跳过并计入 renderFailures |
| sing-box | `apple-proxy-singbox` | 默认 strict；任一已选节点无法完整表示时失败，迁移期可显式使用 compatible |

用户必须在 Sub-Store 中自行选择每个 client collection 的成员。生成器不做客户端能力白名单过滤：勾选什么节点就处理什么节点。sing-box 默认使用 `nodeErrorMode=strict`，任一已选节点无法完整渲染时整个任务失败；这能避免私密组合与实际配置不一致。只有迁移期显式使用 `nodeErrorMode=compatible` 时，才保留可渲染子集并把跳过计数写入 `renderFailures`，不会静默丢弃。其他客户端仍按各自文档的 `renderFailures` 边界执行。

> 本用户部署中的 `xiaov` 来源跳过不使用，不要加入 `apple-proxy-all` 或任何 client collection。

## 手工迁移顺序

一次只迁移一个客户端，严格按下列顺序操作：

1. **保留旧 collection 和 tasks**：不重命名、不覆盖、不删除现有输出。
2. **建立 `apple-proxy-all` 总池**：只添加用户已单独预览过的来源。
3. **建立五个客户端组合**：按上表精确创建五个名称，并从总池选择成员。
4. **用户自行筛选**：直接编辑对应 collection 选择要包含的节点；生成器不按客户端能力白名单过滤。sing-box 默认 strict，无法表示任一已选节点就失败；其他客户端和 sing-box 的显式 compatible 模式才会跳过并计入 `renderFailures`。
5. **preview**：逐个预览五个 client collection，记录节点总数和各协议计数；任何失败先停止迁移。
6. **只修改对应客户端的 `name=`**：将该客户端的 File/Script tasks 指向它自己的 collection，不改其他客户端任务。
7. **refresh 并对比计数**：刷新该客户端的节点与 Profile/Config 任务，将输入数、输出数与 preview 记录对比。
8. **保留旧 URL 回滚**：新输出完成客户端灰度验收前，旧 URL 始终保留可用。

## 兼容与回滚

`apple-proxy-sources` 是保留的兼容/回滚路径，不是新部署的五客户端共享输入。迁移期间保留该 collection、所有旧 tasks 与私密旧 URL。若新任务 preview、refresh、计数对比或客户端灰度任一失败，立即在该客户端切回旧 URL，无需更改其他客户端。

## 协议标签与固定节点名称迁移

节点规范化后，新名称使用 `· <Protocol>` 协议标签。任何外部 exact-name 引用都不会自动跟随改名：先 preview 对应 client collection，确认规范化后的新名称，再更新固定名称引用。若固定目标无法解析，保持旧 URL 并停止迁移。
