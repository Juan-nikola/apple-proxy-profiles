# v2rayN / V2Box 双内核分流重制设计

**状态：** 已获用户确认，待实施计划
**日期：** 2026-09-06

## 1. 目标

彻底删除主仓库中旧的 v2rayN/V2Box 客户端实现，基于同一套规则意图和节点出口模型重新制作：

- v2rayN 同时支持 sing-box core 和 Xray core；
- V2Box 使用经过真实设备验证的 Xray 兼容配置；
- 中国域名、中国 IP、业务域名和默认代理按照固定优先级判定；
- AI、GitHub、YouTube、媒体、社交、游戏、国内平台等业务拥有稳定业务 ID 和独立出口；
- sing-box 模式提供 selector、urltest、detour 和远程 rule_set；
- Xray 模式提供业务 balancer、固定节点和已验证的链式出口，并明确能力降级；
- 公开产物不包含节点凭据、订阅地址或私密 policy。

## 2. 删除边界

删除主仓库中旧的：

- `clients/v2box/**` renderer、dist、fixture 和测试；
- 旧 v2rayN renderer（若存在于目标分支）及其 dist、fixture、测试；
- `public/current` 中两个客户端的旧脚本、manifest 和示例；
- build、verify、client catalog、policy schema、Sub-Store task 对旧实现的绑定；
- 仅服务于旧 `NODE~` 显示名解析和单节点直出行为的客户端专属逻辑。

保留共享节点协议解析、节点指纹、链式关系识别、规则模型、规则源更新和其他客户端实现。`.worktrees/` 下其他分支不属于删除范围。

## 3. 统一中间层

新增客户端无关的路由编译接口。规则编译产出 `RouteIntent`：

```text
RouteIntent {
  matcher,
  businessId,
  action: DIRECT | PROXY | REJECT,
  priority,
  dnsClass,
  sourceProvenance
}
```

节点编译产出 `OutboundGraph`：

```text
OutboundGraph {
  physicalNodes,
  businessGroups,
  selectors,
  urlTests,
  detours,
  direct,
  reject,
  final
}
```

所有业务和节点引用使用稳定 ID。显示名称仅用于诊断和用户界面。

## 4. 规则与 DNS 优先级

固定顺序为：

```text
local/private
> security
> user custom
> explicit business
> domestic business
> ChinaTLD / china-list
> resolve + ChinaIP
> default proxy group
> fail-closed fallback
```

入口先做协议嗅探。业务域名规则在中国兜底前匹配；未命中域名规则时才 resolve，并用 ChinaIP 做最终国内判断。DNS 服务器、IPv4/IPv6 策略、QUIC 策略和拦截模式均为显式参数。

Loyalsoldier/v2ray-rules-dat、v2fly/domain-list-community 及现有业务源通过 source adapter 接入。每个来源锁定 commit、SHA-256、许可证、抓取时间和条目诊断。来源只表达事实和候选分类，由统一策略映射决定动作。

## 5. sing-box renderer

v2rayN 的 sing-box 配置任务生成 sing-box JSON，并在任务文档中要求 v2rayN 选择 sing-box core：

- 物理节点是独立 outbound tag；
- 每个业务 ID 生成 selector；
- 自动业务组生成 urltest 并可指定探测 URL、间隔、容差；
- 链式节点通过 detour 连接上游 outbound；
- 规则资产使用远程 binary rule_set 和 hash manifest；
- route.rules 只引用稳定业务组 tag；
- `FOLLOW` 映射为业务 selector/urltest，`DIRECT` 映射为 direct，固定节点映射为物理节点 tag；
- 支持 Clash API 或 sing-box 图形客户端运行时切换。

## 6. Xray renderer

v2rayN 的 Xray 配置任务和 V2Box 共用 Xray renderer，但通过 capability contract 明确边界：

- 物理节点输出为 Xray outbound；
- 业务候选池使用 Xray balancer 或静态默认出口；
- 固定节点使用稳定 node ID；
- 链式代理仅在对应协议和客户端版本通过测试时生成；
- Xray 的 `domainStrategy`、DNS servers、GeoData 引用和 route rules 使用经过校验的字段；
- 不声称拥有 sing-box selector 的运行时控制能力；
- 不支持的 selector、urltest、detour 或动态 rule-set 能力进入 `capabilityDiagnostics`，不能静默改变动作。

## 7. 客户端与任务

新增任务：

```text
v2rayn-singbox-windows
v2rayn-singbox-macos
v2rayn-xray-windows
v2rayn-xray-macos
v2box-xray-iphone
v2box-xray-ipad
```

节点任务与配置任务分离。任务使用 `edge → current → previous` channel，读取同一份私密 policy，公开 generator 只接收 Sub-Store collection 内容。

## 8. 能力报告

每个配置 manifest 必须包含 core、schemaVersion、规则和资产 hash，以及：

```json
{
  "fullGroupSemantics": true,
  "supported": ["business-routing", "china-ip", "fixed-node"],
  "degraded": [],
  "unsupported": []
}
```

Xray/V2Box 的 `fullGroupSemantics` 为 false，并列出手动 selector、运行时切换、动态规则等降级项。

## 9. 验收

1. 旧客户端目录、发布物、任务绑定和测试不再被主仓库引用。
2. 同一规则语料经统一解释器后，sing-box 与 Xray 对可表达动作一致。
3. v2rayN sing-box 配置可通过 sing-box check，Xray 配置可通过 Xray JSON 校验。
4. v2rayN Windows/macOS 分别验证 sing-box 和 Xray core 导入；V2Box iPhone/iPad 验证 Xray 配置导入。
5. 规则命中、业务组、节点组、链式关系和 fallback 均可由 explain 工具解释。
6. 规则、脚本、manifest 的 hash 闭合，公开产物无私密信息。
7. 失败时阻止发布，不生成空节点订阅或静默降级配置。
