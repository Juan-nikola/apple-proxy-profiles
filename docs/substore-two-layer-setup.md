# Sub-Store 九客户端指南

公开层只提供无凭据脚本和规则，私密层由用户自己的 Sub-Store 保存节点来源、collection 和输出任务。所有新任务使用 `https://juan-nikola.github.io/apple-proxy-profiles/current/`。

## Collection

10 个手动 collection：`apple-proxy-all`、`apple-proxy-egern`、`apple-proxy-anywhere`、`apple-proxy-shadowrocket`、`apple-proxy-surge`、`apple-proxy-singbox`、`apple-proxy-happ`、`apple-proxy-v2box`、`apple-proxy-clash`、`apple-proxy-incy`。

## 脚本与任务

canonical catalog 共 38 个 File task。每个 generator task 都是“File + Script Operator”：File 源内容留空，Script Operator 以远程链接引用下面的 JS；不要把 JS 放到 File 的远程源文件字段。配置任务读取 schema v3 按客户端分层的 policy，节点任务不读取 policy。典型路径：

```text
current/egern/scripts/egern-node-generator.js
current/anywhere/scripts/anywhere-strategy-generator.js
current/shadowrocket/scripts/shadowrocket-profile-generator.js
current/surge/scripts/surge-profile-generator.js
current/sing-box/scripts/sing-box-config-generator.js
current/v2box/scripts/substore-config-generator.js
current/clash/scripts/clash-profile-generator.js
current/happ/scripts/happ-config-generator.js
current/incy/scripts/incy-config-generator.js
```

参数放在 URL 的 `#` 后并用 `&` 分隔，不使用 `?`；生产任务固定 `channel=current`。HAPP 只允许 `macos`、`iphone`、`ipad`。

## 参数含义与可用值

以下参数由各客户端生成器共同使用或按客户端扩展。参数名和值区分大小写；只填写表中的值。当前私密 Sub-Store 的 30 个配置任务已统一设置为 `ipv6Mode=ipv4-only`，以避免无可用 IPv6 路由时出现连接失败。

| 参数 | 含义 | 可用值 | 当前生产配置 |
| --- | --- | --- | --- |
| `output` | 输出节点订阅或完整配置 | `nodes`、`config` | 节点任务 `nodes`；配置任务 `config` |
| `type` | Sub-Store 输入类型 | `collection` | `collection` |
| `name` | 输入 collection 名称 | 对应 collection 标识 | 各客户端的 `apple-proxy-*` |
| `subscriptionName` | 输出中引用的节点订阅名称 | 任意非空单行文本 | 与客户端节点订阅显示名完全一致 |
| `platform` | 目标平台 | 由客户端限制为 `macos`、`iphone`、`ipad`、`appletv`、`android`、`androidtv`、`windows` 或 `linux` | 按任务填写 |
| `channel` | 公开脚本与规则发布通道 | 当前生产只用 `current` | `current` |
| `dnsMode` | DNS 策略预设 | `stable`、`privacy`、`speed` | `stable` |
| `chinaDns` | 国内域名 DNS | `alidns`、`dnspod`、`system` | `alidns` |
| `globalDns` | 境外域名 DNS | `cloudflare`、`google`、`quad9` | `cloudflare` |
| `blockMode` | 安全/广告/跟踪规则拦截强度 | `balanced`、`security`、`strict`、`off` | `balanced` |
| `quicMode` | UDP/443（QUIC）处理策略 | `allow`、`proxy-block`、`all-block` | `proxy-block` |
| `ipv6Mode` | IPv4/IPv6 解析和连接策略 | `auto`、`ipv4-only` | 所有 30 个配置任务 `ipv4-only` |
| `autoGroupMode` | 自动测速和地区分组规模 | `auto`、`full`、`balanced`、`minimal` | `auto` |
| `clientChain` | 是否启用客户端链式入口/落地 | `off`、`on` | `off` |
| `adblockMode` | 是否加载完整广告规则包 | `off`、`full` | `off` |
| `nodeErrorMode` | sing-box 不兼容节点的处理方式 | `strict`、`compatible` | `strict` |
| `profileMode` | sing-box 配置模式 | `light`、`diagnostic` | `light` |
| `region` | V2Box GeoData 区域 | `cn`、`global`、`ru`、`ir` | `cn` |

`ipv6Mode=auto` 允许系统使用 IPv6，适合已经确认 IPv6 可达的网络；`ipv6Mode=ipv4-only` 只使用 IPv4，适合没有可用 IPv6 路由或日志出现 `no route to host` 的网络。IPv4-only 主要解决地址族和路由失败，不会单独解决规则包过大造成的内存不足。`quicMode=proxy-block` 只阻止代理路径上的 QUIC，`all-block` 阻止全部 QUIC，`allow` 不阻止 QUIC。`adblockMode=full` 会加载额外广告规则并增加内存占用，移动端保持 `off`；sing-box 和 Clash 移动端不能使用 `full`。

`nodeSubscriptionUrl`、`proxyPolicyUrl` 只能填写你自己的 HTTPS 私密地址，不能提交到仓库。V2Box 的 `clientChainTarget` 只有在 `clientChain=on` 时使用 `NODE:节点名` 格式；`policyOverrides` 是可选的 V2Box 业务策略覆盖，不需要时留空。Sub-Store 的 `noCache` 和 `insecure` 是界面开关而非脚本参数，生产任务应关闭两者。

## policy JSON

单独建立一个私密 File task，内容输出名为 `apple-proxy-policy`。使用 schema v3：顶层包含 9 个客户端层，每层嵌套 schema v2，并完整填写以下 13 个业务目标。业务组显示名由生成器固定为中文，不要在各客户端另建英文同名组：

```json
{
  "schemaVersion": 3,
  "clients": {
    "surge": {
      "schemaVersion": 2,
      "targets": {
        "ai": "FOLLOW",
        "github": "FOLLOW",
        "youtube": "FOLLOW",
        "overseasMedia": "FOLLOW",
        "globalSocial": "FOLLOW",
        "apple": "DIRECT",
        "microsoft": "DIRECT",
        "domesticPlatform": "DIRECT",
        "overseasGame": "FOLLOW",
        "game": "DIRECT",
        "download": "DIRECT",
        "dnsAndRules": "FOLLOW",
        "final": "FOLLOW"
      }
    },
    "sing-box": {
      "schemaVersion": 2,
      "targets": {
        "ai": "NODE~🇺🇸qqpw家宽|vless",
        "github": "FOLLOW",
        "youtube": "FOLLOW",
        "overseasMedia": "FOLLOW",
        "globalSocial": "FOLLOW",
        "apple": "DIRECT",
        "microsoft": "DIRECT",
        "domesticPlatform": "DIRECT",
        "overseasGame": "FOLLOW",
        "game": "DIRECT",
        "download": "DIRECT",
        "dnsAndRules": "FOLLOW",
        "final": "FOLLOW"
      }
    }
  }
}
```

示例只展开 Surge 和 sing-box；实际 policy 还必须包含 `anywhere`、`egern`、`shadowrocket`、`happ`、`v2box`、`clash`、`incy` 七层，且每层都完整填写同一组 targets。Surge 的 `ai` 保持 `FOLLOW`；sing-box、Egern、Shadowrocket、Anywhere、HAPP、V2Box、Clash、INCY 的 `ai` 使用 `NODE~🇺🇸qqpw家宽|vless`。不填写 `subscriptionTags`。所有完整配置任务读取这一个 policy，节点订阅任务只输出节点、不读取 policy。`final` 可填写 `FOLLOW`（默认 `🚀 节点选择`）、`DIRECT`（默认直连）或 `NODE~查询词`（默认固定节点）；旧字段名 `最终兜底` 仍会映射到 `final`。支持策略组的客户端会把 `漏网之鱼` 生成为 `🚀 节点选择`、`DIRECT`、`REJECT` 三选一，且 `REJECT` 仅供手动排查，不作为默认值。查询词经过 Unicode 规范化后必须唯一命中同一节点；缺失、多候选或协议不兼容都会阻止生成。节点展示名的旗帜、协议和 `·U` UDP 标记由生成器自动追加，不要把这些后缀复制进查询词；同名节点按协议区分时使用 `NODE~查询词|vless`。Surge 当前不支持 VLESS，使用该固定目标会让 Surge 任务按设计失败关闭，需保持 `FOLLOW` 或改用 Surge 支持的协议。Anywhere 的 `anywhere-strategy` 只输出脱敏的 `localAssignments` 核对结果，不能通过远程文件自动导入业务组绑定或 `漏网之鱼` 默认出口，必须在 App 内手动设置；HAPP/V2Box/INCY 需要重新 Preview 后才改变生成的 Xray 出口。固定节点不存在或不兼容时任务失败，不静默回退。

`final` 不改变前面的业务规则、广告/劫持拦截或 `ChinaTLD`/`ChinaIP` 规则；它只负责最后的未知流量。完整配置首次导入会采用 policy 默认值，但客户端若已缓存用户手动选择，刷新时可能继续保留该选择，需要在客户端手动切换一次。生产默认保持 `FOLLOW` 或按 policy 指定节点，不要把所有未知流量默认设成 `REJECT`。

## 迁移

先 Preview 10 个 collection 和 38 个任务，再逐个替换客户端订阅。失败时切换设备上的旧 Profile/Config；HAPP 固定节点运行时仅允许 balancer 回退 FOLLOW。后台删除 OneXray、v2rayN 遗留对象及旧任务，保留新的 `apple-proxy-happ` collection。
