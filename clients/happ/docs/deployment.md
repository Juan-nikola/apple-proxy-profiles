# Happ 部署：Sub-Store 到六个平台

## 一次性建立

1. 生产环境打开公开 Happ 助手：`https://juan-nikola.github.io/apple-proxy-profiles/current/happ/import.html`；灰度验证必须改用 `https://juan-nikola.github.io/apple-proxy-profiles/edge/happ/import.html`。按页面提示把对应通道的路由/geodata Profile 安装进 Happ。它下载同一通道的 `geosite.dat`、`geoip.dat`，不含私密节点。
2. 在助手中为中文业务目标选择 `DIRECT`、`FOLLOW` 或 `NODE:精确节点名`，复制页面本地生成的 `policyOverrides` 值。`policyOverrides` 是 UTF-8 JSON 的**未填充 Base64URL**，不是加密：不要把它、完整私密任务 URL 或节点资料公开；不要用普通 Base64 的 `+`、`/`、末尾 `=`。
3. 在私密 Sub-Store 对原始组合 `apple-proxy-sources` 建立下列七个 File 任务，均引用：

```text
生产任务：`https://juan-nikola.github.io/apple-proxy-profiles/current/happ/scripts/happ-config-generator.js`

灰度任务（独立复制七个任务，只改 URL 和 `channel`）：`https://juan-nikola.github.io/apple-proxy-profiles/edge/happ/scripts/happ-config-generator.js`
```

六个配置任务均为 `output=config&type=collection`，并把各自任务名同时填入 `name` 与 `subscriptionName`；审计任务使用 `output=audit&type=collection&platform=all`。**七个任务使用同一 `policyOverrides`** 值：

| 任务 | platform | 作用 |
| --- | --- | --- |
| `happ-config-macos` | `macos` | macOS JSON 数组 |
| `happ-config-iphone` | `iphone` | iPhone JSON 数组 |
| `happ-config-ipad` | `ipad` | iPad JSON 数组 |
| `happ-config-android` | `android` | Android JSON 数组 |
| `happ-config-windows` | `windows` | Windows JSON 数组 |
| `happ-config-linux` | `linux` | Linux JSON 数组 |
| `happ-routing-audit` | `all` | 私密策略解析审计 |

例如 macOS 生产任务：

```text
output=config&type=collection&name=happ-config-macos&subscriptionName=happ-config-macos&platform=macos&channel=current&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=auto&policyOverrides=e30
```

灰度任务使用完全相同的参数，但把脚本 URL 中的 `current` 改成 `edge`，并把 `channel=current` 改成 `channel=edge`；不要在生产任务上直接替换。

4. 预览每个配置任务必须得到非空 JSON 数组；将匹配当前设备的平台私密输出 URL 导入官方 Happ。导入顺序仍是先路由/geodata Profile、再 JSON 数组。保留旧订阅，首次只在一台设备测试。
5. 日常从 Happ 首页切换节点。`FOLLOW` 会随首页当前选中条目改变；`NODE:...` 指定的业务路由保持固定，固定节点不健康时 Xray 自动回退到当前 `FOLLOW`，恢复后再使用固定节点。

## 固定节点的精确规则

`NODE:东京 01` 仅按节点显示名**大小写完全一致**匹配；`东京 01`、`tokyo 01` 和多一个空格都是不同名字。只有恰好一个兼容节点才固定。配置可同时使用 `DIRECT`、`FOLLOW`、`NODE:东京 01`；固定目标不存在、重复或不兼容会降为 `FOLLOW`，不会阻塞其它业务组。

更换固定节点时，编辑中文业务目标，重新由助手生成**一个** Base64URL 字符串，再更新全部七个任务。稳定后通常不需要持续修改；平时只在 Happ 首页换 `FOLLOW` 节点即可。

## 通道与发布

生产七任务使用 `current`。先用独立、可回滚的 `edge` 七任务和六平台 canary 验证，再把成功的 edge 工件推进 `current`；禁止先提升 current 再测试。不要在生产任务上直接试每日 edge。
