# sing-box 部署

1. 在私密 Sub-Store 添加 `sing-box-config-generator.js`。
2. 设置 `output=config`、`type=collection`、`platform` 和私密节点集合的 `name`。
3. 日常测试选择 `channel=edge`，稳定使用选择 `channel=current`。
4. 在官方客户端中导入返回的 JSON；不要把真实 JSON 配置提交到 GitHub。

支持的平台包括 Mac、iPhone、iPad、Android 和 OpenWrt。Mac、iPhone、iPad、Android 使用官方客户端的 TUN 能力；OpenWrt 额外启用透明网关所需的 `auto_redirect` 与 DNS 劫持参数。

当前版：`https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js`

测试版：`https://juan-nikola.github.io/apple-proxy-profiles/edge/sing-box/scripts/sing-box-config-generator.js`
