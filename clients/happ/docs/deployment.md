# HAPP 部署

## 公开 GeoData

1. 打开稳定入口：`https://juan-nikola.github.io/apple-proxy-profiles/current/happ/index.html`。
2. HAPP 用户只使用最新的 `current/happ` 入口；生产任务固定 `channel=current`。
3. 日常设备和私密任务都固定使用 `current`；`edge` 和 `previous` 只属于维护者的内部灰度与回滚流程。

公开层不包含节点、订阅地址、密码、UUID 或 policy override。

## 私密 Sub-Store

在自己的 Sub-Store 中创建 File 后，给它添加“脚本操作/Script Operator”，并在脚本操作里以“远程链接”引用 `current/happ/scripts/happ-config-generator.js`；File 源内容保持为空。不要把 generator URL 填到 File 的“远程源文件”字段，否则 Preview 会原样显示 JavaScript 源码。把真实 collection 名称放在私密任务参数中。只建立 `macos`、`iphone`、`ipad` 三个平台任务；另建一个 `happ-routing-audit` 任务检查兼容性和策略解析。HAPP URL 必须保持 `/current/happ/`，不要把私密节点 URL、token 或 policy 正文写入公开文档。

三个生产配置任务的参数都显式填写 `ipv6Mode=ipv4-only`；其余 DNS、拦截和 QUIC 参数按根目录 [Sub-Store 参数表](../../../docs/substore-two-layer-setup.md) 填写。完整配置任务读取 `apple-proxy-policy`，节点任务只输出节点。

### HAPP 三平台 JSON 导入方式

当前兼容基线是 HAPP `4.0.5`/`5.6.0` 系列与 Xray `26.7.28`。JSON 配置由 Xray JSON 自己负责 DNS、路由和固定节点；HAPP Profile 只负责 GeoData 与 Tunnel DNS。HAPP 路由开关对 JSON 订阅会被锁定，这是客户端的正常限制，不是路由关闭。

`macos`、`iphone`、`ipad` 三个平台的真实 File 响应都会自动附带同一格式的 `routing: happ://routing/onadd/<base64>`，并发送 `routing-enable: 1`、`sniffing-enable: 1`。前者负责把 Profile 绑定到当前 JSON 订阅并在 GeoData 下载完成后激活，第二项明确保持订阅级路由为开启状态，第三项打开 HAPP 运行时 TUN 的协议/SNI 嗅探，使域名路由规则优先于 IP 回落。macOS 任务还会发送 HAPP 官方桌面参数 `proxy-enable: 1`，导入或更新订阅时自动选择 Proxy 模式并接管系统 HTTP/SOCKS 代理；iPhone/iPad 使用 Network Extension，不发送这个桌面专用参数。

> 重要：请在 HAPP 中添加 **订阅 URL**，不要先在浏览器下载 JSON 再使用“从文件导入节点”。下载到本地的文件不会保留 HTTP 响应头，所以 HAPP 无法从它自动绑定路由 Profile；旧版 HAPP 还可能把 JSON 数组当作单个配置而提示“无法解析配置”。

按下面顺序操作：

1. 在 Sub-Store Preview 对应平台任务，确认输出是非空 JSON 数组；Preview 不会显示真实 HTTP 响应头，这是正常现象。
2. 复制真实的 **File URL**（不是 Preview 下载文件，也不是 `/subs?api=...` 管理页面 URL）。在 HAPP 的“添加订阅/URL”入口粘贴该 URL。
3. HAPP 删除旧订阅条目后重新请求 URL，会收到 `routing`、`routing-enable: 1`、`sniffing-enable: 1` 和（仅 macOS）`proxy-enable: 1` 响应头，并下载同一 `current` channel 的 `geoip.dat`、`geosite.dat`。连接前等待两份 GeoData 下载完成。已经导入过旧任务时建议删除后重新添加，确保客户端重新应用嗅探和桌面模式参数。
4. 进入该订阅的设置页，JSON 订阅的路由开关显示为锁定是正常的；它由提供商配置控制，不能手动复制或编辑 Profile。重新连接后检查固定节点、国内外业务、局域网和 DNS。
5. 若仍出现“无法解析配置”、`geosite`/`geoip` 分类不存在、`NEAgentErrorDomain` 或 VPN 无效果，先删除旧订阅和旧 Profile，再重新导入同一平台 File URL，不要只点击旧条目的 Refresh。

#### 本地文件导入的边界

本项目输出的是“多配置 JSON 数组”，用于 HAPP 订阅页的节点选择。当前 HAPP 版本对本地文件导入的兼容性不一致，而且本地文件不可能携带 `routing` HTTP 头；因此本地文件导入不能保证自动安装或启用路由。需要离线传输时，只能先通过公开安装页手动安装 GeoData，再在 HAPP 中单独导入路由深链，最后手动导入一个 JSON 配置对象；这不属于推荐的自动更新流程。

普通节点列表仍可使用公开安装页导入 Profile。JSON 订阅不要手动复制 routing.happ.su 的 Profile，也不要先绑定一个公共 Profile 再导入 JSON；Restricted Mode 下 Profile 必须由 JSON 订阅响应携带并自动绑定。

验证路由时不要以“开关是否可点击”为准。HAPP 对 JSON 订阅会固定显示已开启并禁止手动切换；请在日志中确认 `happ-direct`、`happ-follow/...` 和需要时的 `happ-fixed/.../candidate`。`proxy-block` 会把应用 UDP/443（QUIC）直连回落，避免送入只支持 TCP 的 Reality；`all-block` 才会完全丢弃 UDP/443。

### 日志与 macOS 系统代理

HAPP JSON 默认日志级别为 `info`。订阅通过 `sniffing-enable: 1` 打开运行时 TUN 嗅探，入口对 HTTP、TLS、QUIC 开启分析并使用 `routeOnly: false`，因此嗅探成功时日志目标会显示域名；纯 IP、未加密 TCP、ECH 或嗅探失败只能显示 IP。出站 tag 使用节点展示名，例如 `happ-follow/小秘书GEN2 · VLESS · U`，固定业务出口使用 `[candidate]`/`[balancer]` 后缀，且不会泄露节点凭据。

macOS 的 HAPP 任务会在订阅导入/更新时请求自动 Proxy 模式（`proxy-enable: 1`），正常情况下无需手动打开系统代理。它使用 HTTP/HTTPS `127.0.0.1:10809`、SOCKS `127.0.0.1:10808`；可用 `scutil --proxy` 查看 `HTTPEnable`、`HTTPSEnable`、`SOCKSEnable` 是否已被 HAPP 打开。若仍为 `0`，删除 HAPP 旧订阅后重新添加最新 File URL；若被 Surge、Shadowrocket、Clash、系统 VPN 或其他网络扩展覆盖，只保留一个软件接管系统代理。显式 `curl --socks5-hostname 127.0.0.1:10808 https://www.google.com` 成功而浏览器失败时，问题属于系统代理接管，不属于统一策略路由。断开 HAPP 后应确认系统代理恢复为关闭或原来的设置。

策略值只允许 `DIRECT`、`FOLLOW` 或唯一 `NODE~<大致名称>`（兼容读取旧的 `NODE:<精确节点名>`）。`final=FOLLOW` 使用当前 JSON 的 follow 节点，`final=DIRECT` 使用 `happ-direct`，固定节点使用独立 balancer；HAPP 每个节点对应一个 JSON，不模拟同一配置内的 selector。策略修改后重新生成所有相关私密任务，再导入新 JSON。节点名和 Profile deep link 不要提交到仓库或公开聊天。

## 回滚

保留旧 JSON 和旧 Profile。回滚时同时切换到 `previous` GeoData 与对应的 previous Profile；对应平台 JSON 必须重新导入 `previous` 任务，让响应头和 GeoData URL 一起回滚，避免通道名称和规则数据不匹配。
