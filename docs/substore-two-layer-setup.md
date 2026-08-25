# Sub-Store 九客户端外置 JS + 任务引用总指南

九个客户端都通过自动化门禁后发布到 `current`；`edge` 是维护者的隔离预览频道，`previous` 用于回滚。下表和任务示例中的 `current` 是正式 URL。需要预览候选时，将脚本路径和 hash 参数中的频道一并替换为 `edge`；不要把 `edge` URL 用作生产任务。

本指南把公开代码和私密节点分成两层：

1. **GitHub Pages 公开层**：仓库维护没有节点的 JavaScript 生成器和公开规则。
2. **Sub-Store 私密层**：你自己的 Sub-Store 保存来源、组合、参数和最终输出 URL。

“引用”的含义是：Sub-Store 的 File 或 Script Operator 保存一个远程 JS URL；旧版单行模式在 URL 的 `#` 后用 `&` 传参数。不要复制 JavaScript 正文，也不要把私密 API、节点 URL 或输出链接提交到 GitHub。

九个客户端的 collection 名称、用户自行筛选边界、迁移顺序和回滚方法统一见 [Sub-Store 客户端节点池指南](substore-client-pools.md)。

## 0. 安全边界

本文件只使用公开 Pages URL 和 `example.invalid`。以下信息不要放进仓库、README、Issue、聊天、截图、终端历史或公开日志：

- Sub-Store 管理地址和 API key；
- `snell`、`vlesshy2` 或其他来源的真实订阅 URL；
- 节点服务器、端口、UUID、密码、PSK、私钥、证书和完整节点配置；
- Sub-Store 生成的节点订阅、Profile、JSON、YAML URL；
- 带秘密参数的二维码和 deep link。

本项目不需要 MITM、HTTPS 解密、CA 证书、请求重写或“不验证证书”。`insecure` 永远关闭；`noCache` 生产任务默认关闭，只有隔离测试任务排查缓存时临时打开。

## 1. 先建立总池和九个客户端组合

在你自己的 Sub-Store 中：

1. 保留已有来源、旧 collection、tasks 和旧 URL，先分别 preview 确认非空。
2. 建立用户自己的 `apple-proxy-all` 总池。
3. 按节点池指南建立九个 client collection，用户自行选择每个客户端要包含的节点；HAPP/OneXray/v2rayN/V2Box 会按已审计能力过滤不兼容节点，并在诊断中记录排除原因。
4. 逐个 preview 并记录计数，再一次只迁移一个客户端的 `name=`。

`sing-box-client` 不是必需标签。它只是 Sub-Store 的筛选辅助，可以删除；如果要自定义 sing-box 节点组合，请移除该标签筛选条件后，直接手动勾选进入 `apple-proxy-singbox` 的节点。不要改 collection slug，也不要把任务参数里的 `name=apple-proxy-singbox` 改成中文。

新任务不再让九个客户端直接共享一个 collection。旧 `apple-proxy-sources` 继续保留作兼容/回滚入口，不要删除。

## 2. 十七个公开远程 JS

新任务优先使用 `current/`：

| JS | 公开 URL | Sub-Store 用途 |
| --- | --- | --- |
| Shadowrocket node | `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-subscription.js` | 排序节点订阅 File |
| Shadowrocket Profile | `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js` | 三个 Profile File |
| Egern node | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js` | 节点 File |
| Egern Profile | `https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-profile-generator.js` | 三个 Profile File |
| Anywhere node | `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js` | 节点 File |
| Anywhere strategy | `https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-strategy-generator.js` | 策略校验/映射 File，不生成完整 Profile |
| Surge node resource | `https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-nodes-generator.js` | 一个 Surge 节点 File |
| Surge Profile | `https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js` | 三个平台远程 Profile File |
| sing-box config | `https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js` | 四个平台 Config File |
| OneXray nodes | `https://juan-nikola.github.io/apple-proxy-profiles/current/onexray/scripts/onexray-node-generator.js` | Xray JSON 节点订阅 |
| OneXray Profile | `https://juan-nikola.github.io/apple-proxy-profiles/current/onexray/scripts/onexray-profile-generator.js` | 原生结构化 Profile |
| OneXray audit | `https://juan-nikola.github.io/apple-proxy-profiles/current/onexray/scripts/onexray-routing-audit.js` | 脱敏分流审计 |
| HAPP config | `https://juan-nikola.github.io/apple-proxy-profiles/current/happ/scripts/happ-config-generator.js` | HAPP JSON 配置数组 |
| HAPP audit | `https://juan-nikola.github.io/apple-proxy-profiles/current/happ/scripts/happ-routing-audit.js` | 脱敏分流审计 |
| v2rayN nodes | `https://juan-nikola.github.io/apple-proxy-profiles/current/v2rayn/scripts/substore-node-generator.js` | Windows/macOS Xray 节点订阅 |
| v2rayN config | `https://juan-nikola.github.io/apple-proxy-profiles/current/v2rayn/scripts/substore-config-generator.js` | Windows/macOS Xray JSON 配置 |
| V2Box nodes | `https://juan-nikola.github.io/apple-proxy-profiles/current/v2box/scripts/substore-node-generator.js` | iPhone/iPad Xray 节点订阅 |
| V2Box config | `https://juan-nikola.github.io/apple-proxy-profiles/current/v2box/scripts/substore-config-generator.js` | iPhone/iPad Xray JSON 配置 |

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
https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-egern&clientChain=off
```

不要写成 `script.js?output=nodes`。`?` 是网页查询参数，不是本项目的 Sub-Store 脚本参数格式。参数值中如果有私密 URL、中文、emoji、空格、`&`、`#` 或 `%`，只对该参数值做百分号编码；不要编码脚本 URL、参数名和分隔参数的 `&`、`=`。

配置任务同样使用 hash；例如 Surge iPhone 的完整引用形式是：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js#output=config&type=collection&name=apple-proxy-surge&subscriptionName=Apple-Proxy-Nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off
```

## 4. 17 个通用任务总表

下面的 `Apple-Proxy-Nodes` 是公开示例显示名。实际使用时，在 Shadowrocket、Surge 或 sing-box 中给节点订阅取一个你自己的显示名，并让同一客户端对应 Profile/Config 任务的 `subscriptionName` 逐字一致。每个 Profile/Config 只指向节点池指南定义的对应 client collection。

| # | 任务名 | 类型 | 远程脚本 | 平台/作用 | 更新 |
| ---: | --- | --- | --- | --- | --- |
| 1 | `egern-nodes` | File | Egern node | 节点 YAML | 6 小时 |
| 2 | `egern-macos` | File | Egern Profile | macOS | 每天 |
| 3 | `egern-iphone` | File | Egern Profile | iPhone | 每天 |
| 4 | `egern-ipad` | File | Egern Profile | iPad | 每天 |
| 5 | `anywhere-nodes` | File | Anywhere node | Clash YAML | 6 小时 |
| 6 | `shadowrocket-nodes` | File | Shadowrocket node | 排序节点订阅 | 6 小时 |
| 7 | `shadowrocket-config-macos` | File | Shadowrocket Profile | macOS | 每天 |
| 8 | `shadowrocket-config-iphone` | File | Shadowrocket Profile | iPhone | 每天 |
| 9 | `shadowrocket-config-ipad` | File | Shadowrocket Profile | iPad | 每天 |
| 10 | `surge-nodes` | File | Surge node resource | 节点 `[Proxy]` | 6 小时 |
| 11 | `surge-config-macos` | File | Surge Profile | macOS | 每天 |
| 12 | `surge-config-iphone` | File | Surge Profile | iPhone | 每天 |
| 13 | `surge-config-ipad` | File | Surge Profile | iPad | 每天 |
| 14 | `singbox-config-macos` | File | sing-box config | macOS | 每天 |
| 15 | `singbox-config-iphone` | File | sing-box config | iPhone | 每天 |
| 16 | `singbox-config-ipad` | File | sing-box config | iPad | 每天 |
| 17 | `singbox-config-android` | File | sing-box config | Android | 每天 |

通用任务总数为 `4+1+4+4+4=17` 个。

## 4.1 九客户端目标与 35 个任务

仓库注册表包含九个稳定 ID，九个都已进入 `active` 发布状态。任务总数为 **35 个**：现有 17 个通用任务，加上 Anywhere 策略校验/映射、policy、3 个 OneXray 任务、6 个 HAPP 平台配置任务、1 个 HAPP 审计任务和 6 个 v2rayN/V2Box 任务。

| # | 任务 | 状态 | 输入/绑定 | 说明 |
| ---: | --- | --- | --- | --- |
| 18 | `anywhere-strategy` | active/private | `apple-proxy-anywhere` + `policyInput=apple-proxy-policy` | 只输出策略目标校验/映射和脱敏计数，不伪造完整 Anywhere Profile |
| 19 | `apple-proxy-policy` | private | 私密 Sub-Store policy | schema v2 单层 `targets`；reader 保持 schema v1 兼容；只在私密任务读取 revision、channel、公开 Manifest SHA-256 和 GeoData SHA-256，不放入公开 Pages |
| 20 | `onexray-nodes` | active/private | `apple-proxy-onexray` 或总池 | 输出 Xray JSON outbounds；不复制完整 Profile，不包含公开凭据 |
| 21 | `onexray-profile` | active/private | `apple-proxy-onexray` | 输出结构化 OneXray Profile；固定节点缺失/重复/不兼容时整项失败 |
| 22 | `onexray-routing-audit` | active/private | 与 Profile 同一 collection/参数 | 只输出计数、目标解析和链状态，不输出节点凭据 |
| 23 | `happ-macos` | active/private | `apple-proxy-happ` | 输出 macOS HAPP JSON 配置数组 |
| 24 | `happ-iphone` | active/private | `apple-proxy-happ` | 输出 iPhone HAPP JSON 配置数组 |
| 25 | `happ-ipad` | active/private | `apple-proxy-happ` | 输出 iPad HAPP JSON 配置数组 |
| 26 | `happ-android` | active/private | `apple-proxy-happ` | 输出 Android HAPP JSON 配置数组 |
| 27 | `happ-windows` | active/private | `apple-proxy-happ` | 输出 Windows HAPP JSON 配置数组 |
| 28 | `happ-linux` | active/private | `apple-proxy-happ` | 输出 Linux HAPP JSON 配置数组 |
| 29 | `happ-routing-audit` | active/private | `apple-proxy-happ` + `policyInput=apple-proxy-policy` | 只输出兼容数、排除原因、业务目标和 warning |
| 30 | `v2rayn-nodes` | active/private | `apple-proxy-v2rayn` | 输出 Windows/macOS 可导入的 Xray JSON 节点订阅 |
| 31 | `v2rayn-config-windows` | active/private | `apple-proxy-v2rayn` | 输出 Windows v2rayN 配置；默认 `region=cn` |
| 32 | `v2rayn-config-macos` | active/private | `apple-proxy-v2rayn` | 输出 macOS v2rayN 配置；默认 `region=cn` |
| 33 | `v2box-nodes` | active/private | `apple-proxy-v2box` | 输出 iPhone/iPad 可导入的 Xray JSON 节点订阅 |
| 34 | `v2box-config-iphone` | active/private | `apple-proxy-v2box` | 输出 iPhone V2Box 配置；默认 `region=cn` |
| 35 | `v2box-config-ipad` | active/private | `apple-proxy-v2box` | 输出 iPad V2Box 配置；默认 `region=cn` |


除节点订阅任务外，所有配置、Profile 和 audit 任务的 Sub-Store 元数据都设置 `policyInput=apple-proxy-policy`；节点任务不读取策略。policy File 使用 schema v2 单层 `targets`，读取器继续兼容 schema v1。读取策略的任务接收同名 `channel`（仅 `edge`、`current`、`previous`），并绑定该频道的 policy revision、公开 client Manifest SHA-256 和 GeoData SHA-256；OneXray node-only 任务也接收 `channel`，但不读取业务策略。HAPP 的 6 个平台配置任务和 `happ-routing-audit` 固定使用 `/current/happ/`，任务片段不接收或携带 `channel`；HAPP 审计只把 `current` 作为内部诊断元数据。公开脚本只在 Pages 提供无节点 bundle，真实输出仍只在私密 Sub-Store 任务日志和客户端导入结果中查看。

真机 canary 不再是发布门禁。自动化测试、规则预算、manifest 闭合、ChinaIP/v2fly 审计和秘密扫描通过后，客户端可以直接使用 `current`；`edge` 只作为维护者预览入口。设备清单保留为上线后的可选实践反馈，失败时回滚受影响客户端并修正后续发布。

当前任务的频道契约是：通用客户端、policy 和 OneXray 任务使用 `channel=current`；HAPP 任务固定使用 `/current/happ/` 且省略 `channel`；`edge` 仅作为维护者灰度频道，`previous` 用于回滚。

### 完整 `apple-proxy-policy` 示例

公开文档中的 `apple-proxy-policy` 必须列全 13 个业务目标，不能只保留缩减版示例。

```json
{
  "schemaVersion": 2,
  "targets": {
    "🤖 AI 专用": "FOLLOW",
    "🐙 GitHub": "FOLLOW",
    "📺 YouTube": "FOLLOW",
    "🎬 海外流媒体": "FOLLOW",
    "💬 海外社交": "FOLLOW",
    "🍎 Apple": "DIRECT",
    "🪟 Microsoft": "DIRECT",
    "🇨🇳 国内平台": "DIRECT",
    "🌍 海外游戏": "FOLLOW",
    "🎮 游戏连接": "DIRECT",
    "⬇️ 下载/P2P": "DIRECT",
    "🧭 DNS 与规则下载": "FOLLOW",
    "最终兜底": "FOLLOW"
  }
}
```

## 5. Egern：1 个节点 File + 3 个 Profile File

### 5.1 `egern-nodes`

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js
```

参数：

```text
output=nodes&type=collection&name=apple-proxy-egern&clientChain=off
```

旧版完整引用：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/egern/scripts/egern-node-generator.js#output=nodes&type=collection&name=apple-proxy-egern&clientChain=off
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
| `egern-macos` | macOS | `output=config&type=collection&name=apple-proxy-egern&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off` |
| `egern-iphone` | iPhone | `output=config&type=collection&name=apple-proxy-egern&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=iphone&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |
| `egern-ipad` | iPad | `output=config&type=collection&name=apple-proxy-egern&nodeSubscriptionUrl=https://example.invalid/private/egern-nodes&platform=ipad&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&autoGroupMode=auto&clientChain=off` |

预览必须出现 `ipv6:`、`dns:`、`policy_groups:`、`rules:` 和 `default_subscription_group:`；没有自更新 URL 时不应出现无效的空 `auto_update: {}`。

## 6. Anywhere：节点 File + 策略审计 + 公开规则导入

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-node-generator.js
```

参数：

```text
output=nodes&type=collection&name=apple-proxy-anywhere&clientChain=off
```

预览顶层必须有 `proxies:`。保存 `anywhere-nodes` 私密输出 URL 后，在 Anywhere 的节点订阅页面导入它。

Anywhere 的策略校验/映射是独立任务，不替代节点 File，也不生成虚假的完整 Profile：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/scripts/anywhere-strategy-generator.js
```

参数：

```text
output=strategy&type=collection&name=apple-proxy-anywhere&channel=current
```

它读取同一个私密 `apple-proxy-policy` 文件，输出业务目标状态、固定节点映射和脱敏计数；节点订阅任务只读取 collection，不读取策略。策略任务失败时应修复策略或节点匹配，不回退成默认或空 Profile。

公开规则全部导入页：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/anywhere/import.html
```

点击页面中的“全部导入”后，仍需在 App 中对规则集逐个确认 DIRECT、REJECT 或目标节点/链。节点订阅、公开 `.arrs` 规则和设备本地绑定是三层独立配置；`Default` 不是可靠的停用开关，也不要用 MITM 解决规则下载问题。

## 7. Shadowrocket：1 个节点 Operator + 3 个 Profile File

### 7.1 节点订阅

Shadowrocket 的节点订阅使用排序生成器 `shadowrocket-node-subscription.js`：在 Sub-Store 新建 File 任务 `shadowrocket-nodes`，脚本链接为 `https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-node-subscription.js#output=nodes&type=collection&name=apple-proxy-shadowrocket&clientChain=off`。生成器会归一化节点并按“洲 → 名称”排序（亚太 → 欧洲 → 美洲，洲内按稳定名称），与 Profile 内的节点顺序完全一致。在 Shadowrocket 客户端中添加该 File 的私密输出 URL，显示名记为 `Apple-Proxy-Nodes`（实际显示名可以自定义，但必须逐字填写到三个 Shadowrocket Profile 的 `subscriptionName`）。

旧结构中的 `shadowrocket-nodes` 处理组合保留为兼容项：早期版本曾要求在该组合上挂 `shadowrocket-node-operator.js` 节点操作，但 Sub-Store 的组合 Script Operator 不能执行本项目的 esbuild bundle 格式，会导致节点处理失败。当前 Profile 生成器内置了同一套归一化逻辑，因此新任务不再需要节点操作，也不要再挂这个远程脚本。

### 7.2 三个平台 Profile

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/shadowrocket/scripts/shadowrocket-profile-generator.js
```

公共参数：`output=config&type=collection&name=apple-proxy-shadowrocket&subscriptionName=Apple-Proxy-Nodes&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&autoGroupMode=auto&clientChain=off`。

| 任务 | 额外参数 |
| --- | --- |
| `shadowrocket-config-macos` | `platform=macos&ipv6Mode=ipv4-only` |
| `shadowrocket-config-iphone` | `platform=iphone&ipv6Mode=auto` |
| `shadowrocket-config-ipad` | `platform=ipad&ipv6Mode=auto` |

例如 macOS 完整参数：

```text
output=config&type=collection&name=apple-proxy-shadowrocket&subscriptionName=Apple-Proxy-Nodes&platform=macos&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&autoGroupMode=auto&clientChain=off
```

预览应包含 `[General]`、`[Proxy Group]`、`[Rule]`，且不包含节点密码、UUID 或服务器凭据。导入顺序：Intel Mac → iPhone → iPad；旧 Profile 始终保留。

## 8. Surge：1 个节点 File + 3 个远程 Profile File

### 8.1 节点资源 File

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-nodes-generator.js
```

参数：`output=nodes&type=collection&name=apple-proxy-surge&clientChain=off`。

预览应输出 `[Proxy]` 和至少一个节点。该资源输出用户选入 `apple-proxy-surge` 的全部节点，生成器不按客户端能力白名单过滤；当前 Surge renderer 无法表示的协议（例如 VLESS）会跳过并计入 `renderFailures`，只有没有任何可渲染节点时才失败。保存此 File 的私密输出 URL，下面记作 `<SURGE_NODES_URL>`。

### 8.2 三个平台 Profile

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/surge/scripts/surge-profile-generator.js
```

公共参数（使用原始组合）：`output=config&type=collection&name=apple-proxy-surge&subscriptionName=Apple-Proxy-Nodes&proxyPolicyUrl=<SURGE_NODES_URL>&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&autoGroupMode=auto&clientChain=off`。在新版 Sub-Store 参数编辑器中直接填写私密 URL；旧版 `JS_URL#...` 模式只对 URL 参数值进行百分号编码。

| 任务 | 额外参数 | 官方客户端 |
| --- | --- | --- |
| `surge-config-macos` | `platform=macos&ipv6Mode=ipv4-only` | Surge for Mac |
| `surge-config-iphone` | `platform=iphone&ipv6Mode=auto` | Surge for iPhone |
| `surge-config-ipad` | `platform=ipad&ipv6Mode=auto` | Surge for iPad |

预览应是合法 Surge INI，包含 `[General]`、`[Proxy]`、`[Proxy Group]` 和 `[Rule]`。`[Proxy]` 只保留注释，隐藏组 `📦 远程节点池` 通过 `policy-path=<SURGE_NODES_URL>` 加载节点；Intel Mac 与 Apple Silicon Mac 都使用 `platform=macos`，不要把 Mac 配置导入移动端。

## 9. sing-box：4 个 Config File

脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js
```

公共参数：`output=config&type=collection&name=apple-proxy-singbox&subscriptionName=Apple-Proxy-Nodes&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&autoGroupMode=auto&clientChain=off&nodeErrorMode=strict&channel=current`。

sing-box 默认 strict：任一已选节点无法完整渲染时 preview 失败，用户应回到 `apple-proxy-singbox` 修正组合。迁移期可显式使用 `nodeErrorMode=compatible`，但必须检查 `renderFailures`。

手动组合示例：先在 `apple-proxy-singbox` 中去掉 `sing-box-client` 标签筛选，再只勾选你确认需要的节点。Preview collection 后再 Preview 四个平台任务。若 `strict` 报协议或字段错误，说明刚刚手选的节点不能完整转换；应移除该节点或修正字段，不要用 `compatible` 掩盖节点缺失。

| 任务 | 平台额外参数 | 官方客户端 |
| --- | --- | --- |
| `singbox-config-macos` | `platform=macos&ipv6Mode=ipv4-only` | sing-box for Mac |
| `singbox-config-iphone` | `platform=iphone&ipv6Mode=ipv4-only` | sing-box for iPhone |
| `singbox-config-ipad` | `platform=ipad&ipv6Mode=ipv4-only` | sing-box for iPad |
| `singbox-config-android` | `platform=android&ipv6Mode=auto` | sing-box for Android |

本项目的 sing-box edge 构建会自动解析官方 testing 最新 release。测试时把 JS URL 的 `current` 改成 `edge`，并把 `channel=current` 改成 `channel=edge`；生产任务保留 current 作为回滚入口。

预览必须是 JSON，且能通过配置校验。四个平台都使用终端 TUN；未知域名通过 DNS response matching 和 `ChinaIP` rule-set 自动判断国内/海外。iPhone/iPad 任务不得设置 `adblockMode=full`，且应确认没有 URLTest、持久 DNS 缓存和 IPv6 直连探测。当前不生成 OpenWrt 透明网关配置。

## 10. v2rayN 与 V2Box：Xray JSON 任务

两个客户端共享同一份地区 GeoData manifest，但 collection 和平台任务相互独立。节点任务只输出用户选择的节点，不需要 `platform`；配置任务必须使用对应平台，并且不使用 `autoGroupMode`。

### 10.1 v2rayN

节点脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/v2rayn/scripts/substore-node-generator.js
```

节点参数：

```text
output=nodes&type=collection&name=apple-proxy-v2rayn&clientChain=off&channel=current
```

配置脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/v2rayn/scripts/substore-config-generator.js
```

| 任务 | 平台 | 额外参数 |
| --- | --- | --- |
| `v2rayn-config-windows` | Windows | `platform=windows&region=cn&ipv6Mode=auto` |
| `v2rayn-config-macos` | macOS | `platform=macos&region=cn&ipv6Mode=ipv4-only` |

公共配置参数为 `output=config&type=collection&name=apple-proxy-v2rayn&subscriptionName=Apple-Proxy-v2rayN&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&clientChain=off&channel=current`。地区可改为 `global`、`ru` 或 `ir`；不要把真实节点值写入公开文档。

### 10.2 V2Box

节点脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/v2box/scripts/substore-node-generator.js
```

节点参数：

```text
output=nodes&type=collection&name=apple-proxy-v2box&clientChain=off&channel=current
```

配置脚本：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/v2box/scripts/substore-config-generator.js
```

| 任务 | 平台 | 额外参数 |
| --- | --- | --- |
| `v2box-config-iphone` | iPhone | `platform=iphone&region=cn&ipv6Mode=auto` |
| `v2box-config-ipad` | iPad | `platform=ipad&region=cn&ipv6Mode=auto` |

公共配置参数为 `output=config&type=collection&name=apple-proxy-v2box&subscriptionName=Apple-Proxy-V2Box&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&clientChain=off&channel=current`。配置通过共享 GeoData 资产闭合；资产或节点不兼容时应查看诊断并修正对应 collection。

## 11. 运行和刷新顺序

### 首次建立

1. 按节点池指南 preview 九个 client collection。
2. 运行节点任务：Egern、Anywhere、Shadowrocket。
3. 运行依赖节点输出 URL 的 Egern Profile。
4. 运行 `surge-nodes`，再运行 Surge 三个平台 Profile；Profile 会自动携带节点资源 URL。
5. 运行 Shadowrocket 和 sing-box Profile/Config。
6. 运行 OneXray 节点、Profile、审计任务，再运行 HAPP 六平台配置和审计任务。
7. 运行 v2rayN 节点与 Windows/macOS 配置任务，或运行 V2Box 节点与 iPhone/iPad 配置任务。
8. 逐个保存私密输出 URL；不要在聊天中回传。
9. 先在一台 macOS 或 Android 设备导入并 canary，再处理 iPhone、iPad、Windows 和 Linux。

审计查看入口：Pages 的 `current/audit/dashboard.json` 是机器可读摘要，首页提供中文审计入口；审计阻断项在仓库 Issues 的 `audit-blocker` 标签下查看。节点 URL、policy File、固定目标和私密 audit 只在你自己的 Sub-Store 任务日志中查看，不能复制到公开 Issue 或 README。

### 日常刷新

节点源变化：`apple-proxy-all` 总池 → 用户更新对应 client collection 筛选 → 该客户端节点任务 → Profile/Config 任务 → 客户端手动更新。

公开规则变化：在客户端对已有规则集执行 Update；不要因为规则更新就重新创建 Sub-Store 节点任务。

### 回滚

失败时先在设备切回旧 Profile/Config。公开 JS 可在隔离任务中回退到 `/previous/` 或已验证的 `/versions/<manifestHash>/`；生产任务修复前不要直接把所有任务切到 `edge`。参数和私密输出 URL 不需要改变。

维护者命令行回滚入口：`node scripts/update-rules.mjs --check --channel previous` 用于验证回滚频道；精确不可变版本使用 `/versions/<manifestHash>/`。不要手工替换单个规则文件，必须由 canonical generator 重新生成整棵频道快照。

## 12. 任务完成检查

- 九个 client collection 都已 preview，且只包含用户为该客户端选择的协议和字段。
- 节点预览非空；Profile/Config 预览结构正确，不出现凭据。
- `noCache` 正式任务关闭，`insecure` 始终关闭。
- `subscriptionName` 在对应客户端和所有 Profile/Config 任务中逐字一致。
- Mac、iPhone、iPad、Android 使用各自平台值；没有交叉导入。
- Anywhere 规则导入后逐个检查目标绑定；没有把规则更新误当成节点刷新。
- 旧 Profile/Config 与回滚入口仍保留。

## 13. 旧兼容 URL

已经部署的 `substore-*` Pages URL 可以继续使用，不需要为了改名迁移。旧 `apple-proxy-sources` collection、tasks 和输出 URL 保留作兼容/回滚入口。新任务统一使用客户端前缀 URL；不要把同一脚本的新旧 URL 同时添加到一个任务。
