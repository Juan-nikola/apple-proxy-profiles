# OneXray

OneXray 使用与 Shadowrocket、Surge、Egern、Anywhere、sing-box 相同的共享轻量规则，生成 OneXray 可导入的 Xray 原生 Profile。节点和业务分组参数保持私密：仓库只发布无凭据的 GeoData 安装页和规则数据，Profile 与节点订阅只在你的 Sub-Store 中生成和保存。

## 公开 GeoData 安装

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

域名数据为 `geosite`，IP 数据为 `geoip`。安装 GeoData 不会创建 Profile，也不会导入节点或业务分组；Profile 必须从私密 Sub-Store 入口获取。

## 私有任务

OneXray 在 Sub-Store 中需要三个私有任务：

| 任务 | 输出 | 说明 |
| --- | --- | --- |
| `onexray-nodes` | nodes | 生成可导入 OneXray 的节点订阅 |
| `onexray-profile` | profile | 生成版本化 Profile deep link 与导入内容 |
| `onexray-routing-audit` | audit | 生成不含凭据的分流审计报告 |

脚本文件名（`onexray-nodes-generator.js`、`onexray-profile-generator.js`）和参数示例见 `docs/deployment.md`。审计输出与 Profile 共享同一个私有处理器，只是输出模式不同。

两个脚本已随 edge 发布到 Pages：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-nodes-generator.js
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js
```

## 快速使用（跳过验证，直接用 edge）

下面的步骤默认你已经有一台能访问的 Sub-Store，并且里面已有原始组合（例如 `apple-proxy-sources`）。仓库不会替你保存 Sub-Store 地址或 API key。

### 第 0 步：让 Pages 上线

脚本已经放在 `public/edge/onexray/scripts/`。你需要把本分支推到 GitHub 并触发 Pages 部署；部署完成后先用浏览器或 `curl -I` 确认下面地址返回 200：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-nodes-generator.js
```

如果返回 404，说明 Pages 还没部署这个分支，先完成推送/合并再继续。

### 第 1 步：在 Sub-Store 创建三个任务

Sub-Store → Files → 新建任务 → 远程链接，然后粘贴下面完整 URL。`name=apple-proxy-sources` 必须改成你 Sub-Store 里真实组合名；如果改了，三个任务里的 `name=` 要一起改。

#### `onexray-nodes`（节点订阅）

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-nodes-generator.js?v=4#output=nodes&type=collection&name=apple-proxy-sources&channel=edge&clientChain=off
```

预览成功标志：节点数量大于 0。

OneXray 使用 Xray 内核，节点订阅只会包含 OneXray 支持的协议（VLESS、VMess、SS、Trojan、Socks、HTTP、Hysteria2）。原始组合里的 Snell 等 Xray 不支持的节点会被自动排除，所以 OneXray 的节点数量可能少于 Shadowrocket/Egern；这是预期行为。

#### `onexray-profile`（Profile）

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js?v=4#output=profile&type=collection&name=apple-proxy-sources&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off
```

预览成功标志：生成带版本号的 Profile deep link 或可导入的 Profile 内容。

#### `onexray-routing-audit`（脱敏审计，可选）

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/scripts/onexray-profile-generator.js?v=4#output=audit&type=collection&name=apple-proxy-sources&channel=edge&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&clientChain=off
```

`v=4` 是 Sub-Store 脚本缓存版本号：脚本内容更新后，把三个任务 URL 里的 `v=` 数字 +1 再保存一次，否则 Sub-Store 可能继续使用旧脚本。需要固定业务节点时，在 URL 末尾追加非空的 `&policyOverrides=<Base64URL>`；不要写成空的 `&policyOverrides=`，旧版链接模式会把空值解析成布尔值并导致生成失败。

### 第 2 步：安装 edge GeoData

打开：

```text
https://juan-nikola.github.io/apple-proxy-profiles/edge/onexray/index.html
```

先安装 `geosite`（domain），再安装 `geoip`（ip）。安装 GeoData 不会创建 Profile，也不会导入节点。

### 第 3 步：导入 Profile 并启动

1. 用 `onexray-profile` 任务生成的 deep link 在 OneXray 中导入 Profile。
2. 选择 Rule 模式。
3. 选一个主节点。
4. 重启 VPN。

### 第 4 步：快速自检

- `baidu.com` 应直连。
- `google.com` 应走主节点。
- `192.168.1.1`（路由器）应直连。
- 固定业务（如果配了 `policyOverrides`）只走固定节点，主节点切换不影响它。

### 第 5 步：遇到问题

- 先看 OneXray 状态、Ping 和 Xray 日志。
- 固定节点故障时只有该业务失败，不会自动回退或通知；修复后必须重新生成并重新导入 Profile。
- 完整诊断和回滚见 `docs/troubleshooting.md`。

跳过验证意味着你直接承担稳定性风险：请一直使用 edge，不要把它 promote 成 current，除非你已经用稳定了。

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

`policyOverrides` 使用 Base64URL 编码，但 Base64URL 不是加密，只是可逆编码。包含业务策略或固定节点的编码值属于私密输入，不要提交到仓库，也不要在聊天、截图或日志中分享。完整 Profile deep link 同样按原样保密，并受 32 KiB 长度上限约束。

### 推荐：用本地 `policy.json` 一键同步

不想手动写 Base64URL 时，可以只用可读 JSON 文件维护分组：

1. 编辑 `代理项目/onexray-private/policy.json`（仓库外的私有目录，不会提交）：

```json
{
  "ai": "NODE:🇺🇸 大妈尔湾｜自建·U VLESS",
  "github": "NODE:🇺🇸 小秘书sjc｜自建·U"
}
```

2. 在仓库根目录运行：

```bash
npm --workspace @apple-proxy-profiles/onexray run set:onexray-policy
```

脚本会自动把 JSON 编码成 Base64URL、更新 Sub-Store 的 `onexray-profile` 与 `onexray-routing-audit` 任务、重新生成 deep link，并把新链接保存到 `onexray-private/onexray-profile-link.txt`。

3. 用文件里的新 deep link 重新导入 OneXray 即可。

只打印不修改：`npm --workspace @apple-proxy-profiles/onexray run set:onexray-policy -- --print`。

## 文档

- `docs/deployment.md`：两条安装顺序与私有任务参数。
- `docs/troubleshooting.md`：固定节点故障、诊断与回滚。
- `docs/canary.md`：六平台灰度验收清单。

实现状态与 canary 就绪状态是两回事：自动测试通过只代表实现完成，不代表任何设备已经完成真机验收。
