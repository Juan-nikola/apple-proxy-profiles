# HAPP 排障

- **页面打不开或下载失败**：先确认设备能访问 GitHub Pages，再检查 URL 是否为 `https` 且使用公开稳定入口 `current/happ`。生产任务固定 `channel=current`；`edge` 和 `previous` 只供维护者内部灰度或回滚。
- **GeoData hash 不一致**：停止导入，重新下载同一通道的 manifest 和两个 `.dat` 文件；不要手工编辑二进制。
- **JSON 为空**：在 Sub-Store 分别预览 collection 和 HAPP 任务，确认至少有一个兼容节点。
- **所有节点测速显示 `n/a`**：`n/a` 表示 HAPP 还没有执行 Ping，不是生成器把节点判定为不可用。点订阅标题右侧的测速表盘，或左滑节点后点测速；也可以在 HAPP 的 `Settings → Subscriptions → Ping on Launch` 开启启动测速。生成的 JSON 会把当前 `happ-follow/...` 出站写入 `observatory.subjectSelector`，因此手动 Ping 后才会出现延迟结果。
- **Reality 节点显示 `tcp`**：这是正常的两层表示：`network: tcp` 是 VLESS/VMess 的传输层，Reality 必须看同一出站的 `security: reality` 和 `realitySettings.publicKey`。只有同时看到 `security: tls` 且没有 `realitySettings` 才是错误；此时重新刷新订阅，确认任务远程脚本 URL 使用最新版本。
- **固定节点未命中**：节点名必须大小写、空格和标点完全一致；修正策略后重新生成 JSON。
- **HAPP 路由开关显示锁定或点击后提示“对于 JSON 订阅，无法手动启用/禁用路由”**：这是 HAPP 的 Restricted Mode 设计，不是配置错误。JSON 配置由 Xray JSON 自己负责 DNS、路由和固定节点；提供商响应头只负责绑定 GeoData/Profile。判断是否生效要看日志：国内目标应出现 `happ-direct`，海外普通目标应出现当前 `happ-follow/...`，AI 等固定业务应出现 `happ-fixed/.../candidate`。不要反复点击这个开关，也不要用 routing.happ.su 的链接覆盖 JSON 订阅 Profile。
- **从文件导入提示“无法解析配置”**：不要导入浏览器下载的 JSON 数组。文件导入丢失了 `routing`/`routing-enable` 响应头，且部分 HAPP 版本不接受数组文件；删除该条目后，改用对应平台的私密 File URL 从 HAPP 的“添加订阅/URL”入口导入。
- **URL 导入后仍显示“尚无路由配置”**：确认使用的是 HAPP generator 的真实 File URL，而不是 Sub-Store `/subs?api=...` 管理页、Preview 下载地址或普通节点 URL。删除旧条目后重新导入，等待 GeoData 下载完成并重新连接；`routing-enable: 1` 与 `happ://routing/onadd/...` 只会在真实 HTTP 请求中生效。真实 File 响应必须同时包含 `routing`、`routing-enable: 1` 和 `content-type: application/json`。
- **内核提示 `balancer ... not found`**：这是旧版 HAPP JSON 的结构问题，旧输出把固定节点 balancer 放在了配置顶层。不要继续刷新旧订阅；在 Sub-Store 重新 Preview 对应平台任务，确认新版 JSON 将 balancer 放在 `routing.balancers`，然后删除 HAPP 旧订阅条目并重新导入。
- **iOS 提示‘超出隧道内存限制（50 MB）’**：先在 Sub-Store 重新 Preview 对应平台任务，确认输出非空；真实 File 请求会通过 `routing` 响应头绑定 Profile，Preview 看不到响应头是正常的。删除 HAPP 中旧的订阅条目后重新导入新版 JSON，并重启 HAPP。不要跨平台混用 JSON，也不要混用不同发布通道。
- **日志出现 `XTLS rejected UDP/443 traffic`**：旧版本曾把 QUIC 写成无效的 `network: quic`，Xray 会忽略该规则，UDP/443 便进入不支持 UDP 的 Reality。重新生成并导入新版 File URL；当前 `proxy-block` 使用合法的 `network: udp` + `port: 443` 直连回落，`all-block` 丢弃，且入口启用 QUIC 嗅探。看到 Reality 出站的 `network: tcp` 与 `security: reality` 同时存在是正确的，不代表 Reality 被降级。
- **日志出现 `illegal domain rule: geosite:*`、`NEAgentErrorDomain` 或 VPN 没有效果**：通常是旧 JSON、旧 Profile 或旧 GeoData 缓存仍被使用。删除旧订阅，重新导入新版 File URL，等待 `current` GeoData 下载成功后再连接；不要在 JSON 订阅上手动复制公共 Profile。
- **Sub-Store Preview 看不到 `routing` 响应头**：这是预览请求的限制，不代表生产 File 没有响应头。用真实私密 File URL 在 HAPP 中删除旧条目后重新导入，才会触发 Profile 绑定。
- **导入后无流量**：确认先安装 `current` GeoData，再导入 `current` JSON；检查 HAPP VPN 权限、DNS 和节点连通性。
- **需要回滚**：切回旧 JSON，并同时安装 previous GeoData 和 previous Profile。不要把 current Profile 与 previous GeoData 混用。

日志和审计只保留脱敏的错误类别、时间、平台和 hash；不要分享节点地址、完整订阅 URL 或凭据。
