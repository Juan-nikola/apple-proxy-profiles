# sing-box 配置生成器

这个目录提供官方 sing-box 客户端配置生成器，覆盖 Mac、iPhone、iPad、Android 和 OpenWrt 软路由。`edge` 默认跟踪 testing 分支每日构建；`current` 只承接已经通过验证的版本。

## Sub-Store 参数

将 `clients/sing-box/dist/sing-box-config-generator.js` 或 `substore-config-generator.js` 配置为私密 Sub-Store 远程脚本，输出选择 `config`，类型选择 `collection`，平台使用 `macos`、`iphone`、`ipad`、`android` 或 `openwrt`。同时设置 `channel=edge` 或 `channel=current`。

脚本会返回 JSON 配置，并使用 GitHub Pages 的 sing-box rule-set 镜像。真实节点、凭据和私密节点源只存在于 Sub-Store 运行时。

## 远程地址

- 当前版：`https://juan-nikola.github.io/apple-proxy-profiles/current/sing-box/scripts/sing-box-config-generator.js`
- 测试版：`https://juan-nikola.github.io/apple-proxy-profiles/edge/sing-box/scripts/sing-box-config-generator.js`
