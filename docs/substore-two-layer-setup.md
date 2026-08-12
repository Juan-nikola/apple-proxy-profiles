# Sub-Store 五客户端外置 JS + 任务引用总指南

本指南把公开代码和私密节点分成两层：

1. **GitHub Pages 公开层**：仓库维护没有节点的 JavaScript 生成器和公开规则。
2. **Sub-Store 私密层**：你自己的 Sub-Store 保存来源、组合、参数和最终输出 URL。

“引用”的含义是：Sub-Store 的 File 或 Script Operator 保存一个远程 JS URL；旧版单行模式在 URL 的 `#` 后用 `&` 传参数。不要复制 JavaScript 正文，也不要把私密 API、节点 URL 或输出链接提交到 GitHub。

## 0. 安全边界

本文件只使用公开 Pages URL 和 `example.invalid`。以下信息不要放进仓库、README、Issue、聊天、截图、终端历史或公开日志：

- Sub-Store 管理地址和 API key；
- `snell`、`vlesshy2` 或其他来源的真实订阅 URL；
- 节点服务器、端口、UUID、密码、PSK、私钥、证书和完整节点配置；
- Sub-Store 生成的节点订阅、Profile、JSON、YAML URL；
- 带秘密参数的二维码和 deep link。

本项目不需要 MITM、HTTPS 解密、CA 证书、请求重写或“不验证证书”。`insecure` 永远关闭；`noCache` 生产任务默认关闭，只有隔离测试任务排查缓存时临时打开。

## 1. 先建立一个私密组合订阅

在你自己的 Sub-Store 中：

1. 保留已有订阅 `snell` 和 `vlesshy2`，先分别预览确认非空。
2. 新建原始组合订阅，名称严格填写：`apple-proxy-sources`。
3. 将 `snell` 与 `vlesshy2` 加入这个原始组合，不把真实来源地址复制到任何公开位置。
4. 预览原始组合，确认节点数量大于 0。

以后增加节点来源只加入 `apple-proxy-sources`，不需要改 GitHub JS。五个客户端的 Profile/Config 全部读取这个原始组合（Shadowrocket Profile 生成器内置节点归一化，不依赖组合上的节点操作）。删除来源时也只在这一层操作，并先保留旧输出以便回滚。

## 2. 七个公开远程 JS

新任务优先使用 `current/`：

| JS | 公开 URL | Sub-Store 用途 |
| --- | --- | --- |
| Shadowrocket node | `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-subscription.js` | 排序节点订阅 File |
| Shadowrocket Profile | `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js` | 三个 Profile File |
| Egern node | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js` | 节点 File |
| Egern Profile | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js` | 三个 Profile File |
| Anywhere node | `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js` | 节点 File |
| Surge node resource | `https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-nodes-generator.js` | 一个 Surge 节点 File |
| Surge Profile | `https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js` | 三个平台远程 Profile File |
| sing-box config | `https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js` | 五个平台 Config File |

测试版只把路径中的 `current` 换成 `edge`。不要使用 GitHub `blob` 页面、`clients/*/dist/` 本地路径或旧兼容 URL 创建新任务。

## 3. 参数填写方式

### 新版 Sub-Store

1. 新建 File 或 Script Operator。
2. 来源选择“远程链接/链接”，粘贴第 2 节的完整 JS URL。
3. 展开参数编辑器，逐项添加 `key` 和 `value`。
4. `noCache` 关闭，`insecure` 关闭。

### 旧版只有一个脚本链接框

把参数放在 URL 的 `#` 后，参数之间用 `&`：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-sources&clientChain=off
```

不要写成 `script.js?output=nodes`。`?` 是网页查询参数，不是本项目的 Sub-Store 脚本参数格式。参数值中如果有私密 URL、中文、emoji、空格、`&`、`#` 或 `%`，只对该参数值做百分号编码；不要编码脚本 URL、参数名和分隔参数的 `&`、`=`。

配置任务同样使用 hash；例如 Surge iPhone 的完整引用形式是：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js#output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off
```

## 4. 20 个任务总表

下面的 `Apple-Proxy-Nodes` 是公开示例显示名。实际使用时，在 Shadowrocket、Surge 或 sing-box 中给节点订阅取一个你自己的显示名，并让同一客户端对应 Profile/Config 任务的 `subscriptionName` 逐字一致。五个客户端的 Profile/Config 全部指向原始组合 `apple-proxy-sources`：Shadowrocket Profile 生成器内部自己完成节点归一化、去重与客户端过滤，不再依赖组合处理链上的节点操作。

| # | 任务名 | 类型 | 远程脚本 | 平台/作用 | 更新 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `egern-nodes` | File | Egern node | 节点 YAML | 6 小时 |
| 2 | `egern-macos` | File | Egern Profile | macOS | 每天 |
| 3 | `egern-iphone` | File | Egern Profile | iPhone | 每天 |
| 4 | `egern-ipad` | File | Egern Profile | iPad | 每天 |
| 5 | `anywhere-nodes` | File | Anywhere node | Clash YAML | 6 小时 |
| 6 | `shadowrocket-config-macos` | File | Shadowrocket Profile | macOS | 每天 |
| 7 | `shadowrocket-config-iphone` | File | Shadowrocket Profile | iPhone | 每天 |
| 8 | `shadowrocket-config-ipad` | File | Shadowrocket Profile | iPad | 每天 |
| 9 | `surge-nodes` | File | Surge node resource | 节点 `[Proxy]` | 6 小时 |
| 10 | `surge-config-macos` | File | Surge Profile | macOS | 每天 |
| 11 | `surge-config-iphone` | File | Surge Profile | iPhone | 每天 |
| 12 | `surge-config-ipad` | File | Surge Profile | iPad | 每天 |
| 13 | `singbox-config-macos` | File | sing-box config | macOS | 每天 |
| 14 | `singbox-config-iphone` | File | sing-box config | iPhone | 每天 |
| 15 | `singbox-config-ipad` | File | sing-box config | iPad | 每天 |
| 16 | `singbox-config-android` | File | sing-box config | Android | 每天 |
| 17 | `singbox-config-openwrt` | File | sing-box config | OpenWrt | 每天 |
| 18 | `onexray-nodes` | File | 私有托管 OneXray node | 节点订阅 | 6 小时 |
| 19 | `onexray-profile` | File | 私有托管 OneXray Profile | Profile deep link | 每天 |
| 20 | `onexray-routing-audit` | File | 私有托管 OneXray audit | 脱敏审计 | 每天 |

客户端总数为 4+1+3+4+5+3=20 个任务。

## 5. Egern：1 个节点 File + 3 个 Profile File

### 5.1 `egern-nodes`

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js
```

参数：

```text
output=nodes&type=collection&name=apple-proxy-sources&clientChain=off
```

旧版完整引用：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-sources&clientChain=off
```

预览成功标志：输出顶层有 `proxies:`，节点数量大于 0；不要导入到 Egern 之前就删除旧 Profile。保存该 File 的私密输出 URL，仅在下表的 `nodeSubscriptionUrl` 参数中使用。

### 5.2 三个平台 Profile

脚本统一为：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js
```

把 `https://example.invalid/private/egern-nodes` 换成 `egern-nodes` 在你自己 Sub-Store 中生成的私密 URL；不要把替换后的真实 URL 写回仓库。

| 任务 | 平台 | 完整参数 |
| --- | --- | --- |
| `egern-macos` | macOS | `output=config&type=collection&name=apple-proxy-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `egern-iphone` | iPhone | `output=config&type=collection&name=apple-proxy-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `egern-ipad` | iPad | `output=config&type=collection&name=apple-proxy-sources&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

预览必须出现 `ipv6:`、`dns:`、`policy_groups:`、`rules:` 和 `default_subscription_group:`；没有自更新 URL 时不应出现无效的空 `auto_update: {}`。

## 6. Anywhere：1 个节点 File + 公开规则导入

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js
```

参数：

```text
output=nodes&type=collection&name=apple-proxy-sources&clientChain=off
```

预览顶层必须有 `proxies:`。保存 `anywhere-nodes` 私密输出 URL 后，在 Anywhere 的节点订阅页面导入它。

公开规则全部导入页：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html
```

点击页面中的“全部导入”后，仍需在 App 中对规则集逐个确认 DIRECT、REJECT 或目标节点/链。节点订阅、公开 `.arrs` 规则和设备本地绑定是三层独立配置；`Default` 不是可靠的停用开关，也不要用 MITM 解决规则下载问题。

## 7. Shadowrocket：1 个节点 Operator + 3 个 Profile File

### 7.1 节点订阅

Shadowrocket 的节点订阅使用排序生成器 `shadowrocket-node-subscription.js`：在 Sub-Store 新建 File 任务 `shadowrocket-nodes`，脚本链接为 `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-subscription.js#output=nodes&type=collection&name=apple-proxy-sources&clientChain=off`。生成器会归一化节点并按“洲 → 国旗 → 名称”排序（亚太 → 欧洲 → 美洲，洲内按国旗），与 Profile 内的节点顺序完全一致。在 Shadowrocket 客户端中添加该 File 的私密输出 URL，显示名记为 `Apple-Proxy-Nodes`（实际显示名可以自定义，但必须逐字填写到三个 Shadowrocket Profile 的 `subscriptionName`）。

旧结构中的 `shadowrocket-nodes` 处理组合保留为兼容项：早期版本曾要求在该组合上挂 `shadowrocket-node-operator.js` 节点操作，但 Sub-Store 的组合 Script Operator 不能执行本项目的 esbuild bundle 格式，会导致节点处理失败。当前 Profile 生成器内置了同一套归一化逻辑，因此新任务不再需要节点操作，也不要再挂这个远程脚本。

### 7.2 三个平台 Profile

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js
```

公共参数：`output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&autoGroupMode=auto&clientChain=off`。

| 任务 | 额外参数 |
| --- | --- |
| `shadowrocket-config-macos` | `platform=macos&ipv6Mode=ipv4-only` |
| `shadowrocket-config-iphone` | `platform=iphone&ipv6Mode=auto` |
| `shadowrocket-config-ipad` | `platform=ipad&ipv6Mode=auto` |

例如 macOS 完整参数：

```text
output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off
```

预览应包含 `[General]`、`[Proxy Group]`、`[Rule]`，且不包含节点密码、UUID 或服务器凭据。导入顺序：Intel Mac → iPhone → iPad；旧 Profile 始终保留。

## 8. Surge：1 个节点 File + 3 个远程 Profile File

### 8.1 节点资源 File

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-nodes-generator.js
```

参数：`output=nodes&type=collection&name=apple-proxy-sources&clientChain=off`。

预览应输出 `[Proxy]` 和至少一个节点。该资源只保留 Surge 已登记且字段完整的协议；当前会自动排除 VLESS。保存此 File 的私密输出 URL，下面记作 `<SURGE_NODES_URL>`。

### 8.2 三个平台 Profile

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js
```

公共参数（使用原始组合）：`output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&proxyPolicyUrl=<SURGE_NODES_URL>&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&autoGroupMode=auto&clientChain=off`。在新版 Sub-Store 参数编辑器中直接填写私密 URL；旧版 `JS_URL#...` 模式只对 URL 参数值进行百分号编码。

| 任务 | 额外参数 | 官方客户端 |
| --- | --- | --- |
| `surge-config-macos` | `platform=macos&ipv6Mode=ipv4-only` | Surge for Mac |
| `surge-config-iphone` | `platform=iphone&ipv6Mode=auto` | Surge for iPhone |
| `surge-config-ipad` | `platform=ipad&ipv6Mode=auto` | Surge for iPad |

预览应是合法 Surge INI，包含 `[General]`、`[Proxy]`、`[Proxy Group]` 和 `[Rule]`。`[Proxy]` 只保留注释，隐藏组 `📦 远程节点池` 通过 `policy-path=<SURGE_NODES_URL>` 加载节点；Intel Mac 与 Apple Silicon Mac 都使用 `platform=macos`，不要把 Mac 配置导入移动端。

## 9. OneXray：3 个私有任务

OneXray 的两个 bundle 已随 edge 发布到 Pages，只存在于 `edge/onexray/scripts/`；current 与 previous 不发布脚本。直接使用下面的 edge URL 创建任务。

节点任务：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-nodes-generator.js?v=7#output=nodes&type=collection&name=apple-proxy-sources&channel=edge&clientChain=off
```

Profile 与审计共用同一个生成器，只改 `output`：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js?v=7#output=profile&type=collection&name=apple-proxy-sources&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off&policyFile=onexray-policy&logLevel=info
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js?v=7#output=audit&type=collection&name=apple-proxy-sources&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off&policyFile=onexray-policy&logLevel=info
```

| 任务 | 输出 | 平台/作用 | 更新 |
| --- | --- | --- | --- |
| `onexray-nodes` | nodes | OneXray 节点订阅 | 6 小时 |
| `onexray-profile` | profile | 版本化 Profile deep link | 每天 |
| `onexray-routing-audit` | audit | 脱敏路由审计 | 按需 |

OneXray 的节点订阅只保留 Xray 内核支持的协议（VLESS、VMess、SS、Trojan、Socks、HTTP、Hysteria2）；原始组合中的 Snell 等节点会被自动排除，因此 OneXray 节点预览数量可能小于其他客户端。

`v=7` 是 Sub-Store 脚本缓存版本号；脚本内容更新后把三个任务 URL 里的 `v=` 数字 +1 并重新保存。固定业务推荐用 `&policyFile=onexray-policy` 引用 Sub-Store 内的可读策略文件，也可继续用 `&policyOverrides=<Base64URL>`，两者不能同时使用。`logLevel` 可输入 `none`、`error`、`warning`、`info`、`debug`，默认 `warning`，示例使用 `info` 以记录访问日志。

`onexray-policy` 是 Sub-Store 里的一个本地文件，内容为可读 JSON（业务名可用中文），每个分组可写 `FOLLOW`（跟随主节点）、`DIRECT`（直连）或 `NODE:<精确节点名>`（固定节点）。以后要加入自定义分流规则，修改仓库 `shared/rules/custom-rules.js` 并按 README 的发布流程执行。

Profile 名会插入 8 位内容哈希版本号；同一通道必须使用同一通道的 GeoData。完整安装顺序、Rule 模式、固定节点快照和回滚说明见 `clients/onexray/docs/deployment.md` 与 `clients/onexray/docs/troubleshooting.md`。

## 10. sing-box：5 个 Config File

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js
```

公共参数：`output=config&type=collection&name=apple-proxy-sources&subscriptionName=Apple-Proxy-Nodes&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&autoGroupMode=auto&clientChain=off&channel=current`。

| 任务 | 平台额外参数 | 官方客户端 |
| --- | --- | --- |
| `singbox-config-macos` | `platform=macos&ipv6Mode=ipv4-only` | sing-box for Mac |
| `singbox-config-iphone` | `platform=iphone&ipv6Mode=auto` | sing-box for iPhone |
| `singbox-config-ipad` | `platform=ipad&ipv6Mode=auto` | sing-box for iPad |
| `singbox-config-android` | `platform=android&ipv6Mode=auto` | sing-box for Android |
| `singbox-config-openwrt` | `platform=openwrt&ipv6Mode=auto` | OpenWrt 软路由 |

想测试最新 testing 分支时，只在隔离任务中把 JS URL 的 `current` 改成 `edge`，并把 `channel=current` 改成 `channel=edge`。生产任务先使用 `current`，避免每日 testing 提交直接影响全部设备。

预览必须是 JSON，且能通过配置校验。移动端使用 TUN 相关配置；OpenWrt 才启用透明网关、DNS 劫持和 Linux 自动重定向字段。OpenWrt 还需要设备上安装与配置匹配的官方 sing-box 二进制；不能把本仓库生成的 JSON 当成已安装核心。

## 11. 运行和刷新顺序

### 首次建立

1. 预览 `apple-proxy-sources`。
2. 运行节点任务：Egern、Anywhere、Shadowrocket。
3. 运行依赖节点输出 URL 的 Egern Profile。
4. 运行 `surge-nodes`，再运行 Surge 三个平台 Profile；Profile 会自动携带节点资源 URL。
5. 运行 Shadowrocket 和 sing-box Profile/Config。
6. 逐个保存私密输出 URL；不要在聊天中回传。
7. 先在一台 macOS 设备导入并 canary，再处理移动端；sing-box Android/OpenWrt 另按其清单执行。

### 日常刷新

节点源变化：原始组合 `apple-proxy-sources` → 各客户端节点任务（Surge 为 `surge-nodes`）→ 各客户端 Profile/Config 任务 → 客户端手动更新。

公开规则变化：在客户端对已有规则集执行 Update；不要因为规则更新就重新创建 Sub-Store 节点任务。

### 回滚

失败时先在设备切回旧 Profile/Config。公开 JS 可在隔离任务中回退到 `/previous/` 或已验证的 `/versions/<manifestHash>/`；生产任务修复前不要直接把所有任务切到 `edge`。参数和私密输出 URL 不需要改变。

## 12. 任务完成检查

- 组合 `apple-proxy-sources` 非空，且只包含预期来源。
- 节点预览非空；Profile/Config 预览结构正确，不出现凭据。
- `noCache` 正式任务关闭，`insecure` 始终关闭。
- `subscriptionName` 在对应客户端和所有 Profile/Config 任务中逐字一致。
- Mac、iPhone、iPad、Android、OpenWrt 使用各自平台值；没有交叉导入。
- Anywhere 规则导入后逐个检查目标绑定；没有把规则更新误当成节点刷新。
- 旧 Profile/Config 与回滚入口仍保留。

## 13. 旧兼容 URL

已经部署的 `substore-*` Pages URL 可以继续使用，不需要为了改名迁移。新任务统一使用客户端前缀 URL；不要把同一脚本的新旧 URL 同时添加到一个任务。
