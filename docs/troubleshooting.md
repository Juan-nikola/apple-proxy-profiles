# 故障排查与回滚

固定顺序：切回旧 Profile → 判断节点/规则/DNS/局域网/IPv6 → 生成脱敏统计 → 只分享统计。先恢复可用网络，再排查；不要删除旧 Profile。

## 先回滚

1. 在当前设备的配置/Profile 列表选择部署前保留的旧 Profile。
2. 断开再连接 Shadowrocket，确认旧 Profile 恢复可用网络。
3. 新 Profile 保留在列表中用于排查，不要覆盖、重命名或删除旧 Profile。
4. 如果旧 Profile 也无法联网，先暂时断开 Shadowrocket，判断是否为 Wi-Fi、蜂窝网络或上游服务故障。
5. Intel Mac 未恢复前，不让 iPhone 或 iPad 更新；iPhone 未通过前，不让 iPad 更新。

回滚成功标志：无需删除新 Profile 就能选回旧 Profile，并恢复部署前的联网状态。

## 参数排障使用版本化测试 Profile

DNS、QUIC、IPv6、`blockMode`或测速参数排障使用下面的 File 副本流程：

客户端链式不适用这个仅复制 Profile File 的流程。链式排障必须按[维护速查中的完整隔离栈步骤](maintenance.md#打开客户端链式)，同时使用独立测试组合、节点 Script Operator、节点订阅和 Profile。

1. 在 Sub-Store 复制对应平台的正式 File，以 `-test-YYYYMMDD-参数-值`结尾命名。
2. 每个副本只改一个参数，预览通过后发布新的 URL。
3. 将这个新 URL 导入并排在旧 Profile 旁边，不使用覆盖导入。
4. 按需要关闭测试 Profile 和旧回滚 Profile 的自动更新，避免排障过程中内容自行变化。
5. 不要覆盖回滚 File 或 URL；也不要在诊断记录或截图中暴露它们。
6. 失败时直接选择旧 Profile；恢复可用网络后再检查日志和统计。

## 节点更新失败

在 Sub-Store 预览 `shadowrocket-sources`。原始来源为空就检查来源；原始有节点而 `shadowrocket-nodes` 为空就查看排除原因计数。不要截图节点详情。恢复前一次可用订阅，节点数量正常后再更新设备。

检查顺序：

1. 单独预览各个原始来源，判断是一个来源还是全部来源失效。
2. 预览组合 `shadowrocket-sources`，确认处理前节点数量不为 0。
3. 再预览 `shadowrocket-nodes`。若为空，记录协议和排除原因计数，不复制节点详情。
4. 确认节点脚本参数是 `output=nodes&clientChain=off` 或有意开启的 `on`，且目标平台为 Shadowrocket。
5. 恢复最近可用来源或脚本后先更新 Intel Mac。

如果节点名出现 `[已有链]`，表示脚本检测到了既有 `chain`、`underlying-proxy` 等链路字段，并主动阻止它再次成为客户端入口；不要手工删除或伪造该标记。若判断不符合预期，应检查原始节点的链路字段，而不是改生成后的名称。

## 规则下载失败

运行 `npm run check:rules`。首次部署有任何规则失败就停止灰度；已安装设备先保留 Shadowrocket 上一次可用缓存和旧 Profile。不要用空规则覆盖现有配置。

成功时命令会报告 29 份规则均通过。若出现 HTTP、条目数量或格式错误，记录规则名称和健康状态即可；不要把临时失败误当成需要删除旧缓存的理由。

## DNS 污染或网站指向异常

先确认命中的规则和 DNS 日志；把 `dnsMode` 保持或改回 `stable`，分别测试 `chinaDns=alidns|dnspod` 和 `globalDns=cloudflare|google|quad9`，每次重新生成并更新 Profile。不要同时改 QUIC、IPv6 和 DNS。

1. 保存当前参数和异常时间。
2. 按“参数排障使用版本化测试 Profile”复制 File；只改一个 DNS 参数并发布新的 URL。
3. 在 Intel Mac 更新、重连，清理应用自身缓存后复测相同域名。
4. 对比规则命中和 DNS 日志；不公开完整 Profile URL 或节点信息。
5. 无改善就切回旧 Profile，再试下一个单一参数。

## AirPlay、HomeKit、NAS、打印机或路由器失效

先切旧 Profile 验证设备本身；再确认目标是 `.local`、私有 IPv4/IPv6 或 mDNS，规则命中必须是 DIRECT。不要给局域网地址强制主代理。确认同一 Wi-Fi、系统本地网络权限和访客网络隔离。

局域网问题不要通过打开 HTTPS 解密或把全部流量改为代理解决。若旧 Profile 和断开 Shadowrocket 后同样失败，应先检查路由器、设备在线状态和系统权限。

## IPv6 异常

在 IPv4、双栈、可取得的 IPv6-only 网络分别测试。仅为定位问题临时设 `ipv6Mode=ipv4-only`；必须通过版本化 File 发布新的 URL 并与旧 Profile 并存。如果 IPv6-only 网络因此无法工作，这是预期排障结果，应恢复 `auto`，检查 DNS AAAA 和节点 IPv6 可达性。

非私有 IPv6 流量也必须参与规则并最终进入 `FINAL`，不能把“网站能打开”当成没有绕过的证据；需要查看规则命中日志。

## QUIC 或游戏异常

1. 日常先保持 `quicMode=allow`。
2. 只为定位代理路径中的应用 UDP/443 问题，复制 File 并发布新的 URL，生成 `proxy-block` 测试 Profile；仍有问题时才另复制一份测试 `all-block`。
3. 每种模式都要重新生成和更新 Profile，它不是热切换。
4. 测试后恢复 `allow`。此开关不等同于禁用 Hysteria2/TUIC 节点传输。
5. 游戏实时连接组只应显示明确带 `[UDP]` 的节点；没有合适节点时保持 DIRECT。

## AI 登录或风控

在 `🤖 AI 专用`固定一个地区和节点，不频繁更换；核对账号地区、付款地区和服务条款。代理只能改变网络出口，不能保证解除账号风控。

先看规则日志是否命中 `🤖 AI 专用`，再检查所选具体节点是否可用。不要为了绕过账号限制伪造身份或频繁切换出口。

## 评论地区没有变化

分别切换哔哩哔哩、抖音、小红书或微博对应策略组，确认规则日志命中该组。即使出口已改变，账号、手机号、GPS、缓存和平台风控仍可能决定评论地区；本项目不伪造 GPS，也不承诺显示变化。

只在符合平台服务条款的前提下使用对应策略组；不要把显示没有变化误判为规则一定失效。

## 可以分享什么

只分享平台、节点总数、协议计数、地区计数、来源计数、排除原因计数和规则健康状态。绝不能分享服务器、端口与凭据组合、密码、PSK、UUID、私钥、订阅 URL、Profile URL、Token、二维码或包含完整地址栏的截图。

安全分享模板：

```text
平台：macOS / iPhone / iPad
节点总数：
协议计数：
地区计数：
来源计数：
排除原因计数：
规则健康状态：
异常发生时间与复现步骤（不含 URL、地址、端口、节点名和凭据）：
已切回旧 Profile：是 / 否
```

发送前逐行检查并删除服务器、端口组合和完整链接。不要发送 Sub-Store 后台截图、浏览器地址栏、Shadowrocket 节点详情、二维码或原始日志全文。

