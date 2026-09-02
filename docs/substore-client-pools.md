# Sub-Store 客户端节点池

Sub-Store 由用户自己保存节点来源和筛选结果。仓库只提供公开 renderer，不接触你的私密订阅地址。当前维护 10 个手动 collection：一个总池和九个客户端池。

| 客户端 | Collection | 说明 |
| --- | --- | --- |
| 总池 | `apple-proxy-all` | 汇总用户选择的来源，不直接作为 Profile 输入 |
| Surge | `apple-proxy-surge` | 默认主力；单远程节点池，Profile 自动更新 |
| Shadowrocket | `apple-proxy-shadowrocket` | 轻量节点订阅和 Profile |
| Egern | `apple-proxy-egern` | Apple 原生 YAML Profile |
| sing-box | `apple-proxy-singbox` | macOS、iPhone、iPad、Android Config |
| Anywhere | `apple-proxy-anywhere` | `.arrs` 规则和手动策略绑定 |
| HAPP | `apple-proxy-happ` | macOS、iPhone、iPad 的 Xray JSON 固定业务出口 |
| V2Box | `apple-proxy-v2box` | Xray JSON；使用共享 GeoData |
| Clash Apple | `apple-proxy-clash` | Mihomo YAML 节点和 Config |
| INCY | `apple-proxy-incy` | JSON 数组 + autorouting |

## 选择规则

先在总池中确认来源，再把节点手动加入客户端池。每个 renderer 会按协议和字段能力检查输入；遇到不兼容节点时严格失败关闭或记录 `renderFailures`，不会静默生成错误配置。sing-box 默认 `nodeErrorMode=strict`。

Surge 推荐使用 `surge-nodes` 任务生成节点资源，再由三个平台 Profile 任务引用同一个远程池。这样切换节点只更新一次，Profile 不需要重新复制节点。

V2Box 节点任务和配置任务分开：节点任务只输出 JSON 节点，配置任务读取 `public/current/geodata/<region>/` 的共享 GeoData。地区参数只改变规则资产，不改变节点池。

## 迁移顺序

1. Preview `apple-proxy-all`，确认来源和节点数量。
2. 先建立 `apple-proxy-surge`，完成 Surge macOS、iPhone、iPad 导入。
3. 需要其他客户端时，再从总池复制节点到对应 collection 并 Preview 其任务。
4. 新任务统一使用 `/current/` URL 和 `channel=current`。
5. 验证完成后，手动删除旧 collection `apple-proxy-onexray`、`apple-proxy-v2rayn` 及其旧 File task；新的 `apple-proxy-happ` collection 保留并使用三个 HAPP 配置任务。

## 回滚

设备侧保留上一份 Profile/Config。新任务 Preview 失败时先切回本地旧配置，再修正同一个 collection；不要更换未知 URL，也不要把节点凭据提交到公开仓库。
