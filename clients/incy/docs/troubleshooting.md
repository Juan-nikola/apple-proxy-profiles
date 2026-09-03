# INCY 故障排查

## 生成或导入失败

按顺序检查脚本路径是否为 `current/incy/scripts/incy-config-generator.js`、参数是否在 `#` 后，以及 `output=config`、`type=collection`、`name=apple-proxy-incy`、`subscriptionName` 和 `platform` 是否正确。collection 必须非空，节点必须属于 VLESS、VMess、Trojan、Shadowsocks、Hysteria2/Hy2、SOCKS5 或 HTTP；SSR、TUIC、Snell、AnyTLS、SSH 和未验证 WireGuard 会让整个 task 失败。私密 policy 必须绑定 `channel=current`，固定 `NODE~`/`NODE:` 目标必须唯一命中。

一个不兼容节点会阻止整个单对象输出，不要复制错误响应中的部分配置；修正 collection 后重新 Preview，客户端上一份配置仍可保留。

## 路由、DNS 和协议异常

确认 `DomainStrategy=IPIfNonMatch`；数组第一项的最后一条规则使用 `balancerTag=balancer-ap-incy-follow`，单节点项使用当前 `ap-incy-follow/<id>` 的 `outboundTag`。域名命中 ChinaTLD、业务域名或安全规则后不会继续解析 IP；只有域名未命中才匹配 `geoip:CN`。OpenAI、GitHub、YouTube、海外媒体、社交、游戏、下载和广告目标应与 policy 一致，固定 balancer 故障时回退 follow。DNS 国内/海外服务器、`quicMode=proxy-block` 和 `ipv6Mode=ipv4-only` 不应被手工改写。生成配置还会在 `dns.hosts` 中固定所选 DoH 域名到其公开 IP，避免其他 VPN 的 Fake-IP 解析污染 INCY；更新前请刷新订阅并重新连接。

如果只在一个平台出现，对照 `clients/incy/examples/` 中的配置，确认 `127.0.0.1:10808` SOCKS、`127.0.0.1:10809` HTTP、sniffing 的 `destOverride` 仅包含 `http`、`tls`、`quic`，并确认客户端支持官方 JSON 数组。数组第一项是自动选择，后续项是手动节点；若客户端仍只显示一个服务器，可临时使用 `format=single` 验证基础连接，再升级客户端后恢复 `selectionMode=both`。

系统代理或 TUN 一直转圈时，先在 INCY 中停用旧配置并重新刷新私密 File URL，确认数组第一项已成功解析且至少有一个节点可测速，再在客户端内开启对应模式。不要把本地 Preview 文件直接当订阅导入，因为它没有 `autorouting` 响应头；不要在 JSON 中手工添加未记录的 TUN 字段。

## GeoData、缓存与回滚

只接受 `https://juan-nikola.github.io/apple-proxy-profiles/current/incy/` 下的资源。比对两个 `.sha256` sidecar 和 `client-manifest.json` 的记录；不一致时重新下载 routing、GeoData 与 sidecar，不能只替换单个文件。更新失败时先切回客户端上一份数组元素；维护者恢复 previous 时必须恢复完整快照和 matching manifest hash。不要把 `edge` 拼进任务 URL。

## 诊断信息

生成器日志只包含平台、规范化数量、接受数量、协议类别计数和 schema 版本。日志中不应出现节点名称、地址、UUID、密码、订阅 URL 或 policy 正文；如发现这些内容，立即停止分享日志并运行 `npm run check:secrets`。
