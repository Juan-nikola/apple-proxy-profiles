# INCY 部署与导入

INCY 适配器读取你自己的 Sub-Store collection，并按官方 full-Xray 格式返回一个 JSON 数组。第一项包含全部节点 outbounds、observatory、自动选择 balancer、DNS、业务路由和固定节点故障回退；后续项各自包含一个节点和同样的完整路由能力，用于手动切换。节点、UUID、密码和私密 policy 不会进入仓库或公开 Pages。

## 公共产物

生产通道固定为 `current`，公开目录包含两个 generator、`routing.json`、`geoip.dat`、`geosite.dat`、两个 SHA-256 sidecar 和 `client-manifest.json`：

```text
https://juan-nikola.github.io/apple-proxy-profiles/current/incy/scripts/incy-config-generator.js
https://juan-nikola.github.io/apple-proxy-profiles/current/incy/routing.json
https://juan-nikola.github.io/apple-proxy-profiles/current/incy/geoip.dat
https://juan-nikola.github.io/apple-proxy-profiles/current/incy/geosite.dat
```

## 创建私密 Sub-Store task

在自己的 Sub-Store 建立 `apple-proxy-incy` collection，并手动勾选节点来源。新建 File task，将第一个 generator 作为 Script Operator 远程链接，参数放在 URL 的 `#` 后：

```text
output=config&type=collection&name=apple-proxy-incy&subscriptionName=INCY&platform=macos&channel=current&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&adblockMode=off&format=array&selectionMode=both&autoGroupMode=auto&clientChain=off
```

把 `platform` 换成 `iphone`、`ipad`、`appletv`、`android`、`androidtv`、`macos`、`windows` 或 `linux`。`subscriptionName` 必须和客户端内显示的节点订阅名称一致。Sub-Store 负责提供节点，INCY 负责自动测速、手动切换和业务分流，不做客户端能力预过滤。

Preview 成功时，正文是一个非空 JSON 数组：第一项的 `remarks` 类似 `INCY · INCY 自动选择`，后续项对应规范化后的节点。每一项都包含 `inbounds` 和 `outbounds`，响应头包含 `content-type: application/json`、`content-disposition: incy-<platform>.json` 和未编码的 `autorouting`。任意一个节点不支持、字段不完整或固定 policy 目标不可用时，整个 task 失败，绝不返回部分 `$content`。

## 导入、路由和更新

在 INCY 中使用私密 File URL 导入；不要把 Preview 下载的本地 JSON 当作普通节点文件，因为本地文件没有响应头。导入后，在 INCY 的配置/服务器列表中选择第一项即可自动测速选节点，选择后续带节点名称的项即可手动指定节点。`autorouting` 会绑定 `current/incy/routing.json`；若版本不自动绑定，手动打开该 URL 并确认 `DomainStrategy=IPIfNonMatch` 与 `useChunkFiles=true`。如需纯自动模式，可把 `selectionMode=both` 去掉并使用 `format=single`。

路由先匹配域名业务规则和 `ChinaTLD`，域名未命中才由 `IPIfNonMatch` 解析 IP，再匹配 `geoip:CN`，最后进入当前元素 follow；自动选择首项的最终规则使用 Xray `balancerTag`，单节点项使用对应的 `outboundTag`。`FOLLOW`、`DIRECT`、`NODE~`/`NODE:`、`REJECT` 分别映射到 follow、`freedom`、固定 balancer、`blackhole`。固定节点探测失败回退到 follow。

系统代理和 TUN 请在 INCY 客户端自身的网络模式中开启。JSON 只提供标准的 `127.0.0.1:10808` SOCKS 与 `127.0.0.1:10809` HTTP 本地入口，不伪造客户端私有 TUN 字段；开启后应以 INCY 状态页显示的运行状态为准。

更新继续使用同一个 File URL。GeoData、routing 和 manifest 必须来自同一个 current 快照；失败时客户端保留的上一份单对象配置仍可使用。

维护者发布前运行：

```bash
npm run verify
npm run check:task
npm run check:secrets
npm run check:rules
```
