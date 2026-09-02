# INCY 客户端适配器设计

状态：已完成设计，等待用户审阅

日期：2026-09-02

## 1. 目标

在 `apple-proxy-profiles` monorepo 中新增 INCY 客户端适配器，作为第九个 active client。适配器输出 INCY 可导入的完整 Xray JSON 数组，使一个 Sub-Store 私密订阅 URL 同时提供节点、DNS、GeoData 路由、业务分组、固定节点策略、测速和故障回退。

目标覆盖平台：

- iPhone
- iPad
- Apple TV
- Android
- Android TV
- macOS
- Windows
- Linux

目标行为与现有 sing-box/HAPP 统一 policy 对齐，达到配置和分流层面的 sing-box 效果。INCY App 本身是闭源客户端，本项目不嵌入其二进制、UI 或运行时。

## 2. 已确认的产品决策

### 2.1 导入模型

采用 HAPP 式数组：一个订阅响应返回多个完整 Xray 配置，每个候选节点对应一个数组元素。INCY 将数组元素作为多个可切换配置显示。

每个元素都包含独立的：

- 当前主节点 outbound；
- 固定 policy 节点 outbound；
- `direct` 和 `block` outbound；
- DNS 配置；
- routing 规则；
- 固定节点 balancer；
- observatory；
- 策略摘要 metadata。

这样保留用户手动切换节点的能力，并使每个配置拥有完整、可独立验证的分流行为。

### 2.2 单订阅体验

用户只在 INCY 中添加一个 Sub-Store 私密 URL。响应正文是 JSON 数组；响应头附带 INCY `autorouting` profile 深链接，指向公共、无密钥的 routing profile。用户不需要再手动添加规则 URL。

概念响应：

```text
content-type: application/json; charset=utf-8
content-disposition: attachment; filename="incy-iphone.json"
autorouting: incy://autorouting/onadd/https://juan-nikola.github.io/apple-proxy-profiles/current/incy/routing.json

[
  { "inbounds": [...], "outbounds": [...], "dns": {...}, "routing": {...} },
  { "inbounds": [...], "outbounds": [...], "dns": {...}, "routing": {...} }
]
```

`autorouting` 只负责绑定和更新公共 GeoData/routing profile；完整业务出口绑定仍写在每个 JSON 元素的 Xray routing 中。

### 2.3 节点选择责任

Sub-Store collection 是用户明确选择的节点清单。INCY 适配器不调用现有客户端能力矩阵预过滤节点。

适配器必须：

- 对 collection 返回的每个节点尝试生成配置；
- 对已知节点协议执行严格字段校验和 Xray renderer；
- 对适配器约定的原始 Xray outbound 形态提供扩展入口；
- 任意节点无法安全转换时失败整个 task；
- 不静默丢弃、自动替换或伪装不支持的协议。

“不预过滤”不代表任意协议可以凭空生效。新协议必须由 Sub-Store 提供适配器可序列化的 Xray outbound，或在后续增加对应 renderer；否则必须报告清晰错误。

## 3. INCY 官方能力边界

设计依据：

- [INCY platforms](https://github.com/INCY-DEV/incy-platforms)
- [Subscription format](https://github.com/INCY-DEV/incy-docs/blob/main/ru/dev-docs/subscription-format.en.md)
- [Full Xray configurations](https://github.com/INCY-DEV/incy-docs/blob/main/ru/dev-docs/full-xray-config.en.md)
- [Routing](https://github.com/INCY-DEV/incy-docs/blob/main/ru/dev-docs/routing.en.md)
- [Autorouting](https://github.com/INCY-DEV/incy-docs/blob/main/ru/dev-docs/autorouting.en.md)

INCY 将包含 `inbounds` 和 `outbounds` 的 JSON 识别为完整配置，并支持数组形式。完整配置可以包含 `routing`、`dns`、balancer 和 observatory；INCY 会对入口、日志、stats 和 DNS/balancer 循环做运行时补丁。

首版 renderer 的明确协议范围：

- VLESS
- VMess
- Trojan
- Shadowsocks
- Hysteria2/Hy2
- SOCKS5
- HTTP

WireGuard/AmneziaWG 需要单独依据 Sub-Store 节点形态和 INCY/Xray 运行时做 renderer 与真机验证。SSR、TUIC、Snell、AnyTLS、SSH 不得被伪装成已支持类型；没有可验证 Xray 表达时，严格失败。

INCY 的 `incy://crypt1` 是 URL 混淆而不是秘密保护。它可作为可选分享辅助，不用于保护订阅凭据。

## 4. 总体架构

新增 workspace：

```text
clients/incy/
  package.json
  README.md
  docs/
  examples/
  src/
    options.js
    render-node.js
    render-dns.js
    render-platform.js
    render-routing.js
    render-subscription.js
    render-routing-profile.js
    substore-config-entry.js
    link-encoder.js             # 可选 crypt1 辅助
  test/
```

适配器不直接修改 HAPP 的运行逻辑。可复用的策略解析来自 `shared/policies/resolve-unified.js`；Xray 输出初期在 INCY workspace 内独立实现，避免把已稳定的 HAPP 回归风险引入本次变更。

数据流：

```text
Sub-Store private collection
        ↓
normalizeNodes（保留所有有效节点，不按客户端过滤）
        ↓
INCY/Xray renderer
        ↓
resolveUnifiedPolicy
        ↓
每个候选节点生成一个完整 Xray JSON 元素
        ↓
response body JSON array + autorouting header
        ↓
INCY 导入多个可切换配置
```

## 5. 配置元素设计

### 5.1 Inbounds

每个元素生成：

- `socks`，监听 `127.0.0.1:10808`，启用 UDP 和 `http/tls/quic` sniffing；
- `http`，监听 `127.0.0.1:10809`，启用相同 sniffing；
- `routeOnly: false`，使 INCY 可以在 TUN/系统代理入口先获取域名再进行路由。

INCY 文档要求完整配置的 socks-like inbound 使用标准端口；客户端仍负责平台相关的 TUN、系统代理和电视入口管理。

### 5.2 Outbounds

每个数组元素的当前节点是 `incy-follow/<stable-node-id>`。统一 policy 中的固定节点按稳定 ID 去重，生成独立 candidate outbound 和 balancer。每个固定 balancer 使用 `leastPing`，`fallbackTag` 指向当前数组元素的 follow outbound。

固定节点不能解析、标签重复、或 policy 指向不存在节点时，整个 task 失败。

### 5.3 Observatory

`observatory.subjectSelector` 至少包含当前 follow outbound 和所有实际生成的固定 candidate outbound。探测 URL 使用现有项目约定的 `https://www.gstatic.com/generate_204`，间隔和超时按平台 preset 映射。

### 5.4 DNS

配置包含国内和海外 DNS：

- 国内 DNS：匹配 `geosite:CN`、`geosite:PRIVATE`，并期望 `geoip:CN`，通过 `direct` 访问；
- 海外 DNS：匹配明确的境外业务 geosite，走当前 follow 或 `dnsAndRules` 固定目标；
- `ipv6Mode=ipv4-only` 时使用 IPv4 查询策略；
- DNS server 的 IP 在 observatory + balancer 场景下置于 routing 直连保护规则中，避免测速依赖 DNS、DNS 又依赖 balancer 的循环。

### 5.5 Metadata

每个元素携带 `meta`：

- `serverDescription`：当前节点和 policy 解析摘要；
- `platform`；
- `schemaVersion`；
- 脱敏的 renderer 版本信息。

不写入节点密码、UUID、订阅 URL、私有 policy 内容或其他秘密。

## 6. 域名、IP 和业务分流

路由顺序固定为：

```text
PRIVATE / localhost
  ↓
Hijacking / BlockHttpDNS / Privacy / Advertising
  ↓
DomesticCore / DomesticPlatform / DomesticGame
  ↓
AI / GitHub / YouTube / Media / Social / Game / Apple / Microsoft / Download
  ↓
ChinaTLD（geosite:CN）
  ↓
IPIfNonMatch：域名未命中后解析 IP
  ↓
ChinaIP（geoip:CN）
  ↓
漏网之鱼（final）
```

准确语义是“域名规则未命中后解析 IP”，不是 DNS 返回 NXDOMAIN 后才解析。域名命中业务规则时直接使用业务目标；域名未命中任何域名规则时，Xray 使用 DNS 解析结果进行 IP/CIDR 规则判断；目标本来就是字面 IP 时跳过域名阶段。

业务目标完全复用统一 policy：

| Policy | Xray 目标 |
|---|---|
| `FOLLOW` | 当前数组元素的 follow outbound |
| `DIRECT` | `direct` freedom outbound |
| `NODE~query` / `NODE:name` | 固定节点 balancer，失败回退当前 follow |
| `REJECT` | `block` blackhole outbound |

业务规则必须排在安全规则之后、`ChinaTLD/ChinaIP` 之前。DNS route hint 必须排在具体业务规则之后，以免把 AI、GitHub 等目标重新导向默认 follow。

默认参数：

- `dnsMode=stable`；
- `chinaDns=alidns`；
- `globalDns=cloudflare`；
- `blockMode=balanced`；
- `quicMode=proxy-block`；
- `ipv6Mode=ipv4-only`；
- `adblockMode=off`；
- 完整策略 target 默认值与统一 policy 相同。

## 7. GeoData 和更新

发布树新增：

```text
public/current/incy/
  client-manifest.json
  routing.json
  geoip.dat
  geoip.dat.sha256
  geosite.dat
  geosite.dat.sha256
```

`geoip.dat` 和 `geosite.dat` 使用现有共享规则编译结果，独立复制到 INCY 目录并生成独立 manifest。routing profile 使用 INCY 字段 `Geoipurl`、`Geositeurl`、`LastUpdated`、`DomainStrategy=IPIfNonMatch`、`useChunkFiles` 和 DNS/Direct/Proxy/Block 分类。

移动端可由 INCY 自己裁剪 GeoData；Windows/Linux 使用完整文件。规则源只维护一份，不在 INCY 目录重复维护业务规则文本。

Sub-Store config entry 在响应 header 设置：

```text
autorouting: incy://autorouting/onadd/https://juan-nikola.github.io/apple-proxy-profiles/current/incy/routing.json
```

更新遵循 current/previous 原子发布和现有 manifest 校验；公共目录绝不包含私密节点或 policy 正文。

## 8. Sub-Store task 和平台参数

新增 collection：

```text
apple-proxy-incy
```

新增完整配置 task：

```text
incy-config-iphone
incy-config-ipad
incy-config-appletv
incy-config-android
incy-config-androidtv
incy-config-macos
incy-config-windows
incy-config-linux
```

配置 task 使用 `output=config`、`type=collection`、对应 `platform` 和统一参数。每个平台输出同一 Xray schema；平台字段只影响日志级别、测速 preset、IPv4/IPv6 和资源策略，不向配置写入 INCY UI 私有字段。

## 9. 失败、安全和可观测性

失败即拒绝发布：

- collection 为空或无法解析；
- 任意选中节点缺失必需字段或无法转换；
- 原始 Xray outbound 违反安全 schema；
- policy 固定节点不可用；
- JSON 数组为空、标签重复或 routing 目标悬空；
- GeoData、routing profile 或 manifest 校验失败。

日志只记录平台、接受数量、错误协议类别、错误计数和 schema 版本，不记录节点名、地址、UUID、密码、订阅 URL 或 policy 目标正文。

公开发布继续执行 secret scan、动作检查、manifest hash、文件预算和 current/previous 回滚校验。

## 10. 测试和真机验收

### 10.1 自动化测试

新增 INCY workspace 测试：

- options 平台和参数校验；
- VLESS、VMess、Trojan、SS、Hy2、SOCKS5、HTTP renderer；
- raw Xray outbound 扩展入口的 schema 校验；
- 每个配置的 inbounds/outbounds/tag 唯一性；
- `IPIfNonMatch`、业务规则优先级、ChinaTLD/ChinaIP 顺序；
- 国内/海外 DNS 和 DNS 直连保护；
- `FOLLOW/DIRECT/NODE~ / NODE:` policy 映射；
- fixed balancer、observatory 和 fallback；
- 任意一个节点失败时整个 task 拒绝，且不生成部分订阅；
- 响应 `autorouting` header、公共 routing profile 和 GeoData manifest；
- 不泄露秘密的 diagnostics 和输出扫描。

### 10.2 跨客户端一致性

使用相同脱敏节点和 policy fixture，对 sing-box、HAPP、INCY 的规则 source、目标 policy 和 final fallback 做一致性断言。客户端格式不同，但规则语义必须一致。

### 10.3 真机验收

在 INCY 官方客户端上逐平台验证：

1. 一个订阅 URL 导入多个数组配置；
2. 自动绑定并更新 autorouting profile；
3. GeoData 下载/裁剪成功；
4. 国内域名直接访问；
5. 未命中域名规则但解析到中国 IP 的目标直连；
6. OpenAI、GitHub、YouTube 等业务命中对应分组；
7. 固定节点测速、节点故障回退和最终兜底；
8. QUIC、DNS 防劫持和 IPv4-only 行为；
9. 更新、断网、旧配置保留和 previous 回滚；
10. iPhone、iPad、Apple TV、Android、Android TV、macOS、Windows、Linux 全部通过。

## 11. 非目标和剩余风险

- 不复制或打包 INCY 闭源 App；
- 不承诺 INCY UI 提供 sing-box 同等 selector、TUN 或 per-app 体验；
- 不把 `crypt1` 当作真正加密；
- 不在没有 Xray 可表达形态时承诺任意未来协议自动支持；
- INCY 官方文档没有公开完整的运行时源码，真机验收是最终兼容性依据；
- 完整配置数组会比普通节点订阅大，需通过 GeoData 引用、移动端裁剪和发布预算控制体积。
