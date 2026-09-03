# INCY 配置生成器

INCY 适配器把 Sub-Store collection 转成官方支持的完整 Xray JSON 数组。生产任务使用 `format=array&selectionMode=both`：数组第一项是包含全部节点的自动选择配置，后续每一项是一个可手动切换的独立节点配置。`format=single` 仍可用于只需要一个自动选择配置的场景。

`incy://crypt1` 只是一个可选的 URL 混淆辅助，不是加密，也不应当用来保护订阅凭据或敏感信息。

当前版本已经完成节点渲染、官方 full-Xray 数组、自动/手动节点切换、业务分组分流和 Sub-Store operator。输入 collection 中每个节点都会尝试转换；任意一个节点不支持或字段不完整时，整个 task 失败，不返回部分配置。首期协议边界为 VLESS、VMess、Trojan、Shadowsocks、Hysteria2/Hy2、SOCKS5 和 HTTP；SSR、TUIC、Snell、AnyTLS、SSH、未验证的 WireGuard 不会被伪装支持。

支持平台为 iPhone、iPad、Apple TV、Android、Android TV、macOS、Windows 和 Linux。每个 full-Xray 配置使用统一的 DNS、业务分组、`IPIfNonMatch` 域名优先/IP 后备、国内 IP 直连、固定节点 least-ping 和故障回退。数组首项负责全部节点自动测速选择，后续元素用于手动指定节点。Sub-Store 负责提供节点，业务 policy 写入私密配置；公开发布只提供 routing/GeoData/manifest，不含私密节点或 policy。

本 workspace 的 `npm run verify` 会依次跑测试、构建、fixtures、secret scan 和 JSON 校验，方便在发布前确认生成物和公开 JSON 都仍然是干净的。

部署步骤见 [部署指南](docs/deployment.md)，遇到导入或缓存异常先看 [故障排查](docs/troubleshooting.md)。公开入口和导入说明会继续维护在 `dist/` 和 `examples/`。
