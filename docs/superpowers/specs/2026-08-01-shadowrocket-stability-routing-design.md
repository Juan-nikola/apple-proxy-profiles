# Shadowrocket 国内应用、游戏与稳定性增强设计

日期：2026-08-01
状态：已实现，等待真机灰度

## 1. 目标

在保留现有业务分组、默认直连/代理方向与手动线路能力的前提下，解决以下问题：

1. 抖音、抖音评论及其他国内 App 在 Shadowrocket 开启后加载缓慢。
2. iPhone 上《问道手游》在 Wi-Fi 和蜂窝网络中只要开启 Shadowrocket 就明显变慢，即使“🕹️ 游戏平台”选择 DIRECT 仍不能恢复。
3. macOS 偶发断流。
4. “🚀 节点选择”默认跟随 Shadowrocket 首页当前节点。
5. 策略组加载全部节点时不再依赖远程节点订阅必须使用固定显示名。
6. 使用 Shadowrocket 原生格式的 Blackmatrix7 增强规则，避免引入需要转换且移动端收益不确定的异构规则源。

## 2. 已确认的约束

- 保留全部现有策略组。
- “🚀 节点选择”收敛为只含 `PROXY`；原先从根组进入的自动、故障转移和洲组能力移到境外业务组，国内业务组仍保持 DIRECT 优先。
- “🎮 游戏连接”和“⬇️ 下载/P2P”继续默认 DIRECT。
- iPhone 需要兼容蜂窝 IPv6/NAT64，不能全局强制关闭 IPv6。
- 不对所有 UDP 做无条件直连，避免破坏海外游戏和用户的显式策略选择。
- 不引入 Sukka 规则；公开远程规则全部使用 Blackmatrix7 的 Shadowrocket 原生版本。
- 不把节点、订阅 URL、密码、UUID 或 Token 写入仓库和日志。

## 3. 根因与设计判断

### 3.1 国内 App 与《问道手游》

现有配置只引用 `ChinaMax.list`。该文件以 IP、ASN 和少量域名规则为主，缺少 `ChinaMax_Domain.list` 中的大规模国内域名集合。因此域名流量可能需要先执行 DNS，再依赖 IP 规则或 `GEOIP,CN` 判断直连。Shadowrocket 接管 DNS 后，这条路径比域名阶段直接命中更慢，也更容易受代理 DNS、IPv6 和网络切换影响。

《问道手游》的官方运营域名属于雷霆游戏和吉比特，Blackmatrix7 的 `ChinaMax_Domain.list` 已包含 `leiting.com`、`leitingcn.com`、`g-bits.com` 等后缀；通用 `Game.list` 没有专门的《问道手游》规则。仅把“🕹️ 游戏平台”切到 DIRECT，无法证明登录、资源、DNS、实时 UDP 和直接 IP 都经过该组。

### 3.2 抖音

现有 `DouYin` 规则规模较小。改用 Blackmatrix7 `ByteDance` 后，继续映射到现有“🎵 抖音”组，可以扩大到评论、账号、图片、视频和字节系公共服务，同时保留用户当前的策略控制方式。

### 3.3 macOS 断流

现有推荐参数同时允许代理侧 QUIC 和 IPv6。节点 UDP 能力、网络 IPv6 质量或网络切换不稳定时，应用可能优先尝试一条质量较差的路径，表现为间歇性断流或长时间等待。

采用 `quicMode=proxy-block` 只阻止经代理的应用 QUIC，触发 TCP/TLS 回退；国内 DIRECT 流量的 QUIC 不被全局封锁。macOS 推荐 Profile 使用 `ipv6Mode=ipv4-only` 作为稳定优先基线；iPhone/iPad 保持 `ipv6Mode=auto`。

### 3.4 首页节点与订阅显示名

Shadowrocket 内建策略 `PROXY` 表示首页当前选择的节点。设备验证发现，仅把它放在“🚀 节点选择”的第一个候选仍会让客户端保留此前选中的具体节点。修正后的“🚀 节点选择”只包含 `PROXY`，从结构上保证它始终跟随首页；自动、故障转移、洲组和具体节点移到境外业务分组选择。

现有 `<subscriptionName>,use=true` 会把节点枚举绑定到 Shadowrocket 中的订阅显示名。改为 `include-all-proxies=true` 与 `policy-regex-filter` 后，策略组从客户端当前可用代理中筛选，不再要求节点订阅必须叫 `Shadowrocket-Nodes` 或 `shadowsocks-nodes`。旧的 `subscriptionName` 参数保留兼容解析，但不再影响生成的策略组。

## 4. 规则源与顺序

### 4.1 采用的增强规则

- `ByteDance`：替换 `DouYin`，策略仍为“🎵 抖音”。
- `ChinaMax_Domain`：使用 Blackmatrix7 Shadowrocket 原生域名集合，策略为 DIRECT。
- `ChinaMax`：保留现有 IP/ASN/补充规则，策略为 DIRECT。
- `SteamCN`：加入国内 Steam 服务直连，避免被通用游戏规则提前接管。
- 其余现有 Blackmatrix7 服务、广告、安全、媒体和游戏规则继续保留。

`ChinaMax_Domain` 与 `ChinaMax` 共同构成增强版国内覆盖；不使用 Surge 专用 `ChinaMax_All`，也不把其他客户端格式直接交给 Shadowrocket。

### 4.2 高优先级本地纠正规则

在远程通用规则之前增加以下 DIRECT 后缀规则，作为《问道手游》可审计、低风险的兜底：

- `leiting.com`
- `leitingcn.com`
- `g-bits.com`

纠正规则只覆盖已确认的官方运营域名，不猜测服务器端口或大范围 IP 段。

### 4.3 关键顺序

1. 局域网与保留地址。
2. 自定义拦截、直连、代理和 AI 纠正。
3. 安全、广告和具有独立策略组的服务规则；`ByteDance` 在国内总表之前，以保留“🎵 抖音”的手动控制。
4. 《问道手游》官方域名 DIRECT 纠正。
5. `SteamCN` DIRECT。
6. `ChinaMax_Domain` DIRECT。
7. 通用 `Game`：UDP 命中“🎮 游戏连接”，其余命中“🕹️ 游戏平台”。
8. 下载与 PrivateTracker。
9. `ChinaMax` DIRECT。
10. `GEOIP,CN,DIRECT`。
11. `FINAL,🚀 节点选择`。

国内总域名表放在通用 Game 之前，避免国内游戏及其 CDN 被宽泛游戏规则抢先分流；具有独立业务组的抖音等规则则放在国内总表之前。

## 5. 策略组行为

- “🚀 节点选择”只包含内建 `PROXY`，不再加载或保存具体节点。
- 境外业务组保持“🚀 节点选择”优先，并在其后提供全部自动、全部故障转移、现有洲组、DIRECT 和按过滤器得到的具体节点。
- 国内业务组保持 DIRECT 优先，其后提供“🚀 节点选择”和按过滤器得到的具体节点。
- 所有需要动态节点的组使用 `include-all-proxies=true`；现有正则过滤、隐藏组、测速参数和 UDP/P2P 限制保持生效。
- 验证器把 `PROXY` 视为 Shadowrocket 内建策略，并校验每个动态组的 `include-all-proxies=true`。
- 生成结果不得再输出依赖固定显示名的 `use=true` 引用。

## 6. 平台网络默认值

- 默认 QUIC 模式改为 `proxy-block`：代理侧应用 QUIC 被阻止，DIRECT QUIC 保持允许。
- iPhone/iPad 默认或推荐值：`ipv6Mode=auto`。
- macOS 默认或推荐值：`ipv6Mode=ipv4-only`。
- 用户显式传入合法的 `quicMode` 或 `ipv6Mode` 时仍覆盖平台默认值，便于回滚和对照测试。
- DNS 继续采用国内 AliDNS 直连、境外 Cloudflare 经“🧭 DNS 与规则下载”策略的稳定模式；本次不同时替换 DNS 架构，以控制变量。

## 7. 兼容性和迁移

- 旧 URL 中的 `subscriptionName` 参数继续接受，避免现有 Sub-Store File 因未知参数失败；文档标记为兼容参数。
- 用户可以给节点订阅使用任意显示名；如果客户端同时存在多份节点订阅，`include-all-proxies=true` 会把所有符合名称正则的节点纳入候选，这是预期行为。
- 旧 Profile 保留作为回滚入口。更新节点脚本、Profile 脚本及三个 File 后，再在 Shadowrocket 手动更新节点订阅和当前平台 Profile。
- 更新后的“🚀 节点选择”结构上只能选择 `PROXY`，因此刷新 Profile 后根组不能继续保存具体节点。
- 其他业务组中仍然有效的手动选择可能被客户端保留，这是预期行为；具体节点、自动组或洲组会有意绕过首页跟随。需要跟随首页时，在对应境外业务组手动选择一次“🚀 节点选择”。

## 8. 验证与验收

### 8.1 自动测试

- 先新增失败测试，再修改实现。
- 验证“🚀 节点选择”候选精确等于 `["PROXY"]`，且不含动态节点源。
- 遍历验证全部境外业务组的首页跟随、自动、故障转移、洲组、DIRECT 候选顺序，以及全部国内业务组的 DIRECT/首页跟随顺序。
- 验证动态组输出 `include-all-proxies=true`，不输出 `<subscriptionName>,use=true`。
- 验证 `PROXY` 被当作合法内建策略。
- 验证 `ByteDance`、`SteamCN`、`ChinaMax_Domain` 和 `ChinaMax` 各出现一次且顺序正确。
- 验证《问道手游》三个域名规则先于国内总表和 Game。
- 验证 iPhone/iPad IPv6 自动、macOS IPv4-only，以及默认代理 QUIC 阻断。
- 运行全部 Node 测试、构建和生成配置验证。

### 8.2 在线规则审计

- 检查每个 Blackmatrix7 URL 可下载、内容非 HTML、规则类型可解析且数量不低于保守阈值。
- 为 `DOMAIN-SET` 增加对应的解析和验证支持。
- 检查 `ChinaMax_Domain` 实际包含雷霆/吉比特后缀。

### 8.3 设备验收

- iPhone 在 Wi-Fi 与蜂窝网络分别测试《问道手游》登录、换线、战斗和资源加载，并在日志中确认雷霆/吉比特域名命中 DIRECT。
- 测试抖音首页、视频、评论和图片，确认命中“🎵 抖音”且默认 DIRECT。
- macOS 连续使用并经历休眠唤醒、Wi-Fi 切换，确认无持续断流。
- 测试国内网站、境外网站、AI、流媒体、局域网和 DNS，防止增强规则产生回归。

## 9. 回滚

- 代码层面保留单一提交边界，可通过反向提交恢复。
- 客户端保留旧 Profile；出现关键回归时立即切回旧 Profile。
- 参数级回滚：显式设置 `quicMode=allow` 或 macOS `ipv6Mode=auto` 即可恢复原网络路径。
- 规则级问题可暂时恢复旧 Profile，不在生产 Profile 中手工删除部分规则，以免下一次自动更新覆盖。
