# Apple Proxy Profiles · 零基础部署与维护手册

这个仓库把你保存在 Sub-Store 里的私密节点，转换成七个 active 客户端可导入的配置。HAPP 与 OneXray 已接入真实 renderer、bundle、fixture 和发布清单；公开页面只放无节点脚本，节点凭据仍只在你的 Sub-Store 私密任务中处理：

| 客户端 | 平台 | 本项目提供什么 |
| --- | --- | --- |
| Shadowrocket | macOS、iPhone、iPad | 节点订阅 + 三个平台 Profile |
| Surge | macOS、iPhone、iPad | 节点资源 + 三个平台 Profile |
| Egern | macOS、iPhone、iPad | 节点文件 + 三个平台 Profile |
| Anywhere | iPhone、iPad | 节点订阅 + 14 个公开业务规则包 |
| sing-box | macOS、iPhone、iPad、Android | 四个平台完整 JSON 配置 |
| OneXray | macOS、iPhone、iPad、Android、Windows、Linux | Xray JSON 节点订阅、结构化 Profile、路由审计 |
| HAPP | iPhone、iPad、macOS、Android、Windows、Linux | HAPP JSON 订阅、路由审计 |

Android 仍是 sing-box 的一个平台输出；注册表和发布链路现在覆盖七个 active 客户端。Sub-Store 任务总数为 28：原有 17 个通用任务，加上 `apple-proxy-policy`、3 个 OneXray 任务、6 个 HAPP 平台配置任务和 `happ-routing-audit`。

本仓库只保存公开脚本、公开规则和脱敏示例，**不保存你的订阅、节点、密码、UUID、私密输出 URL 或 Sub-Store 管理地址**。本项目不需要 MITM、HTTPS 解密、CA 证书或请求重写，这些功能请保持关闭。

> 第一次部署：从“第 0 节”开始按顺序操作。每个关键步骤都写了成功标志、失败检查和回滚方法。技术细节可以以后再读，不需要先学编程。

## 我现在要做什么

| 你的目标 | 直接去这里 |
| --- | --- |
| 第一次部署全部客户端 | [第 1 节：首次部署](#第-1-节首次部署-sub-store) |
| 把配置导入客户端 | [第 2 节：导入七个客户端](#第-2-节导入七个客户端) |
| 增加、删除或筛选节点 | [3.1 节：增加或删除节点](#31-增加或删除节点) |
| 修改 DNS、IPv6 等任务参数 | [3.2 节：修改一个任务参数](#32-修改一个任务参数) |
| 更新公开规则 | [3.3 节：更新公开规则](#33-更新公开规则) |
| 修改源码并发布 | [第 4 节：开发、验证和发布](#第-4-节开发验证和发布) |
| 出问题需要恢复 | [第 5 节：验证与回滚](#第-5-节验证与回滚) |
| 查看公开审计 | Pages 的 `current/audit/dashboard.json` 或首页中文审计入口；阻断项看 Issues 的 `audit-blocker` 标签 |
| 查常见错误 | [第 6 节：常见问题](#第-6-节常见问题) |

---

## 第 0 节：先理解项目怎么工作

### 0.1 六个常用词

| 词 | 简单解释 |
| --- | --- |
| 节点 | 一台能转发网络流量的服务器，例如东京或洛杉矶节点 |
| 订阅 | 一个返回节点列表的网址 |
| Sub-Store | 保存私密订阅并运行本项目生成脚本的工具 |
| collection | Sub-Store 中的一组节点；本项目为每个客户端准备独立 collection |
| Profile / Config | 客户端真正导入的分流配置 |
| 业务组 | 例如 AI、YouTube、GitHub、Apple；你可以在客户端里为某类业务选择出口 |

### 0.2 “统一规则中间层”是什么

它是仓库里的源码逻辑，不是客户端里多出来的一层界面。

```text
公开上游规则
    ↓
shared/rules/semantic-intents.js（统一业务语义）
    ↓
七个客户端各自的格式生成器
    ↓
客户端中的业务组、规则集或 selector
```

它不会把所有 AI、媒体、游戏和国内业务混成一个组。它固定“这些来源属于哪个业务意图”，再让不同客户端按自己的格式输出。以后新增 App 或替换上游规则时，维护者主要修改统一语义和测试，不需要分别手改七套互相漂移的规则。

当前固定的主路由顺序是：国内核心 → 业务规则 → 海外游戏 → 中国域名后缀 → 中国 IP → 最终走主节点。具体客户端仍保留自己支持的业务选择器。

### 0.3 数据从哪里到哪里

```text
你的私密订阅
    ↓
apple-proxy-all 总池
    ↓
七个 active 客户端 collection（由你筛选；Xray renderer 会报告并排除不兼容节点）
    ↓
28 个 Sub-Store File 任务（17 个通用任务 + 11 个 HAPP/OneXray 私密任务）
    ↓
客户端导入私密输出 URL
    ↓
公开规则从 GitHub Pages 单独下载
```

`apple-proxy-sources` 是旧版兼容和回滚入口。已经有旧部署时先保留，不要急着删除。

---

## 第 1 节：首次部署 Sub-Store

### 1.1 准备条件

你需要：

1. 至少一个已经确认可用的私密节点来源。
2. 一套你能管理的 Sub-Store。
3. 一台先做测试的设备，建议从 macOS 开始。
4. 如果要自己维护源码：GitHub 账号、Git 和 Node.js 22。

如果 Sub-Store 已经在运行，先备份现有来源、collection、File 任务和客户端旧 Profile；如果还没部署 Sub-Store，请先按你所使用的 Sub-Store 发行版文档完成安装和访问保护。本仓库不负责服务器登录、TLS 或反向代理配置。

成功标志：你能进入 Sub-Store 管理页，至少一个私密来源可以单独预览出节点。

失败怎么办：来源单独预览为空时，先修复来源，不要继续创建本项目任务。

回滚方式：保留当前能联网的客户端 Profile 和 Sub-Store 备份，后续任何一步失败都可以切回。

### 1.1.1 已提供私密入口时的本机配置

如果你已经有 Sub-Store 的私密入口，可以在本机生成一份不进 Git 的任务清单。命令只把地址写入被 `.gitignore` 保护的 `secrets/substore.private.json`，不会上传、提交或写入公开 Pages：

```bash
SUBSTORE_SOURCE_URL='https://你的私密 Sub-Store 地址' \\
SUBSTORE_CHANNEL=current \\
npm run configure:substore
```

成功标志：终端显示 `Wrote private Sub-Store config`，且文件权限为 `0600`；文件中有 8 个 collection、28 个任务。切换灰度或回滚时，把 `SUBSTORE_CHANNEL` 改成 `edge` 或 `previous` 后重新运行即可。真实地址不要复制进 README、Issue 或聊天。

这个命令会离线校验公开 JS URL 的 `#` 参数，但不会替你登录 Sub-Store 管理后台或自动删除旧任务；首次迁移仍按下面的 preview、canary 和回滚步骤执行。

### 1.2 创建一个总池和七个客户端 collection

先创建或核对以下对象：

| 用途 | collection 名称 |
| --- | --- |
| 总节点池 | `apple-proxy-all` |
| Egern | `apple-proxy-egern` |
| Anywhere | `apple-proxy-anywhere` |
| Shadowrocket | `apple-proxy-shadowrocket` |
| Surge | `apple-proxy-surge` |
| sing-box | `apple-proxy-singbox` |
| OneXray | `apple-proxy-onexray` |
| HAPP | `apple-proxy-happ` |

操作：

1. 把你确认可用的来源加入 `apple-proxy-all`。
2. 从总池为七个客户端分别建立 collection；也可以先把总池原样交给生成器，再由生成器按客户端能力审计并排除不兼容节点。
3. 在 Sub-Store 中自行筛选每个客户端要使用的协议和节点。HAPP/OneXray 不会静默删除可表示节点，审计任务会给出输入数、兼容数和排除原因。
4. 逐个点击 preview，记录节点总数和协议计数。

**重要：`sing-box-client` 不是必需标签。** 它只是 Sub-Store 的筛选辅助，可以删除。要自己选择 sing-box 节点时，移除该标签筛选条件，直接在 `apple-proxy-singbox` 中手动勾选节点，然后按“collection preview → 四个 `singbox-config-*` 任务 preview → 客户端刷新”的顺序操作。请始终保留 collection slug `apple-proxy-singbox`，以及任务参数 `name=apple-proxy-singbox`；这两个是机器绑定键，不能改成中文。

成功标志：七个客户端 collection 都能预览，且每个集合只包含你愿意交给该客户端的节点；HAPP/OneXray 审计中的排除计数可解释。

失败怎么办：某一个 collection 为空时，只检查它的来源和筛选条件；不要同时改其他客户端。

回滚方式：旧 collection、旧任务和旧输出 URL 继续保留，直到新客户端完成真机验证。

完整的筛选边界和迁移顺序见 [Sub-Store 客户端节点池指南](docs/substore-client-pools.md)。

### 1.3 创建或核对 28 个 active File 任务

通用任务总数是 `4+1+4+4+4=17`；加上 policy、3 个 OneXray 任务、6 个 HAPP 平台任务和 1 个 HAPP 审计任务后，canonical 任务总数是 28。早期文档漏算了 `shadowrocket-nodes`，不要再按 16 个创建。

| # | 客户端 | File 任务名 | 作用 |
| ---: | --- | --- | --- |
| 1 | Egern | `egern-nodes` | 私密节点 YAML |
| 2 | Egern | `egern-macos` | macOS Profile |
| 3 | Egern | `egern-iphone` | iPhone Profile |
| 4 | Egern | `egern-ipad` | iPad Profile |
| 5 | Anywhere | `anywhere-nodes` | 私密 Clash 节点 YAML |
| 6 | Shadowrocket | `shadowrocket-nodes` | 私密排序节点订阅 |
| 7 | Shadowrocket | `shadowrocket-config-macos` | macOS Profile |
| 8 | Shadowrocket | `shadowrocket-config-iphone` | iPhone Profile |
| 9 | Shadowrocket | `shadowrocket-config-ipad` | iPad Profile |
| 10 | Surge | `surge-nodes` | 私密 `[Proxy]` 节点资源 |
| 11 | Surge | `surge-config-macos` | macOS Profile |
| 12 | Surge | `surge-config-iphone` | iPhone Profile |
| 13 | Surge | `surge-config-ipad` | iPad Profile |
| 14 | sing-box | `singbox-config-macos` | macOS JSON |
| 15 | sing-box | `singbox-config-iphone` | iPhone JSON |
| 16 | sing-box | `singbox-config-ipad` | iPad JSON |
| 17 | sing-box | `singbox-config-android` | Android JSON |

已有任务时逐个核对名称、脚本 URL、`name=` 和平台参数；没有任务时按 [Sub-Store 七客户端外置 JS + 任务引用总指南](docs/substore-two-layer-setup.md) 创建。不要复制 JavaScript 正文，File 应引用 Pages 上的远程脚本。11 个 HAPP/OneXray 任务仍是私密任务，不会把节点或策略内容发布到 Pages；HAPP 配置必须分别建立 `happ-macos`、`happ-iphone`、`happ-ipad`、`happ-android`、`happ-windows`、`happ-linux` 六个平台任务。

建议刷新频率：节点类任务每 6 小时，配置类任务每天。Anywhere App 中的节点和规则仍需手动 Refresh/Update。

成功标志：

- `egern-nodes`、`anywhere-nodes` 的预览顶层有 `proxies:`。
- `shadowrocket-nodes` 能输出非空节点订阅。
- Shadowrocket Profile 含 `[General]`、`[Proxy Group]`、`[Rule]`。
- `surge-nodes` 含 `[Proxy]`；Surge Profile 还含 `[General]`、`[Proxy Group]`、`[Rule]`。
- sing-box 是合法 JSON，并含 `dns`、`inbounds`、`outbounds`、`route`。

失败怎么办：先确认脚本操作已启用并参与预览，再检查对应 collection 非空、`name=` 完全一致、参数放在 URL 的 `#` 后而不是 `?` 后。

回滚方式：不要覆盖旧 File；可先创建带 `-test` 后缀的隔离任务，预览通过后再切换正式客户端。

### 1.4 任务 URL 怎么看

以 Shadowrocket macOS 为例：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js#output=config&type=collection&name=apple-proxy-shadowrocket&subscriptionName=Apple-Proxy-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off
```

`#` 后是参数，多个参数用 `&` 分隔。不要把私密节点订阅放进公开文档；需要引用私密节点 File 的 Egern、Surge 任务，只能在自己的 Sub-Store 参数中填写该 URL。

维护者可以离线检查任务参数：

```bash
node scripts/check-substore-task.mjs '<完整任务 URL>'
```

成功标志：输出 `OK`。失败时按错误提示修正参数，不要绕过校验器。

---

## 第 2 节：导入七个客户端

总原则：先保留旧 Profile，只在一台测试设备导入；macOS 通过后再做 iPhone、iPad，Android 最后单独验证。

### 2.1 Shadowrocket

操作：

1. 把 `shadowrocket-nodes` 的私密输出 URL 添加为节点订阅。
2. 给订阅设置一个显示名，例如 `Apple-Proxy-Nodes`。
3. 三个平台 Profile 任务中的 `subscriptionName` 必须与这个显示名逐字一致。
4. 添加当前设备对应的 `shadowrocket-config-*` 私密输出 URL，选择新 Profile 并连接。

成功标志：节点数量大于 0；存在 `🚀 节点选择`、`🐙 GitHub`、`🍎 Apple` 等业务组；国内、海外和局域网测试都正常。

失败怎么办：业务组存在但看不到订阅节点时，首先检查 `subscriptionName` 的大小写、空格和标点。

回滚方式：切回旧 Profile；旧节点订阅也先不要删除。

详细步骤见 [Shadowrocket 零基础部署](clients/shadowrocket/docs/deployment.md)。

### 2.2 Egern

操作：

1. 先运行 `egern-nodes`，把它的私密输出 URL 填进三个 Egern Profile 任务的 `nodeSubscriptionUrl`。
2. 重新预览 `egern-macos`、`egern-iphone` 或 `egern-ipad`。
3. 在 Egern 中只导入当前平台的 Profile 私密 URL，不要把 `egern-nodes` 当作完整 Profile 导入。

成功标志：Profile 含 `dns:`、`policy_groups:`、`rules:`、`default_subscription_group:`，并且不含节点密码或 UUID。

失败怎么办：Profile 为空时先检查 `egern-nodes` 是否非空，以及 `nodeSubscriptionUrl` 是否只在私密任务中正确填写。

回滚方式：在 Egern 里切回旧 Profile。

详细步骤见 [Egern 部署指南](clients/egern/docs/deployment.md)。

### 2.3 Anywhere

Anywhere 分为三层，缺一层都不会完整生效：

1. **节点层**：把 `anywhere-nodes` 的私密 URL 加入 Anywhere 并手动刷新。
2. **规则层**：打开公开导入页 `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html`，点击“全部导入”。
3. **绑定层**：在 App 中检查每个业务包的目标，然后使用 Rule 模式。

当前默认是 14 个稳定业务包：

- `AI`
- `Apple`
- `ChinaIP`
- `DomesticCore`
- `DomesticPlatform`
- `Download`
- `GitHub`
- `Microsoft`
- `OverseasGame`
- `OverseasMedia`
- `OverseasSocial`
- `Privacy`
- `Security`
- `YouTube`

当前 Manifest 的默认绑定：

| 默认目标 | 业务包 |
| --- | --- |
| REJECT | `Security` |
| DIRECT | `Privacy`、`DomesticCore`、`DomesticPlatform`、`Apple`、`Microsoft`、`Download`、`ChinaIP` |
| 跟随当前代理/链 | `AI`、`GitHub`、`YouTube`、`OverseasMedia`、`OverseasSocial`、`OverseasGame` |

`Default` 在 Anywhere 中表示跟随当前节点或链，不是“停用”。完整广告包 `Advertising`、`Advertising_Domain` 属于独立可选包，不在默认 14 个业务包内。

成功标志：节点刷新后数量大于 0；14 个业务包全部出现；本地 assignment 与导入页一致；Global Mode 关闭并使用 Rule 模式。

失败怎么办：依次检查节点是否刷新、规则是否导入、每个业务包是否绑定。不要用 MITM 或证书解决规则下载问题。

回滚方式：恢复旧节点订阅和旧本地规则绑定；只回滚出问题的那一层。

详细步骤见 [Anywhere 部署指南](clients/anywhere/docs/deployment.md)。

### 2.4 Surge

操作：

1. 先运行 `surge-nodes`，取得私密节点资源 URL。
2. 把该 URL 填进三个 Surge Profile 任务的 `proxyPolicyUrl`。
3. 预览应看到隐藏组 `📦 远程节点池` 的 `policy-path` 指向该私密 URL。
4. 在 Surge 中导入当前平台的 `surge-config-*` Profile。

成功标志：Profile 含 `[General]`、`[Proxy]`、`[Proxy Group]`、`[Rule]`；`[Proxy]` 不直接暴露节点凭据；业务组可以使用远程节点池。

失败怎么办：先预览 `surge-nodes`；它为空时不要继续改 Profile。

回滚方式：切回旧 Surge Profile，保留失败任务用于排查。

详细步骤见 [Surge 部署指南](clients/surge/docs/deployment.md)。

### 2.5 sing-box

操作：在 sing-box 中导入当前平台对应的 `singbox-config-macos`、`singbox-config-iphone`、`singbox-config-ipad` 或 `singbox-config-android` 私密 URL，允许系统创建 VPN/TUN。

成功标志：配置通过 sing-box 校验；节点不为空；国内网站、海外网站和局域网都正常。

失败怎么办：默认 `nodeErrorMode=strict` 会在任何已选节点无法完整转换时停止。回到 `apple-proxy-singbox` 修正节点或字段，不要直接用兼容模式掩盖丢节点。

回滚方式：切回旧 JSON 配置；生产任务保持 `current`，不要把所有设备直接切到 `edge`。

详细步骤见 [sing-box 部署指南](clients/sing-box/docs/deployment.md)。

### 2.6 HAPP

HAPP 的公开安装页只提供无凭据的 GeoData 和脚本；节点与配置仍从 Sub-Store 的私密任务导入。生产版本请打开 [HAPP 安装页](https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html)，安装 `geoip.dat` 和 `geosite.dat`，再按设备导入对应的 `happ-macos`、`happ-iphone`、`happ-ipad`、`happ-android`、`happ-windows` 或 `happ-linux` 私密输出。`edge` 仅保留给未来变更的灰度候选。

成功标志：GeoData 与配置使用同一频道；配置数组非空；DNS、国内外业务和局域网测试正常；`happ-routing-audit` 的兼容数和排除原因可解释。HAPP JSON 使用客户端内置 Xray GeoData 能识别的标准标签；公开频道 GeoData 仍用于 HAPP 路由资料和版本校验。如果 HAPP 提示‘超出隧道内存限制（50 MB）’，先重新 Preview 对应任务，再删除旧订阅条目并重新导入，不能继续使用旧缓存 JSON。

失败怎么办：先分别 preview 当前 `apple-proxy-happ`、对应平台任务和审计任务，确认不是节点协议或固定节点不兼容；未来变更先在 `edge` 灰度，不要把未经验证的候选直接替换生产任务。

回滚方式：在 HAPP 中切回旧配置，并恢复旧 GeoData；保留新任务用于排查。

详细步骤见 [HAPP 部署指南](clients/happ/docs/deployment.md) 和 [HAPP 六平台灰度清单](clients/happ/docs/canary.md)。

### 2.7 OneXray

先在 OneXray 中导入 `onexray-nodes` 私密节点订阅，再导入 `onexray-profile` 私密 Profile。Profile 使用 `apple-proxy-policy` 的私密策略覆盖；`onexray-routing-audit` 只输出脱敏计数、目标解析和链状态。公开 [OneXray 安装页](https://juan-nikola.github.io/apple-proxy-profiles/current/onexray/index.html) 只用于安装无凭据 GeoData；`edge` 仅保留给未来变更灰度。

成功标志：节点订阅非空；Profile 通过 OneXray 校验；业务组、DNS、国内外业务和回滚测试正常；节点任务、Profile 和审计都使用同一频道与 collection。

失败怎么办：先 preview `onexray-nodes`，再 preview `onexray-profile` 和审计；固定节点缺失、重复或协议不兼容时，回到 `apple-proxy-onexray` 修正，不要用空节点强行导入。

回滚方式：切回旧 OneXray Profile 和节点订阅；公开规则或 GeoData 问题使用 `previous`，不要同时删除 Sub-Store 任务。

详细步骤见 [OneXray 部署指南](clients/onexray/docs/deployment.md) 和 [OneXray 六平台灰度清单](clients/onexray/docs/canary.md)。

---

## 第 3 节：日常维护

| 场景 | 首先改哪里 | 成功标志 | 回滚 |
| --- | --- | --- | --- |
| 增加或删除节点 | Sub-Store 总池和受影响的 client collection | preview 数量、协议符合预期 | 恢复旧筛选或旧 collection |
| 修改 DNS、IPv6 等参数 | 单个 File 任务 | 预览结构正确，单台设备测试通过 | 恢复原参数或旧 Profile |
| 更新公开规则 | `edge` 候选和规则工作流 | 自动测试通过，canary 命中正确 | 不推进 `current` 或使用 `previous` |
| 修改生成器源码 | 对应 `clients/<client>/src/` 和测试 | build、fixtures、test、verify 通过 | 回退提交或切回旧发布通道 |
| 发布 Pages | GitHub Actions | 工作流成功，公开 URL 可下载 | 保持旧 `current` 或回退提交 |

### 3.1 增加或删除节点

1. 修改私密来源或 `apple-proxy-all`。
2. 只更新真正受影响的客户端 collection。
3. preview 并记录节点总数、协议计数和 `renderFailures`。
4. 只刷新对应客户端的节点任务和 Profile/Config。
5. 先在一台设备手动更新。

不要为了增加一个节点同时重建七个客户端，也不要修改公开 JavaScript。

如果你只想调整 sing-box 使用的节点：

1. 打开 `apple-proxy-singbox`，先 Preview 并记录旧节点数。
2. 删除 `sing-box-client` 标签筛选条件。
3. 手动勾选要使用的节点并再次 Preview。
4. 依次 Preview `singbox-config-macos`、`singbox-config-iphone`、`singbox-config-ipad`、`singbox-config-android`。
5. 四个平台都通过后，再刷新 sing-box 客户端。

如果删除标签后 collection 变成空的，说明 Sub-Store 仍残留标签过滤条件，或没有手动勾选节点。`nodeErrorMode=strict` 报错则表示手选节点的协议或字段不能完整转换，应移除该节点或修正字段；不要用 `compatible` 掩盖节点丢失。

### 3.2 修改一个任务参数

常见参数包括 `dnsMode`、`chinaDns`、`globalDns`、`ipv6Mode`、`quicMode`、`autoGroupMode`、`clientChain`、`adblockMode`。

每次只改一个参数：复制原值 → 修改测试任务 → preview → 导入一台设备 → 完成联网和回滚测试 → 再修改正式任务。失败时恢复刚才保存的原值。

### 3.3 更新公开规则

普通用户不需要手工更新仓库规则；客户端会从公开 Pages 下载已发布文件。维护者更新规则时：

```bash
npm run update:rules    # 生成 edge 候选
npm test
npm run verify
```

定时工作流只构建 `edge`，不会自动替换生产 `current`。canary 通过后，在 GitHub Actions 的 **Update Rules** 工作流中填写要推进的客户端和经过测试的 64 位 client-manifest hash，才会把该客户端推进 `current`。

失败怎么办：`edge` 验证失败就停止，不要手工编辑 `public/current/`。生产已经异常时临时使用 `previous` 或 Manifest 中的不可变 `versions/<manifestHash>/`。

### 3.4 业务分组怎么维护

- 业务含义和上游归属：`shared/rules/semantic-intents.js`。
- 公开规则来源：`automation/src/source-catalog.js`。
- 各客户端格式：`clients/<client>/src/`。
- Anywhere 14 个业务包：由统一语义聚合生成，不在文档里单独手写另一套来源映射。

新增 App 时先判断它属于现有 AI、媒体、社交、国内平台、下载或游戏意图；只有现有业务意图确实无法表达时，才新增业务组。这样七个客户端的名称和行为不会越维护越散。

---

## 第 4 节：开发、验证和发布

### 4.1 第一次准备本地仓库

```bash
git clone https://github.com/你的用户名/apple-proxy-profiles.git
cd apple-proxy-profiles
npm ci
```

需要 Node.js 22。先运行 `node --version`，输出应以 `v22.` 开头。

### 4.2 改哪里

| 路径 | 用途 | 能否手改 |
| --- | --- | --- |
| `shared/` | 统一合同、节点和业务语义 | 可以，同时加测试 |
| `clients/<client>/src/` | 客户端生成器源码 | 可以，同时加测试 |
| `automation/src/` | 规则获取、编译和发布逻辑 | 可以，同时加测试 |
| `clients/<client>/dist/` | 自动构建产物 | 不可以 |
| `public/current/`、`public/edge/` | 自动发布产物 | 不可以 |

### 4.3 修改后的完整验证

从仓库根目录运行：

```bash
npm run build
npm run fixtures
npm test
npm run verify
npm run check:secrets
npm run check:actions
git diff --check
```

只有全部退出码为 0 才提交。`npm run check:rules` 会联网核对固定上游；网络失败和代码失败要分开判断，但没有完整成功证据时不要发布。

### 4.4 提交和推送

```bash
git status --short
git add <你确认过的文件>
git commit -m "描述本次修改"
git push origin main
```

不要无检查地使用 `git add .`，避免把临时文件、私密输出或无关修改一起提交。

### 4.5 GitHub Pages

Fork 用户进入仓库 **Settings → Pages**，Source 选择 **GitHub Actions**。部署工作流位于 `.github/workflows/deploy-pages.yml`。

公开地址通常是：

```text
https://你的用户名.github.io/apple-proxy-profiles/
```

只修改 README 不会改变客户端公开产物；修改 `public/**` 或规则工作流完成后，Pages 会按工作流发布。到 Actions 页面确认绿色成功标志，再用公开 URL 检查脚本或导入页。

---

## 第 5 节：验证与回滚

### 5.1 每台设备都要检查

- [ ] 中国网站和国内 App 正常打开。
- [ ] Google、GitHub、YouTube 等海外服务正常。
- [ ] 路由器、NAS、打印机等局域网设备可达。
- [ ] 切换 `🚀 节点选择` 后，新连接使用新节点。
- [ ] 常用业务组可以单独切换并恢复为默认选择。
- [ ] Wi-Fi 与移动网络切换后能重新连接。
- [ ] 关闭代理后，系统网络恢复。
- [ ] 实际切回旧 Profile，再切回新 Profile，确认回滚入口可用。

维护者可以离线解释域名的当前规则：

```bash
npm run explain:route -- --channel current --domain baidu.com
```

### 5.2 三层回滚

1. **设备层**：先切回旧 Profile/Config，这是最快恢复方法。
2. **Sub-Store 层**：恢复旧参数、旧 collection 或旧 File 输出，再 preview。
3. **公开发布层**：规则或脚本问题使用 `previous`；需要精确版本时使用 `versions/<manifestHash>/`。

一次只回滚一层。节点问题不要同时删除规则，规则问题也不要重建全部节点任务。

---

## 第 6 节：常见问题

### Q1：预览还是空白或显示占位内容

检查顺序：对应 collection 是否非空 → File 中的脚本操作是否启用并参与预览 → `name=` 是否完全一致 → 参数是否放在 `#` 后 → 远程脚本是否使用 `current/` 正确路径。

### Q2：配置有业务组，但组里没有节点

Shadowrocket 和 Surge 首先检查 `subscriptionName`；Egern 和 Surge 再检查私密节点 File URL 参数；sing-box 检查 strict 日志中的协议或字段错误。

### Q3：Anywhere 规则导入了但没有生效

确认节点、规则、绑定三层都已完成，并且使用 Rule 模式。`Default` 是跟随当前代理，不是停用。旧的来源级规则仍存在时先按 Anywhere 迁移指南清理，避免和 14 个稳定业务包重复。

### Q4：国内 App 变慢或误走代理

确认没有开启全局模式；用 `explain:route` 检查域名；再查看客户端是否仍保留旧业务组选择、旧规则或 DNS 缓存。不要先打开 MITM。

### Q5：更新后整个客户端不能联网

立即切回旧 Profile。然后在 Sub-Store 单独 preview 节点任务和当前平台配置，找到从哪一层开始为空或报错。不要在故障期间同时修改多个参数。

### Q6：Pages 部署失败

打开 Actions 中失败的运行，查看第一个红色步骤。常见类别是依赖安装、测试、官方 sing-box core、固定上游规则或秘密扫描失败。修复后重新运行；不要手工上传不完整的 `public/`。

### Q7：私密输出 URL 很长，能公开吗

不能。难猜的 URL 不是登录认证。Sub-Store 管理页和私密输出应只在你信任的网络、VPN 或带认证与 TLS 的反向代理后使用。

---

## 文件地图和继续阅读

| 路径 | 作用 |
| --- | --- |
| `docs/substore-client-pools.md` | 七个 active 客户端 collection 的筛选、迁移和回滚 |
| `docs/substore-two-layer-setup.md` | 28 个 active/private File 的完整 URL、频道、审计和回滚参数 |
| `docs/maintenance.md` | 开发者维护、规则编译、发布与回滚 |
| `docs/implementation-status.md` | 当前已完成和仍需真机执行的事项 |
| `clients/<client>/docs/` | 每个客户端的部署、灰度和排障细节 |
| `shared/rules/semantic-intents.js` | 统一业务语义中间层 |
| `automation/src/source-catalog.js` | 固定公开规则来源 |
| `public/current/` | 生产通道 |
| `public/edge/` | 测试候选通道 |
| `public/previous/` | 快速回滚通道 |

客户端详细文档：

- Shadowrocket：[部署](clients/shadowrocket/docs/deployment.md) · [灰度](clients/shadowrocket/docs/canary-checklist.md) · [维护](clients/shadowrocket/docs/maintenance.md) · [排障](clients/shadowrocket/docs/troubleshooting.md)
- Surge：[部署](clients/surge/docs/deployment.md) · [灰度](clients/surge/docs/canary.md) · [排障](clients/surge/docs/troubleshooting.md)
- Egern：[部署](clients/egern/docs/deployment.md) · [灰度](clients/egern/docs/canary.md) · [排障](clients/egern/docs/troubleshooting.md)
- Anywhere：[部署](clients/anywhere/docs/deployment.md) · [灰度](clients/anywhere/docs/canary.md) · [排障](clients/anywhere/docs/troubleshooting.md)
- sing-box：[部署](clients/sing-box/docs/deployment.md) · [灰度](clients/sing-box/docs/canary.md) · [排障](clients/sing-box/docs/troubleshooting.md)
- HAPP：[部署](clients/happ/docs/deployment.md) · [灰度](clients/happ/docs/canary.md) · [排障](clients/happ/docs/troubleshooting.md)
- OneXray：[部署](clients/onexray/docs/deployment.md) · [灰度](clients/onexray/docs/canary.md) · [排障](clients/onexray/docs/troubleshooting.md)

## 许可

本仓库整体以 [GNU GPL v2.0 only](LICENSE) 发布。Blackmatrix7 规则的来源、固定提交、转换说明和免责声明随衍生产物保留；各客户端名称和商标属于各自权利人。
