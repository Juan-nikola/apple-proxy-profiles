# 五客户端国内分流可靠性增强设计

**日期：** 2026-08-09  
**状态：** 已批准，等待书面复核  
**基线：** `main@b3413d940dee78e2f167b64b730245449a250e7e`

## 1. 背景

本仓库从同一套共享规则语义生成 Shadowrocket、Surge、Egern、Anywhere 和 sing-box 配置。当前默认分流已经采用轻量混合模式：小型国内核心和游戏规则保护明确业务，明确海外服务进入代理策略，中国 IPv4/IPv6 或客户端原生 GEOIP CN 负责未分类的国内目标，最终未知流量进入代理。

当前剩余问题不是“完全没有中国规则”，而是以下几类可靠性缺口：

1. 五客户端分别维护部分规则阶段常量，存在顺序漂移风险。
2. 常见国内 `.com`、`.net` 域名依赖小型核心集或解析后的中国 IP；普通 `.cn` 没有独立的后置兜底语义。
3. 各客户端 DNS 能力不同。Egern 和 sing-box 能表达明确的分流 DNS；Surge 和 Shadowrocket 使用各自的代理解析/备用 DNS 行为；Anywhere 的 DNS 与规则绑定主要保存在设备本地。
4. ChinaIP 是未知国内流量的关键安全网，但缺少独立副源漂移报告。
5. Anywhere 没有等价的完整 Profile 生成器，本地 assignment 不可由远程产物强制。
6. 发现误分流后缺少统一的本地解释工具和带证据的观察集维护流程。

本设计强化现有 `balanced` 模式，不重新引入十万级中国域名表，也不在本阶段上线 `direct-first`。

## 2. 已批准的产品决策

1. 第一阶段只强化 `balanced`，最终未知和 DNS 失败流量继续走 `🚀 节点选择`。
2. 新增独立的后置规则源 `ChinaTLD`，只包含 `DOMAIN-SUFFIX,cn`，策略为 `DIRECT`。
3. `ChinaTLD` 必须位于所有明确业务规则和 `OverseasGame` 之后、`ChinaIP` 之前。
4. 不把裸公共后缀 `cn` 放入 `DomesticCore`，也不放宽 `DomesticCore` 现有的公共后缀验证。
5. 五客户端必须从同一个共享路由计划生成规则阶段；客户端适配器只能转换语法和实现客户端原生解析步骤。
6. 现有 ChinaIP 生产输入保持不变；新增 `gaoyifan/china-operator-ip` 只做审计比较，不自动合并或发布。
7. `ObservedDomestic` 只接受带 App/游戏、日期和误分流证据的条目，发布时并入 `DomesticCore`。
8. 不上传访问记录，不实现失败连接自动重放，不使用 AI 实时判断域名。
9. `direct-first` 是第二阶段独立设计；第一阶段不得暴露未验证参数或改变默认终点。

## 3. 目标

- 普通未知 `.cn` 域名在不扩大国内核心表的情况下可靠直连。
- 未命中域名规则的中国 IPv4/IPv6 继续可靠直连。
- 明确海外业务、非中国 IP、DNS 失败和无法判断流量继续安全走代理。
- 消除五客户端路由阶段的手写顺序漂移。
- 为 ChinaIP 突然收缩、过期和副源分歧提供可审计门禁。
- 让用户能够在本地解释“域名/IP 为什么命中某策略”。
- 保持当前轻量预算、官方 sing-box 二进制规则边界和 edge/current 灰度模型。

## 4. 非目标

- 不承诺零规则、零维护或“完美分流”。
- 不默认重新加入 `ChinaMax_Domain`、完整 `geosite:cn` 或完整广告域名包。
- 不替换节点协议、凭据、Sub-Store 私密来源或策略组体系。
- 不强制覆盖用户手动选择的服务策略组。
- 不通过 MITM、HTTPS 解密、Allow Insecure 或根证书改善分类。
- 不在本阶段为 Anywhere 声称无法由产物保证的最终策略能力。
- 不在本阶段实现 `routingMode=direct-first`。

## 5. 方案选择

### 5.1 采用：分阶段强化 balanced

在现有小型明确规则、中国 IP 和最终代理之间增加后置 `ChinaTLD`，并统一共享阶段、DNS 语义、审计、测试和灰度。它在国内误走代理、未知海外可用性、内存和维护成本之间最平衡。

### 5.2 拒绝：第一阶段同时上线 direct-first

直接把所有未知流量设为 DIRECT 可以最大限度避免国内误走代理，但会让冷门海外服务、国外游戏 CDN 和未收录 API 直连失败。Anywhere 的最终策略也无法由当前远程产物可靠控制。

### 5.3 拒绝：重新使用完整中国域名库

大规模中国域名表会重新引入下载、缓存、内存、冲突和误分类面，并削弱现有轻量架构的可维护性。它可以作为外部对照，不作为默认生产输入。

## 6. 权威路由顺序

共享语义的唯一权威顺序为：

1. `local`：局域网、私有地址、系统域名，DIRECT。
2. `security`：DNS 劫持、HTTPDNS、隐私和可选广告规则。
3. `custom`：用户自定义 block、direct、proxy 和 AI 规则。
4. `bootstrap`：公开规则下载主机的独立启动策略。
5. `earlyDomestic`：DomesticCore、DomesticGame、SteamCN。
6. `serviceIntent`：国内服务组、Apple、Microsoft、AI、GitHub、流媒体、社交、下载和其他明确业务。
7. `overseasGame`：OverseasGame。
8. `lateDomestic`：ChinaTLD。
9. `resolveUnknown`：客户端需要时通过中国 DNS 显式解析未分类域名。
10. `resolvedChinaIp`：ChinaIP，以及支持客户端的 GEOIP CN。
11. `defaultProxy`：非中国 IP、DNS 失败或无法判断，进入 `🚀 节点选择`。

明确业务规则必须早于 `ChinaTLD`。因此，明确需要代理的 `.cn` 域名仍可由业务规则或 `CUSTOM_PROXY` 覆盖；普通未分类 `.cn` 才由 `ChinaTLD` 直连。

## 7. 共享语义模型

### 7.1 规则阶段元数据

共享轻量规则目录为每个客户端可见规则源声明：

- `id`
- `policy`
- `phase`
- `dnsClass`
- `inputFormat`

`phase` 的合法值为：

- `security`
- `earlyDomestic`
- `serviceIntent`
- `overseasGame`
- `lateDomestic`
- `resolvedChinaIp`

`dnsClass` 的合法值为：

- `china`
- `proxy`
- `none`

共享层导出 `orderedRoutingPlan()`。每个默认规则源必须且只能属于一个阶段。旧的 `DEFAULT_RULE_SOURCE_IDS`、策略目标和客户端目录可以继续作为兼容接口，但其顺序必须由同一元数据推导或由测试证明完全一致。

### 7.2 ChinaTLD

新增编译规则源：

- ID：`ChinaTLD`
- 规范条目：`domainSuffix: cn`
- 策略：`DIRECT`
- 阶段：`lateDomestic`
- DNS 类别：`china`

它分别发布为：

- Shadowrocket/Surge：规范化 `.list`
- Egern：`.yaml`
- sing-box：审计 JSON 和官方 core 编译的 `.srs`
- Anywhere：`.arrs` 和 Manifest 记录

该规则源虽然只有一条规则，仍进入统一编译和 Manifest 流程，以避免 Anywhere 特例和五客户端语义分裂。

### 7.3 ObservedDomestic

共享源码把国内核心拆为两个维护概念：

- `DomesticCoreBase`：稳定、通用的国内核心服务和 CDN。
- `ObservedDomestic`：真机发现的误分流例外。

`ObservedDomestic` 每条源码记录包含：

- `suffix`
- `service`
- `observedAt`
- `reason`

编译器只把 `suffix` 投影并合并到发布的 `DomesticCore`。重复、非法域名、公共后缀、缺少元数据或超过预算都使构建失败。

## 8. DNS 数据流

默认推荐 `dnsMode=stable`。

1. 明确海外规则在支持的客户端中使用代理侧加密 DNS。
2. 国内规则、`ChinaTLD` 和未知候选使用 AliDNS、DNSPod 或显式系统中国 DNS。
3. 未分类域名获得 A/AAAA 后进入 ChinaIP 判断。
4. 中国 IPv4/IPv6 直连。
5. 非中国 IP、DNS 失败、域名和真实 IP 均不可获得时进入代理。
6. 不透明重放已经失败的 TCP、QUIC、登录、支付或游戏请求。

`privacy` 保留为显式高级选项，但文档必须说明它不是国内直连优先场景的推荐值。

## 9. 客户端适配

### 9.1 Shadowrocket

- 从共享计划渲染规则，不再本地维护完整阶段顺序。
- `ChinaTLD` 位于全部业务规则和 OverseasGame 后、ChinaIP 前。
- 保留中国主 DNS、代理侧全局备用 DNS、DNS 劫持和最终代理。
- 验证 stable/privacy 模式的全局备用 DNS 仍通过 `🧭 DNS 与规则下载` 代理。
- 真机检查 HTTPDNS、硬编码 IP、IPv6、QUIC 和被用户手动改成代理的国内服务组。

### 9.2 Surge

- 从共享计划渲染业务规则和 `ChinaTLD`。
- 保留中国主 DNS；明确海外目标由代理端解析。
- 保留 `FINAL,🚀 节点选择,dns-failed`。
- 文档继续明确 `globalDns` 是共享兼容参数，不在本地 Profile 中单独使用。
- 不为追求表面一致而引入未经验证的客户端专有 DNS 语法。

### 9.3 Egern

- 路由从共享计划生成。
- stable/speed 保留明确海外 `proxy_rule_set → global`、国内和未知 → `china`。
- privacy 保留 global wildcard。
- `ChinaTLD` 路由位置必须与共享计划一致。
- DNS 转发顺序和路由顺序分别测试，防止只修其中一侧。

### 9.4 sing-box

- 生产只引用官方 core 编译的二进制 `.srs`。
- 明确业务和 ChinaTLD 在显式解析步骤前匹配。
- 未分类域名执行 `resolve`，服务器为 `dns-direct`。
- 解析后的地址匹配 ChinaIP；最终出站保持 `🚀 节点选择`。
- 明确海外 DNS 使用带代理 detour 的 DoH。
- IPv4-only 和 prefer-IPv4 两种策略分别验证。

### 9.5 Anywhere

- 发布 `ChinaTLD.arrs`，Manifest 标记 `routing=1` 和 `phase=lateDomestic`。
- 导入页按共享计划显示逻辑顺序、目标策略、所有 shard 和哈希。
- 同一逻辑规则集的全部 shard 必须绑定同一目标。
- canary 人工确认 DomesticCore、DomesticGame、ChinaTLD、ChinaIP 均为 DIRECT。
- `Default` 不视为停用。
- 节点刷新、规则 Update、assignment 和五类 DNS 继续作为独立状态验证。
- 自动测试不能替代本地 assignment 验收。

## 10. ChinaIP 副源审计

### 10.1 来源

现有固定 ChinaIP 输入继续作为唯一生产输入。新增 `gaoyifan/china-operator-ip` 作为 MIT 许可的只读审计副源，记录来源、提交、抓取时间和内容哈希。副源产物不进入任何客户端 Manifest。

### 10.2 数据获取边界

- 定时 edge 更新工作流可以获取新的副源快照。
- 普通离线构建和测试只读取已经固定的快照，不依赖实时网络。
- fetch、解析或校验失败不得覆盖最后一次有效快照。
- current 推进使用与 edge 产物一起生成的不可变审计报告，不重新抓取。

### 10.3 比较和门禁

报告至少包含：

- IPv4/IPv6 规范前缀数量；
- 相比上一有效主源的增加、删除和覆盖变化；
- 主源与副源的规范覆盖差异；
- 非法、私有、保留和非规范 CIDR；
- 主副源时间戳和内容哈希。

初始阈值：

- 空文件、解析失败、非法地址族或禁止地址 → 构建失败。
- 主源任一地址族相比上一有效版本突然缩减超过 20% → 阻止 edge 发布。
- 主副源覆盖差异超过 5% → 警告。
- 主副源覆盖差异超过 15% → 禁止自动推进 current，要求人工审查。
- 连续 7 天没有成功副源比较 → 禁止推进 current，但不破坏现有 current。

上线前 14 天为 report-only 校准期。校准期结束后才能启用数值门禁；门禁阈值的任何修改都需要独立测试和评审。副源永不自动并入主源。

## 11. 本地诊断与审计

新增只读命令：

```text
npm run explain:route -- --domain example.cn --ip 1.2.3.4
```

命令不访问网络，读取固定的共享语义和已编译快照，输出：

- 命中的阶段和规则源；
- DNS 类别；
- 输入 IP 是否属于 ChinaIP；
- 预期策略；
- 五客户端的已知表达差异。

构建生成 `audit/routing-plan.json`，包含有序阶段、规则源、策略、DNS 类别、条数和哈希，不包含节点、订阅 URL 或用户访问记录。

真机误分流报告只要求客户端版本、网络类型、公开 Manifest 哈希、目标域名、解析 IP、命中规则、最终策略、IPv6/QUIC/HTTPDNS 状态。私密节点、凭据、完整订阅 URL 和未脱敏日志不得进入仓库。

## 12. 错误处理

- 上游规则抓取失败：保留最后一次有效快照，失败构建不得覆盖 edge/current。
- 编译冲突、空文件、预算超限或非确定性：停止发布。
- ChinaIP 副源不可用：记录警告；超过七天后阻止 current 推进。
- DNS 失败：balanced 最终走代理。
- 规则下载失败但有有效缓存：客户端继续使用最后有效版本。
- 首次安装且无缓存：返回明确诊断，不写入空缓存。
- Anywhere shard 缺失或 assignment 不一致：canary 失败，不推进该客户端。
- 任一客户端失败：只阻止该客户端推进，不迫使其他客户端切换到未验证产物。
- 发布失败：保留现有 current、previous 和不可变 versions 快照。

## 13. 测试设计

### 13.1 共享语义

验证：

- 每个默认规则源只有一个 phase。
- 权威阶段顺序固定。
- ChinaTLD 只有 `domainSuffix: cn`。
- ChinaTLD 位于所有 serviceIntent 和 OverseasGame 后、ChinaIP 前。
- DomesticCore 继续拒绝 `cn`、`com`、`net` 等公共后缀。
- 明确海外或 CUSTOM_PROXY 的 `.cn` 测试域名先于 ChinaTLD。
- ObservedDomestic 元数据完整、无重复并进入 DomesticCore。
- 默认条数、字节和启动内联预算不超限。

### 13.2 跨客户端语义矩阵

五客户端必须对以下用例产生等价结果：

- 普通未知 `.cn` → DIRECT，通过 ChinaTLD。
- 明确代理的 `.cn` 例外 → 对应代理策略。
- 国内视频、评论、图片、支付、地图、网盘、软件下载 → DIRECT。
- 国内游戏登录、更新、资源、语音和 CDN → DIRECT。
- AI、GitHub、Telegram、海外媒体和海外游戏 → 对应代理策略。
- 未分类中国 IPv4/IPv6 → DIRECT。
- 未分类海外 IPv4/IPv6 → `🚀 节点选择`。
- DNS 失败和无法判断 → `🚀 节点选择`。

### 13.3 客户端专项测试

- Shadowrocket：规则顺序、DNS fallback 代理标记、最终代理。
- Surge：规则顺序、`dns-failed` 终点、参数文档契约。
- Egern：DNS forward 顺序和路由顺序。
- sing-box：resolve 位于 ChinaIP 前、海外 DoH detour、官方 core check、二进制 SRS。
- Anywhere：Manifest phase/routing、全部 shard、导入顺序和文档检查表。

### 13.4 构建和发布

- 全量 npm 测试、build、fixtures、verify、秘密扫描、Actions 固定检查和规则复现。
- 使用固定官方 sing-box core 编译并检查配置。
- 连续构建两次，生成树哈希必须一致。
- 测试构建不得修改 public/current。
- 副源审计报告必须进入 edge client manifest 或发布审批证据，但不进入客户端规则下载集合。

## 14. 真机 canary 与推进

1. 只生成 edge，不覆盖 current。
2. 按现有客户端顺序分别验证 macOS/iPhone/iPad；sing-box 另验证 Android/OpenWrt；Anywhere 验证 iPhone/iPad。
3. 每个平台验证 Wi-Fi、蜂窝网络、IPv4/IPv6、QUIC、断网恢复和节点切换。
4. 国内 App/游戏检查规则命中与实际出口；海外服务检查对应代理出口。
5. 每客户端至少稳定运行 24 小时。
6. 每客户端保留旧配置并完成一次回滚演练。
7. 通过后，在 canary-approval 中使用已测试的 64 位 client-manifest 哈希推进对应客户端。
8. current 必须复用已验证不可变字节，不重新构建。
9. 上线后验证公开 URL、Manifest、哈希和回滚指针。

## 15. 完成标准

- 五客户端由同一共享路由计划生成阶段。
- ChinaTLD 在所有客户端正确发布和排序。
- 普通未知 `.cn`、未知中国 IPv4/IPv6 直连。
- 明确海外、未知海外和 DNS 失败保持代理。
- DomesticCore 没有被放宽为公共后缀列表。
- ChinaIP 副源报告可复现，副源不会进入生产规则。
- Anywhere assignment 风险有明确人工门禁。
- 本地解释工具和审计计划不泄露私密信息。
- 默认规则仍满足 25,000 条、5 MB 和现有 sing-box 内存边界。
- 自动测试、官方 core 检查、真机 canary 和回滚演练全部通过。
- 现有 current 在正式推进前保持不变。

## 16. 第二阶段边界

第一阶段完成并稳定后，另行设计 `routingMode=direct-first`。其候选语义是明确代理/拒绝规则优先、其他未知流量最终 DIRECT。该模式不得默认启用，不得透明重放失败请求，且 Anywhere 只有在最终策略能力经真机确认后才能宣称支持。

## 17. 参考来源

- 项目当前共享策略：<https://github.com/Juan-nikola/apple-proxy-profiles/blob/b3413d940dee78e2f167b64b730245449a250e7e/shared/rules/lightweight-policy.js>
- 项目当前跨客户端路由测试：<https://github.com/Juan-nikola/apple-proxy-profiles/blob/b3413d940dee78e2f167b64b730245449a250e7e/test/cross-client-routing.test.js>
- gaoyifan/china-operator-ip：<https://github.com/gaoyifan/china-operator-ip>
- Loyalsoldier/geoip：<https://github.com/Loyalsoldier/geoip>
- Blackmatrix7/ios_rule_script：<https://github.com/blackmatrix7/ios_rule_script>
- MetaCubeX/meta-rules-dat：<https://github.com/MetaCubeX/meta-rules-dat>
