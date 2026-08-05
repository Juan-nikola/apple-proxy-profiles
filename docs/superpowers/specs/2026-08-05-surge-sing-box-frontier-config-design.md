# Surge 与 sing-box 前沿配置生成设计

日期：2026-08-05
状态：待用户审阅
基线：`apple-proxy-profiles` 现有 Shadowrocket、Egern、Anywhere 生成器

## 1. 目标

在现有共享节点、策略、规则和发布体系上新增 Surge 与 sing-box 配置生成能力，保持与现有客户端相同的分流意图，同时优先适配：

- Surge 最新测试版，覆盖 Mac、iPhone、iPad；
- sing-box `testing` 分支每日最新提交，覆盖 Mac、iPhone/iPad、Android 和标准 OpenWrt/ImmortalWrt 软路由；
- 软路由作为全屋透明网关；
- 节点继续来自用户私密 Sub-Store，真实节点和凭据不进入 GitHub。

项目只生成、验证和发布配置与规则，不编译、签名、安装或分发 Surge、sing-box、SFA/SFI/SFM 或软路由二进制。

## 2. 已确认的设计决策

### 2.1 共享数据源与隐私边界

现有共享核心继续作为唯一事实来源：

1. 私密 Sub-Store 提供节点输入；
2. 共享层负责节点规范化、协议能力、地区/来源标签、策略意图和安全诊断；
3. 规则层继续从固定 Blackmatrix7 快照生成可审计规则；
4. Surge 和 sing-box 适配器把中立模型映射到各自原生格式。

公开仓库和 Pages 只包含公开脚本、规则、哈希、来源、计数、兼容性元数据和 `example.invalid` 脱敏示例。原始订阅 URL、节点地址、端口、UUID、密码、密钥、认证参数和私密输出 URL 只存在 Sub-Store 与设备中。

### 2.2 前沿版本策略

Surge 和 sing-box 都优先测试通道，但不把所有平台强行锁在同一个版本：

- Surge 跟随官方最新测试版；
- sing-box 每日跟随官方 `testing` 最新提交；
- 每个平台记录自己的上游提交、客户端构建或兼容版本；
- 能力矩阵只允许目标客户端已支持的字段进入配置；
- 一个平台注册失败时冻结该平台，不阻塞其他平台继续前进。

“最新版”指官方发布或官方分支可验证的最新候选，不代表项目代替官方渠道分发程序本体。

### 2.3 软路由范围

软路由按标准 OpenWrt/ImmortalWrt + 原生 sing-box core 设计，不绑定 HomeProxy、PassWall、OpenClash 等具体管理插件。配置目标是全屋透明网关，包含 TUN、自动路由、自动重定向、DNS 劫持、LAN 排除和防回环；具体插件包装层作为后续适配，不改变核心 JSON。

## 3. 总体架构

```text
私密 Sub-Store 节点
        │
        ▼
共享规范化核心
  节点能力 · 策略意图 · 规则模型 · 安全门禁
        │
   ┌────┴──────────────┐
   ▼                   ▼
Surge 适配器          sing-box 适配器
   │                   │
   ├─ Mac Profile      ├─ Mac JSON
   ├─ iPhone Profile   ├─ Apple 移动端 JSON
   └─ iPad Profile     ├─ Android JSON
                       └─ OpenWrt 网关 JSON
```

新增客户端目录：

- `clients/surge`：节点脚本、Mac/iPhone/iPad Profile 生成器、解析与测试夹具；
- `clients/sing-box`：节点/配置生成器、平台能力矩阵、JSON 与规则集校验、平台夹具。

现有 Shadowrocket、Egern、Anywhere 的输入、输出和公开规则契约不改变。

## 4. Surge 配置设计

三个平台共享节点、策略组和规则内容，分别生成平台专属 `[General]`：

- `[Proxy]`：由私密 Sub-Store 节点映射而来；
- `[Proxy Group]`：复用节点选择、自动测速、故障转移、地区、来源、AI、媒体、国内服务、游戏、下载和安全组；
- `[Rule]`：复用统一规则顺序和目标语义；
- `[General]`：按 Mac、iPhone、iPad 分别处理 DNS、IPv6、接管和系统差异；
- 不启用 MITM、证书、请求改写、正文脚本或隐式代理降级。

测试版新增字段必须先进入 Surge 能力矩阵，并通过结构解析、导入夹具和真机 canary 后才进入 `current`。无法自动证明的 Surge 行为以明确的人工验收项记录，不以“生成成功”替代设备验证。

## 5. sing-box 配置设计

配置使用官方原生 JSON，不依赖第三方转换器：

- `outbounds`：节点、direct、block、selector 和 urltest；
- `route`：共享策略和规则顺序映射到 sing-box route rules；
- `dns`：国内/国外解析、代理解析、规则解析和防泄漏策略；
- `rule_set`：同时发布可审计源 JSON 与紧凑二进制 `.srs`，默认配置引用 `.srs`；
- `experimental.cache_file`：缓存远程规则集，避免每次启动重新下载；
- `inbounds`：按平台使用官方 TUN/系统接管结构；
- `route.auto_detect_interface`、默认接口和排除项用于避免节点连接路由回环。

### 5.1 平台差异

- Mac：桌面 TUN、系统 DNS 和应用接管；
- iPhone/iPad：官方移动客户端可接受的 TUN/系统 DNS 字段，避免使用仅 Linux 可用的路由能力；
- Android：使用官方 VpnService 兼容字段，避免大规模 `route_address_set` 触发系统路由限制；
- OpenWrt：使用 `auto_route`、`auto_redirect`、DNS hijack、LAN 网段排除、路由器本机排除和 IPv4/IPv6 网关规则。

平台不支持的字段不得静默删除后继续生成；适配器必须返回聚合的排除原因并冻结该平台候选。

## 6. 发布通道、Manifest 与回滚

每个平台都维护三个逻辑通道：

- `edge/`：每日追踪最新测试版或 `testing` 提交，验证通过后自动更新；
- `current/`：最近一次完成真实设备 canary 的可用配置；
- `previous/`：更新前的可用配置，用于快速回滚。

每份 Manifest 至少记录：

- 客户端与平台；
- 上游版本、提交 SHA 和获取时间；
- 配置 schema/能力矩阵版本；
- 规则 Manifest 哈希与规则集列表；
- 配置文件哈希；
- 验证状态、失败阶段和回滚入口。

每日流程：

1. 读取官方 Surge 测试版元数据和 sing-box `testing` 提交；
2. 更新能力矩阵并生成平台候选；
3. 对 sing-box 使用对应 core 执行格式化、schema 和 `check`；
4. 运行确定性、规则闭包、DNS、防回环和秘密扫描；
5. 仅更新通过的平台 `edge`；
6. 由固定设备顺序完成 canary 后提升到 `current`；
7. 保留 `previous` 与内容哈希快照。

Sub-Store 任务继续使用稳定脚本 URL；用户可以选择 `edge` 或 `current`，而真实节点输出仍走私密 URL。

## 7. 错误处理与安全门禁

所有客户端适配器采用 fail-closed：

- 未知协议字段、无效测试版字段、悬空策略、重复名称、规则缺失、规则哈希不一致和 DNS 回环都阻止发布；
- 错误只输出客户端、平台、阶段、计数和稳定错误码，不反射节点值；
- 不能被目标客户端完整表达的节点只在私密输出中按平台排除，并写入聚合诊断；
- 公开构建不读取真实订阅 URL，不上传私密输出，不生成包含节点的示例；
- 自动更新失败时保留上一个 `edge`，不删除 `current` 或 `previous`。

## 8. 测试与验收

### 8.1 自动测试

- 节点协议映射、能力过滤和不支持原因；
- 策略组候选顺序、默认项和跨客户端语义；
- Surge Profile 结构、规则顺序和平台差异；
- sing-box JSON schema、`sing-box check`、格式化确定性和 `.srs` 闭包；
- TUN、DNS、自动重定向、LAN 排除和防回环；
- 同输入逐字节确定性；
- 公开/私密边界和秘密扫描；
- `edge/current/previous` 发布与回滚原子性。

### 8.2 真实设备验收

Surge：Intel Mac → iPhone → iPad。
sing-box：Mac → Android → iPhone/iPad → OpenWrt 测试 VLAN → 家庭主网关。

每个平台至少验证：配置导入、节点刷新、自动测速、国内 App 直连、海外服务代理、广告规则、DNS、IPv4、IPv6、QUIC/UDP、网络切换、重启后恢复和上一版本回滚。

### 8.3 完成标准

- Surge 三个平台均能导入并完成 canary；
- sing-box 四类目标配置均通过对应 core/client 校验，软路由能为 LAN 设备透明分流；
- 规则、节点和策略的共享语义有测试证据；
- 每个平台都有可访问的 `edge/current/previous` Manifest 和回滚配置；
- 无真实节点或凭据进入公开产物；
- 新增功能不改变既有 Shadowrocket、Egern、Anywhere 的测试与公开快照。

## 9. 实施阶段

1. 共享前沿版本追踪、能力矩阵、平台 Manifest 和 `edge/current/previous` 发布框架；
2. Surge Mac/iPhone/iPad 适配与测试；
3. sing-box Mac、Apple 移动端和 Android 适配与测试；
4. sing-box OpenWrt/ImmortalWrt 网关适配与测试；
5. 全部客户端文档、Pages 入口、Sub-Store 部署说明和最终 canary。

每个阶段独立形成实现计划、测试报告和 PR；后续阶段不得绕过前一阶段的验证门禁。

## 10. 非目标

- 不编译、签名、安装或镜像分发 Surge/sing-box 客户端和 core；
- 不绑定某一个 OpenWrt 管理插件；
- 不把真实节点、真实订阅 URL 或完整私密配置公开到 GitHub；
- 不用第三方在线转换器替代本仓库的原生适配器；
- 不承诺测试版永远兼容，版本变化必须经过能力矩阵和回滚流程。
