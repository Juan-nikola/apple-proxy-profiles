# INCY 故障排查

## 生成或导入失败

按顺序检查脚本路径是否为 `current/incy/scripts/incy-config-generator.js`、参数是否在 `#` 后，以及 `output=config`、`type=collection`、`name=apple-proxy-incy`、`subscriptionName` 和 `platform` 是否正确。collection 必须非空，节点必须属于 VLESS、VMess、Trojan、Shadowsocks、Hysteria2/Hy2、SOCKS5 或 HTTP；SSR、TUIC、Snell、AnyTLS、SSH 和未验证 WireGuard 会让整个 task 失败。私密 policy 必须绑定 `channel=current`，固定 `NODE~`/`NODE:` 目标必须唯一命中。

一个不兼容节点会阻止整个数组输出，不要复制错误响应中的部分配置；修正 collection 后重新 Preview，客户端上一份配置仍可保留。

## 路由、DNS 和协议异常

确认 `DomainStrategy=IPIfNonMatch`，最后一条规则指向当前 `ap-incy-follow/<id>`。域名命中 ChinaTLD、业务域名或安全规则后不会继续解析 IP；只有域名未命中才匹配 `geoip:CN`。OpenAI、GitHub、YouTube、海外媒体、社交、游戏、下载和广告目标应与 policy 一致，固定 balancer 故障时回退 follow。DNS 国内/海外服务器、`quicMode=proxy-block` 和 `ipv6Mode=ipv4-only` 不应被手工改写。

如果只在一个平台出现，对照 `clients/incy/examples/` 中的配置，确认 `127.0.0.1:10808` SOCKS、`127.0.0.1:10809` HTTP 和 sniffing 没有被改坏。

## GeoData、缓存与回滚

只接受 `https://juan-nikola.github.io/apple-proxy-profiles/current/incy/` 下的资源。比对两个 `.sha256` sidecar 和 `client-manifest.json` 的记录；不一致时重新下载 routing、GeoData 与 sidecar，不能只替换单个文件。更新失败时先切回客户端上一份数组元素；维护者恢复 previous 时必须恢复完整快照和 matching manifest hash。不要把 `edge` 拼进任务 URL。

## 诊断信息

生成器日志只包含平台、规范化数量、接受数量、协议类别计数和 schema 版本。日志中不应出现节点名称、地址、UUID、密码、订阅 URL 或 policy 正文；如发现这些内容，立即停止分享日志并运行 `npm run check:secrets`。
