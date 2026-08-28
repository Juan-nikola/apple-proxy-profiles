# Sub-Store 七客户端指南

公开层只提供无凭据脚本和规则，私密层由用户自己的 Sub-Store 保存节点来源、collection 和输出任务。所有新任务使用 `https://juan-nikola.github.io/apple-proxy-profiles/current/`。

## Collection

8 个 collection：`apple-proxy-all`、`apple-proxy-egern`、`apple-proxy-anywhere`、`apple-proxy-shadowrocket`、`apple-proxy-surge`、`apple-proxy-singbox`、`apple-proxy-v2box`、`apple-proxy-clash`。

## 脚本与任务

canonical catalog 共 27 个 File task。配置任务读取 schema v2 policy，节点任务不读取 policy。典型路径：

```text
current/egern/scripts/egern-node-generator.js
current/anywhere/scripts/anywhere-strategy-generator.js
current/shadowrocket/scripts/shadowrocket-profile-generator.js
current/surge/scripts/surge-profile-generator.js
current/sing-box/scripts/sing-box-config-generator.js
current/v2box/scripts/substore-config-generator.js
current/clash/scripts/clash-profile-generator.js
```

参数放在 URL 的 `#` 后并用 `&` 分隔，不使用 `?`；生产任务固定 `channel=current`。

## 迁移

先 preview 七个 collection 和任务，再逐个替换客户端订阅。失败时切换设备上的旧 Profile/Config。后台手动删除 `apple-proxy-happ`、`apple-proxy-onexray`、`apple-proxy-v2rayn` 及对应旧 File task。
