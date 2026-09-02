# INCY 配置生成器

INCY 适配器把 Sub-Store collection 转成完整的 Xray JSON 数组。它沿用现有客户端的严格参数解析和 fail-closed 约定，但输出面向 INCY 导入的本地配置与平台元数据。

`incy://crypt1` 只是一个可选的 URL 混淆辅助，不是加密，也不应当用来保护订阅凭据或敏感信息。

当前版本已经完成节点渲染、路由、HAPP 式完整配置数组和 Sub-Store operator。输入 collection 中每个节点都会尝试转换；任意一个节点不支持或字段不完整时，整个 task 失败，不返回部分数组。首期协议边界为 VLESS、VMess、Trojan、Shadowsocks、Hysteria2/Hy2、SOCKS5 和 HTTP；SSR、TUIC、Snell、AnyTLS、SSH、未验证的 WireGuard 不会被伪装支持。

支持平台为 iPhone、iPad、Apple TV、Android、Android TV、macOS、Windows 和 Linux。每个数组元素都使用统一的 DNS、业务分组、`IPIfNonMatch` 域名优先/IP 后备、国内 IP 直连、固定节点 least-ping 和 follow 回退。Sub-Store 负责节点选择，公开发布只提供 routing/GeoData/manifest，不含私密节点或 policy。

本 workspace 的 `npm run verify` 会依次跑测试、构建、fixtures、secret scan 和 JSON 校验，方便在发布前确认生成物和公开 JSON 都仍然是干净的。

部署步骤见 [部署指南](docs/deployment.md)，遇到导入或缓存异常先看 [故障排查](docs/troubleshooting.md)。公开入口和导入说明会继续维护在 `dist/` 和 `examples/`。
