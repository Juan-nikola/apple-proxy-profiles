# Sub-Store 八客户端指南

公开层只提供无凭据脚本和规则，私密层由用户自己的 Sub-Store 保存节点来源、collection 和输出任务。所有新任务使用 `https://juan-nikola.github.io/apple-proxy-profiles/current/`。

## Collection

9 个手动 collection：`apple-proxy-all`、`apple-proxy-egern`、`apple-proxy-anywhere`、`apple-proxy-shadowrocket`、`apple-proxy-surge`、`apple-proxy-singbox`、`apple-proxy-happ`、`apple-proxy-v2box`、`apple-proxy-clash`。

## 脚本与任务

canonical catalog 共 30 个 File task。配置任务读取 schema v2 policy，节点任务不读取 policy。典型路径：

```text
current/egern/scripts/egern-node-generator.js
current/anywhere/scripts/anywhere-strategy-generator.js
current/shadowrocket/scripts/shadowrocket-profile-generator.js
current/surge/scripts/surge-profile-generator.js
current/sing-box/scripts/sing-box-config-generator.js
current/v2box/scripts/substore-config-generator.js
current/clash/scripts/clash-profile-generator.js
current/happ/scripts/happ-config-generator.js
```

参数放在 URL 的 `#` 后并用 `&` 分隔，不使用 `?`；生产任务固定 `channel=current`。HAPP 只允许 `macos`、`iphone`、`ipad`。

## policy JSON

单独建立一个私密 File task，输出 `apple-proxy-policy`，例如：

```json
{
  "ai": "NODE~美国 家宽",
  "github": "NODE~东京",
  "youtube": "FOLLOW",
  "apple": "DIRECT",
  "final": "FOLLOW"
}
```

不填写 `subscriptionTags`。查询词经过 Unicode 规范化后必须唯一命中同一节点；缺失、多候选或协议不兼容都会阻止生成。Surge、sing-box、Egern、Shadowrocket、Clash、Anywhere 保留客户端内切换；HAPP/V2Box 需要重新生成后才改变业务出口。

## 迁移

先 Preview 9 个 collection 和 30 个任务，再逐个替换客户端订阅。失败时切换设备上的旧 Profile/Config；HAPP 固定节点运行时仅允许 balancer 回退 FOLLOW。后台删除 OneXray、v2rayN 遗留对象及旧任务，保留新的 `apple-proxy-happ` collection。
