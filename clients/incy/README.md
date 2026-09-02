# INCY 配置生成器

INCY 适配器把 Sub-Store collection 转成官方支持的完整 Xray JSON。生产任务使用单个聚合配置，所有节点都在同一份配置中参与 observatory/least-ping 选择；同时保留 `format=array` 作为 HAPP 式兼容输出。

`incy://crypt1` 只是一个可选的 URL 混淆辅助，不是加密，也不应当用来保护订阅凭据或敏感信息。

当前版本已经完成节点渲染、官方单对象聚合配置、HAPP 式数组兼容输出和 Sub-Store operator。输入 collection 中每个节点都会尝试转换；任意一个节点不支持或字段不完整时，整个 task 失败，不返回部分配置。首期协议边界为 VLESS、VMess、Trojan、Shadowsocks、Hysteria2/Hy2、SOCKS5 和 HTTP；SSR、TUIC、Snell、AnyTLS、SSH、未验证的 WireGuard 不会被伪装支持。

支持平台为 iPhone、iPad、Apple TV、Android、Android TV、macOS、Windows 和 Linux。单对象配置使用统一的 DNS、业务分组、`IPIfNonMatch` 域名优先/IP 后备、国内 IP 直连、固定节点 least-ping 和全部节点自动选择。Sub-Store 负责节点选择，公开发布只提供 routing/GeoData/manifest，不含私密节点或 policy。

本 workspace 的 `npm run verify` 会依次跑测试、构建、fixtures、secret scan 和 JSON 校验，方便在发布前确认生成物和公开 JSON 都仍然是干净的。

部署步骤见 [部署指南](docs/deployment.md)，遇到导入或缓存异常先看 [故障排查](docs/troubleshooting.md)。公开入口和导入说明会继续维护在 `dist/` 和 `examples/`。
