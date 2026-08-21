# Sub-Store 客户端节点池与迁移指南

本页是 Sub-Store collection 的 canonical 人工边界。公开仓库不保存任何私密节点或 Sub-Store 输出；文中名称均为合成名称，示例输出地址只使用 `https://example.invalid/private/<client-output>`。

## Collection 边界

`apple-proxy-all` 是用户在自己 Sub-Store 中建立的总池，用于汇总用户自己选择的来源。它不是仓库发布物，也不是七个 active 客户端任务的直接输入。七个 active 客户端分别读取下列 client collection；HAPP 与 OneXray 已有原生 renderer、公开无凭据脚本和私密任务契约：

| 客户端 | SubStore 组合 | 维护原则 |
| --- | --- | --- |
| Egern | `apple-proxy-egern` | 用户自行选择来源、AnyTLS 和字段形状 |
| Anywhere | `apple-proxy-anywhere` | 用户自行选择 Anywhere 可导入的节点，远程输出只有节点列表 |
| Shadowrocket | `apple-proxy-shadowrocket` | 用户自行选择节点；AnyTLS 等已实现类型可直接包含 |
| Surge | `apple-proxy-surge` | 用户自行选择节点；renderer 无法表示的协议跳过并计入 renderFailures |
| sing-box | `apple-proxy-singbox` | 默认 strict；任一已选节点无法完整表示时失败，迁移期可显式使用 compatible |
| OneXray | `apple-proxy-onexray` | 用户自行选择节点；节点任务输出 Xray JSON，Profile/审计对不兼容和固定节点问题失败关闭 |
| HAPP | `apple-proxy-happ` | 用户自行选择节点；六平台配置与审计共享同一策略覆盖，固定节点问题写入私密 warning |

### 标签不是必需条件

Sub-Store 里的 `sing-box-client` 只是筛选辅助标签，不是 sing-box 或本项目要求的节点字段。它可以删除，也可以完全不使用。真正决定节点是否进入配置的是 `apple-proxy-singbox` collection 中的最终手动选择结果，以及节点本身是否能被 sing-box 完整转换。

推荐新手这样设置 `apple-proxy-singbox`：

1. 先记录旧 collection 的 preview 节点数。
2. 移除以 `sing-box-client` 为条件的筛选。
3. 在 collection 中手动勾选想给 sing-box 使用的节点。
4. Preview `apple-proxy-singbox`，确认节点数量大于 0。
5. 再 Preview 四个平台的 `singbox-config-*` 任务。
6. 全部通过后再刷新客户端。

不要改动机器绑定键：collection slug 仍必须是 `apple-proxy-singbox`，任务 URL 里的 `name=apple-proxy-singbox` 也必须保持一致。标签可以中文、英文或不存在，但 collection slug 和 `name=` 不能中文化。

HAPP 和 OneXray 使用同样的手动组合原则，分别维护 `apple-proxy-happ` 和 `apple-proxy-onexray`。它们不会要求节点带 `sing-box-client`，但仍会按各自协议能力过滤或拒绝不兼容节点。

### HAPP / OneXray 边界

这两个客户端已经进入 `active` 发布状态，但仍必须先做设备 canary。`onexray-nodes` 只输出节点订阅，不读取业务策略；`onexray-profile`、`onexray-routing-audit`、六个平台 HAPP 配置任务和 `happ-routing-audit` 必须使用同一 `channel`、策略覆盖、公开 Manifest 和 GeoData 绑定。公开 Pages 只提供无凭据脚本、安装页和 GeoData，真实节点与策略仍只在私密 Sub-Store 任务中生成。

用户必须在 Sub-Store 中自行选择每个 client collection 的成员。选择决定输入范围，但各客户端适配层仍会按官方格式和字段能力过滤、拒绝或失败关闭；HAPP/OneXray 的审计会记录排除原因。sing-box 默认使用 `nodeErrorMode=strict`，任一已选节点无法完整渲染时整个任务失败；这能避免私密组合与实际配置不一致。只有迁移期显式使用 `nodeErrorMode=compatible` 时，才保留可渲染子集并把跳过计数写入 `renderFailures`，不会静默丢弃。其他客户端仍按各自文档的 `renderFailures` 边界执行。

## 手工迁移顺序

一次只迁移一个客户端，严格按下列顺序操作：

1. **保留旧 collection 和 tasks**：不重命名、不覆盖、不删除现有输出。
2. **建立 `apple-proxy-all` 总池**：只添加用户已单独预览过的来源。
3. **建立七个客户端组合**：按上表精确创建七个名称，并从总池选择成员。
4. **用户自行筛选**：直接编辑对应 collection 选择要包含的节点；生成器不按客户端能力白名单过滤。sing-box 默认 strict，无法表示任一已选节点就失败；其他客户端和 sing-box 的显式 compatible 模式才会跳过并计入 `renderFailures`。
5. **preview**：逐个预览七个 client collection，记录节点总数和各协议计数；任何失败先停止迁移。
6. **只修改对应客户端的 `name=`**：将该客户端的 File/Script tasks 指向它自己的 collection，不改其他客户端任务。
7. **refresh 并对比计数**：刷新该客户端的节点与 Profile/Config 任务，将输入数、输出数与 preview 记录对比。
8. **保留旧 URL 回滚**：新输出完成客户端灰度验收前，旧 URL 始终保留可用。

## 兼容与回滚

`apple-proxy-sources` 是保留的兼容/回滚路径，不是新部署的七客户端共享输入。迁移期间保留该 collection、所有旧 tasks 与私密旧 URL。若新任务 preview、refresh、计数对比或客户端灰度任一失败，立即在该客户端切回旧 URL，无需更改其他客户端。

## 协议标签与固定节点名称迁移

节点规范化后，新名称使用 `· <Protocol>` 协议标签。任何外部 exact-name 引用都不会自动跟随改名：先 preview 对应 client collection，确认规范化后的新名称，再更新固定名称引用。若固定目标无法解析，保持旧 URL 并停止迁移。
