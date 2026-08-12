# OneXray

OneXray 使用与 Shadowrocket、Surge、Egern、Anywhere、sing-box 相同的共享轻量规则，生成 OneXray 可导入的 Xray 原生 Profile。节点、业务分组和 deep link 都是私密信息：仓库只发布无凭据的 GeoData 安装页和规则数据，Profile 与节点订阅只在你的 Sub-Store 中生成和保存。

## 快速开始

### 1. 安装 GeoData

公开安装页与数据位于三个通道：

- `edge`：仅用于灰度 canary，未通过验证前不能作为 current。
- `current`：稳定发布，只有 deliberate promotion 后才更新。
- `previous`：回滚依赖，必须与同名 Profile 配对使用。

安装页示例：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/index.html
```

页面中的安装链接使用 OneXray deep link 格式：

```text
onexray://onexray.com/dat/add?type=domain|ip&url=<percent-encoded-https-url>#<channel-name>
```

域名数据为 `geosite`，IP 数据为 `geoip`。先安装 `geosite`（domain），再安装 `geoip`（ip）。安装 GeoData 不会创建 Profile，也不会导入节点或业务分组。

### 2. 在 Sub-Store 创建三个任务

Sub-Store → Files → 新建任务 → 远程链接，粘贴下面的完整 URL。`name=apple-proxy-sources` 必须改成你 Sub-Store 里真实组合名；改了之后三个任务里的 `name=` 要一起改。

`onexray-nodes`（节点订阅）：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-nodes-generator.js?v=5#output=nodes&type=collection&name=apple-proxy-sources&channel=edge&clientChain=off
```

`onexray-profile`（Profile）：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js?v=5#output=profile&type=collection&name=apple-proxy-sources&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off&policyFile=onexray-policy
```

`onexray-routing-audit`（脱敏审计，建议一起建）：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js?v=5#output=audit&type=collection&name=apple-proxy-sources&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off&policyFile=onexray-policy
```

`v=5` 是 Sub-Store 脚本缓存版本号：脚本内容更新后，把任务 URL 里的 `v=` 数字 +1 再保存一次，否则 Sub-Store 可能继续使用旧脚本。

预览成功标志：

- `onexray-nodes`：节点数量大于 0。原始组合里的 Snell 等 Xray 不支持的节点会被自动排除，所以节点数可能少于 Shadowrocket/Egern，这是预期行为。
- `onexray-profile`：生成带版本号的 deep link。
- `onexray-routing-audit`：生成脱敏 JSON 审计报告。

### 3. 导入 Profile 并启动

1. 用 `onexray-profile` 任务生成的 deep link 在 OneXray 中导入 Profile。
2. 选择 Rule 模式。
3. 选一个主节点。
4. 重启 VPN。

快速自检：

- `baidu.com` 应直连。
- `google.com` 应走主节点。
- `192.168.1.1`（路由器）应直连。
- 固定业务（如果配了固定节点）只走固定节点，主节点切换不影响它。

### 4. 遇到问题

- 先看 OneXray 状态、Ping 和 Xray 日志。
- 固定节点故障时只有该业务失败，不会自动回退或通知；修复后必须重新生成并重新导入 Profile。
- 完整诊断和回滚见 `docs/troubleshooting.md`。

跳过验证意味着你直接承担稳定性风险：请一直使用 edge，不要把它 promote 成 current，除非你已经用稳定了。

## 业务分组设置（跟随 / 直连 / 固定节点）

每个业务分组只有三种取值：

| 值 | 含义 |
| --- | --- |
| `FOLLOW` | 跟随主节点，主节点切换时一起变 |
| `DIRECT` | 直连，不走代理 |
| `NODE:<精确节点名>` | 固定节点，主节点怎么切换都不变 |

业务名可以用英文 ID，也可以用中文（带不带 emoji 都行）。全部 12 个分组：

| 业务 | 可用键 | 默认 |
| --- | --- | --- |
| AI 专用（OpenAI/Claude/Gemini/Copilot） | `ai`、`AI 专用`、`🤖 AI 专用` | `FOLLOW` |
| GitHub | `github`、`GitHub`、`🐙 GitHub` | `FOLLOW` |
| YouTube | `youtube`、`YouTube`、`📺 YouTube` | `FOLLOW` |
| 海外流媒体（Netflix/Disney/Spotify 等） | `globalMedia`、`海外流媒体`、`🎬 海外流媒体` | `FOLLOW` |
| 海外社交（Telegram/Facebook/Instagram/Twitter/TikTok） | `globalSocial`、`海外社交`、`💬 海外社交` | `FOLLOW` |
| Apple | `apple`、`Apple`、`🍎 Apple` | `DIRECT` |
| Microsoft | `microsoft`、`Microsoft`、`🪟 Microsoft` | `DIRECT` |
| 国内平台（B站/抖音/小红书/微博） | `domestic`、`国内平台`、`🇨🇳 国内平台` | `DIRECT` |
| 海外游戏 | `overseasGame`、`海外游戏`、`🌍 海外游戏` | `FOLLOW` |
| 下载/P2P | `download`、`下载/P2P`、`⬇️ 下载/P2P` | `DIRECT` |
| DNS 与规则下载 | `dnsAndRules`、`DNS 与规则下载`、`🧭 DNS 与规则下载` | `FOLLOW` |
| 最终兜底 | `final`、`最终兜底` | `FOLLOW` |

### 推荐：用 Sub-Store 的 `onexray-policy` 文件维护

在 Sub-Store 新建一个本地文件 `onexray-policy`，内容直接写可读 JSON，例如完整 12 组：

```json
{
  "AI 专用": "NODE:🇺🇸 大妈尔湾｜自建·U VLESS",
  "GitHub": "NODE:🇺🇸 小秘书sjc｜自建·U",
  "YouTube": "NODE:🇯🇵 奶爸JP｜自建·U VLESS",
  "海外流媒体": "NODE:🇺🇸 瓦工MegaboxPro｜自建·U VLESS",
  "海外社交": "NODE:🇸🇬 小秘书SG｜自建·U",
  "Apple": "DIRECT",
  "Microsoft": "DIRECT",
  "国内平台": "DIRECT",
  "海外游戏": "FOLLOW",
  "下载/P2P": "DIRECT",
  "DNS 与规则下载": "FOLLOW",
  "最终兜底": "FOLLOW"
}
```

`onexray-profile` 与 `onexray-routing-audit` 任务 URL 里的 `&policyFile=onexray-policy` 会让生成脚本自动读取这个文件，不需要手动 Base64URL。

改分组只需要三步：

1. 编辑 `onexray-policy` 文件，把某个分组的取值改成 `FOLLOW`、`DIRECT` 或 `NODE:<精确节点名>`。
2. 保存文件，重新运行 `onexray-profile` 任务。
3. 用新生成的 deep link 重新导入 OneXray，选 Rule 模式，重启 VPN。

注意：

- 节点名必须和 `onexray-nodes` 输出里完全一致，少个空格或标点都会生成失败（这是保护机制）。
- 固定节点写死在 Profile 里：改分组后旧 deep link 失效，必须重新导入。
- 主节点可以随时切换，只影响 `FOLLOW` 与最终兜底路径。
- `onexray-policy` 属于私密信息，不要发到公开渠道。

### 备选：本地 `policy.json` 一键同步

不想在 Sub-Store 里建文件时，可以用仓库外的私有目录：

1. 编辑 `代理项目/onexray-private/policy.json`（仓库外，不会提交）。
2. 在仓库根目录运行：

```bash
npm --workspace @apple-proxy-profiles/onexray run set:onexray-policy
```

脚本会自动把 JSON 编码成 Base64URL、更新 Sub-Store 的 `onexray-profile` 与 `onexray-routing-audit` 任务、重新生成 deep link，并把新链接保存到 `onexray-private/onexray-profile-link.txt`。

3. 用文件里的新 deep link 重新导入 OneXray 即可。

只打印不修改：`npm --workspace @apple-proxy-profiles/onexray run set:onexray-policy -- --print`。

## 加入分流规则

规则分三层维护，越往下越重：

| 你要做的事 | 改哪里 | 改完要做什么 |
| --- | --- | --- |
| 调整业务分组 | Sub-Store 的 `onexray-policy` 文件 | 保存 → 重跑 `onexray-profile` → 导入 |
| 加几条自定义规则 | 仓库 `shared/rules/custom-rules.js` | 构建 → 推 GitHub → Pages 部署 → `v=` +1 → 重跑 → 导入 |
| 加一个大分类 | `automation/src/source-catalog.js` + 规则快照 | 规则源更新流程（较重，一般交给维护者） |

### 自定义规则怎么写

自定义规则放在 [shared/rules/custom-rules.js](../../shared/rules/custom-rules.js)，格式是 Surge 风格：

```js
export const CUSTOM_RULES = Object.freeze({
  block: Object.freeze([]),
  direct: Object.freeze([]),
  proxy: Object.freeze([]),
  ai: Object.freeze([
    "DOMAIN-SUFFIX,perplexity.ai",
    "DOMAIN-SUFFIX,x.ai",
  ]),
});
```

四个数组的含义：

| 数组 | 规则走哪里 |
| --- | --- |
| `block` | 直接拦截 |
| `direct` | 直连 |
| `proxy` | 跟随主节点（最终兜底） |
| `ai` | 归入 AI 业务组，走 AI 分组配置的节点 |

支持的写法：

```text
DOMAIN,example.com
DOMAIN-SUFFIX,example.com
DOMAIN-KEYWORD,keyword
IP-CIDR,1.2.3.0/24
IP-CIDR6,2001:db8::/32
```

IP 规则可加 `,no-resolve`（如 `IP-CIDR,1.2.3.0/24,no-resolve`）。自定义规则在安全规则之后、国内大分类之前生效，优先级高于后面的大分类。

这些规则是五个客户端与 OneXray 共享的：改一次，Shadowrocket、Surge、Egern、Anywhere、sing-box 和 OneXray 都会同步生效。

### 发布流程（自己动手时）

1. 编辑 `shared/rules/custom-rules.js`，加入你要的规则。
2. 在仓库根目录运行 `npm test` 和 `npm run build`，确保通过。
3. 提交并推送到 GitHub `main`，等 Pages 部署完成（约 10–20 分钟）。
4. 把 Sub-Store 相关任务 URL 里的 `v=` 数字 +1 并保存（OneXray 至少 `onexray-profile` 必须改）。
5. 重新运行 `onexray-profile`，用新 deep link 重新导入 OneXray。

### 推荐：交给维护助手

自己改需要跑构建、推送和等待部署。更省事的做法是把规则需求直接发给维护者，例如：

> 把 `example.com` 走代理、把 `198.51.100.0/24` 直连、把 `tracker.example.net` 拦截。

维护者会完成：改 `custom-rules.js` → 测试与构建 → 推 GitHub → Pages 部署 → 更新 Sub-Store 任务 `v=` → 重新生成并保存新 deep link。你只需要最后导入。

### 核对规则

想离线确认某条规则会怎么走，在仓库根目录运行：

```bash
npm run explain:route -- --channel current --domain example.com
```

它会告诉你这个域名命中哪个规则、走哪个出口，不执行 DNS，也不修改任何文件。

## 参数

枚举写法的完整形式是 `output=nodes|profile|audit`，通道写法是 `channel=edge|current|previous`；其余参数见下表。

| 参数 | 允许值 | 默认值 |
| --- | --- | --- |
| `output` | `nodes`、`profile`、`audit` | 必填 |
| `type` | `collection` | 必填 |
| `name` | 组合名称 | 必填 |
| `channel` | `edge`、`current`、`previous` | `edge` |
| `dnsMode` | 共享 DNS 枚举 | `stable` |
| `chinaDns` | 共享国内 DNS 枚举 | `alidns` |
| `globalDns` | 共享境外 DNS 枚举 | `cloudflare` |
| `blockMode` | 共享拦截枚举 | `balanced` |
| `quicMode` | 共享 QUIC 枚举 | `proxy-block` |
| `ipv6Mode` | 共享 IPv6 枚举 | `auto` |
| `clientChain` | `on`、`off` | `off` |
| `clientChainTarget` | `NODE:<名称>` 或空 | 空 |
| `policyOverrides` | Base64URL JSON 或空 | 空 |
| `policyFile` | Sub-Store 文件名称或空 | 空 |

`policyOverrides` 使用 Base64URL 编码，但 Base64URL 不是加密，只是可逆编码。包含业务策略或固定节点的编码值属于私密输入，不要提交到仓库，也不要在聊天、截图或日志中分享。推荐优先使用 `policyFile=onexray-policy` 的可读 JSON 文件；`policyOverrides` 与 `policyFile` 不能同时使用。完整 Profile deep link 同样按原样保密，并受 32 KiB 长度上限约束。

## 文档

- `docs/deployment.md`：两条安装顺序、私有任务参数与规则维护。
- `docs/troubleshooting.md`：固定节点故障、诊断与回滚。
- `docs/canary.md`：六平台灰度验收清单。

实现状态与 canary 就绪状态是两回事：自动测试通过只代表实现完成，不代表任何设备已经完成真机验收。
