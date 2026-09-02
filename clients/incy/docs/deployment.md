# INCY 部署与导入

INCY 适配器读取你自己的 Sub-Store collection，并返回 HAPP 式完整 JSON 数组。数组的每个元素都是独立的 Xray 配置，包含 follow 节点、标准 inbounds、DNS、路由、固定节点 least-ping balancer 和故障回退。节点、UUID、密码和私密 policy 不会进入仓库或公开 Pages。

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
output=config&type=collection&name=apple-proxy-incy&subscriptionName=INCY&platform=macos&channel=current&dnsMode=stable&chinaDns=alidns&globalDns=cloudflare&blockMode=balanced&quicMode=proxy-block&ipv6Mode=ipv4-only&adblockMode=off&autoGroupMode=auto&clientChain=off
```

把 `platform` 换成 `iphone`、`ipad`、`appletv`、`android`、`androidtv`、`macos`、`windows` 或 `linux`。`subscriptionName` 必须和客户端内显示的节点订阅名称一致。Sub-Store 负责节点选择，INCY 不做客户端能力预过滤。

Preview 成功时，正文是非空 JSON 数组，响应头包含 `content-type: application/json`、`content-disposition: incy-<platform>.json` 和编码后的 `autorouting`。任意一个节点不支持、字段不完整或固定 policy 目标不可用时，整个 task 失败，绝不返回部分 `$content`。

## 导入、路由和更新

在 INCY 中使用私密 File URL 导入并选择数组元素；不要把 Preview 下载的本地 JSON 当作普通节点文件，因为本地文件没有响应头。`autorouting` 会绑定 `current/incy/routing.json`；若版本不自动绑定，手动打开该 URL 并确认 `DomainStrategy=IPIfNonMatch` 与 `useChunkFiles=true`。

路由先匹配域名业务规则和 `ChinaTLD`，域名未命中才由 `IPIfNonMatch` 解析 IP，再匹配 `geoip:CN`，最后进入当前元素 follow。`FOLLOW`、`DIRECT`、`NODE~`/`NODE:`、`REJECT` 分别映射到 follow、`freedom`、固定 balancer、`blackhole`。固定节点探测失败回退到 follow。

更新继续使用同一个 File URL。GeoData、routing 和 manifest 必须来自同一个 current 快照；失败时客户端保留的上一份数组元素仍可使用。

维护者发布前运行：

```bash
npm run verify
npm run check:task
npm run check:secrets
npm run check:rules
```
